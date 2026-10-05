import { BigStat } from "./BigStat";
import { Checklist } from "./Checklist";
import { Chips } from "./Chips";
import { Close } from "./Close";
import { Compare } from "./Compare";
import { Cycle } from "./Cycle";
import { Definition } from "./Definition";
import { DoDont } from "./DoDont";
import { Gauge } from "./Gauge";
import { Hook } from "./Hook";
import { MythFact } from "./MythFact";
import { Process } from "./Process";
import { Proportion } from "./Proportion";
import { Quantity } from "./Quantity";
import { Timeline } from "./Timeline";
import { Timer } from "./Timer";
import { Trend } from "./Trend";
import { Versus } from "./Versus";
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
  Gauge,
  Hook,
  MythFact,
  Process,
  Proportion,
  Quantity,
  Timeline,
  Timer,
  Trend,
  Versus,
};
