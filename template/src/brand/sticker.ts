import type { Palette } from "../episode/talent";
import { BORDER, ON_COLOR, RADIUS, SHADOW, STICKER_FILL } from "./tokens";

export type StickerTone = "white" | "accent" | "danger" | "safe" | "ink";

export const stickerColors = (tone: StickerTone, c: Palette): { background: string; color: string } => {
  switch (tone) {
    case "white":
      return { background: STICKER_FILL, color: c.text };
    case "accent":
      return { background: c.accent, color: ON_COLOR };
    case "danger":
      return { background: c.danger, color: ON_COLOR };
    case "safe":
      return { background: c.safe, color: ON_COLOR };
    case "ink":
      return { background: c.text, color: ON_COLOR };
  }
};

export type StickerOptions = {
  readonly tone?: StickerTone;
  readonly radius?: number;
  readonly border?: number;
  readonly shadow?: number;
  /** Overrides the tone's fill (e.g. a Compare swatch color). */
  readonly fill?: string;
  /** Overrides the ink border (e.g. a Decision outcome's tone). */
  readonly borderColor?: string;
};

/** Surface of a sticker: fill, ink border, hard ink shadow. Spread into a block's style. */
export const stickerStyle = (c: Palette, opts: StickerOptions = {}): React.CSSProperties => {
  const { tone = "white", radius = RADIUS, border = BORDER, shadow = SHADOW, fill, borderColor } = opts;
  const colors = stickerColors(tone, c);
  return {
    backgroundColor: fill ?? colors.background,
    color: colors.color,
    border: `${border}px solid ${borderColor ?? c.text}`,
    borderRadius: radius,
    boxShadow: `${shadow}px ${shadow}px 0 ${c.text}`,
    boxSizing: "border-box",
  };
};
