import { z } from "zod";
import { iconName } from "./schema-parts";

export const processSchema = z
  .strictObject({
    steps: z
      .array(
        z.strictObject({
          icon: iconName,
          label: z
            .string()
            .min(1)
            .max(20)
            .refine((s) => s.trim().split(/\s+/).length <= 4, { message: "label must be 4 words or fewer" }),
        }),
      )
      .min(3)
      .max(5),
    connector: z.enum(["arrow", "chevron"]).default("arrow"),
    highlightStep: z.number().int().min(0).optional(),
  })
  .refine((p) => p.highlightStep === undefined || p.highlightStep < p.steps.length, {
    message: "highlightStep must point at a step",
    path: ["highlightStep"],
  });
