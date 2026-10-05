import { describe, it, expect } from 'vitest';
import { computeInsights, formatInsightsForSharing } from './insights.js';
import { toLocalDateKey, todayKey } from './dates.js';

/**
 * Insights exist so this app can be evaluated without telemetry. Anything that
 * reports user behaviour must be computed here, locally and testably, so the app
 * never has to phone home to answer "is this working?".
 */

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateKey(d);
};

const dish = (id, proteinType = 'chicken', dishType = 'curry', isCustom = false) =>
  ({ id, nameEn: `Dish ${id}`, proteinType, dishType, isCustom });

const dishes = [
  dish('a', 'chicken', 'curry'),
  dish('b', 'beef', 'rice'),
  dish('c', 'lentils', 'curry'),
  dish('d', 'vegetables', 'soup', true),
];

const member = (id, prefs) => ({ id, name: `M${id}`, preferences: prefs });

describe('computeInsights — empty state', () => {
  it('returns zeroes rather than NaN when there is no data at all', () => {
    const result = computeInsights({});
    expect(result.totalMeals).toBe(0);
    expect(result.daysWithMeals).toBe(0);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.ratingCoverage).toBe(0);
    expect(result.mealsPerWeek).toBe(0);
    expect(Number.isNaN(result.mealsPerWeek)).toBe(false);
  });

  it('does not divide by zero when there are no dishes', () => {
    const result = computeInsights({ history: [{ dishId: 'a', date: daysAgo(1), mealType: 'dinner' }], dishes: [] });
    expect(result.distinctDishShare).toBe(0);
    expect(result.distinctProteins).toBe(0);
  });
});

describe('computeInsights — volume', () => {
  it('counts total meals and distinct days', () => {
    const history = [
      { dishId: 'a', date: daysAgo(0), mealType: 'lunch' },
      { dishId: 'b', date: daysAgo(0), mealType: 'dinner' },
      { dishId: 'c', date: daysAgo(1), mealType: 'dinner' },
    ];
    const r = computeInsights({ history, dishes });
    expect(r.totalMeals).toBe(3);
    expect(r.daysWithMeals).toBe(2);
    expect(r.mealsLast30Days).toBe(3);
  });

  it('excludes meals older than 30 days from the recent count', () => {
    const history = [
      { dishId: 'a', date: daysAgo(2), mealType: 'dinner' },
      { dishId: 'b', date: daysAgo(45), mealType: 'dinner' },
    ];
    const r = computeInsights({ history, dishes });
    expect(r.totalMeals).toBe(2);
    expect(r.mealsLast30Days).toBe(1);
  });
});

describe('computeInsights — streaks', () => {
  it('measures a run of consecutive days', () => {
    const history = [0, 1, 2, 3].map((n) => ({ dishId: 'a', date: daysAgo(n), mealType: 'dinner' }));
    const r = computeInsights({ history, dishes });
    expect(r.longestStreak).toBe(4);
    expect(r.currentStreak).toBe(4);
  });

  it('does not report a lapsed run as the current streak', () => {
    // Meals stopped a week ago: the habit has lapsed, so current must be 0 while
    // the historical longest is still reported honestly.
    const history = [7, 8, 9].map((n) => ({ dishId: 'a', date: daysAgo(n), mealType: 'dinner' }));
    const r = computeInsights({ history, dishes });
    expect(r.longestStreak).toBe(3);
    expect(r.currentStreak).toBe(0);
  });

  it('treats a gap as ending the run but keeps the longest', () => {
    const history = [
      ...[0, 1].map((n) => ({ dishId: 'a', date: daysAgo(n), mealType: 'dinner' })),
      ...[5, 6, 7, 8].map((n) => ({ dishId: 'a', date: daysAgo(n), mealType: 'dinner' })),
    ];
    const r = computeInsights({ history, dishes });
    expect(r.longestStreak).toBe(4);
    expect(r.currentStreak).toBe(2);
  });

  it('treats two meals on one day as a single day for streak purposes', () => {
    const history = [
      { dishId: 'a', date: daysAgo(0), mealType: 'lunch' },
      { dishId: 'b', date: daysAgo(0), mealType: 'dinner' },
    ];
    const r = computeInsights({ history, dishes });
    expect(r.daysWithMeals).toBe(1);
    expect(r.longestStreak).toBe(1);
  });
});

describe('computeInsights — variety', () => {
  it('counts distinct dishes, proteins and dish types actually cooked', () => {
    const history = [
      { dishId: 'a', date: daysAgo(0), mealType: 'lunch' },
      { dishId: 'a', date: daysAgo(1), mealType: 'dinner' },
      { dishId: 'b', date: daysAgo(2), mealType: 'dinner' },
    ];
    const r = computeInsights({ history, dishes });
    expect(r.distinctDishes).toBe(2);      // 'a' counted once despite two meals
    expect(r.distinctProteins).toBe(2);    // chicken, beef
    expect(r.distinctDishTypes).toBe(2);   // curry, rice
  });

  it('ignores history rows whose dish no longer exists', () => {
    const history = [
      { dishId: 'a', date: daysAgo(0), mealType: 'dinner' },
      { dishId: 'deleted', date: daysAgo(1), mealType: 'dinner' },
    ];
    const r = computeInsights({ history, dishes });
    expect(r.totalMeals).toBe(2);
    expect(r.distinctDishes).toBe(2);
    expect(r.distinctProteins).toBe(1);
    expect(Number.isNaN(r.distinctProteins)).toBe(false);
  });
});

describe('computeInsights — household setup', () => {
  it('measures how much of the preference space is filled in', () => {
    const family = [
      member(1, { a: 'loves', b: 'wont_touch' }),
      member(2, { a: 'eats' }),
    ];
    const r = computeInsights({ dishes, familyMembers: family });
    expect(r.ratingsGiven).toBe(3);
    expect(r.ratingsPossible).toBe(8);      // 4 dishes x 2 members
    expect(r.ratingCoverage).toBeCloseTo(0.375, 3);
    expect(r.wontTouchCount).toBe(1);
  });

  it('reports zero coverage rather than NaN with no family members', () => {
    const r = computeInsights({ dishes, familyMembers: [] });
    expect(r.ratingsPossible).toBe(0);
    expect(r.ratingCoverage).toBe(0);
  });

  it('counts custom recipes', () => {
    const r = computeInsights({ dishes });
    expect(r.customDishes).toBe(1);
  });
});

describe('formatInsightsForSharing', () => {
  const insights = computeInsights({
    history: [{ dishId: 'a', date: daysAgo(0), mealType: 'dinner' }],
    dishes,
    familyMembers: [member(1, { a: 'loves' })],
    settings: { mealsPerDay: 2, cooldowns: { sameDish: 7, sameProtein: 3, sameDishType: 2 } },
  });

  it('produces a readable multi-line summary', () => {
    const text = formatInsightsForSharing(insights);
    expect(text).toMatch(/Dastarkhwan usage summary/);
    expect(text).toMatch(/Meals planned: 1 across 1 days/);
    expect(text.split('\n').length).toBeGreaterThan(5);
  });

  it('never emits NaN or undefined', () => {
    const text = formatInsightsForSharing(computeInsights({}));
    expect(text).not.toMatch(/NaN|undefined/);
  });

  it('discloses no dish, family name or individual date', () => {
    // Names live in `dishes` and `familyMembers` but must not reach the summary:
    // this text is designed to be pasted into a message when asking for help.
    const text = formatInsightsForSharing(insights);
    expect(text).not.toMatch(/Dish /);
    expect(text).not.toMatch(/\bM1\b/);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('insights report today correctly', () => {
  it('includes a meal logged today in the current streak', () => {
    const history = [{ dishId: 'a', date: todayKey(), mealType: 'dinner' }];
    const r = computeInsights({ history, dishes });
    expect(r.currentStreak).toBe(1);
    expect(r.currentStreak).toBe(r.longestStreak);
  });
});


describe('computeInsights — suggestion quality', () => {
  const ev = (type, extra = {}) => ({ type, ...extra });

  it('reports null rather than a misleading zero before anything was shown', () => {
    const r = computeInsights({ history: [], dishes, usageEvents: [] });
    expect(r.topPickRate).toBeNull();
    expect(r.listAcceptanceRate).toBeNull();
    expect(r.suggestionsShown).toBe(0);
  });

  it('computes the first-choice rate from outcomes, not from suggestions shown', () => {
    // 1 shown, accepted as offered. A suggestion that was merely displayed and never
    // acted on must not count as a rejection.
    const usageEvents = [
      ev('suggested', { dishId: 'a' }),
      ev('accepted', { dishId: 'a' }),
    ];
    const r = computeInsights({ history: [], dishes, usageEvents });
    expect(r.suggestionsShown).toBe(1);
    expect(r.suggestionsAccepted).toBe(1);
    expect(r.topPickRate).toBe(1);
    expect(r.listAcceptanceRate).toBe(1);
  });

  it('separates a wrong first choice from a useful list', () => {
    const usageEvents = [
      ev('suggested', { dishId: 'a' }),
      ev('accepted_alternative', { dishId: 'b', suggestedDishId: 'a' }),
      ev('suggested', { dishId: 'c' }),
      ev('rejected', { dishId: 'c' }),
    ];
    const r = computeInsights({ history: [], dishes, usageEvents });
    // One outcome taken, and it was not the first choice.
    expect(r.topPickRate).toBe(0);
    expect(r.listAcceptanceRate).toBe(0.5);
    expect(r.suggestionsAcceptedAlternative).toBe(1);
    expect(r.suggestionsRejected).toBe(1);
  });

  it('ignores displayed-but-unacted suggestions in the ratio', () => {
    // Five suggestions shown, one accepted. The rate is 1/1, because the other four
    // were never resolved — counting them would understate the engine.
    const usageEvents = [
      ...[1, 2, 3, 4, 5].map((n) => ev('suggested', { dishId: `d${n}` })),
      ev('accepted', { dishId: 'd1' }),
    ];
    const r = computeInsights({ history: [], dishes, usageEvents });
    expect(r.suggestionsShown).toBe(5);
    expect(r.topPickRate).toBe(1);
  });

  it('handles a mixed history without producing NaN', () => {
    const usageEvents = [
      ev('suggested', { dishId: 'a' }), ev('accepted', { dishId: 'a' }),
      ev('suggested', { dishId: 'b' }), ev('rejected', { dishId: 'b' }),
      ev('suggested', { dishId: 'c' }), ev('accepted_alternative', { dishId: 'd' }),
    ];
    const r = computeInsights({ history: [], dishes, usageEvents });
    expect(r.topPickRate).toBeCloseTo(1 / 3, 3);
    expect(r.listAcceptanceRate).toBeCloseTo(2 / 3, 3);
  });

  it('includes the rate in the shareable summary when available', () => {
    const usageEvents = [ev('suggested', { dishId: 'a' }), ev('accepted', { dishId: 'a' })];
    const text = formatInsightsForSharing(computeInsights({ history: [], dishes, usageEvents }));
    expect(text).toMatch(/Suggestion quality: top pick accepted 100%/);
  });

  it('says so plainly when there is not enough data', () => {
    const text = formatInsightsForSharing(computeInsights({ history: [], dishes }));
    expect(text).toMatch(/Suggestion quality: not enough data yet/);
  });
});
