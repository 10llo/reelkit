import type { CueFn } from "./cue-types";

export const MYTH_AT = 0.05;
export const STRIKE_FROM = 0.35;
export const STRIKE_TO = 0.45;
export const STAMP_AT = 0.45;
export const FACT_AT = 0.55;

export const mythFactCues: CueFn<"MythFact"> = (_props, { at }) => [
  { name: "bonk", at: at(STAMP_AT) },
  { name: "chime", at: at(FACT_AT) },
];
