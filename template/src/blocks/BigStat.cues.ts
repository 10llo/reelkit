import type { CueFn } from "./cue-types";

export const NUMBER_AT = 0.1;
export const COUNT_END = 0.45;
export const LABEL_AT = 0.3;
export const SOURCE_AT = 0.45;

export const bigStatCues: CueFn<"BigStat"> = (_props, { at }) => [{ name: "ding", at: at(COUNT_END) }];
