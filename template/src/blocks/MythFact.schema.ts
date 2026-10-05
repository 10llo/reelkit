import { z } from "zod";

export const mythFactSchema = z.object({
  mythTag: z.string().min(1).max(12).default("MITO"),
  myth: z.string().min(1).max(70),
  factTag: z.string().min(1).max(12).default("REALIDAD"),
  fact: z.string().min(1).max(90),
});
