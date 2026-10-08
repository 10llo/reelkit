import type { Cue } from "../brand/sfx";
import type { Talent } from "../episode/talent";
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";
import { closeCues } from "./Close.cues";
import { compareCues } from "./Compare.cues";
import { definitionCues } from "./Definition.cues";
import { hookCues } from "./Hook.cues";
import { versusCues } from "./Versus.cues";
import type { BlockName } from "./schemas";

// Node-safe. Each block task adds its cue function here; Task 13 makes this total.
export const BLOCK_CUES: { [K in BlockName]?: CueFn<K> } = {
  Close: closeCues,
  Hook: hookCues,
  Definition: definitionCues,
  Compare: compareCues,
  Versus: versusCues,
};

export const cuesFor = (block: BlockName, props: unknown, timing: BeatTiming, talent: Talent): Cue[] => {
  const fn = BLOCK_CUES[block] as CueFn<BlockName> | undefined;
  return fn ? fn(props as never, timing, talent) : [];
};
