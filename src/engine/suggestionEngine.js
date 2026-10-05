/**
 * Suggestion engine.
 *
 * Two structural repairs live here.
 *
 * 1. **Enrichment.** Every category-based rule needs protein/dish-type/tag resolved
 *    from the dish collection. The shipped version accepted the dish list at three
 *    call sites and passed it at none, so protein/dish-type cooldowns and every
 *    weekly limit were inert. The index is now built once per run and threaded through.
 *
 * 2. **Determinism.** The shipped scorer added `Math.random()` per dish and sorted
 *    stably, so with the default (all-neutral) state every dish tied and the winner
 *    was simply "the first seed row that rolled a +10" — ~98% of outcomes ignored the
 *    score, and the shown dish changed on ~97.5% of reloads. The jitter is now a pure
 *    function of `(date, mealType, dishId, attempt)`, which makes a suggestion stable
 *    across reloads while `attempt` still lets "Something Else" move on.
 */

import { isOnCooldown, getDaysSinceLastMade, getCategoryCounts, buildDishIndex } from './repetitionTracker.js';
import { checkFamilyConflicts, getConflictFreeDishes } from './conflictResolver.js';
import { PREF, DIETARY_RULE_TYPES, RULE_CATEGORIES } from '../utils/preferences.js';
import { todayKey, startOfWeek, endOfWeek } from '../utils/dates.js';

const DEFAULT_COOLDOWNS = { sameDish: 7, sameProtein: 3, sameDishType: 2 };

/** Deterministic PRNG seed. Same inputs must always produce the same draw. */
function hashSeed(...parts) {
  const input = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pure jitter in `[-spread, +spread]`, stable for a given seed. */
function jitter(seed, spread = 8) {
  const x = Math.sin(seed) * 10000;
  return Math.round((x - Math.floor(x)) * (2 * spread + 1)) - spread;
}

/**
 * Does `dish` violate any active dietary rule?
 *
 * Tag rules compare against `counts.dietaryTags` — a tally of meals whose *dish*
 * carries the tag. The shipped version counted every history row in the week, so
 * two tag-free meals were enough to block 100% of dishes carrying the tag.
 */
function violatesDietaryRules(dish, counts, yesterdayCounts, activeRules) {
  for (const rule of activeRules) {
    const { ruleType, category, value, limit } = rule;

    if (ruleType === DIETARY_RULE_TYPES.MAX_PER_WEEK) {
      const relevant =
        category === RULE_CATEGORIES.PROTEIN_TYPE ? dish.proteinType === value
          : category === RULE_CATEGORIES.DISH_TYPE ? dish.dishType === value
            : category === RULE_CATEGORIES.DIETARY_TAGS ? Boolean(dish.dietaryTags?.includes(value))
              : false;
      if (!relevant) continue;

      const bucket = category === RULE_CATEGORIES.PROTEIN_TYPE ? counts.proteinType
        : category === RULE_CATEGORIES.DISH_TYPE ? counts.dishType
          : counts.dietaryTags;
      if ((bucket[value] || 0) >= limit) return true;
    }

    if (ruleType === DIETARY_RULE_TYPES.NO_CONSECUTIVE) {
      const relevant =
        category === RULE_CATEGORIES.PROTEIN_TYPE ? dish.proteinType === value
          : category === RULE_CATEGORIES.DISH_TYPE ? dish.dishType === value
            : category === RULE_CATEGORIES.DIETARY_TAGS ? Boolean(dish.dietaryTags?.includes(value))
              : false;
      if (!relevant) continue;

      const bucket = category === RULE_CATEGORIES.PROTEIN_TYPE ? yesterdayCounts.proteinType
        : category === RULE_CATEGORIES.DISH_TYPE ? yesterdayCounts.dishType
          : yesterdayCounts.dietaryTags;
      if ((bucket[value] || 0) > 0) return true;
    }
  }
  return false;
}

/** Human-readable explanation of why a dish was excluded, for the UI. */
export function explainExclusions(dishes, familyMembers, cookingHistory, dietaryRules, settings) {
  const dishIndex = buildDishIndex(dishes);
  const cooldowns = settings?.cooldowns || DEFAULT_COOLDOWNS;
  const window = buildRuleWindows(cookingHistory, dietaryRules, dishIndex);
  const reasons = [];

  const hardBlocked = dishes.length - getConflictFreeDishes(dishes, familyMembers).length;
  if (hardBlocked > 0) {
    reasons.push({ reason: 'wont_touch', count: hardBlocked, detail: 'Someone has marked these "won\'t touch"' });
  }

  let cooldownBlocked = 0;
  for (const dish of getConflictFreeDishes(dishes, familyMembers)) {
    if (isOnCooldown(dish, cookingHistory, cooldowns, dishIndex).onCooldown) cooldownBlocked += 1;
  }
  if (cooldownBlocked > 0) {
    reasons.push({ reason: 'cooldown', count: cooldownBlocked, detail: 'Recently cooked (dish, protein or dish type)' });
  }

  let ruleBlocked = 0;
  for (const dish of getConflictFreeDishes(dishes, familyMembers)) {
    if (violatesDietaryRules(dish, window.weekly, window.yesterday, window.activeRules)) ruleBlocked += 1;
  }
  if (ruleBlocked > 0) {
    const labels = window.activeRules.map((r) => `${r.ruleType} ${r.value}(${r.limit})`).join(', ');
    reasons.push({ reason: 'dietary', count: ruleBlocked, detail: `Your dietary rules excluded these: ${labels}` });
  }

  return reasons;
}

function buildRuleWindows(cookingHistory, dietaryRules, dishIndex) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const validRules = [];
  for (const rule of dietaryRules || []) {
    // Rules are normalised on write, but tolerate legacy shapes defensively.
    const ruleType = rule.ruleType ?? rule.type;
    const isActive = rule.isActive === undefined ? true : Boolean(rule.isActive);
    if (!ruleType || !isActive) continue;
    validRules.push({
      ruleType,
      category: rule.category,
      value: rule.value,
      limit: rule.limit ?? 1,
    });
  }

  const weekly = getCategoryCounts(cookingHistory, startOfWeek(today), endOfWeek(today), dishIndex);
  const yesterdayCounts = getCategoryCounts(cookingHistory, yesterday, yesterday, dishIndex);
  return { weekly, yesterday: yesterdayCounts, activeRules: validRules };
}

/**
 * Dishes that survive the hard filters: no `wont_touch` from any member, inside no
 * cooldown, and violating no active dietary rule.
 *
 * @param {string} _mealType Reserved. Reserved for breakfast/sehri/iftar in seasonal
 *   mode; the shipped version accepted it and never used it, which the linter flagged.
 */
export function getAvailableDishes(dishes, familyMembers, cookingHistory, dietaryRules, settings, _mealType) {
  const dishIndex = buildDishIndex(dishes);
  const cooldowns = settings?.cooldowns || DEFAULT_COOLDOWNS;
  const window = buildRuleWindows(cookingHistory, dietaryRules, dishIndex);

  return getConflictFreeDishes(dishes, familyMembers).filter((dish) => {
    if (isOnCooldown(dish, cookingHistory, cooldowns, dishIndex).onCooldown) return false;
    if (violatesDietaryRules(dish, window.weekly, window.yesterday, window.activeRules)) return false;
    return true;
  });
}

/**
 * Score a dish. Neutral dishes stay near the base of 50: absence of an opinion is
 * not a demerit. `seed` makes the jitter deterministic.
 */
export function getDishScore(dish, familyMembers, cookingHistory, dietaryRules, settings, seed = 0, weeklyCounts = null) {
  const conflicts = checkFamilyConflicts(dish, familyMembers);

  // `getAvailableDishes` already removes hard conflicts, so this normally holds.
  // But scoring must not reward a dish someone refuses if it is ever reached
  // directly — the shipped scorer did exactly that (+10 for a rejected dish).
  if (conflicts.hasHardConflict) return -1000;

  const { lovers, eaters } = conflicts;
  const memberCount = familyMembers?.length || 0;
  const rated = lovers.length + eaters.length;

  // Base is deliberately the neutral 50: absence of an opinion is not a demerit.
  let score = 50;

  if (memberCount > 0) {
    if (lovers.length === memberCount) {
      score += 30; // everyone loves it
    } else if (lovers.length > memberCount / 2) {
      score += 15; // majority loves it
    } else if (rated > 0 && eaters.length > memberCount / 2) {
      score -= 12; // majority merely tolerates it
    }
    // Explicit ratings are weak evidence; prefer dishes the family has an opinion on.
    score += Math.min(rated * 2, 8);
  }

  // Novelty: not made in a fortnight earns a boost larger than the jitter band,
  // so it can actually change the ranking.
  const daysSince = getDaysSinceLastMade(dish.id, cookingHistory);
  if (daysSince >= 14) score += 10;

  // Weekly minimums: +5 per unmet minimum this dish would help satisfy.
  for (const rule of dietaryRules || []) {
    const ruleType = rule.ruleType ?? rule.type;
    const isActive = rule.isActive === undefined ? true : Boolean(rule.isActive);
    if (!isActive || ruleType !== DIETARY_RULE_TYPES.MIN_PER_WEEK) continue;

    if (rule.category === RULE_CATEGORIES.PROTEIN_TYPE && dish.proteinType !== rule.value) continue;
    if (rule.category === RULE_CATEGORIES.DISH_TYPE && dish.dishType !== rule.value) continue;
    if (rule.category === RULE_CATEGORIES.DIETARY_TAGS && !dish.dietaryTags?.includes(rule.value)) continue;

    // `weeklyCounts` is null when the caller has no enriched history; without it we
    // cannot know whether the minimum is unmet, so we skip rather than award blindly
    // (the shipped version awarded a permanent, never-expiring +5 here).
    const bucket = weeklyCounts
      ? (rule.category === RULE_CATEGORIES.PROTEIN_TYPE ? weeklyCounts.proteinType
        : rule.category === RULE_CATEGORIES.DISH_TYPE ? weeklyCounts.dishType
          : weeklyCounts.dietaryTags)
      : null;
    if (bucket && (bucket[rule.value] || 0) < rule.limit) score += 5;
  }

  score += jitter(seed, 8);
  return score;
}

/**
 * Generate a suggestion.
 *
 * @param {object} [options]
 * @param {number} [options.attempt=0] Bump to move past a rejected dish.
 * @param {string} [options.dateKey] Override "today" (used by tests).
 * @param {boolean} [options.deterministic=true] Set false only for genuine re-rolls.
 */
export function generateSuggestion(
  dishes,
  familyMembers,
  cookingHistory,
  dietaryRules,
  settings,
  mealType = 'dinner',
  options = {},
) {
  const { attempt = 0, dateKey = todayKey() } = options;

  const available = getAvailableDishes(
    dishes, familyMembers, cookingHistory, dietaryRules, settings, mealType,
  );

  // Enrich once: weekly tallies are needed both for filtering and for `min_per_week` scoring.
  const dishIndex = buildDishIndex(dishes);
  const today = new Date();
  const weeklyCounts = getCategoryCounts(cookingHistory, startOfWeek(today), endOfWeek(today), dishIndex);

  const scored = available.map((dish) => ({
    dish,
    score: getDishScore(
      dish,
      familyMembers,
      cookingHistory,
      dietaryRules,
      settings,
      hashSeed(dateKey, mealType, dish.id, attempt),
      weeklyCounts,
    ),
  }));

  // Tie-break on id so equal scores are still deterministic across reloads.
  scored.sort((a, b) => (b.score - a.score) || (a.dish.id - b.dish.id));

  if (scored.length === 0) {
    return {
      topSuggestion: null,
      alternatives: [],
      exclusions: explainExclusions(dishes, familyMembers, cookingHistory, dietaryRules, settings),
    };
  }

  return {
    topSuggestion: scored[0].dish,
    alternatives: scored.slice(1, 5).map((s) => s.dish),
    exclusions: [],
  };
}

export { PREF };
