import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

export const RING_FROM = 0.05;
export const RING_TO = 0.45;
export const CENTER_AT = 0.48;
export const DOT_FROM = 0.55;

/** A node pops when the ring reaches the middle of its arc. */
export const cycleNodeAt = ({ at }: BeatTiming, i: number, n: number) => at(RING_FROM + ((RING_TO - RING_FROM) * (2 * i + 1)) / (2 * n));

export const cycleCues: CueFn<"Cycle"> = (props, timing) =>
  props.stages.map((_, i) => ({ name: "tick" as const, at: cycleNodeAt(timing, i, props.stages.length) }));
