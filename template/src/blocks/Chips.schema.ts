import { z } from "zod";
import { chipItem } from "./schema-parts";

export const chipsSchema = z.strictObject({
  items: z.array(chipItem).min(2).max(6),
  columns: z.union([z.literal(1), z.literal(2)]).default(2),
});
