/**
 * Repetition tracker.
 *
 * History rows carry only `{ dishId, date, mealType }`; protein/dish-type live on
 * the dish. Every category-based rule therefore needs the dish collection to
 * resolve them — that is what `dishIndex` is for. The shipped version accepted
 * this argument and never received it at any call site, which silently disabled
 * the protein and dish-type cooldowns entirely.
 *
 * Resolve the index ONCE per suggestion run (`buildDishIndex`) rather than
 * rebuilding a lookup map inside a nested loop.
 */

import { daysBetween, parseLocalDate, startOfDay } from '../utils/dates.js';

/** Build an `id -> dish` lookup for enrichment. */
export function buildDishIndex(allDishes) {
  const index = new Map();
  for (const dish of allDishes || []) index.set(dish.id, dish);
  return index;
}

function resolveProtein(entry, dishIndex) {
  return entry.proteinType ?? dishIndex?.get(entry.dishId)?.proteinType ?? null;
}

function resolveDishType(entry, dishIndex) {
  return entry.dishType ?? dishIndex?.get(entry.dishId)?.dishType ?? null;
}

/** The local date of the most recent history entry matching `predicate`. */
function lastMatchingDate(cookingHistory, predicate) {
  let latest = null;
  for (const entry of cookingHistory) {
    if (!predicate(entry)) continue;
    const date = parseLocalDate(entry.date);
    if (!latest || date > latest) latest = date;
  }
  return latest;
}

/**
 * Is `dish` still inside one of the repetition cooldowns?
 *
 * A cooldown of N blocks a dish for N days *after* it was made — a dish made
 * exactly N days ago is available again. The shipped comparison was
 * `daysSince <= cooldown`, which made a 7-day setting block 8 days.
 */
export function isOnCooldown(dish, cookingHistory, cooldowns, allDishesOrIndex) {
  const dishIndex = allDishesOrIndex instanceof Map
    ? allDishesOrIndex
    : buildDishIndex(allDishesOrIndex);
  const today = startOfDay(new Date());

  const sameDishDays = getDaysSinceLastMade(dish.id, cookingHistory);
  const sameDishLimit = cooldowns?.sameDish ?? 0;
  if (sameDishDays < sameDishLimit) {
    return { onCooldown: true, reason: 'sameDish', detail: `Made ${sameDishDays} day(s) ago (limit ${sameDishLimit})` };
  }

  if (dish.proteinType) {
    const last = lastMatchingDate(cookingHistory, (e) => resolveProtein(e, dishIndex) === dish.proteinType);
    if (last) {
      const elapsed = Math.round((today - startOfDay(last)) / 86400000);
      const limit = cooldowns?.sameProtein ?? 0;
      if (elapsed < limit) {
        return { onCooldown: true, reason: 'sameProtein', detail: `${dish.proteinType} made ${elapsed} day(s) ago (limit ${limit})` };
      }
    }
  }

  if (dish.dishType) {
    const last = lastMatchingDate(cookingHistory, (e) => resolveDishType(e, dishIndex) === dish.dishType);
    if (last) {
      const elapsed = Math.round((today - startOfDay(last)) / 86400000);
      const limit = cooldowns?.sameDishType ?? 0;
      if (elapsed < limit) {
        return { onCooldown: true, reason: 'sameDishType', detail: `${dish.dishType} made ${elapsed} day(s) ago (limit ${limit})` };
      }
    }
  }

  return { onCooldown: false, reason: null, detail: null };
}

export function getLastMadeDate(dishId, cookingHistory) {
  let latest = null;
  for (const entry of cookingHistory) {
    if (entry.dishId !== dishId) continue;
    const date = parseLocalDate(entry.date);
    if (!latest || date > latest) latest = date;
  }
  return latest;
}

/**
 * Whole local days since the dish was last made.
 * Returns `Infinity` when it has never been made — callers compare with `>=`,
 * so this stays finite after arithmetic (verified: no NaN/Infinity reaches sorting).
 */
export function getDaysSinceLastMade(dishId, cookingHistory) {
  const last = getLastMadeDate(dishId, cookingHistory);
  if (!last) return Infinity;
  return daysBetween(last, new Date());
}

/**
 * Tally cooking history between two dates by protein type, dish type and dietary tag.
 *
 * `allDishesOrIndex` is required for the protein/dishType tallies; without it the
 * result is empty and every `max_per_week` rule silently compares against zero.
 * Tags are tallied here too, so tag rules can count *tagged* rows rather than all rows.
 */
export function getCategoryCounts(cookingHistory, startDate, endDate, allDishesOrIndex) {
  const dishIndex = allDishesOrIndex instanceof Map
    ? allDishesOrIndex
    : buildDishIndex(allDishesOrIndex);

  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  end.setHours(23, 59, 59, 999);

  const counts = { proteinType: {}, dishType: {}, dietaryTags: {}, total: 0 };

  for (const entry of cookingHistory) {
    const date = parseLocalDate(entry.date);
    if (date < start || date > end) continue;

    const dish = dishIndex.get(entry.dishId);
    counts.total += 1;

    const protein = resolveProtein(entry, dishIndex);
    if (protein) counts.proteinType[protein] = (counts.proteinType[protein] || 0) + 1;

    const dishType = resolveDishType(entry, dishIndex);
    if (dishType) counts.dishType[dishType] = (counts.dishType[dishType] || 0) + 1;

    const tags = entry.dietaryTags ?? dish?.dietaryTags ?? [];
    for (const tag of tags) {
      counts.dietaryTags[tag] = (counts.dietaryTags[tag] || 0) + 1;
    }
  }

  return counts;
}
