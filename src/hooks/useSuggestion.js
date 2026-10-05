import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db.js';
import { generateSuggestion } from '../engine/suggestionEngine.js';
import { todayKey } from '../utils/dates.js';

/**
 * Suggestion state for one meal slot.
 *
 * The engine is now deterministic for a given `(date, mealType, attempt)`, so a
 * suggestion survives reloads, backgrounding and service-worker updates without
 * persisting anything. "Something Else" advances `attempt`, which moves the whole
 * ranking on — rejected dishes are also excluded outright so they cannot come back
 * within the same session.
 */
export function useSuggestion(mealType = 'dinner') {
  const [attempt, setAttempt] = useState(0);
  const [rejectedIds, setRejectedIds] = useState([]);

  const dishes = useLiveQuery(() => db.dishes.toArray());
  const familyMembers = useLiveQuery(() => db.familyMembers.toArray());
  const cookingHistory = useLiveQuery(() => db.cookingHistory.toArray());
  const dietaryRules = useLiveQuery(() => db.dietaryRules.toArray());
  const settings = useLiveQuery(() => db.settings.get(1));

  const today = todayKey();

  const loggedEntries = useMemo(() => {
    if (!cookingHistory) return [];
    return cookingHistory.filter((entry) => entry.date === today && entry.mealType === mealType);
  }, [cookingHistory, today, mealType]);

  const loggedMealForToday = useMemo(() => {
    if (!dishes || loggedEntries.length === 0) return null;
    const entry = loggedEntries[0];
    return dishes.find((d) => d.id === entry.dishId) || null;
  }, [loggedEntries, dishes]);

  const suggestionData = useMemo(() => {
    // A logged meal is the source of truth for this slot.
    if (loggedEntries.length > 0) {
      return {
        topSuggestion: loggedMealForToday,
        alternatives: [],
        exclusions: [],
        isAlreadySelected: true,
        loggedEntryId: loggedEntries[0].id,
      };
    }

    if (!dishes || !familyMembers || !cookingHistory || !dietaryRules || !settings) {
      return { topSuggestion: null, alternatives: [], exclusions: [], isAlreadySelected: false };
    }

    const candidates = dishes.filter((d) => !rejectedIds.includes(d.id));

    try {
      const result = generateSuggestion(
        candidates,
        familyMembers,
        cookingHistory,
        dietaryRules,
        settings,
        mealType,
        { attempt, dateKey: today },
      );
      return { ...result, isAlreadySelected: false };
    } catch (error) {
      console.error('Suggestion engine error:', error);
      return { topSuggestion: null, alternatives: [], exclusions: [], isAlreadySelected: false };
    }
  }, [dishes, familyMembers, cookingHistory, dietaryRules, settings, mealType, attempt, rejectedIds, today, loggedEntries, loggedMealForToday]);

  const loading = !dishes || !familyMembers || cookingHistory === undefined || dietaryRules === undefined;

  /** Start over: forget rejections and re-rank from the top. */
  const refresh = useCallback(() => {
    setRejectedIds([]);
    setAttempt((n) => n + 1);
  }, []);

  const rejectSuggestion = useCallback(() => {
    if (suggestionData.topSuggestion && !suggestionData.isAlreadySelected) {
      setRejectedIds((prev) => [...prev, suggestionData.topSuggestion.id]);
    }
    setAttempt((n) => n + 1);
  }, [suggestionData]);

  /** Accept a specific dish (the top pick, or a chosen alternative). */
  const acceptSuggestion = useCallback(async (dishId) => {
    if (suggestionData.isAlreadySelected) return;
    const targetDishId = dishId ?? suggestionData.topSuggestion?.id;
    if (!targetDishId) return;

    const todayKeyValue = todayKey();
    // Guard against a double-tap creating two rows for the same slot.
    const existing = await db.cookingHistory
      .where('date')
      .equals(todayKeyValue)
      .filter((entry) => entry.mealType === mealType && entry.dishId === targetDishId)
      .first();
    if (existing) return;

    await db.cookingHistory.add({ dishId: targetDishId, date: todayKeyValue, mealType });
    setRejectedIds([]);
  }, [mealType, suggestionData]);

  const cancelPlannedMeal = useCallback(async () => {
    for (const entry of loggedEntries) {
      await db.cookingHistory.delete(entry.id);
    }
    setRejectedIds([]);
    setAttempt(0);
  }, [loggedEntries]);

  return {
    suggestion: suggestionData.topSuggestion,
    alternatives: suggestionData.alternatives,
    exclusions: suggestionData.exclusions || [],
    isAlreadySelected: suggestionData.isAlreadySelected,
    loggedEntryId: suggestionData.loggedEntryId,
    loading,
    refresh,
    acceptSuggestion,
    rejectSuggestion,
    cancelPlannedMeal,
  };
}
