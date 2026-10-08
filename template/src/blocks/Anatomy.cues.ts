import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

export const SUBJECT_AT = 0.04;
export const CALLOUTS_FROM = 0.18;
export const CALLOUTS_SPAN = 0.45;
export const HIGHLIGHT_AT = 0.75;

export const calloutStart = ({ at }: BeatTiming, i: number, count: number) => at(CALLOUTS_FROM + (CALLOUTS_SPAN * i) / count);

export const anatomyCues: CueFn<"Anatomy"> = (props, timing) => [
  ...props.callouts.map((_, i) => ({ name: "tick" as const, at: calloutStart(timing, i, props.callouts.length) })),
  ...(props.highlight !== undefined ? [{ name: "ding" as const, at: timing.at(HIGHLIGHT_AT) }] : []),
];
