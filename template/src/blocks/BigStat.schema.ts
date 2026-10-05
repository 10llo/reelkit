import { z } from "zod";

export const bigStatSchema = z.strictObject({
  value: z.number(),
  decimals: z.number().int().min(0).max(2).default(0),
  prefix: z.string().max(3).default(""),
  unit: z.string().max(6).default(""),
  label: z.string().min(1).max(60),
  source: z.string().max(80).default(""),
});
