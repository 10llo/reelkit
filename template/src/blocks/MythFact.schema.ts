import { z } from "zod";

export const mythFactSchema = z.strictObject({
  mythTag: z.string().min(1).max(12).default("MITO"),
  myth: z.string().min(1).max(50),
  factTag: z.string().min(1).max(12).default("REALIDAD"),
  fact: z.string().min(1).max(60),
});
