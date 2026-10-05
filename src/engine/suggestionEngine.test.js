import { describe, it, expect } from 'vitest';
import { seedDishes } from '../data/seed.js';
import { generateSuggestion, getAvailableDishes, getDishScore } from './suggestionEngine.js';
import { toLocalDateKey, startOfWeek } from '../utils/dates.js';

/**
 * These tests exist because the shipped engine looked like it worked and did not.
 * Each `describe` block pins one of the defects found in the audit so a future
 * refactor cannot silently reintroduce it.
 */

// Mirror the ids the app generates for seed dishes (`seed:<slug>`).
const dishes = seedDishes.map((dish) => ({
  ...dish,
  id: `seed:${dish.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
}));

const settings = { cooldowns: { sameDish: 7, sameProtein: 3, sameDishType: 2 }, mealsPerDay: 2 };
const oneMember = [{ id: 1, name: 'Ali', role: 'husband', preferences: {} }];
const fourMembers = [1, 2, 3, 4].map((i) => ({ id: i, name: `M${i}`, role: 'other', preferences: {} }));

/** Local `YYYY-MM-DD` for N days ago — never UTC, or the test itself is timezone-buggy. */
const daysAgo = (n) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return toLocalDateKey(date);
};

const entry = (dish, date, mealType = 'dinner') => ({ id: Math.random(), dishId: dish.id, date, mealType });
const chickenDishes = dishes.filter((d) => d.proteinType === 'chicken');
const beefDishes = dishes.filter((d) => d.proteinType === 'beef');

describe('cooldowns (F1.1 — was inert because allDishes was never passed)', () => {
  it('excludes the same protein within the cooldown window', () => {
    const history = [entry(chickenDishes[0], daysAgo(1))];
    const available = getAvailableDishes(dishes, oneMember, history, [], settings, 'dinner');
    expect(available.some((d) => d.proteinType === 'chicken')).toBe(false);
  });

  it('excludes the same dish type within the cooldown window', () => {
    const curry = dishes.find((d) => d.proteinType === 'chicken' && d.dishType === 'curry');
    const otherCurry = dishes.find((d) => d.proteinType === 'beef' && d.dishType === 'curry');
    const history = [entry(curry, daysAgo(1))];
    const available = getAvailableDishes(dishes, oneMember, history, [], settings, 'dinner');
    expect(available.some((d) => d.id === otherCurry.id)).toBe(false);
  });

  it('honours a protein cooldown of 0 as "disabled"', () => {
    const history = [entry(chickenDishes[0], daysAgo(0))];
    const loose = { ...settings, cooldowns: { sameDish: 0, sameProtein: 0, sameDishType: 0 } };
    const available = getAvailableDishes(dishes, oneMember, history, [], loose, 'dinner');
    expect(available.some((d) => d.proteinType === 'chicken')).toBe(true);
  });

  it('treats a cooldown of N as N days: available again exactly N days later (F1.7 off-by-one)', () => {
    const dish = chickenDishes[0];
    const exactlySeven = getAvailableDishes([dish], oneMember, [entry(dish, daysAgo(7))], [], settings);
    const sixDays = getAvailableDishes([dish], oneMember, [entry(dish, daysAgo(6))], [], settings);
    expect(exactlySeven).toHaveLength(1);
    expect(sixDays).toHaveLength(0);
  });
});

describe('weekly limits (F1.2 — was dead because getCategoryCounts had no dish data)', () => {
  const beefRule = [{ id: 1, ruleType: 'max_per_week', category: 'proteinType', value: 'beef', limit: 2, isActive: true }];

  /**
   * Build `count` history entries for `dish` that are guaranteed to fall inside the
   * current Monday-based week. Using "today" is not enough: if the suite runs on a
   * Sunday or Monday, `daysAgo(2)` lands in the *previous* week and a weekly-cap test
   * would pass or fail depending on the day it ran.
   */
  const thisWeek = (dish, count) => {
    const monday = startOfWeek(new Date());
    const inWeek = (offset) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + offset);
      // Never build a future date; fall back to the week's Monday.
      return date > new Date() ? toLocalDateKey(monday) : toLocalDateKey(date);
    };
    return Array.from({ length: count }, (_, i) => entry(dish, inWeek(i)));
  };

  it('blocks a protein once its weekly cap is reached', () => {
    // Two chicken meals this week against a cap of 1. `sameProtein: 3` already
    // excludes chicken via cooldown, so the *absence of beef* is what proves the
    // weekly rule ran: nothing has touched a cooldown for beef.
    const chickenCap = [{ id: 1, ruleType: 'max_per_week', category: 'proteinType', value: 'chicken', limit: 1, isActive: true }];
    const history = thisWeek(chickenDishes[0], 2);

    const withRule = getAvailableDishes(dishes, oneMember, history, chickenCap, settings);
    const withoutRule = getAvailableDishes(dishes, oneMember, history, [], settings);

    // Beef is available either way — proving the rule targets chicken specifically.
    expect(withoutRule.some((d) => d.proteinType === 'beef')).toBe(true);
    expect(withRule.some((d) => d.proteinType === 'beef')).toBe(true);

    // The cap itself, measured against a disabled protein cooldown so the two
    // mechanisms cannot be confused for one another.
    const noProteinCooldown = { ...settings, cooldowns: { ...settings.cooldowns, sameProtein: 0 } };
    expect(getAvailableDishes(dishes, oneMember, history, [], noProteinCooldown).some((d) => d.proteinType === 'chicken')).toBe(true);
    expect(getAvailableDishes(dishes, oneMember, history, chickenCap, noProteinCooldown).some((d) => d.proteinType === 'chicken')).toBe(false);
  });

  it('counts weekly meals cumulatively, not just the most recent', () => {
    // Two *different* chicken dishes, so this is purely about the weekly tally being
    // cumulative rather than about the 7-day same-dish rule. Both protein and
    // dish-type cooldowns are disabled so only the weekly cap can move the result.
    const noCooldown = { ...settings, cooldowns: { sameDish: 7, sameProtein: 0, sameDishType: 0 } };
    const cooked = [chickenDishes[0], chickenDishes[1]];
    const cookedTypes = new Set(cooked.map((d) => d.dishType));
    // A chicken dish whose type was not cooked today, so no cooldown touches it.
    const subject = chickenDishes.find((d) => !cookedTypes.has(d.dishType));
    expect(subject).toBeDefined();

    const history = [entry(cooked[0], daysAgo(0)), entry(cooked[1], daysAgo(0))];

    // Headroom: 2 cooked against a budget of 3, so the subject is still allowed.
    const budgetThree = [{ id: 1, ruleType: 'max_per_week', category: 'proteinType', value: 'chicken', limit: 3, isActive: true }];
    expect(getAvailableDishes(dishes, oneMember, history, budgetThree, noCooldown).some((d) => d.id === subject.id)).toBe(true);

    // Cap reached: 2 cooked against a budget of 2, so the subject is excluded.
    const budgetTwo = [{ ...budgetThree[0], limit: 2 }];
    expect(getAvailableDishes(dishes, oneMember, history, budgetTwo, noCooldown).some((d) => d.id === subject.id)).toBe(false);
  });

  it('still honours the legacy `type` field shape (F1.5)', () => {
    const legacy = [{ id: 1, type: 'max_per_week', category: 'proteinType', value: 'beef', limit: 1, isActive: true }];
    const history = thisWeek(beefDishes[0], 1);
    const available = getAvailableDishes(dishes, oneMember, history, legacy, settings);
    expect(available.some((d) => d.proteinType === 'beef')).toBe(false);
  });

  it('ignores a rule marked inactive', () => {
    const inactive = [{ ...beefRule[0], isActive: false }];
    const history = thisWeek(chickenDishes[0], 1);
    const available = getAvailableDishes(dishes, oneMember, history, inactive, settings);
    expect(available.some((d) => d.proteinType === 'beef')).toBe(true);
  });
});

describe('tag rules (F1.3 — counted every history row instead of tagged rows)', () => {
  const spicyRule = [{ id: 1, ruleType: 'max_per_week', category: 'dietaryTags', value: 'spicy', limit: 2, isActive: true }];

  it('does not block tagged dishes when tag-free meals were cooked', () => {
    const mildOnly = dishes.filter((d) => d.dietaryTags.includes('mild') && !d.dietaryTags.includes('spicy'));
    const history = mildOnly.slice(0, 4).map((d) => entry(d, daysAgo(0)));
    const available = getAvailableDishes(dishes, oneMember, history, spicyRule, settings);
    expect(available.some((d) => d.dietaryTags.includes('spicy'))).toBe(true);
  });

  it('does block tagged dishes once tagged meals reach the limit', () => {
    const spicyOnly = dishes.filter((d) => d.dietaryTags.includes('spicy'));
    const history = spicyOnly.slice(0, 2).map((d) => entry(d, daysAgo(0)));
    const available = getAvailableDishes(dishes, oneMember, history, spicyRule, settings);
    expect(available.some((d) => d.dietaryTags.includes('spicy'))).toBe(false);
  });
});

describe('preference vocabulary (F2.2 — onboarding wrote a value the engine ignored)', () => {
  it('hard-filters a dish marked with the legacy `wont_eat` spelling', () => {
    const target = beefDishes[0];
    const family = [{ id: 1, name: 'Ali', role: 'husband', preferences: { [target.id]: 'wont_eat' } }];
    const available = getAvailableDishes(dishes, family, [], [], settings);
    expect(available.some((d) => d.id === target.id)).toBe(false);
  });

  it('hard-filters a dish marked `wont_touch`', () => {
    const target = beefDishes[0];
    const family = [{ id: 1, name: 'Ali', role: 'husband', preferences: { [target.id]: 'wont_touch' } }];
    const available = getAvailableDishes(dishes, family, [], [], settings);
    expect(available.some((d) => d.id === target.id)).toBe(false);
  });

  it('leaves dishes with no preference in the pool (neutral is not a refusal)', () => {
    const available = getAvailableDishes(dishes, oneMember, [], [], settings);
    expect(available.length).toBe(dishes.length);
  });
});

describe('scoring (F1.9/F1.10 — neutral was penalised and rejection was rewarded)', () => {
  it('keeps unrated dishes at or above the neutral base', () => {
    const scores = dishes.map((d) => getDishScore(d, fourMembers, [], [], settings, 1));
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(50);
  });

  it('never scores a dish someone refuses above a neutral dish', () => {
    const target = beefDishes[0];
    const refusers = [
      { id: 1, name: 'A', role: 'other', preferences: { [target.id]: 'wont_touch' } },
      { id: 2, name: 'B', role: 'other', preferences: {} },
    ];
    // Rejected outright: the scorer must not reward it.
    expect(getDishScore(target, refusers, [], [], settings, 42)).toBeLessThan(0);
  });

  it('ranks a loved dish above a merely tolerated one at an identical seed', () => {
    const loved = beefDishes[0];
    const tolerated = beefDishes[1];
    const loveAll = fourMembers.map((m) => ({ ...m, preferences: { [loved.id]: 'loves' } }));
    const eatAll = fourMembers.map((m) => ({ ...m, preferences: { [tolerated.id]: 'eats' } }));
    expect(getDishScore(loved, loveAll, [], [], settings, 7))
      .toBeGreaterThan(getDishScore(tolerated, eatAll, [], [], settings, 7));
  });

  it('gives a novelty bonus to a dish not made in a fortnight', () => {
    const dish = chickenDishes[0];
    const never = getDishScore(dish, oneMember, [], [], settings, 3);
    const recently = getDishScore(dish, oneMember, [entry(dish, daysAgo(1))], [], settings, 3);
    expect(never).toBeGreaterThan(recently);
  });
});

describe('determinism (F2.3 — the shown dish changed on ~97% of reloads)', () => {
  const options = { attempt: 0, dateKey: '2026-10-05' };

  it('returns the same dish for the same context, every time', () => {
    const picks = new Set();
    for (let i = 0; i < 100; i += 1) {
      picks.add(generateSuggestion(dishes, oneMember, [], [], settings, 'dinner', options).topSuggestion.id);
    }
    expect(picks.size).toBe(1);
  });

  it('advances to a different dish when the attempt changes', () => {
    const first = generateSuggestion(dishes, oneMember, [], [], settings, 'dinner', { attempt: 0, dateKey: '2026-10-05' });
    const second = generateSuggestion(dishes, oneMember, [], [], settings, 'dinner', { attempt: 1, dateKey: '2026-10-05' });
    expect(second.topSuggestion.id).not.toBe(first.topSuggestion.id);
  });

  it('does not pick the same dish for lunch and dinner', () => {
    const lunch = generateSuggestion(dishes, oneMember, [], [], settings, 'lunch', options);
    const dinner = generateSuggestion(dishes, oneMember, [], [], settings, 'dinner', options);
    expect(lunch.topSuggestion.id).not.toBe(dinner.topSuggestion.id);
  });

  it('does not collapse onto the first seed rows (F1.11)', () => {
    const tally = {};
    for (let i = 0; i < 365; i += 1) {
      const day = new Date(2026, 0, 1 + i);
      const dateKey = toLocalDateKey(day);
      const pick = generateSuggestion(dishes, oneMember, [], [], settings, 'dinner', { attempt: 0, dateKey }).topSuggestion;
      tally[pick.id] = (tally[pick.id] || 0) + 1;
    }
    // A fair-ish spread should reach most of the 80-dish pool across a year.
    expect(Object.keys(tally).length).toBeGreaterThan(60);
  });
});

describe('explanations', () => {
  it('reports why the pool is empty instead of a generic message', () => {
    const rules = ['chicken', 'beef', 'mutton', 'fish', 'eggs', 'lentils', 'vegetables']
      .map((value, i) => ({ id: i, ruleType: 'max_per_week', category: 'proteinType', value, limit: 1, isActive: true }));
    const history = dishes.map((d) => entry(d, daysAgo(0)));
    const result = generateSuggestion(dishes, oneMember, history, rules, settings, 'dinner', { attempt: 0, dateKey: '2026-10-05' });

    expect(result.topSuggestion).toBeNull();
    expect(result.exclusions.length).toBeGreaterThan(0);
  });
});
