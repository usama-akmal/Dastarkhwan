import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  addDish,
  updateDish,
  deleteDish,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  setMemberPreference,
  addCookingHistoryEntry,
  updateCookingHistoryEntry,
  deleteCookingHistoryEntry,
  addDietaryRule,
  updateDietaryRule,
  deleteDietaryRule,
  updateSettings,
  getUsageEvents,
} from '../data/db';

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
    // NOTE: this key is `members`. It was previously destructured as `familyMembers`
    // in the onboarding steps, which silently yielded `[]` and made the whole wizard
    // a no-op. `familyMembers` is provided as an alias so neither spelling can
    // silently break the flow again.
    members: members || [],
    familyMembers: members || [],
    loading,
    addMember: addFamilyMember,
    updateMember: updateFamilyMember,
    deleteMember: deleteFamilyMember,
    setPreference: setMemberPreference,
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
    updateEntry: updateCookingHistoryEntry,
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

export const useUsageEvents = () => {
  const events = useLiveQuery(() => getUsageEvents());
  const loading = events === undefined;

  return {
    events: events || [],
    loading,
  };
};
