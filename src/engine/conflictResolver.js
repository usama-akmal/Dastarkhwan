/**
 * Family-conflict resolution.
 *
 * Preference states are three: loves / eats / wont_touch. Crucially, *absence* of
 * a preference is a fourth, neutral state and must NOT be coerced into `eats` —
 * the shipped version did exactly that (`member.preferences?.[dish.id] || 'eats'`),
 * which turned "we haven't rated this" into a 10-point demerit per family member
 * and dragged a 4-person household's whole pool from a designed base of 50 down to 10–30.
 */

import { PREF, canonicalPreference } from '../utils/preferences.js';

/** Classify one member's stance on one dish. Unknown values mean "no opinion". */
export function getMemberPreference(member, dishId) {
  return canonicalPreference(member?.preferences?.[dishId]);
}

export function checkFamilyConflicts(dish, familyMembers = []) {
  const result = {
    hasHardConflict: false,
    hasSoftConflict: false,
    conflicts: [],
    lovers: [],
    eaters: [],
    rejecters: [],
    unrated: [],
  };

  for (const member of familyMembers) {
    const pref = getMemberPreference(member, dish.id);
    if (pref === PREF.WONT_TOUCH) {
      result.hasHardConflict = true;
      result.conflicts.push({ member: member.name, preference: PREF.WONT_TOUCH });
      result.rejecters.push(member.name);
    } else if (pref === PREF.LOVES) {
      result.lovers.push(member.name);
    } else if (pref === PREF.EATS) {
      result.eaters.push(member.name);
    } else {
      // No opinion. Neither a bonus nor a penalty.
      result.unrated.push(member.name);
    }
  }

  result.hasSoftConflict = result.lovers.length > 0 && result.eaters.length > 0;
  return result;
}

export function getUniversallyLovedDishes(dishes, familyMembers = []) {
  if (familyMembers.length === 0) return [];
  return dishes.filter((dish) => {
    const { lovers, hasHardConflict } = checkFamilyConflicts(dish, familyMembers);
    return !hasHardConflict && lovers.length === familyMembers.length;
  });
}

/** Dishes no member has declared `wont_touch`. */
export function getConflictFreeDishes(dishes, familyMembers = []) {
  return dishes.filter((dish) => !checkFamilyConflicts(dish, familyMembers).hasHardConflict);
}
