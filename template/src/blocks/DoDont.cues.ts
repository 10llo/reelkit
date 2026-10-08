import type { CueFn } from "./cue-types";

// Fractions of a 105-frame reference beat.
export const slideAt = (i: number) => (18 + 12 * i) / 105;
export const stampAt = (i: number) => (42 + 18 * i) / 105;

export const doDontCues: CueFn<"DoDont"> = (props, { at }) =>
  props.cards.map((card, i) => ({ name: card.verdict === "no" ? ("bonk" as const) : ("chime" as const), at: at(stampAt(i)) }));
