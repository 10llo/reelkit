import type { Palette } from "../episode/talent";

// "Consultorio Pop": the brand owns the surfaces; talents bring accent, danger, safe and extras.
export const INK = "#2B1B3D";
export const STICKER_FILL = "#FFFFFF";
export const HIGHLIGHT = "#FFC93C";
/** Text on accent, danger, safe and ink stickers. */
export const ON_COLOR = "#FFFFFF";
/** Background per scene: hook, step 1, step 2, step 3, close. */
export const SCENE_BG = ["#FFF4E6", "#FFE0D6", "#D3F2EE", "#FFF0C2", "#FF6B57"] as const;

export const BORDER = 6;
export const SHADOW = 10;
export const RADIUS = 36;
export const TILT = -3;

/** The palette every frame and block sees: brand surfaces, talent colors for meaning. */
export const applyBrand = (palette: Palette): Palette => ({
  ...palette,
  bg: SCENE_BG[0],
  bg2: STICKER_FILL,
  text: INK,
});

export const inkShadow = (px: number, c: Palette) => `${px}px ${px}px 0 ${c.text}`;
