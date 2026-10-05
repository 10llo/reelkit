import { z } from "zod";
import { iconName } from "./schema-parts";

/** Longest single word (characters) a step label may hold: it must fit its column at 40 px. */
export const maxProcessWord = (n: number) => Math.floor((960 / n - 12) / 22);

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
  })
  .superRefine((p, ctx) => {
    const k = maxProcessWord(p.steps.length);
    p.steps.forEach((s, i) => {
      const word = s.label.split(/\s+/).find((w) => w.length > k);
      if (word) {
        ctx.addIssue({
          code: "custom",
          message: `label word "${word}" is too long for ${p.steps.length} steps (max ${k} characters)`,
          path: ["steps", i, "label"],
        });
      }
    });
  });
