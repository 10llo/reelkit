// Node-safe list of every icon name (used by zod schemas). Grouped by domain; Task 2 adds the rest.
// Engineering, energy, technology, money, education, nature and transport domains are deferred.
export const ICON_NAMES = [
  // core (Plan 1)
  "paw", "check", "x", "milk", "spoonDrop", "vomit", "panting", "tremor", "dog", "pumpkin", "bookmark", "share", "clock", "warning", "info",
  // health
  "heart", "pill", "syringe", "thermometer", "stethoscope", "bandage", "tooth", "lungs",
  // veterinary
  "cat", "bone", "fish", "bird", "collar", "flea", "bowl", "leash", "weight", "leaf",
  // food
  "apple", "drop", "coffee", "salt", "sugar", "bread",
  // home
  "house", "door", "bed", "sofa", "trash",
  // time
  "calendar", "hourglass", "alarm", "stopwatch",
  // people
  "person", "people", "child", "elder", "hand", "eye",
  // warnings
  "shield", "stop", "ban", "siren", "poison",
  // actions and arrows
  "arrowRight", "arrowUp", "arrowDown", "refresh", "plus", "minus", "search", "star", "question",
] as const;
export type IconName = (typeof ICON_NAMES)[number];
