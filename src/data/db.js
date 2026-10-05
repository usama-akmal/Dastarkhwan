/**
 * Database layer.
 *
 * Two things worth knowing before editing this file.
 *
 * **Seed identity.** Seed dishes used to be inserted without primary keys, so every
 * re-seed produced *new* auto-increment ids. Since `cookingHistory.dishId` and
 * `familyMembers[].preferences[<id>]` reference those ids, re-seeding silently
 * orphaned all history and all learned preferences. Seed dishes now carry a stable
 * string id derived from their name (`seed:chicken-biryani`), so ids survive re-seeding.
 *
 * **One copy of the data.** There is no server. `exportAllData` / `importAllData`
 * are the only defence against a cleared browser, an evicted origin, or a new phone.
 */

import Dexie from 'dexie';
import { seedDishes } from './seed.js';
import { normalizePreferences, normalizeRule, canonicalPreference } from '../utils/preferences.js';
import { computeInsights } from '../utils/insights.js';

export const db = new Dexie('dastarkhwan');

/**
 * Declare the schema on a Dexie instance.
 *
 * Factored out of the module singleton so tests can build an isolated database
 * (and so the migration path below is exercised identically in both).
 */
export function applySchema(instance) {
  instance.version(1).stores({
    dishes: '++id, nameEn, proteinType, dishType, cuisineType, isCustom',
    familyMembers: '++id, name, role',
    cookingHistory: '++id, date, mealType, dishId',
    dietaryRules: '++id, ruleType, category, value, isActive',
    settings: 'id',
  });

  // v2: dish ids become stable strings (see `seedDishId`) instead of auto-increment
  // integers, and legacy preference/rule spellings are normalised in place.
  instance.version(2).stores({
    dishes: 'id, nameEn, proteinType, dishType, cuisineType, isCustom',
    familyMembers: '++id, name, role',
    cookingHistory: '++id, date, mealType, dishId',
    dietaryRules: '++id, ruleType, category, value, isActive',
    settings: 'id',
  }).upgrade(async (tx) => {
    await tx.table('familyMembers').toCollection().modify((member) => {
      const { preferences, changed } = normalizePreferences(member.preferences);
      if (changed) member.preferences = preferences;
    });
    await tx.table('dietaryRules').toCollection().modify((rule) => {
      const normalized = normalizeRule(rule);
      if (normalized?.changed) Object.assign(rule, normalized.rule);
    });
  });

  return instance;
}

applySchema(db);

/** Build an isolated database under a unique name — used by the test suite. */
export function createDatabase(name) {
  return applySchema(new Dexie(name));
}

export const DEFAULT_SETTINGS = {
  id: 1,
  cooldowns: { sameDish: 7, sameProtein: 3, sameDishType: 2 },
  mealsPerDay: 2,
  onboardingComplete: false,
  familyName: '',
};

/** Stable id for a built-in dish, so re-seeding never renumbers history references. */
export function seedDishId(dish) {
  const slug = String(dish.nameEn || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `seed:${slug}`;
}

/** Seed dishes with their stable ids attached, ready to insert. */
export function getSeedDishes() {
  return (seedDishes || []).map((dish) => ({
    ...dish,
    id: seedDishId(dish),
    isCustom: false,
  }));
}

export const initializeDatabase = async (instance = db) => {
  const dishesCount = await instance.dishes.count();
  if (dishesCount === 0) {
    const seeds = getSeedDishes();
    if (seeds.length > 0) await instance.dishes.bulkPut(seeds);
  }

  const settingsCount = await instance.settings.count();
  if (settingsCount === 0) {
    await instance.settings.add({ ...DEFAULT_SETTINGS });
  }
};

/** Re-apply the built-in dishes without touching anything the user created. */
export const restoreDefaultDishes = async (instance = db) => {
  const seeds = getSeedDishes();
  if (seeds.length === 0) return 0;
  // bulkPut on stable ids: refreshes built-ins in place and leaves custom dishes,
  // history rows and preferences pointing at ids that still exist.
  await instance.dishes.bulkPut(seeds);
  return seeds.length;
};

/**
 * @deprecated Kept for compatibility. The old implementation called
 * `db.dishes.clear()`, which deleted the user's own recipes despite the UI
 * promising the opposite, and renumbered every seed id. Use `restoreDefaultDishes`.
 */
export const forceReseedDatabase = restoreDefaultDishes;

// ---------------------------------------------------------------- Dishes
export const getDishById = (id, instance = db) => instance.dishes.get(id);
export const getAllDishes = (instance = db) => instance.dishes.toArray();

/**
 * Stable id for a user-created dish.
 *
 * `dishes` uses an inline primary key (`id`), so an object added without one throws
 * `DataError`. Custom dishes therefore get a generated, collision-resistant id here
 * rather than relying on the store's key generator.
 */
export function customDishId(dish, suffix = Date.now().toString(36)) {
  const slug = String(dish?.nameEn || 'dish')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dish';
  return `custom:${slug}-${suffix}`;
}

export const addDish = (dish, instance = db) => instance.dishes.add({
  ...dish,
  id: dish.id ?? customDishId(dish),
  isCustom: true,
});

export const updateDish = (id, changes, instance = db) => {
  const { id: _ignored, ...rest } = changes || {};
  void _ignored;
  return instance.dishes.update(id, rest);
};

/**
 * Delete a custom dish and everything that references it, so history and
 * preferences cannot point at a row that no longer exists.
 */
export const deleteDish = async (id, instance = db) => {
  const dish = await getDishById(id, instance);
  if (!dish) return;
  if (!dish.isCustom) throw new Error('Cannot delete built-in dishes');

  await instance.transaction(
    'rw',
    instance.dishes,
    instance.cookingHistory,
    instance.familyMembers,
    async () => {
      await instance.cookingHistory.where('dishId').equals(id).delete();
      await instance.familyMembers.toCollection().modify((member) => {
        if (member.preferences && Object.prototype.hasOwnProperty.call(member.preferences, id)) {
          delete member.preferences[id];
        }
      });
      await instance.dishes.delete(id);
    },
  );
};

// ------------------------------------------------------- Family members
export const getFamilyMembers = (instance = db) => instance.familyMembers.toArray();
export const addFamilyMember = (member, instance = db) => instance.familyMembers.add(member);
export const updateFamilyMember = (id, changes, instance = db) => instance.familyMembers.update(id, changes);
export const deleteFamilyMember = (id, instance = db) => instance.familyMembers.delete(id);

/** Merge one dish preference into a member, normalising and dropping empty values. */
export const setMemberPreference = async (memberId, dishId, value, instance = db) => {
  const member = await instance.familyMembers.get(memberId);
  if (!member) return;
  const { preferences } = normalizePreferences(member.preferences);
  // Normalise the *incoming* value too, so a legacy spelling written by an older
  // client cannot be persisted by a newer one.
  const canonical = value === null || value === undefined ? null : canonicalPreference(value);
  if (canonical === null) {
    delete preferences[dishId];
  } else {
    preferences[dishId] = canonical;
  }
  await instance.familyMembers.update(memberId, { preferences });
};

// ------------------------------------------------------ Cooking history
export const getCookingHistory = (startDate, endDate) => {
  if (startDate && endDate) {
    return db.cookingHistory
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }
  return db.cookingHistory.toArray();
};
export const addCookingHistoryEntry = (entry) => db.cookingHistory.add(entry);
export const updateCookingHistoryEntry = (id, changes) => db.cookingHistory.update(id, changes);
export const deleteCookingHistoryEntry = (id) => db.cookingHistory.delete(id);

// -------------------------------------------------------- Dietary rules
export const getDietaryRules = () =>
  // `isActive` is stored as a boolean; the shipped `.equals(1)` could never match
  // (IndexedDB keys are typed) and had no callers.
  db.dietaryRules.where('isActive').equals(true).toArray();

export const getAllDietaryRules = () => db.dietaryRules.toArray();

export const addDietaryRule = async (rule) => {
  const normalized = normalizeRule(rule);
  if (!normalized) throw new Error('Cannot add an empty dietary rule');
  return db.dietaryRules.add(normalized.rule);
};

export const updateDietaryRule = async (id, changes) => {
  const existing = await db.dietaryRules.get(id);
  const normalized = normalizeRule({ ...existing, ...changes });
  return db.dietaryRules.update(id, normalized.rule);
};

export const deleteDietaryRule = (id) => db.dietaryRules.delete(id);

// ------------------------------------------------------------- Settings
export const getSettings = () => db.settings.get(1);
export const updateSettings = (changes) => {
  const { id, ...rest } = changes || {};
  void id;
  return db.settings.update(1, rest);
};

// ---------------------------------------------------- Backup & restore
const BACKUP_FORMAT = 'dastarkhwan-backup';
const BACKUP_VERSION = 2;

/** A JSON-serialisable snapshot of everything the user owns. */
export async function exportAllData(instance = db) {
  const [dishes, familyMembers, cookingHistory, dietaryRules, settings] = await Promise.all([
    instance.dishes.toArray(),
    instance.familyMembers.toArray(),
    instance.cookingHistory.toArray(),
    instance.dietaryRules.toArray(),
    instance.settings.toArray(),
  ]);

  // Usage insights travel with the backup. They are derived from the data above,
  // but including them means a restored device (or a support conversation) has the
  // same picture without recomputing, and it keeps the measurement the user's own.
  const insights = computeInsights({
    history: cookingHistory,
    dishes,
    familyMembers,
    settings: settings[0] || null,
  });

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      dishes: dishes.length,
      customDishes: dishes.filter((d) => d.isCustom).length,
      familyMembers: familyMembers.length,
      cookingHistory: cookingHistory.length,
      dietaryRules: dietaryRules.length,
    },
    insights,
    data: { dishes, familyMembers, cookingHistory, dietaryRules, settings },
  };
}

/** Validate a parsed backup before writing anything. Throws on anything unusable. */
export function validateBackup(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('That file is not a Dastarkhwan backup.');
  }
  if (payload.format !== BACKUP_FORMAT) {
    throw new Error('Unrecognised backup format.');
  }
  if (typeof payload.version !== 'number' || payload.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app.');
  }
  const data = payload.data;
  if (!data || !Array.isArray(data.dishes) || !Array.isArray(data.familyMembers)) {
    throw new Error('This backup is missing its dish or family data.');
  }
  return {
    dishes: data.dishes,
    familyMembers: data.familyMembers,
    cookingHistory: Array.isArray(data.cookingHistory) ? data.cookingHistory : [],
    dietaryRules: Array.isArray(data.dietaryRules) ? data.dietaryRules : [],
    settings: Array.isArray(data.settings) ? data.settings : [],
  };
}

/**
 * Replace everything with the contents of a backup.
 * Destructive by design — the caller must confirm first.
 */
export async function importAllData(payload, instance = db) {
  const data = validateBackup(payload);

  const familyMembers = data.familyMembers.map((member) => {
    const { preferences } = normalizePreferences(member.preferences);
    return { ...member, preferences };
  });
  const dietaryRules = data.dietaryRules
    .map((rule) => normalizeRule(rule)?.rule)
    .filter(Boolean);

  await instance.transaction(
    'rw',
    instance.dishes,
    instance.familyMembers,
    instance.cookingHistory,
    instance.dietaryRules,
    instance.settings,
    async () => {
      await Promise.all([
        instance.dishes.clear(),
        instance.familyMembers.clear(),
        instance.cookingHistory.clear(),
        instance.dietaryRules.clear(),
        instance.settings.clear(),
      ]);
      // bulkPut, not bulkAdd: primary keys are part of the backup and every reference
      // (dishId, preferences keys) depends on them surviving the round trip.
      await instance.dishes.bulkPut(data.dishes);
      await instance.familyMembers.bulkPut(familyMembers);
      if (data.cookingHistory.length) await instance.cookingHistory.bulkPut(data.cookingHistory);
      if (dietaryRules.length) await instance.dietaryRules.bulkPut(dietaryRules);
      if (data.settings.length) await instance.settings.bulkPut(data.settings);
    },
  );

  return {
    dishes: data.dishes.length,
    familyMembers: familyMembers.length,
    cookingHistory: data.cookingHistory.length,
    dietaryRules: dietaryRules.length,
  };
}

/** Request durable storage so the browser is less likely to evict this origin. */
export async function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
  try {
    const already = await navigator.storage.persisted?.();
    if (already) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
