import { toLocalDateKey, todayKey, startOfWeek, endOfWeek, daysBetween, parseLocalDate } from './dates.js';

/**
 * Local usage insights.
 *
 * This is the app's answer to "how do we know whether this works?" without a server.
 * The app is local-first by design and makes no network request, so there is no
 * telemetry and none is planned. Everything here is computed on-device from the
 * user's own data, shown to them, and included in their backup export — it is their
 * information, not ours.
 *
 * The most important number is `swappedPerPlan`. The engine's whole premise is that
 * a suggestion is good enough to accept; a high ratio of "Something else" taps means
 * the recommendations are not landing, which is the single clearest signal that the
 * scoring needs work.
 *
 * Pure function: no database access, so it is directly testable.
 */

const DAY_MS = 86400000;

/**
 * Longest run of consecutive days with at least one meal logged.
 * This is the retention proxy: a household that plans most days has formed a habit.
 */
function longestDailyStreak(sortedDateKeys) {
  if (sortedDateKeys.length === 0) return { longest: 0, current: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDateKeys.length; i += 1) {
    const gap = daysBetween(sortedDateKeys[i - 1], sortedDateKeys[i]);
    if (gap === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // A streak only counts as "current" if it reaches today or yesterday; otherwise
  // the habit has lapsed and reporting it as current would flatter the numbers.
  const last = parseLocalDate(sortedDateKeys[sortedDateKeys.length - 1]);
  const today = parseLocalDate(todayKey());
  const sinceLast = Math.round((today - last) / DAY_MS);
  const current = sinceLast <= 1 ? run : 0;

  return { longest, current };
}

/**
 * How often the top suggestion was good enough to accept.
 *
 * This is the number the engine should be judged on. A `suggested` event fires once
 * per distinct top pick shown; `accepted` means the household took it as offered,
 * `accepted_alternative` means they took a different dish from the list, and
 * `rejected` means they asked for something else without accepting. Only pairs where
 * a suggestion was actually shown are counted, so the ratio is not diluted by
 * meals that were logged manually.
 */
function summariseSuggestionQuality(usageEvents) {
  const shown = usageEvents.filter((e) => e.type === 'suggested').length;
  const accepted = usageEvents.filter((e) => e.type === 'accepted').length;
  const alternatives = usageEvents.filter((e) => e.type === 'accepted_alternative').length;
  const rejected = usageEvents.filter((e) => e.type === 'rejected').length;

  // Accepted either way counts as "the list contained something they wanted";
  // `topPickRate` isolates how often the first choice alone was right.
  const outcomes = accepted + alternatives + rejected;
  return {
    suggestionsShown: shown,
    suggestionsAccepted: accepted,
    suggestionsAcceptedAlternative: alternatives,
    suggestionsRejected: rejected,
    /** Share of acted-on suggestions that were taken as offered. */
    topPickRate: outcomes === 0 ? null : +(accepted / outcomes).toFixed(3),
    /** Share of acted-on suggestions that were taken at all. */
    listAcceptanceRate: outcomes === 0 ? null : +((accepted + alternatives) / outcomes).toFixed(3),
  };
}

export function computeInsights({
  history = [], dishes = [], familyMembers = [], settings = null, usageEvents = [],
} = {}) {
  const dishById = new Map(dishes.map((d) => [d.id, d]));

  const dateKeys = [...new Set(history.map((e) => e.date))].sort();
  const { longest, current } = longestDailyStreak(dateKeys);

  // --- Coverage: how much of the household's opinion the planner actually knows ---
  const ratingsPossible = dishes.length * familyMembers.length;
  let ratingsGiven = 0;
  let wontTouchCount = 0;
  for (const member of familyMembers) {
    for (const value of Object.values(member.preferences || {})) {
      ratingsGiven += 1;
      if (value === 'wont_touch') wontTouchCount += 1;
    }
  }
  const ratingCoverage = ratingsPossible === 0 ? 0 : ratingsGiven / ratingsPossible;

  // --- Variety: distinct dishes and proteins actually cooked ---
  const distinctDishes = new Set(history.map((e) => e.dishId)).size;
  const proteins = new Set();
  const dishTypes = new Set();
  for (const entry of history) {
    const dish = dishById.get(entry.dishId);
    if (dish?.proteinType) proteins.add(dish.proteinType);
    if (dish?.dishType) dishTypes.add(dish.dishType);
  }

  // --- Recency and volume ---
  const now = new Date();
  const weekCount = history.filter((e) => {
    const d = parseLocalDate(e.date);
    return d >= startOfWeek(now) && d <= endOfWeek(now);
  }).length;
  const last30 = history.filter((e) => {
    const d = parseLocalDate(e.date);
    return (now - d) / DAY_MS <= 30;
  }).length;

  // --- Customisation: is the household making the app its own? ---
  const customDishes = dishes.filter((d) => d.isCustom).length;

  const totalPlanned = history.length;
  const suggestionQuality = summariseSuggestionQuality(usageEvents);

  const firstMeal = dateKeys[0] || null;
  const daysSinceFirstMeal = firstMeal ? daysBetween(firstMeal, toLocalDateKey(now)) : 0;

  return {
    // Volume
    totalMeals: totalPlanned,
    mealsLast30Days: last30,
    mealsThisWeek: weekCount,
    daysSinceFirstMeal,
    mealsPerWeek: daysSinceFirstMeal > 0 ? +(totalPlanned / (daysSinceFirstMeal / 7)).toFixed(1) : totalPlanned,

    // Habit
    daysWithMeals: dateKeys.length,
    longestStreak: longest,
    currentStreak: current,

    // Personalisation
    distinctDishes,
    distinctDishShare: dishes.length ? +(distinctDishes / dishes.length).toFixed(3) : 0,
    distinctProteins: proteins.size,
    distinctDishTypes: dishTypes.size,
    customDishes,

    // Household setup
    familyMembers: familyMembers.length,
    ratingsGiven,
    ratingsPossible,
    ratingCoverage: +ratingCoverage.toFixed(3),
    wontTouchCount,

    // Suggestion quality: the signal that decides whether new features are worth it
    ...suggestionQuality,

    // Configuration, so a support or review conversation has context
    mealsPerDay: settings?.mealsPerDay ?? null,
    theme: settings?.theme ?? null,
    cooldowns: settings?.cooldowns ?? null,
    firstMealDate: firstMeal,
  };
}

/**
 * A plain-text summary suitable for pasting into a message when asking for help.
 * Deliberately contains no dish names, no family names and no dates of individual
 * meals — only counts — so sharing it does not disclose the household's habits.
 */
export function formatInsightsForSharing(insights) {
  const lines = [
    'Dastarkhwan usage summary',
    `Meals planned: ${insights.totalMeals} across ${insights.daysWithMeals} days`,
    `Rate: ${insights.mealsPerWeek}/week, last 30 days: ${insights.mealsLast30Days}`,
    `Streak: current ${insights.currentStreak} days, longest ${insights.longestStreak}`,
    `Variety: ${insights.distinctDishes} distinct dishes, ${insights.distinctProteins} proteins, ${insights.distinctDishTypes} dish types`,
    `Household: ${insights.familyMembers} members, ${insights.ratingsGiven}/${insights.ratingsPossible} preferences rated (${Math.round(insights.ratingCoverage * 100)}%)`,
    `Custom recipes: ${insights.customDishes}`,
    insights.topPickRate === null
      ? 'Suggestion quality: not enough data yet'
      : `Suggestion quality: top pick accepted ${Math.round(insights.topPickRate * 100)}%, any suggestion ${Math.round(insights.listAcceptanceRate * 100)}% (${insights.suggestionsShown} shown)`,
    `Settings: ${insights.mealsPerDay} meal(s)/day, cooldowns ${insights.cooldowns ? `${insights.cooldowns.sameDish}/${insights.cooldowns.sameProtein}/${insights.cooldowns.sameDishType}` : 'n/a'}`,
  ];
  return lines.join('\n');
}

export default computeInsights;
