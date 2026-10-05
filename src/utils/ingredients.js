import { todayKey as currentLocalDateKey } from './dates.js';

/**
 * Shopping ingredients.
 *
 * Scope, stated plainly: this produces a **coarse, editable** shopping list, not a
 * recipe. The seed data has no ingredient quantities (`recipe` is null on all 80
 * dishes) and inventing quantities would be worse than having none, so nothing here
 * claims amounts.
 *
 * Where the ingredients come from: the dish's structured `proteinType`, plus the
 * words in its own name. `Aloo Palak` really is potato and spinach; `Chicken Biryani`
 * really is chicken and rice. That is derivation from data the app already has, not
 * fabrication — and `getDishIngredients` is covered by a test that fails if any
 * seeded dish yields nothing, so a gap surfaces as a red test rather than as a
 * quietly incomplete list.
 *
 * Anything a household wants beyond this can be typed in: the list holds manual
 * items alongside derived ones.
 */

/** Words that appear in seed dish names, mapped to what you would actually buy. */
const NAME_LEXICON = {
  // Proteins
  chicken: 'chicken',
  murgh: 'chicken',
  beef: 'beef',
  mutton: 'mutton',
  gosht: 'mutton',
  fish: 'fish',
  machli: 'fish',
  prawn: 'prawns',
  egg: 'eggs',
  anda: 'eggs',
  // Pulses and grains
  daal: 'lentils',
  dal: 'lentils',
  chana: 'chickpeas',
  cholay: 'chickpeas',
  chole: 'chickpeas',
  rajma: 'kidney beans',
  moong: 'mung beans',
  masoor: 'red lentils',
  mash: 'white lentils',
  lobia: 'black-eyed beans',
  biryani: 'rice',
  pulao: 'rice',
  chawal: 'rice',
  rice: 'rice',
  naan: 'flour',
  roti: 'flour',
  paratha: 'flour',
  sheermal: 'flour',
  // Vegetables
  aloo: 'potatoes',
  palak: 'spinach',
  bhindi: 'okra',
  baingan: 'aubergine',
  gobhi: 'cauliflower',
  kaddu: 'pumpkin',
  tori: 'courgette',
  karela: 'bitter gourd',
  matar: 'peas',
  methi: 'fenugreek leaves',
  sabzi: 'mixed vegetables',
  shimla: 'peppers',
  tamatar: 'tomatoes',
  pyaz: 'onions',
  piyaz: 'onions',
  // Common supporting items that a name often implies
  nihari: 'bone broth',
  paya: 'trotters',
  haleem: 'wheat',
  kebab: 'mince',
  kofta: 'mince',
  keema: 'mince',
  seekh: 'mince',
  chapli: 'mince',
  salan: 'curry base',
  karahi: 'tomatoes',
  korma: 'yoghurt',
  handi: 'yoghurt',
  masala: 'spice mix',
  curry: 'curry base',
  shorba: 'stock',
  yakhni: 'stock',
  soup: 'stock',
  tikka: 'yoghurt',
  boti: 'yoghurt',
  shashlik: 'peppers',
  bhuna: 'tomatoes',
  dum: 'rice',
  dumpukht: 'rice',
  raan: 'yoghurt',
  namkeen: 'salt',
  achari: 'pickling spice',
  lahori: 'gram flour',
  butter: 'butter',
  malai: 'cream',
  cheese: 'cheese',
  paneer: 'paneer',
  lemon: 'lemons',
  nimbu: 'lemons',
  coconut: 'coconut',
  nariyal: 'coconut',
  shaljam: 'turnip',
  arvi: 'taro',
  chholay: 'chickpeas',
  channay: 'chickpeas',
  chanaa: 'chickpeas',
  jalfrezi: 'peppers',
  shawarma: 'flour',
  manchurian: 'cabbage',
  bhujia: 'onions',
  chops: 'yoghurt',
  makhani: 'butter',
  pasanday: 'yoghurt',
  bharta: 'tomatoes',
  saag: 'mustard leaves',
  sarson: 'mustard leaves',
  gajar: 'carrots',
  // Sweets and breakfasts
  halwa: 'semolina',
  kheer: 'rice',
  firni: 'rice',
  seviyan: 'vermicelli',
  sheer: 'milk',
  doodh: 'milk',
  dahi: 'yoghurt',
};

/** Ingredients assumed to be in a Pakistani kitchen already, so not worth listing. */
const PANTRY_STAPLES = new Set(['salt', 'spice mix', 'gram flour']);

/**
 * Dishes whose name does not imply their shopping items.
 *
 * Kept as an explicit table rather than stretching the lexicon: a token like
 * `paye` means trotters, but `chapli` meaning mince would mis-derive any future
 * dish containing it. Named overrides are auditable; clever rules are not.
 */
const DISH_OVERRIDES = {
  'Siri Paye': ['trotters', 'onions'],
  'Chicken Shawarma': ['flour', 'yoghurt'],
  'Chicken Manchurian': ['cabbage', 'peppers'],
};

/** Display order and grouping for the list. */
export const INGREDIENT_GROUPS = {
  meat: ['chicken', 'beef', 'mutton', 'mince', 'trotters', 'fish', 'prawns'],
  produce: [
    'potatoes', 'onions', 'tomatoes', 'spinach', 'okra', 'aubergine', 'cauliflower',
    'pumpkin', 'courgette', 'bitter gourd', 'peas', 'fenugreek leaves', 'greens',
    'mixed vegetables', 'peppers', 'lemons', 'coconut',
  ],
  staples: [
    'rice', 'flour', 'lentils', 'red lentils', 'white lentils', 'mung beans',
    'chickpeas', 'kidney beans', 'black-eyed beans', 'wheat', 'semolina', 'vermicelli',
  ],
  dairy: ['milk', 'yoghurt', 'cream', 'butter', 'cheese', 'paneer', 'eggs'],
  other: ['curry base', 'stock', 'bone broth', 'pickling spice'],
};

/** Group label for an ingredient; anything unrecognised falls to `other`. */
export function groupForIngredient(name) {
  for (const [group, members] of Object.entries(INGREDIENT_GROUPS)) {
    if (members.includes(name)) return group;
  }
  return 'other';
}

/** Split a dish name into lexicon-recognised words. */
function tokenise(nameEn) {
  return String(nameEn || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

/**
 * The shopping ingredients for one dish.
 *
 * Returns a de-duplicated, ordered array: the dish's protein first (it is usually
 * the main purchase), then whatever its name implies, minus pantry staples.
 */
export function getDishIngredients(dish) {
  if (!dish) return [];

  const found = [];

  // The structured protein is authoritative and always included.
  if (dish.proteinType && dish.proteinType !== 'vegetables') {
    const fromProtein = NAME_LEXICON[dish.proteinType] || dish.proteinType;
    found.push(fromProtein);
  }

  for (const token of tokenise(dish.nameEn)) {
    const ingredient = NAME_LEXICON[token];
    if (ingredient) found.push(ingredient);
  }

  for (const extra of DISH_OVERRIDES[dish.nameEn] || []) found.push(extra);

  return [...new Set(found)].filter((i) => !PANTRY_STAPLES.has(i));
}

/**
 * Build a shopping list from a set of planned meals.
 *
 * @param {Array} dishes The dish collection, for resolving ids.
 * @param {Array} entries Planned meals: `{ dishId }` (cooking-history shaped).
 * @returns {Array<{ name: string, sources: string[], group: string }>} Deduplicated
 *   ingredients, each remembering which dishes needed it so the list can be checked
 *   against the plan.
 */
export function buildShoppingList(dishes, entries) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const merged = new Map();

  for (const entry of entries) {
    const dish = byId.get(entry.dishId);
    if (!dish) continue;
    for (const name of getDishIngredients(dish)) {
      if (!merged.has(name)) merged.set(name, { name, sources: [], group: groupForIngredient(name) });
      const record = merged.get(name);
      if (!record.sources.includes(dish.nameEn)) record.sources.push(dish.nameEn);
    }
  }

  const groupOrder = Object.keys(INGREDIENT_GROUPS);
  return [...merged.values()].sort((a, b) => {
    const ga = groupOrder.indexOf(a.group);
    const gb = groupOrder.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Meals planned for the next `days` days, including today.
 *
 * A shopping trip covers what is coming, not what has already been eaten, so this
 * looks forward from today rather than back over history.
 *
 * `todayKey` defaults to the actual local date. It is injectable so tests are not
 * time-dependent, but a missing value must not be fatal: it previously produced
 * `undefined.split` and took the shopping list down with it.
 */
export function futureEntries(history, { days = 7, todayKey: providedToday = currentLocalDateKey() } = {}) {
  const today = providedToday;
  const cutoff = (() => {
    const [y, m, d] = today.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })();

  return history.filter((e) => e.date >= today && e.date <= cutoff);
}

export default buildShoppingList;
