import { z } from "zod";
import { chipItem } from "./schema-parts";

const TWO_COLUMN_MAX_LABEL = 14;

export const chipsSchema = z.strictObject({
  items: z.array(chipItem).min(2).max(6),
  columns: z.union([z.literal(1), z.literal(2), z.literal("auto")]).default("auto"),
});

/** "auto" uses two columns only when every label is short enough to sit side by side. */
export const chipColumns = (items: { label: string }[], columns: 1 | 2 | "auto"): 1 | 2 =>
  columns !== "auto" ? columns : items.every((item) => item.label.length <= TWO_COLUMN_MAX_LABEL) ? 2 : 1;
