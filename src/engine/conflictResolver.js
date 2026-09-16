export function checkFamilyConflicts(dish, familyMembers) {
  const result = {
    hasHardConflict: false,
    hasSoftConflict: false,
    conflicts: [],
    lovers: [],
    eaters: [],
    rejecters: []
  };

  for (const member of familyMembers) {
    const pref = member.preferences?.[dish.id] || 'eats';
    if (pref === 'wont_touch') {
      result.hasHardConflict = true;
      result.conflicts.push({ member: member.name, preference: 'wont_touch' });
      result.rejecters.push(member.name);
    } else if (pref === 'loves') {
      result.lovers.push(member.name);
    } else {
      result.eaters.push(member.name);
    }
  }

  if (result.lovers.length > 0 && result.eaters.length > 0) {
    result.hasSoftConflict = true;
  }

  return result;
}

export function getUniversallyLovedDishes(dishes, familyMembers) {
  return dishes.filter(dish => {
    const conflicts = checkFamilyConflicts(dish, familyMembers);
    return conflicts.lovers.length === familyMembers.length && !conflicts.hasHardConflict && familyMembers.length > 0;
  });
}

export function getConflictFreeDishes(dishes, familyMembers) {
  return dishes.filter(dish => {
    const conflicts = checkFamilyConflicts(dish, familyMembers);
    return !conflicts.hasHardConflict;
  });
}
