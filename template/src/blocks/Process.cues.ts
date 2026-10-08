import { DROP_LAND } from "../brand/motion";
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

export const FIRST = 0.06;
export const SPAN = 0.45;
export const HIGHLIGHT_AT = 0.72;

export const processStepAt = ({ at }: BeatTiming, i: number, n: number) => at(FIRST + (SPAN * i) / n);

export const processCues: CueFn<"Process"> = (props, timing) => [
  ...props.steps.map((_, i) => ({ name: "tick" as const, at: processStepAt(timing, i, props.steps.length) + DROP_LAND })),
  ...(props.highlightStep !== undefined ? [{ name: "ding" as const, at: timing.at(HIGHLIGHT_AT) }] : []),
];
