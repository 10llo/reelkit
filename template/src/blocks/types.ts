import type { z } from "zod";
import type { BeatTiming } from "../frame/timing";
import type { BLOCK_SCHEMAS, BlockName } from "./schemas";

export type BlockProps<K extends BlockName> = z.output<(typeof BLOCK_SCHEMAS)[K]>;

/** A block renders one beat. Keyframes are fractions of the beat via `timing.at(fraction)`. */
export type BlockComponent<K extends BlockName> = React.FC<{
  readonly props: BlockProps<K>;
  readonly timing: BeatTiming;
}>;
