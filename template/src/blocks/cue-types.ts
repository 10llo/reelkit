import type { Cue } from "../brand/sfx";
import type { Talent } from "../episode/talent";
import type { BeatTiming } from "../frame/timing";
import type { BlockName } from "./schemas";
import type { BlockProps } from "./types";

/** Sounds of one beat, at scene-local frames (use `timing.at`). Pure: shares keyframes with the component. */
export type CueFn<K extends BlockName> = (props: BlockProps<K>, timing: BeatTiming, talent: Talent) => Cue[];
