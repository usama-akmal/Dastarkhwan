import { isOnCooldown, getDaysSinceLastMade, getCategoryCounts } from './repetitionTracker.js';
import { checkFamilyConflicts, getConflictFreeDishes } from './conflictResolver.js';

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date) {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getAvailableDishes(dishes, familyMembers, cookingHistory, dietaryRules, settings, mealType) {
  // 1. FILTER OUT dishes where ANY family member has "wont_touch" preference
  let available = getConflictFreeDishes(dishes, familyMembers);

  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  const endOfWeek = getEndOfWeek(today);
  const weeklyCounts = getCategoryCounts(cookingHistory, startOfWeek, endOfWeek);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayCounts = getCategoryCounts(cookingHistory, yesterday, yesterday);

  const cooldowns = settings?.cooldowns || { sameDish: 7, sameProtein: 3, sameDishType: 2 };

  available = available.filter(dish => {
    // 2. FILTER OUT dishes that violate cooldown rules
    const cooldownCheck = isOnCooldown(dish, cookingHistory, cooldowns);
    if (cooldownCheck.onCooldown) return false;

    // 3. FILTER OUT dishes that violate dietary rules
    // Uses the schema: { ruleType, category, value, limit, isActive }
    if (dietaryRules && dietaryRules.length > 0) {
      const activeRules = dietaryRules.filter(r => r.isActive !== false);
      
      for (const rule of activeRules) {
        if (rule.ruleType === 'max_per_week') {
          if (rule.category === 'proteinType' && dish.proteinType === rule.value) {
            if ((weeklyCounts.proteinType[dish.proteinType] || 0) >= rule.limit) return false;
          }
          if (rule.category === 'dishType' && dish.dishType === rule.value) {
            if ((weeklyCounts.dishType[dish.dishType] || 0) >= rule.limit) return false;
          }
          if (rule.category === 'dietaryTags' && dish.dietaryTags?.includes(rule.value)) {
            const tagCount = cookingHistory.filter(h => {
              const hDate = new Date(h.date);
              return hDate >= startOfWeek && hDate <= endOfWeek;
            }).length; // simplified
            if (tagCount >= rule.limit) return false;
          }
        }
        
        if (rule.ruleType === 'no_consecutive') {
          if (rule.category === 'proteinType' && dish.proteinType === rule.value) {
            if ((yesterdayCounts.proteinType[dish.proteinType] || 0) > 0) return false;
          }
          if (rule.category === 'dietaryTags' && dish.dietaryTags?.includes(rule.value)) {
            // Check if yesterday had a dish with this dietary tag
            if ((yesterdayCounts.proteinType[rule.value] || 0) > 0) return false;
          }
        }
      }
    }
    return true;
  });

  return available;
}

export function getDishScore(dish, familyMembers, cookingHistory, dietaryRules, settings) {
  let score = 50;
  
  if (familyMembers && familyMembers.length > 0) {
    const conflicts = checkFamilyConflicts(dish, familyMembers);
    
    // +30 if ALL family members "loves" it
    if (conflicts.lovers.length === familyMembers.length) {
      score += 30;
    }
    // +15 if MOST (>50%) family members "loves" it
    else if (conflicts.lovers.length > familyMembers.length / 2) {
      score += 15;
    }

    // -10 for each member who only "eats" it
    score -= conflicts.eaters.length * 10;
  }

  // +10 for dishes not made in 14+ days
  const daysSince = getDaysSinceLastMade(dish.id, cookingHistory);
  if (daysSince >= 14) {
    score += 10;
  }

  // +5 for meeting "min_per_week" needs
  if (dietaryRules && dietaryRules.length > 0) {
    const today = new Date();
    const startOfWeek = getStartOfWeek(today);
    const endOfWeek = getEndOfWeek(today);
    const weeklyCounts = getCategoryCounts(cookingHistory, startOfWeek, endOfWeek);

    const activeRules = dietaryRules.filter(r => r.isActive !== false);
    for (const rule of activeRules) {
      if (rule.ruleType === 'min_per_week') {
        if (rule.category === 'proteinType' && dish.proteinType === rule.value) {
          if ((weeklyCounts.proteinType[dish.proteinType] || 0) < rule.limit) score += 5;
        }
      }
    }
  }

  // ±10 random factor
  score += Math.floor(Math.random() * 21) - 10;

  return score;
}

export function generateSuggestion(dishes, familyMembers, cookingHistory, dietaryRules, settings, mealType) {
  const available = getAvailableDishes(dishes, familyMembers, cookingHistory, dietaryRules, settings, mealType);
  
  const scoredDishes = available.map(dish => ({
    dish,
    score: getDishScore(dish, familyMembers, cookingHistory, dietaryRules, settings)
  }));

  scoredDishes.sort((a, b) => b.score - a.score);

  if (scoredDishes.length === 0) {
    return { topSuggestion: null, alternatives: [] };
  }

  return {
    topSuggestion: scoredDishes[0].dish,
    alternatives: scoredDishes.slice(1, 5).map(s => s.dish)
  };
}
