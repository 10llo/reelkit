import type { Palette } from "../../episode/talent";
import type { Tone } from "../schema-parts";

export const toneColor = (t: Tone, c: Palette) => (t === "ok" ? c.safe : t === "warn" ? c.accent : c.danger);
