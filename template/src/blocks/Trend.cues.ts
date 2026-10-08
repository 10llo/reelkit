import type { CueFn } from "./cue-types";

export const LINE_FROM = 0.08;
export const LINE_TO = 0.55;
export const AREA_FROM = 0.3;
export const AREA_TO = 0.6;
export const ANNOTATE_AT = 0.68;

export const trendCues: CueFn<"Trend"> = (props, { at }) => [
  { name: "ding", at: at(LINE_TO) },
  ...(props.annotate ? [{ name: "pop" as const, at: at(ANNOTATE_AT) }] : []),
];
