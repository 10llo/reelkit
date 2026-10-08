import type { Cue } from "../brand/sfx";
import type { Talent } from "../episode/talent";
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";
import { bigStatCues } from "./BigStat.cues";
import { checklistCues } from "./Checklist.cues";
import { closeCues } from "./Close.cues";
import { compareCues } from "./Compare.cues";
import { decisionCues } from "./Decision.cues";
import { definitionCues } from "./Definition.cues";
import { doDontCues } from "./DoDont.cues";
import { gaugeCues } from "./Gauge.cues";
import { hookCues } from "./Hook.cues";
import { mythFactCues } from "./MythFact.cues";
import { proportionCues } from "./Proportion.cues";
import { quantityCues } from "./Quantity.cues";
import { trendCues } from "./Trend.cues";
import { versusCues } from "./Versus.cues";
import type { BlockName } from "./schemas";

// Node-safe. Each block task adds its cue function here; Task 13 makes this total.
export const BLOCK_CUES: { [K in BlockName]?: CueFn<K> } = {
  Close: closeCues,
  Hook: hookCues,
  Definition: definitionCues,
  Compare: compareCues,
  Versus: versusCues,
  BigStat: bigStatCues,
  Gauge: gaugeCues,
  Proportion: proportionCues,
  Quantity: quantityCues,
  Trend: trendCues,
  Checklist: checklistCues,
  DoDont: doDontCues,
  MythFact: mythFactCues,
  Decision: decisionCues,
};

export const cuesFor = (block: BlockName, props: unknown, timing: BeatTiming, talent: Talent): Cue[] => {
  const fn = BLOCK_CUES[block] as CueFn<BlockName> | undefined;
  return fn ? fn(props as never, timing, talent) : [];
};
