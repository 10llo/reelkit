import type { CueFn } from "./cue-types";
import { zoneIndex } from "./Gauge.schema";

export const ZONES_FROM = 0.04;
export const ZONES_TO = 0.25;
export const NEEDLE_FROM = 0.3;
export const NEEDLE_TO = 0.55;
export const LEGEND_AT = 0.6;

export const gaugeCues: CueFn<"Gauge"> = (props, { at }) => [
  { name: props.zones[zoneIndex(props.zones, props.value)].tone === "danger" ? "bonk" : "ding", at: at(NEEDLE_TO) },
];
