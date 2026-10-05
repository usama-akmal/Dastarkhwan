import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
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
  recordUsageEvent,
  getUsageEvents,
  USAGE_EVENT,
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

  it('carries usage insights, so measurement survives a device change', async () => {
    // There is no telemetry in this app; the backup is the only place a household's
    // usage picture can travel, and it stays the user's own data.
    await populate();
    const payload = await exportAllData(db);
    expect(payload.insights).toBeDefined();
    expect(payload.insights.totalMeals).toBe(1);
    expect(payload.insights.daysWithMeals).toBe(1);
    expect(payload.insights.familyMembers).toBe(1);
    expect(payload.insights.customDishes).toBe(1);
    expect(Number.isNaN(payload.insights.mealsPerWeek)).toBe(false);
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


describe('usage events (the acceptance-rate signal)', () => {
  it('records an event with a timestamp', async () => {
    await recordUsageEvent({ type: USAGE_EVENT.SUGGESTED, date: '2026-10-05', dishId: 'seed:x', mealType: 'dinner' }, db);
    const events = await getUsageEvents(db);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('suggested');
    expect(events[0].dishId).toBe('seed:x');
    expect(typeof events[0].at).toBe('string');
  });

  it('records the same suggestion only once per day, however many times the page loads', async () => {
    // The suggested event fires on mount, so this must be idempotent or the
    // "suggestions shown" count would grow with every reload.
    const event = { type: USAGE_EVENT.SUGGESTED, date: '2026-10-05', dishId: 'seed:x', mealType: 'dinner' };
    await recordUsageEvent(event, db);
    await recordUsageEvent(event, db);
    await recordUsageEvent(event, db);
    expect(await getUsageEvents(db)).toHaveLength(1);

    // A different meal slot, or a different day, is a genuinely new suggestion.
    await recordUsageEvent({ ...event, mealType: 'lunch' }, db);
    await recordUsageEvent({ ...event, date: '2026-10-06' }, db);
    expect(await getUsageEvents(db)).toHaveLength(3);
  });

  it('does not de-duplicate outcome events, which are discrete actions', async () => {
    const base = { type: USAGE_EVENT.REJECTED, date: '2026-10-05', dishId: 'seed:x', mealType: 'dinner' };
    await recordUsageEvent(base, db);
    await recordUsageEvent(base, db);
    expect(await getUsageEvents(db)).toHaveLength(2);
  });

  it('ignores a malformed event rather than storing a useless row', async () => {
    expect(await recordUsageEvent({}, db)).toBeNull();
    expect(await recordUsageEvent(null, db)).toBeNull();
    expect(await getUsageEvents(db)).toHaveLength(0);
  });

  it('survives a backup round trip, so measurement is not lost on a device change', async () => {
    await recordUsageEvent({ type: USAGE_EVENT.SUGGESTED, date: '2026-10-05', dishId: 'seed:x', mealType: 'dinner' }, db);
    await recordUsageEvent({ type: USAGE_EVENT.ACCEPTED, date: '2026-10-05', dishId: 'seed:x', mealType: 'dinner' }, db);

    const payload = JSON.parse(JSON.stringify(await exportAllData(db)));
    expect(payload.data.usageEvents).toHaveLength(2);
    expect(payload.counts.usageEvents).toBe(2);
    // The computed rate travels too.
    expect(payload.insights.suggestionsShown).toBe(1);
    expect(payload.insights.topPickRate).toBe(1);

    // Wipe, then restore.
    await Promise.all([
      db.dishes.clear(), db.familyMembers.clear(), db.cookingHistory.clear(),
      db.dietaryRules.clear(), db.settings.clear(), db.usageEvents.clear(),
    ]);
    expect(await getUsageEvents(db)).toHaveLength(0);

    await importAllData(payload, db);

    const restored = await getUsageEvents(db);
    expect(restored).toHaveLength(2);
    expect(restored.map((e) => e.type).sort()).toEqual(['accepted', 'suggested']);
  });

  it('restores when a backup carries no usage events at all (older file)', async () => {
    // Backups made before this feature have no usageEvents key; restoring must not throw.
    const legacy = {
      format: 'dastarkhwan-backup',
      version: 1,
      data: {
        dishes: [{ id: 'seed:x', nameEn: 'X', isCustom: false }],
        familyMembers: [{ id: 1, name: 'A', role: 'mother', preferences: {} }],
        cookingHistory: [],
        dietaryRules: [],
        settings: [{ ...DEFAULT_SETTINGS }],
      },
    };
    await expect(importAllData(legacy, db)).resolves.toBeDefined();
    expect(await getUsageEvents(db)).toHaveLength(0);
  });
});


describe('migration from an older install', () => {
  it('adds the usage-events table to a v2 database without losing data', async () => {
    // Simulate a real upgrade: build a database at the previous version, put data in
    // it, close it, then open it with the current schema. This is the path every
    // existing user takes and it must not throw or drop anything.
    const name = `dastarkhwan-migration-${Date.now()}`;

    const old = new Dexie(name);
    old.version(1).stores({
      dishes: '++id, nameEn, proteinType, dishType, cuisineType, isCustom',
      familyMembers: '++id, name, role',
      cookingHistory: '++id, date, mealType, dishId',
      dietaryRules: '++id, ruleType, category, value, isActive',
      settings: 'id',
    });
    old.version(2).stores({
      dishes: 'id, nameEn, proteinType, dishType, cuisineType, isCustom',
      familyMembers: '++id, name, role',
      cookingHistory: '++id, date, mealType, dishId',
      dietaryRules: '++id, ruleType, category, value, isActive',
      settings: 'id',
    });
    await old.open();
    await old.dishes.add({ id: 'seed:existing', nameEn: 'Existing dish', isCustom: false });
    await old.familyMembers.add({ name: 'Ammi', role: 'mother', preferences: { 'seed:existing': 'loves' } });
    await old.cookingHistory.add({ dishId: 'seed:existing', date: '2026-10-01', mealType: 'dinner' });
    old.close();

    // Now open the same stored database with the current schema (v3).
    const upgraded = createDatabase(name);
    await upgraded.open();

    expect(await upgraded.dishes.count()).toBe(1);
    expect(await upgraded.cookingHistory.count()).toBe(1);
    const member = await upgraded.familyMembers.get(1);
    expect(member.preferences['seed:existing']).toBe('loves');

    // The new table exists and is usable.
    await recordUsageEvent({ type: USAGE_EVENT.SUGGESTED, date: '2026-10-05', dishId: 'seed:existing', mealType: 'dinner' }, upgraded);
    expect(await getUsageEvents(upgraded)).toHaveLength(1);

    await upgraded.delete();
  });
});


describe('concurrent suggestion logging', () => {
  // React double-invokes mount effects, so the same suggestion can be recorded twice
  // before either insert lands. A check-then-insert is racy; these pin the fix.
  it('writes one row when the same suggestion is recorded twice without awaiting', async () => {
    const event = { type: USAGE_EVENT.SUGGESTED, date: '2026-10-05', dishId: 'seed:race', mealType: 'lunch' };
    await Promise.all([recordUsageEvent(event, db), recordUsageEvent(event, db)]);
    expect(await getUsageEvents(db)).toHaveLength(1);
  });

  it('writes one row when three fire concurrently', async () => {
    const event = { type: USAGE_EVENT.SUGGESTED, date: '2026-10-05', dishId: 'seed:race3', mealType: 'dinner' };
    await Promise.all([
      recordUsageEvent(event, db),
      recordUsageEvent(event, db),
      recordUsageEvent(event, db),
    ]);
    expect(await getUsageEvents(db)).toHaveLength(1);
  });

  it('still allows a different dish or slot through concurrently', async () => {
    const base = { type: USAGE_EVENT.SUGGESTED, date: '2026-10-05', mealType: 'lunch' };
    await Promise.all([
      recordUsageEvent({ ...base, dishId: 'seed:a' }, db),
      recordUsageEvent({ ...base, dishId: 'seed:b' }, db),
      recordUsageEvent({ ...base, mealType: 'dinner', dishId: 'seed:a' }, db),
    ]);
    expect(await getUsageEvents(db)).toHaveLength(3);
  });
});
