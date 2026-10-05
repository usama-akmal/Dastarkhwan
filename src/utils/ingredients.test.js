import { describe, it, expect } from 'vitest';
import { seedDishes } from '../data/seed.js';
import { todayKey } from './dates.js';
import {
  getDishIngredients,
  buildShoppingList,
  groupForIngredient,
  futureEntries,
  INGREDIENT_GROUPS,
} from './ingredients.js';

/**
 * The shopping list is derived, not curated, so these tests are what keep it honest.
 * The important one is coverage: if a dish yields nothing, the list silently omits
 * it and the household under-buys. That must fail loudly instead.
 */

const dishes = seedDishes.map((d, i) => ({ ...d, id: `seed:${i}` }));

describe('getDishIngredients', () => {
  it('yields at least one shopping item for every seeded dish', () => {
    const missing = seedDishes
      .filter((d) => getDishIngredients(d).length === 0)
      .map((d) => d.nameEn);
    expect(missing).toEqual([]);
  });

  it('always includes the dish protein for meat, fish and pulses', () => {
    for (const dish of seedDishes) {
      if (dish.proteinType === 'vegetables') continue;
      const ingredients = getDishIngredients(dish);
      const expected = { chicken: 'chicken', beef: 'beef', mutton: 'mutton', fish: 'fish', eggs: 'eggs' }[dish.proteinType];
      if (expected) expect(ingredients).toContain(expected);
    }
  });

  it('derives the obvious vegetable from the name', () => {
    const byName = (n) => getDishIngredients(seedDishes.find((d) => d.nameEn === n));
    expect(byName('Aloo Palak')).toEqual(expect.arrayContaining(['potatoes', 'spinach']));
    expect(byName('Bhindi Masala')).toContain('okra');
    expect(byName('Baingan Bharta')).toContain('aubergine');
    expect(byName('Shaljam')).toContain('turnip');
    expect(byName('Arvi')).toContain('taro');
  });

  it('pairs a biryani with rice and a daal with lentils', () => {
    const byName = (n) => getDishIngredients(seedDishes.find((d) => d.nameEn === n));
    expect(byName('Chicken Biryani')).toEqual(expect.arrayContaining(['chicken', 'rice']));
    expect(byName('Daal Makhani')).toEqual(expect.arrayContaining(['lentils']));
    expect(byName('Chana Daal')).toEqual(expect.arrayContaining(['chickpeas', 'lentils']));
  });

  it('uses the explicit override for names that imply nothing', () => {
    const siri = getDishIngredients(seedDishes.find((d) => d.nameEn === 'Siri Paye'));
    expect(siri).toEqual(expect.arrayContaining(['trotters', 'onions']));
  });

  it('never returns duplicates', () => {
    for (const dish of seedDishes) {
      const ingredients = getDishIngredients(dish);
      expect(new Set(ingredients).size).toBe(ingredients.length);
    }
  });

  it('omits things a Pakistani kitchen already has', () => {
    // Listing salt or a generic spice mix as something to buy is noise.
    const all = seedDishes.flatMap((d) => getDishIngredients(d));
    expect(all).not.toContain('salt');
    expect(all).not.toContain('spice mix');
  });

  it('returns an empty array rather than throwing for a missing dish', () => {
    expect(getDishIngredients(null)).toEqual([]);
    expect(getDishIngredients(undefined)).toEqual([]);
    expect(getDishIngredients({ nameEn: '' })).toEqual([]);
  });

  it('stays within a sane size per dish', () => {
    // A single dish needing more than a handful of purchases is a sign the lexicon
    // is over-matching rather than a sign of a rich recipe.
    for (const dish of seedDishes) {
      expect(getDishIngredients(dish).length).toBeLessThanOrEqual(6);
    }
  });
});

describe('groupForIngredient', () => {
  it('places known ingredients in a sensible aisle', () => {
    expect(groupForIngredient('chicken')).toBe('meat');
    expect(groupForIngredient('potatoes')).toBe('produce');
    expect(groupForIngredient('rice')).toBe('staples');
    expect(groupForIngredient('yoghurt')).toBe('dairy');
  });

  it('falls back to other rather than dropping an unknown item', () => {
    expect(groupForIngredient('something-exotic')).toBe('other');
  });

  it('covers every ingredient the lexicon can produce', () => {
    const produced = new Set(seedDishes.flatMap((d) => getDishIngredients(d)));
    const grouped = new Set(Object.values(INGREDIENT_GROUPS).flat());
    const ungrouped = [...produced].filter((i) => !grouped.has(i));
    // Ungrouped items land in `other`, which is acceptable, but this records the
    // count so drift is visible.
    expect(ungrouped.length).toBeLessThanOrEqual(5);
  });
});

describe('buildShoppingList', () => {
  it('merges the same ingredient across dishes and records why it is needed', () => {
    const entries = [{ dishId: 'seed:0' }, { dishId: 'seed:1' }];
    const list = buildShoppingList(dishes, entries);
    const chicken = list.find((i) => i.name === 'chicken');
    expect(chicken).toBeDefined();
    expect(chicken.sources.length).toBeGreaterThanOrEqual(1);
    // Every ingredient is traceable to at least one dish.
    for (const item of list) expect(item.sources.length).toBeGreaterThan(0);
  });

  it('lists each ingredient exactly once however many dishes need it', () => {
    const many = dishes.slice(0, 20).map((d) => ({ dishId: d.id }));
    const list = buildShoppingList(dishes, many);
    expect(new Set(list.map((i) => i.name)).size).toBe(list.length);
  });

  it('groups the output so it can be read aisle by aisle', () => {
    const list = buildShoppingList(dishes, dishes.map((d) => ({ dishId: d.id })));
    const order = Object.keys(INGREDIENT_GROUPS);
    const indices = list.map((i) => order.indexOf(i.group));
    // Non-decreasing group order.
    for (let i = 1; i < indices.length; i += 1) {
      expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
    }
  });

  it('ignores entries whose dish no longer exists', () => {
    const list = buildShoppingList(dishes, [{ dishId: 'deleted-dish' }, { dishId: 'seed:0' }]);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((i) => i.sources.length > 0)).toBe(true);
  });

  it('returns an empty list for an empty plan rather than throwing', () => {
    expect(buildShoppingList(dishes, [])).toEqual([]);
    expect(buildShoppingList([], [])).toEqual([]);
  });
});

describe('futureEntries', () => {
  it('keeps today and the next days, and drops the past', () => {
    const history = [
      { dishId: 'a', date: '2026-10-04' }, // yesterday
      { dishId: 'b', date: '2026-10-05' }, // today
      { dishId: 'c', date: '2026-10-08' }, // within the week
      { dishId: 'd', date: '2026-10-20' }, // too far out
    ];
    const result = futureEntries(history, { days: 7, todayKey: '2026-10-05' });
    expect(result.map((e) => e.dishId)).toEqual(['b', 'c']);
  });

  it('handles a window that crosses a month boundary', () => {
    const history = [
      { dishId: 'a', date: '2026-01-31' },
      { dishId: 'b', date: '2026-02-02' },
    ];
    const result = futureEntries(history, { days: 5, todayKey: '2026-01-30' });
    expect(result.map((e) => e.dishId)).toEqual(['a', 'b']);
  });

  it('defaults to today when no key is supplied rather than throwing', () => {
    // Regression: omitting todayKey produced `undefined.split` and broke the page.
    const today = todayKey();
    const result = futureEntries([{ dishId: 'a', date: today }], { days: 7 });
    expect(result.map((e) => e.dishId)).toEqual(['a']);
    expect(() => futureEntries([], {})).not.toThrow();
    expect(() => futureEntries([], undefined)).not.toThrow();
  });

  it('returns nothing when the window has no meals', () => {
    expect(futureEntries([{ dishId: 'a', date: '2020-01-01' }], { days: 7, todayKey: '2026-10-05' })).toEqual([]);
  });
});
