import { BigStat } from "./BigStat";
import type { BlockName } from "./schemas";
import type { BlockComponent } from "./types";

// Each block task adds its component here, matching BLOCK_SCHEMAS.
export const BLOCKS: { [K in BlockName]: BlockComponent<K> } = {
  BigStat,
};
