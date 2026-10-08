import { STAGGER } from "../frame/timing";
import type { CueFn } from "./cue-types";

// Fractions of a 105-frame reference beat.
export const ITEMS_AT = 18 / 105;
export const METER_FROM = 36 / 105;
export const METER_TO = 90 / 105;
export const CONCLUSION_AT = 60 / 105;

export const compareCues: CueFn<"Compare"> = (props, { at }) => [
  ...props.items.map((_, i) => ({ name: "pop" as const, at: at(ITEMS_AT) + i * STAGGER })),
  ...(props.conclusion ? [{ name: "ding" as const, at: at(CONCLUSION_AT) }] : []),
];
