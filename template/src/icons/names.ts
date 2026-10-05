export const ICON_NAMES = [
  "paw",
  "check",
  "x",
  "milk",
  "spoonDrop",
  "vomit",
  "panting",
  "tremor",
  "dog",
  "pumpkin",
  "bookmark",
  "share",
  "clock",
  "warning",
  "info",
] as const;
export type IconName = (typeof ICON_NAMES)[number];
