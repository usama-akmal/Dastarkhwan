/**
 * Repetition Tracker for Dastarkhwan
 * 
 * Note: cookingHistory entries have { dishId, date, mealType }
 * We need the dishes array to resolve proteinType/dishType for category-based cooldowns.
 * For simplicity, this module works with enriched history (where proteinType/dishType
 * may or may not be present). The suggestion engine should enrich history before passing it.
 */

export function isOnCooldown(dish, cookingHistory, cooldowns, allDishes) {
  // same dish cooldown
  const daysSinceDish = getDaysSinceLastMade(dish.id, cookingHistory);
  if (daysSinceDish <= (cooldowns?.sameDish || 0)) {
    return { onCooldown: true, reason: `Same dish made within ${cooldowns.sameDish} days` };
  }

  // Build a lookup for dish details if allDishes is provided
  const dishMap = {};
  if (allDishes) {
    for (const d of allDishes) {
      dishMap[d.id] = d;
    }
  }

  // same protein cooldown
  if (dish.proteinType) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let lastProteinDate = null;
    for (const h of cookingHistory) {
      const hDish = dishMap[h.dishId];
      const hProtein = h.proteinType || hDish?.proteinType;
      if (hProtein === dish.proteinType) {
        const hDate = new Date(h.date);
        if (!lastProteinDate || hDate > lastProteinDate) {
          lastProteinDate = hDate;
        }
      }
    }
    
    if (lastProteinDate) {
      lastProteinDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil(Math.abs(today - lastProteinDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= (cooldowns?.sameProtein || 0)) {
        return { onCooldown: true, reason: `Same protein (${dish.proteinType}) made within ${cooldowns.sameProtein} days` };
      }
    }
  }

  // same dish type cooldown
  if (dish.dishType) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let lastDishTypeDate = null;
    for (const h of cookingHistory) {
      const hDish = dishMap[h.dishId];
      const hDishType = h.dishType || hDish?.dishType;
      if (hDishType === dish.dishType) {
        const hDate = new Date(h.date);
        if (!lastDishTypeDate || hDate > lastDishTypeDate) {
          lastDishTypeDate = hDate;
        }
      }
    }
    
    if (lastDishTypeDate) {
      lastDishTypeDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil(Math.abs(today - lastDishTypeDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= (cooldowns?.sameDishType || 0)) {
        return { onCooldown: true, reason: `Same dish type (${dish.dishType}) made within ${cooldowns.sameDishType} days` };
      }
    }
  }

  return { onCooldown: false, reason: null };
}

export function getLastMadeDate(dishId, cookingHistory) {
  const historyForDish = cookingHistory.filter(h => h.dishId === dishId);
  if (historyForDish.length === 0) return null;
  historyForDish.sort((a, b) => new Date(b.date) - new Date(a.date));
  return historyForDish[0].date;
}

export function getDaysSinceLastMade(dishId, cookingHistory) {
  const lastMade = getLastMadeDate(dishId, cookingHistory);
  if (!lastMade) return Infinity;
  const lastMadeDate = new Date(lastMade);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastMadeDate.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(today - lastMadeDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getCategoryCounts(cookingHistory, startDate, endDate, allDishes) {
  const counts = { proteinType: {}, dishType: {} };
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const dishMap = {};
  if (allDishes) {
    for (const d of allDishes) {
      dishMap[d.id] = d;
    }
  }

  for (const record of cookingHistory) {
    const recordDate = new Date(record.date);
    if (recordDate >= start && recordDate <= end) {
      const hDish = dishMap[record.dishId];
      const pType = record.proteinType || hDish?.proteinType;
      const dType = record.dishType || hDish?.dishType;
      
      if (pType) counts.proteinType[pType] = (counts.proteinType[pType] || 0) + 1;
      if (dType) counts.dishType[dType] = (counts.dishType[dType] || 0) + 1;
    }
  }
  return counts;
}
