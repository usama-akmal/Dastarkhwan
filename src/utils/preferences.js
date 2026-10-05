/**
 * The preference and dietary-rule vocabulary.
 *
 * Why this module exists: the app shipped with two silent contract violations
 * that produced no error and no user-visible warning.
 *
 *   1. Onboarding wrote the preference `'wont_eat'` while the engine hard-filtered
 *      on `'wont_touch'`, so a dish a family member explicitly refused stayed in
 *      the suggestion pool.
 *   2. The Settings form wrote a rule field named `type` while the engine read
 *      `ruleType`, so every user-created dietary rule was inert.
 *
 * Both are now impossible to express accidentally: every writer uses these
 * constants, and every value crossing a persistence boundary is normalised here.
 */

/** Preference states. Neutral ("no opinion") is represented by *absence*. */
export const PREF = {
  LOVES: 'loves',
  EATS: 'eats',
  WONT_TOUCH: 'wont_touch',
};

export const PREF_VALUES = Object.freeze([PREF.LOVES, PREF.EATS, PREF.WONT_TOUCH]);

/**
 * Legacy spellings encountered in already-persisted data, mapped to canonical values.
 * `wont_eat` was written by the shipped onboarding wizard's "Won't eat" button.
 */
const PREF_ALIASES = Object.freeze({
  wont_eat: PREF.WONT_TOUCH,
  wonttouch: PREF.WONT_TOUCH,
  "won't_touch": PREF.WONT_TOUCH,
  love: PREF.LOVES,
  loved: PREF.LOVES,
  eat: PREF.EATS,
  eats_it: PREF.EATS,
});

export const DIETARY_RULE_TYPES = Object.freeze({
  MAX_PER_WEEK: 'max_per_week',
  MIN_PER_WEEK: 'min_per_week',
  NO_CONSECUTIVE: 'no_consecutive',
});

/** Categories a rule can target. `seasonTags` is reserved for seasonal mode. */
export const RULE_CATEGORIES = Object.freeze({
  PROTEIN_TYPE: 'proteinType',
  DISH_TYPE: 'dishType',
  DIETARY_TAGS: 'dietaryTags',
  SEASON_TAGS: 'seasonTags',
});

/** Field names a rule's discriminator has appeared under, most-canonical first. */
const RULE_TYPE_KEYS = ['ruleType', 'type', 'rule_type'];

/**
 * Normalise a raw preference value to a canonical one.
 * Returns `null` for unknown or neutral values, meaning "no opinion" — which is
 * distinct from `eats` and must not be coerced into it.
 */
export function canonicalPreference(value) {
  if (value === null || value === undefined) return null;
  const key = String(value).trim().toLowerCase();
  if (PREF_VALUES.includes(key)) return key;
  return PREF_ALIASES[key] || null;
}

/**
 * Normalise a preference map, dropping unknown values and de-duplicating
 * legacy keys. Returns `{ preferences, changed }` so callers can skip writes.
 */
export function normalizePreferences(raw) {
  const out = {};
  let changed = false;
  for (const [dishId, value] of Object.entries(raw || {})) {
    const canonical = canonicalPreference(value);
    if (canonical === null) {
      changed = true;
      continue;
    }
    if (canonical !== value) changed = true;
    out[dishId] = canonical;
  }
  return { preferences: out, changed };
}

/**
 * Normalise a dietary rule into the canonical persisted shape:
 * `{ ruleType, category, value, limit, isActive }`.
 *
 * Accepts the legacy `type` spelling and fills in defaults, so records already in
 * a user's database stay readable and any future writer cannot silently diverge.
 */
export function normalizeRule(raw) {
  if (!raw) return null;
  const rule = { ...raw };
  let changed = false;

  const foundKey = RULE_TYPE_KEYS.find((k) => rule[k] !== undefined);
  const ruleType = foundKey ? rule[foundKey] : undefined;
  if (ruleType !== undefined && rule.ruleType !== ruleType) {
    rule.ruleType = ruleType;
    changed = true;
  }
  for (const key of RULE_TYPE_KEYS) {
    if (key !== 'ruleType' && rule[key] !== undefined) {
      delete rule[key];
      changed = true;
    }
  }

  if (rule.isActive === undefined) {
    rule.isActive = true;
    changed = true;
  } else if (typeof rule.isActive !== 'boolean') {
    // Legacy rows may hold 1/0; IndexedDB keys are typed, so a stored `1` never
    // matches a boolean query either.
    rule.isActive = Boolean(rule.isActive);
    changed = true;
  }

  if (rule.ruleType === DIETARY_RULE_TYPES.NO_CONSECUTIVE) {
    if (rule.limit !== 1) {
      rule.limit = 1;
      changed = true;
    }
  } else if (typeof rule.limit !== 'number' || Number.isNaN(rule.limit)) {
    rule.limit = 1;
    changed = true;
  }

  if (rule.category === undefined) {
    rule.category = RULE_CATEGORIES.PROTEIN_TYPE;
    changed = true;
  }

  return { rule, changed };
}

/** Human-readable label for a rule, tolerant of legacy shapes. */
export function describeRule(raw) {
  const { rule } = normalizeRule(raw) ?? {};
  if (!rule) return '';
  const subject = String(rule.value ?? '').replace(/-/g, ' ');
  switch (rule.ruleType) {
    case DIETARY_RULE_TYPES.MAX_PER_WEEK:
      return `Max ${rule.limit} ${subject} per week`;
    case DIETARY_RULE_TYPES.MIN_PER_WEEK:
      return `At least ${rule.limit} ${subject} per week`;
    case DIETARY_RULE_TYPES.NO_CONSECUTIVE:
      return `No ${subject} on consecutive days`;
    default:
      return `${subject}`;
  }
}

/** Selectable values per rule category, derived from the seed vocabularies. */
export const RULE_CATEGORY_VALUES = Object.freeze({
  [RULE_CATEGORIES.PROTEIN_TYPE]: [
    'chicken', 'beef', 'mutton', 'fish', 'eggs', 'lentils', 'vegetables',
  ],
  [RULE_CATEGORIES.DISH_TYPE]: [
    'curry', 'rice', 'roti-based', 'soup', 'fried', 'grilled', 'one-pot',
  ],
  // Only tags that actually exist in the seed data. The shipped UI offered
  // `low-fat`, which no dish carries, so such a rule could never match anything.
  [RULE_CATEGORIES.DIETARY_TAGS]: [
    'high-fat', 'spicy', 'mild', 'quick', 'heavy', 'light',
  ],
});
