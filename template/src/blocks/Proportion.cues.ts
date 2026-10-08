import type { CueFn } from "./cue-types";

export const TRACK_FROM = 0.05;
export const TRACK_TO = 0.2;
export const FILL_AT = 0.3;
export const FILL_TO = 0.55;
export const FILL_SPAN = 0.25;
export const LABEL_AT = 0.4;
export const SOURCE_AT = 0.55;

export const proportionCues: CueFn<"Proportion"> = (_props, { at }) => [{ name: "ding", at: at(FILL_TO) }];
