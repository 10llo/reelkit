import { BigStat } from "./BigStat";
import { Checklist } from "./Checklist";
import { Chips } from "./Chips";
import { Close } from "./Close";
import { Compare } from "./Compare";
import { Cycle } from "./Cycle";
import { Definition } from "./Definition";
import { DoDont } from "./DoDont";
import { Hook } from "./Hook";
import { MythFact } from "./MythFact";
import { Process } from "./Process";
import { Quantity } from "./Quantity";
import { Timeline } from "./Timeline";
import { Timer } from "./Timer";
import type { BlockName } from "./schemas";
import type { BlockComponent } from "./types";

// Each block task adds its component here, matching BLOCK_SCHEMAS.
export const BLOCKS: { [K in BlockName]: BlockComponent<K> } = {
  BigStat,
  Checklist,
  Chips,
  Close,
  Compare,
  Cycle,
  Definition,
  DoDont,
  Hook,
  MythFact,
  Process,
  Quantity,
  Timeline,
  Timer,
};
