import { z } from "zod";
import { chipItem } from "./schema-parts";

export const timerSchema = z
  .strictObject({
    low: z.number().min(0),
    high: z.number().positive(),
    unit: z.string().min(1).max(4),
    caption: z.string().min(1).max(40),
    chips: z.array(chipItem).max(3).default([]),
  })
  .refine((t) => t.low <= t.high, { message: "low must be ≤ high" });
