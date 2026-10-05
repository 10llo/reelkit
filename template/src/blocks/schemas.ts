import { bigStatSchema } from "./BigStat.schema";
import { checklistSchema } from "./Checklist.schema";
import { chipsSchema } from "./Chips.schema";
import { compareSchema } from "./Compare.schema";
import { doDontSchema } from "./DoDont.schema";
import { hookSchema } from "./Hook.schema";
import { timerSchema } from "./Timer.schema";

// Node-safe: schemas only, no components. Each block task adds its entry here.
export const BLOCK_SCHEMAS = {
  BigStat: bigStatSchema,
  Checklist: checklistSchema,
  Chips: chipsSchema,
  Compare: compareSchema,
  DoDont: doDontSchema,
  Hook: hookSchema,
  Timer: timerSchema,
} as const;

export type BlockName = keyof typeof BLOCK_SCHEMAS;

export const isBlockName = (name: string): name is BlockName =>
  Object.prototype.hasOwnProperty.call(BLOCK_SCHEMAS, name);
