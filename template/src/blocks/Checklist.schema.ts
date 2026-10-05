import { z } from "zod";

export const checklistSchema = z.strictObject({
  rows: z.array(z.string().min(1).max(40)).min(2).max(4),
  pill: z.string().min(1).max(32).optional(),
});
