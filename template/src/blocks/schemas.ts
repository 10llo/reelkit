import { bigStatSchema } from "./BigStat.schema";
import { checklistSchema } from "./Checklist.schema";
import { chipsSchema } from "./Chips.schema";
import { closeSchema } from "./Close.schema";
import { compareSchema } from "./Compare.schema";
import { cycleSchema } from "./Cycle.schema";
import { definitionSchema } from "./Definition.schema";
import { doDontSchema } from "./DoDont.schema";
import { hookSchema } from "./Hook.schema";
import { mythFactSchema } from "./MythFact.schema";
import { processSchema } from "./Process.schema";
import { quantitySchema } from "./Quantity.schema";
import { timelineSchema } from "./Timeline.schema";
import { timerSchema } from "./Timer.schema";

// Node-safe: schemas only, no components. Each block task adds its entry here.
export const BLOCK_SCHEMAS = {
  BigStat: bigStatSchema,
  Checklist: checklistSchema,
  Chips: chipsSchema,
  Close: closeSchema,
  Compare: compareSchema,
  Cycle: cycleSchema,
  Definition: definitionSchema,
  DoDont: doDontSchema,
  Hook: hookSchema,
  MythFact: mythFactSchema,
  Process: processSchema,
  Quantity: quantitySchema,
  Timeline: timelineSchema,
  Timer: timerSchema,
} as const;

export type BlockName = keyof typeof BLOCK_SCHEMAS;

export const isBlockName = (name: string): name is BlockName =>
  Object.prototype.hasOwnProperty.call(BLOCK_SCHEMAS, name);
