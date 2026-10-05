import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, recordUsageEvent, USAGE_EVENT } from '../data/db.js';
import { generateSuggestion } from '../engine/suggestionEngine.js';
import { todayKey } from '../utils/dates.js';

/**
 * Keys of suggestions already logged in this session.
 *
 * Module scope on purpose: it must be shared by every instance of this hook, and it
 * must be claimable synchronously so that React's double-invoked mount effects cannot
 * both start a write.
 */
const claimedOffers = new Set();

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

  /**
   * Log what was offered, once per distinct top pick.
   *
   * Without this the acceptance rate cannot be computed: "they accepted it" is only
   * meaningful against a record of what was actually shown.
   *
   * The guard is a module-level set keyed by day/meal/dish rather than a ref. React
   * double-invokes effects on mount, so two invocations start before either finishes;
   * a ref written at the end of the first is not visible to the second. The key is
   * claimed synchronously, before any await, so the second run returns immediately.
   * The store also de-duplicates, which covers two tabs claiming the same key.
   */
  const offeredDishId = loading || suggestionData.isAlreadySelected
    ? null
    : suggestionData.topSuggestion?.id ?? null;
  const offeredKey = offeredDishId ? `${today}:${mealType}:${offeredDishId}` : null;

  useEffect(() => {
    if (!offeredKey || !offeredDishId) return;
    if (claimedOffers.has(offeredKey)) return;
    claimedOffers.add(offeredKey);
    recordUsageEvent({
      type: USAGE_EVENT.SUGGESTED,
      date: today,
      dishId: offeredDishId,
      mealType,
    });
  }, [offeredKey, offeredDishId, today, mealType]);

  /** Start over: forget rejections and re-rank from the top. */
  const refresh = useCallback(() => {
    setRejectedIds([]);
    setAttempt((n) => n + 1);
  }, []);

  const rejectSuggestion = useCallback(() => {
    if (suggestionData.topSuggestion && !suggestionData.isAlreadySelected) {
      setRejectedIds((prev) => [...prev, suggestionData.topSuggestion.id]);
      recordUsageEvent({
        type: USAGE_EVENT.REJECTED,
        date: today,
        dishId: suggestionData.topSuggestion.id,
        mealType,
      });
    }
    setAttempt((n) => n + 1);
  }, [suggestionData, today, mealType]);

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

    // Distinguish "the first choice was right" from "the list contained something
    // they wanted" — they call for different fixes if the rate is poor.
    const topPick = suggestionData.topSuggestion?.id;
    const wasTopPick = dishId === undefined || dishId === topPick;
    recordUsageEvent({
      type: wasTopPick ? USAGE_EVENT.ACCEPTED : USAGE_EVENT.ACCEPTED_ALTERNATIVE,
      date: todayKeyValue,
      dishId: targetDishId,
      suggestedDishId: topPick ?? null,
      mealType,
    });

    setRejectedIds([]);
  }, [mealType, suggestionData]);

  const cancelPlannedMeal = useCallback(async () => {
    for (const entry of loggedEntries) {
      await db.cookingHistory.delete(entry.id);
      recordUsageEvent({ type: USAGE_EVENT.UNDONE, date: entry.date, dishId: entry.dishId, mealType });
    }
    setRejectedIds([]);
    setAttempt(0);
  }, [loggedEntries, mealType]);

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
