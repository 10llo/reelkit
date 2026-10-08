import type { Cue } from "../brand/sfx";
import type { Talent } from "../episode/talent";
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";
import { anatomyCues } from "./Anatomy.cues";
import { bigStatCues } from "./BigStat.cues";
import { checklistCues } from "./Checklist.cues";
import { closeCues } from "./Close.cues";
import { chipsCues } from "./Chips.cues";
import { compareCues } from "./Compare.cues";
import { cycleCues } from "./Cycle.cues";
import { decisionCues } from "./Decision.cues";
import { definitionCues } from "./Definition.cues";
import { doDontCues } from "./DoDont.cues";
import { gaugeCues } from "./Gauge.cues";
import { hookCues } from "./Hook.cues";
import { mythFactCues } from "./MythFact.cues";
import { proportionCues } from "./Proportion.cues";
import { processCues } from "./Process.cues";
import { quantityCues } from "./Quantity.cues";
import { timelineCues } from "./Timeline.cues";
import { timerCues } from "./Timer.cues";
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
  Chips: chipsCues,
  Timer: timerCues,
  Process: processCues,
  Cycle: cycleCues,
  Timeline: timelineCues,
  Anatomy: anatomyCues,
};

export const cuesFor = (block: BlockName, props: unknown, timing: BeatTiming, talent: Talent): Cue[] => {
  const fn = BLOCK_CUES[block] as CueFn<BlockName> | undefined;
  return fn ? fn(props as never, timing, talent) : [];
};
