import { describe, it, expect } from 'vitest';
import {
  canonicalPreference,
  normalizePreferences,
  normalizeRule,
  describeRule,
  PREF,
  RULE_CATEGORIES,
  RULE_CATEGORY_VALUES,
} from './preferences.js';

describe('canonicalPreference', () => {
  it('accepts the three canonical states', () => {
    expect(canonicalPreference(PREF.LOVES)).toBe('loves');
    expect(canonicalPreference(PREF.EATS)).toBe('eats');
    expect(canonicalPreference(PREF.WONT_TOUCH)).toBe('wont_touch');
  });

  it('maps the legacy `wont_eat` spelling written by the old onboarding', () => {
    expect(canonicalPreference('wont_eat')).toBe(PREF.WONT_TOUCH);
  });

  it('is case and whitespace insensitive', () => {
    expect(canonicalPreference(' LOVES ')).toBe(PREF.LOVES);
  });

  it('returns null for absence or unknown values, meaning "no opinion"', () => {
    expect(canonicalPreference(undefined)).toBeNull();
    expect(canonicalPreference(null)).toBeNull();
    expect(canonicalPreference('')).toBeNull();
    expect(canonicalPreference('something_else')).toBeNull();
  });
});

describe('normalizePreferences', () => {
  it('rewrites legacy values and reports the change', () => {
    const result = normalizePreferences({ '1': 'wont_eat', '2': 'loves' });
    expect(result.changed).toBe(true);
    expect(result.preferences).toEqual({ '1': PREF.WONT_TOUCH, '2': PREF.LOVES });
  });

  it('drops unknown values rather than persisting them', () => {
    const result = normalizePreferences({ '1': 'banana' });
    expect(result.preferences).toEqual({});
    expect(result.changed).toBe(true);
  });

  it('reports no change for already-canonical data', () => {
    const result = normalizePreferences({ '1': PREF.EATS });
    expect(result.changed).toBe(false);
    expect(result.preferences).toEqual({ '1': PREF.EATS });
  });

  it('tolerates missing input', () => {
    expect(normalizePreferences(undefined).preferences).toEqual({});
    expect(normalizePreferences(null).changed).toBe(false);
  });
});

describe('normalizeRule', () => {
  it('renames the legacy `type` field to `ruleType`', () => {
    const { rule, changed } = normalizeRule({ id: 1, type: 'max_per_week', category: 'proteinType', value: 'beef', limit: 2 });
    expect(changed).toBe(true);
    expect(rule.ruleType).toBe('max_per_week');
    expect(rule).not.toHaveProperty('type');
  });

  it('leaves an already-canonical rule structurally intact', () => {
    const input = { id: 1, ruleType: 'max_per_week', category: 'proteinType', value: 'beef', limit: 2, isActive: true };
    const { rule, changed } = normalizeRule(input);
    expect(rule).toEqual(input);
    expect(changed).toBe(false);
  });

  it('coerces a legacy numeric isActive to boolean (IndexedDB keys are typed)', () => {
    const { rule } = normalizeRule({ ruleType: 'max_per_week', category: 'dishType', value: 'fried', limit: 3, isActive: 1 });
    expect(rule.isActive).toBe(true);
  });

  it('defaults isActive to true when absent', () => {
    const { rule } = normalizeRule({ ruleType: 'max_per_week', category: 'dishType', value: 'fried', limit: 3 });
    expect(rule.isActive).toBe(true);
  });

  it('forces limit 1 for no_consecutive rules', () => {
    const { rule } = normalizeRule({ ruleType: 'no_consecutive', category: 'dietaryTags', value: 'high-fat', limit: 5 });
    expect(rule.limit).toBe(1);
  });

  it('returns null for empty input', () => {
    expect(normalizeRule(null)).toBeNull();
    expect(normalizeRule(undefined)).toBeNull();
  });
});

describe('describeRule', () => {
  it('describes canonical and legacy rules without producing "undefined"', () => {
    expect(describeRule({ ruleType: 'max_per_week', category: 'proteinType', value: 'beef', limit: 2 }))
      .toBe('Max 2 beef per week');
    // The old Settings list rendered `rule.type` against rules that stored `ruleType`,
    // so onboarding-created rules displayed as "Min undefined ... per week".
    expect(describeRule({ type: 'max_per_week', category: 'proteinType', value: 'beef', limit: 2 }))
      .toBe('Max 2 beef per week');
    expect(describeRule({ ruleType: 'no_consecutive', category: 'dietaryTags', value: 'high-fat', limit: 1 }))
      .toBe('No high fat on consecutive days');
  });

  it('never emits the string "undefined"', () => {
    for (const rule of [
      { ruleType: 'max_per_week', category: 'proteinType', value: 'beef', limit: 2 },
      { type: 'min_per_week', category: 'proteinType', value: 'vegetables', limit: 3 },
      { ruleType: 'no_consecutive', category: 'dishType', value: 'fried' },
    ]) {
      expect(describeRule(rule)).not.toMatch(/undefined/);
    }
  });
});

describe('rule vocabulary matches the seed data', () => {
  it('offers only dietary tags that dishes actually carry', async () => {
    const { seedDishes } = await import('../data/seed.js');
    const presentTags = new Set(seedDishes.flatMap((d) => d.dietaryTags || []));
    for (const tag of RULE_CATEGORY_VALUES[RULE_CATEGORIES.DIETARY_TAGS]) {
      // `low-fat` was offered by the old UI but appears on no dish, so such a rule
      // could never match anything.
      expect(presentTags.has(tag)).toBe(true);
    }
  });

  it('offers only protein types that dishes actually carry', async () => {
    const { seedDishes } = await import('../data/seed.js');
    const present = new Set(seedDishes.map((d) => d.proteinType));
    for (const protein of RULE_CATEGORY_VALUES[RULE_CATEGORIES.PROTEIN_TYPE]) {
      expect(present.has(protein)).toBe(true);
    }
  });
});
