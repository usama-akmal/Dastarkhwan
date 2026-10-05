import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createDatabase,
  initializeDatabase,
  restoreDefaultDishes,
  seedDishId,
  exportAllData,
  importAllData,
  validateBackup,
  deleteDish,
  addDish,
  setMemberPreference,
  DEFAULT_SETTINGS,
} from './db.js';
import { seedDishes } from './seed.js';
import { PREF } from '../utils/preferences.js';

/**
 * Integration tests against a real (fake) IndexedDB, because the defects this
 * suite guards against were all about persistence: seed identity, re-seed data
 * loss, backup round-trips, and reference cleanup on delete.
 */

let db;
let counter = 0;

beforeEach(async () => {
  // Unique name per test: Dexie keeps module-level state per database name.
  counter += 1;
  db = createDatabase(`dastarkhwan-test-${counter}`);
  await initializeDatabase(db);
});

afterEach(async () => {
  await db.delete();
});

const firstSeedId = seedDishId(seedDishes[0]);

describe('initializeDatabase', () => {
  it('seeds all built-in dishes with stable string ids', async () => {
    const dishes = await db.dishes.toArray();
    expect(dishes).toHaveLength(seedDishes.length);
    expect(dishes.every((d) => typeof d.id === 'string' && d.id.startsWith('seed:'))).toBe(true);
  });

  it('seeds default settings when none exist', async () => {
    const settings = await db.settings.get(1);
    expect(settings).toMatchObject({ mealsPerDay: 2, onboardingComplete: false });
    expect(settings.cooldowns).toEqual(DEFAULT_SETTINGS.cooldowns);
  });

  it('is idempotent — running twice does not duplicate dishes', async () => {
    await initializeDatabase(db);
    expect(await db.dishes.count()).toBe(seedDishes.length);
  });

  it('produces the same id for the same dish name (stable across re-seeds)', () => {
    expect(seedDishId({ nameEn: 'Chicken Biryani' })).toBe('seed:chicken-biryani');
    expect(seedDishId({ nameEn: 'Chicken   Biryani!' })).toBe('seed:chicken-biryani');
  });
});

describe('restoreDefaultDishes (F3.2 — used to clear() every dish and renumber ids)', () => {
  it('keeps the user\'s custom recipes', async () => {
    const customId = await addDish({ nameEn: 'Ammi ki Biryani', proteinType: 'chicken', dishType: 'rice', dietaryTags: [] }, db);

    await restoreDefaultDishes(db);

    const custom = await db.dishes.get(customId);
    expect(custom).toBeDefined();
    expect(custom.nameEn).toBe('Ammi ki Biryani');
  });

  it('does not renumber seed dishes, so history references survive', async () => {
    await db.cookingHistory.add({ dishId: firstSeedId, date: '2026-10-05', mealType: 'dinner' });

    await restoreDefaultDishes(db);

    const history = await db.cookingHistory.toArray();
    const dish = await db.dishes.get(history[0].dishId);
    expect(dish).toBeDefined();
    expect(dish.nameEn).toBe(seedDishes[0].nameEn);
  });

  it('preserves preferences keyed by seed dish id', async () => {
    await db.familyMembers.add({ id: 1, name: 'Ali', role: 'husband', preferences: { [firstSeedId]: PREF.LOVES } });

    await restoreDefaultDishes(db);

    const member = await db.familyMembers.get(1);
    expect(member.preferences[firstSeedId]).toBe(PREF.LOVES);
  });

  it('refreshes built-in dish content in place', async () => {
    await db.dishes.update(firstSeedId, { nameEn: 'Tampered' });
    await restoreDefaultDishes(db);
    const dish = await db.dishes.get(firstSeedId);
    expect(dish.nameEn).toBe(seedDishes[0].nameEn);
  });
});

describe('preference writes', () => {
  it('normalises legacy spellings on write', async () => {
    await db.familyMembers.add({ id: 1, name: 'Ali', role: 'husband', preferences: {} });
    await setMemberPreference(1, 'seed:x', 'wont_eat', db);
    const member = await db.familyMembers.get(1);
    expect(member.preferences['seed:x']).toBe(PREF.WONT_TOUCH);
  });

  it('removes the key when the value is cleared, so "no opinion" is stored as absence', async () => {
    await db.familyMembers.add({ id: 1, name: 'Ali', role: 'husband', preferences: { 'seed:x': PREF.LOVES } });
    await setMemberPreference(1, 'seed:x', null, db);
    const member = await db.familyMembers.get(1);
    expect(member.preferences).not.toHaveProperty('seed:x');
  });
});

describe('deleteDish (F2.6 — used to orphan history and preferences)', () => {
  it('refuses to delete a built-in dish', async () => {
    await expect(deleteDish(firstSeedId, db)).rejects.toThrow(/built-in/i);
  });

  it('deletes a custom dish together with its history and preferences', async () => {
    const customId = await addDish({ nameEn: 'Custom', proteinType: 'chicken', dishType: 'curry', dietaryTags: [] }, db);
    await db.familyMembers.add({ id: 1, name: 'Ali', role: 'husband', preferences: { [customId]: PREF.LOVES, [firstSeedId]: PREF.EATS } });
    await db.cookingHistory.add({ dishId: customId, date: '2026-10-05', mealType: 'dinner' });

    await deleteDish(customId, db);

    expect(await db.dishes.get(customId)).toBeUndefined();
    expect(await db.cookingHistory.count()).toBe(0);
    const member = await db.familyMembers.get(1);
    expect(member.preferences).not.toHaveProperty(String(customId));
    // Unrelated preferences must survive.
    expect(member.preferences[firstSeedId]).toBe(PREF.EATS);
  });
});

describe('backup round trip (F3.1 — there was no export/import at all)', () => {
  const populate = async () => {
    await addDish({ nameEn: 'Custom Dish', proteinType: 'beef', dishType: 'curry', dietaryTags: ['spicy'] }, db);
    await db.familyMembers.add({ name: 'Ayesha', role: 'wife', preferences: { [firstSeedId]: PREF.WONT_TOUCH } });
    await db.cookingHistory.add({ dishId: firstSeedId, date: '2026-10-01', mealType: 'dinner' });
    await db.dietaryRules.add({ ruleType: 'max_per_week', category: 'proteinType', value: 'beef', limit: 2, isActive: true });
    await db.settings.update(1, { familyName: 'Khan', onboardingComplete: true });
  };

  it('captures counts and is JSON-serialisable', async () => {
    await populate();
    const payload = await exportAllData(db);
    expect(payload.format).toBe('dastarkhwan-backup');
    expect(payload.counts.customDishes).toBe(1);
    expect(payload.counts.familyMembers).toBe(1);
    expect(payload.counts.cookingHistory).toBe(1);
    expect(() => JSON.parse(JSON.stringify(payload))).not.toThrow();
  });

  it('restores an identical dataset, ids included', async () => {
    await populate();
    const payload = JSON.parse(JSON.stringify(await exportAllData(db)));
    const before = {
      dishes: await db.dishes.toArray(),
      members: await db.familyMembers.toArray(),
      history: await db.cookingHistory.toArray(),
    };

    // Wipe everything, as if the browser had been cleared.
    await Promise.all([
      db.dishes.clear(), db.familyMembers.clear(),
      db.cookingHistory.clear(), db.dietaryRules.clear(), db.settings.clear(),
    ]);
    expect(await db.dishes.count()).toBe(0);

    await importAllData(payload, db);

    expect(await db.dishes.toArray()).toEqual(before.dishes);
    expect(await db.familyMembers.toArray()).toEqual(before.members);
    expect(await db.cookingHistory.toArray()).toEqual(before.history);
    expect((await db.settings.get(1)).familyName).toBe('Khan');
  });

  it('keeps history pointing at a dish that exists after restore', async () => {
    await populate();
    const payload = JSON.parse(JSON.stringify(await exportAllData(db)));
    await Promise.all([db.dishes.clear(), db.familyMembers.clear(), db.cookingHistory.clear(), db.dietaryRules.clear(), db.settings.clear()]);

    await importAllData(payload, db);

    const history = await db.cookingHistory.toArray();
    const dish = await db.dishes.get(history[0].dishId);
    expect(dish).toBeDefined();
  });

  it('normalises legacy values found inside an old backup', async () => {
    const legacyPayload = {
      format: 'dastarkhwan-backup',
      version: 1,
      data: {
        dishes: [{ id: 'seed:x', nameEn: 'X', isCustom: false }],
        familyMembers: [{ id: 1, name: 'Ali', role: 'husband', preferences: { 'seed:x': 'wont_eat' } }],
        cookingHistory: [],
        dietaryRules: [{ id: 1, type: 'max_per_week', category: 'proteinType', value: 'beef', limit: 2 }],
        settings: [{ ...DEFAULT_SETTINGS }],
      },
    };

    await importAllData(legacyPayload, db);

    const member = await db.familyMembers.get(1);
    expect(member.preferences['seed:x']).toBe(PREF.WONT_TOUCH);
    const rule = await db.dietaryRules.get(1);
    expect(rule.ruleType).toBe('max_per_week');
    expect(rule.isActive).toBe(true);
  });
});

describe('validateBackup', () => {
  it('rejects a file that is not a backup', () => {
    expect(() => validateBackup(null)).toThrow(/not a Dastarkhwan backup/i);
    expect(() => validateBackup({ format: 'something-else' })).toThrow(/Unrecognised/i);
  });

  it('rejects a backup from a newer app version', () => {
    expect(() => validateBackup({ format: 'dastarkhwan-backup', version: 99, data: { dishes: [], familyMembers: [] } }))
      .toThrow(/newer version/i);
  });

  it('rejects a backup missing its core collections', () => {
    expect(() => validateBackup({ format: 'dastarkhwan-backup', version: 2, data: { dishes: [] } }))
      .toThrow(/missing/i);
  });

  it('accepts a valid backup and defaults optional collections', () => {
    const result = validateBackup({ format: 'dastarkhwan-backup', version: 2, data: { dishes: [], familyMembers: [] } });
    expect(result.cookingHistory).toEqual([]);
    expect(result.dietaryRules).toEqual([]);
  });
});
