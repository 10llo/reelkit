import { BigStat } from "./BigStat";
import { Checklist } from "./Checklist";
import { Chips } from "./Chips";
import { Compare } from "./Compare";
import { DoDont } from "./DoDont";
import { Hook } from "./Hook";
import { Quantity } from "./Quantity";
import { Timer } from "./Timer";
import type { BlockName } from "./schemas";
import type { BlockComponent } from "./types";

// Each block task adds its component here, matching BLOCK_SCHEMAS.
export const BLOCKS: { [K in BlockName]: BlockComponent<K> } = {
  BigStat,
  Checklist,
  Chips,
  Compare,
  DoDont,
  Hook,
  Quantity,
  Timer,
};
