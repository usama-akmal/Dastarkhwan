import { useLiveQuery } from 'dexie-react-hooks';
import { db, addDish, updateDish, deleteDish, addFamilyMember, updateFamilyMember, deleteFamilyMember, addCookingHistoryEntry, deleteCookingHistoryEntry, addDietaryRule, updateDietaryRule, deleteDietaryRule, updateSettings } from '../data/db';

export const useDishes = () => {
  const dishes = useLiveQuery(() => db.dishes.toArray());
  const loading = dishes === undefined;

  return {
    dishes: dishes || [],
    loading,
    addDish,
    updateDish,
    deleteDish,
    refreshDishes: () => {} // useLiveQuery handles refresh automatically
  };
};

export const useFamilyMembers = () => {
  const members = useLiveQuery(() => db.familyMembers.toArray());
  const loading = members === undefined;

  return {
    members: members || [],
    loading,
    addMember: addFamilyMember,
    updateMember: updateFamilyMember,
    deleteMember: deleteFamilyMember,
    refreshMembers: () => {}
  };
};

export const useCookingHistory = (startDate, endDate) => {
  const history = useLiveQuery(() => {
    if (startDate && endDate) {
      return db.cookingHistory
        .where('date')
        .between(startDate, endDate, true, true)
        .toArray();
    }
    return db.cookingHistory.toArray();
  }, [startDate, endDate]);

  const loading = history === undefined;

  return {
    history: history || [],
    loading,
    addEntry: addCookingHistoryEntry,
    deleteEntry: deleteCookingHistoryEntry,
    refreshHistory: () => {}
  };
};

export const useDietaryRules = () => {
  const rules = useLiveQuery(() => db.dietaryRules.toArray());
  const loading = rules === undefined;

  return {
    rules: rules || [],
    loading,
    addRule: addDietaryRule,
    updateRule: updateDietaryRule,
    deleteRule: deleteDietaryRule,
    refreshRules: () => {}
  };
};

export const useSettings = () => {
  const settings = useLiveQuery(() => db.settings.get(1));
  const loading = settings === undefined;

  return {
    settings: settings || null,
    loading,
    updateSettings,
    refreshSettings: () => {}
  };
};
