import type { CueFn } from "./cue-types";

// Fractions of a 105-frame reference beat.
export const RING_FROM = 12 / 105;
export const RING_TO = 60 / 105;
export const chipAt = (i: number) => (45 + 9 * i) / 105;

export const timerCues: CueFn<"Timer"> = (_props, { at }) => [
  { name: "tick", at: at(RING_FROM) },
  { name: "ding", at: at(RING_TO) },
];
