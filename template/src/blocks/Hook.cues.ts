import type { CueFn } from "./cue-types";

// Fractions of the hook beat (reference: frames of a 90-frame hook).
export const BITES = [10 / 90, 22 / 90, 34 / 90];
export const HERO_AT = 10 / 90;
export const SHAKE_END = 40 / 90;
export const STAMP_AT = 40 / 90;
export const PULSE_FROM = 45 / 90;
export const PULSE_TO = 60 / 90;

export const hookCues: CueFn<"Hook"> = (props, { at }) => [
  ...(props.hero.animation === "bites"
    ? BITES.map((f) => ({ name: "tick" as const, at: at(f) }))
    : [{ name: props.hero.animation === "pop" ? ("pop" as const) : ("bonk" as const), at: at(HERO_AT) }]),
  ...(props.stamp ? [{ name: "pop" as const, at: at(STAMP_AT) }] : []),
];
