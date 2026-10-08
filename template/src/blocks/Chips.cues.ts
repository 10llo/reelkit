import type { CueFn } from "./cue-types";

export const FIRST_AT = 0.1;
export const MAX_STAGGER = 9;
export const ENTER_SPAN = 0.5;

export const chipStagger = (duration: number, count: number) => Math.min(MAX_STAGGER, (duration * ENTER_SPAN) / count);

export const chipsCues: CueFn<"Chips"> = (props, timing) => {
  const s = chipStagger(timing.duration, props.items.length);
  return props.items.map((_, i) => ({ name: "tick" as const, at: timing.at(FIRST_AT) + i * s }));
};
