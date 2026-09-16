import Dexie from 'dexie';
import { seedDishes } from './seed.js';

export const db = new Dexie('dastarkhwan');

db.version(1).stores({
  dishes: '++id, nameEn, proteinType, dishType, cuisineType, isCustom',
  familyMembers: '++id, name, role',
  cookingHistory: '++id, date, mealType, dishId',
  dietaryRules: '++id, ruleType, category, value, isActive',
  settings: 'id'
});

export const initializeDatabase = async () => {
  const dishesCount = await db.dishes.count();
  if (dishesCount === 0 && seedDishes && seedDishes.length > 0) {
    await db.dishes.bulkAdd(seedDishes);
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      id: 1,
      cooldowns: {
        sameDish: 7,
        sameProtein: 3,
        sameDishType: 2
      },
      mealsPerDay: 2,
      onboardingComplete: false,
      familyName: ''
    });
  }
};

export const forceReseedDatabase = async () => {
  if (seedDishes && seedDishes.length > 0) {
    await db.dishes.clear();
    await db.dishes.bulkAdd(seedDishes);
  }
};

// Dishes
export const getDishById = (id) => db.dishes.get(id);
export const getAllDishes = () => db.dishes.toArray();
export const addDish = (dish) => db.dishes.add({ ...dish, isCustom: true });
export const updateDish = (id, changes) => db.dishes.update(id, changes);
export const deleteDish = async (id) => {
  const dish = await getDishById(id);
  if (dish && dish.isCustom) {
    return db.dishes.delete(id);
  }
  throw new Error('Cannot delete non-custom dishes');
};

// Family Members
export const getFamilyMembers = () => db.familyMembers.toArray();
export const addFamilyMember = (member) => db.familyMembers.add(member);
export const updateFamilyMember = (id, changes) => db.familyMembers.update(id, changes);
export const deleteFamilyMember = (id) => db.familyMembers.delete(id);

// Cooking History
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
export const deleteCookingHistoryEntry = (id) => db.cookingHistory.delete(id);

// Dietary Rules
export const getDietaryRules = () => db.dietaryRules.where('isActive').equals(1).toArray();
export const addDietaryRule = (rule) => db.dietaryRules.add(rule);
export const updateDietaryRule = (id, changes) => db.dietaryRules.update(id, changes);
export const deleteDietaryRule = (id) => db.dietaryRules.delete(id);

// Settings
export const getSettings = () => db.settings.get(1);
export const updateSettings = (changes) => db.settings.update(1, changes);
