import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db.js';
import { generateSuggestion } from '../engine/suggestionEngine.js';

export function useSuggestion(mealType = 'dinner') {
  const [rejectedIds, setRejectedIds] = useState([]);

  const dishes = useLiveQuery(() => db.dishes.toArray());
  const familyMembers = useLiveQuery(() => db.familyMembers.toArray());
  const cookingHistory = useLiveQuery(() => db.cookingHistory.toArray());
  const dietaryRules = useLiveQuery(() => db.dietaryRules.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));

  // Check if we already have a meal logged for today for this mealType
  const loggedMealForToday = useMemo(() => {
    if (!cookingHistory || !dishes) return null;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const loggedEntry = cookingHistory.find(h => h.date === todayStr && h.mealType === mealType);
    
    if (loggedEntry) {
      const dish = dishes.find(d => d.id === loggedEntry.dishId);
      return dish || null;
    }
    return null;
  }, [cookingHistory, dishes, mealType]);

  const suggestionData = useMemo(() => {
    // If we already picked a meal for today, bypass the suggestion engine
    if (loggedMealForToday) {
      return { topSuggestion: loggedMealForToday, alternatives: [], isAlreadySelected: true };
    }

    if (!dishes || !familyMembers || !cookingHistory || !dietaryRules || !settings) {
      return { topSuggestion: null, alternatives: [], isAlreadySelected: false };
    }

    const availableDishes = dishes.filter(d => !rejectedIds.includes(d.id));

    try {
      const result = generateSuggestion(
        availableDishes,
        familyMembers,
        cookingHistory,
        dietaryRules,
        settings,
        mealType
      );
      return { ...result, isAlreadySelected: false };
    } catch (e) {
      console.error('Suggestion engine error:', e);
      return { topSuggestion: null, alternatives: [], isAlreadySelected: false };
    }
  }, [dishes, familyMembers, cookingHistory, dietaryRules, settings, mealType, rejectedIds, loggedMealForToday]);

  const loading = !dishes || !familyMembers || cookingHistory === undefined || dietaryRules === undefined;

  const refresh = useCallback(() => {
    setRejectedIds([]);
  }, []);

  const rejectSuggestion = useCallback(() => {
    if (suggestionData.topSuggestion && !suggestionData.isAlreadySelected) {
      setRejectedIds(prev => [...prev, suggestionData.topSuggestion.id]);
    }
  }, [suggestionData]);

  const acceptSuggestion = useCallback(async (dishId) => {
    // Don't log again if we already have one
    if (suggestionData.isAlreadySelected) return;

    const targetDishId = dishId || suggestionData.topSuggestion?.id;
    if (!targetDishId) return;
    
    const dish = dishes?.find(d => d.id === targetDishId);
    if (dish) {
      const today = new Date().toISOString().split('T')[0];
      await db.cookingHistory.add({
        dishId: dish.id,
        date: today,
        mealType: mealType,
      });
      setRejectedIds([]);
    }
  }, [dishes, mealType, suggestionData]);

  const cancelPlannedMeal = useCallback(async () => {
    if (loggedMealForToday && cookingHistory) {
      const todayStr = new Date().toISOString().split('T')[0];
      const loggedEntry = cookingHistory.find(h => h.date === todayStr && h.mealType === mealType);
      if (loggedEntry) {
        await db.cookingHistory.delete(loggedEntry.id);
        setRejectedIds([]);
      }
    }
  }, [loggedMealForToday, cookingHistory, mealType]);

  return {
    suggestion: suggestionData.topSuggestion,
    alternatives: suggestionData.alternatives,
    isAlreadySelected: suggestionData.isAlreadySelected,
    loading,
    refresh,
    acceptSuggestion,
    rejectSuggestion,
    cancelPlannedMeal
  };
}
