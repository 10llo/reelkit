import { z } from "zod";
import { iconName } from "./schema-parts";

const MAX_WORDS = 18;

export const definitionSchema = z.strictObject({
  term: z.string().min(1).max(24),
  pronunciation: z.string().max(30).default(""),
  category: z.string().max(20).default(""),
  meaning: z
    .string()
    .min(1)
    .max(120)
    .refine((s) => s.trim().split(/\s+/).length <= MAX_WORDS, { message: `meaning must be ${MAX_WORDS} words or fewer` }),
  icon: iconName,
});
