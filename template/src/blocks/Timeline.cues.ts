import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

export const LINE_FROM = 0.05;
export const LINE_TO = 0.55;

export const timelineDotAt = ({ at }: BeatTiming, i: number, n: number) => at(LINE_FROM + ((LINE_TO - LINE_FROM) * i) / (n - 1));

export const timelineCues: CueFn<"Timeline"> = (props, timing) =>
  props.events.map((_, i) => ({ name: "tick" as const, at: timelineDotAt(timing, i, props.events.length) }));
