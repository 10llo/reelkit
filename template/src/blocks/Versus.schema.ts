import { z } from "zod";
import { iconName } from "./schema-parts";

/** Longest single word (characters) an attribute may hold: attributes wrap in the 280 px middle column at 40 px. */
export const MAX_ATTRIBUTE_WORD = 12;

const side = z.strictObject({
  name: z.string().min(1).max(14),
  icon: iconName,
});

export const versusSchema = z
  .strictObject({
    vsLabel: z.string().min(1).max(4).default("VS"),
    left: side,
    right: side,
    rows: z
      .array(
        z.strictObject({
          attribute: z.string().min(1).max(14),
          left: z.string().min(1).max(12),
          right: z.string().min(1).max(12),
          winner: z.enum(["left", "right", "tie"]).optional(),
        }),
      )
      .min(2)
      .max(4),
  })
  .superRefine((v, ctx) => {
    v.rows.forEach((r, i) => {
      const word = r.attribute
        .split(/\s+/)
        .find((w) => w.length > MAX_ATTRIBUTE_WORD);
      if (word) {
        ctx.addIssue({
          code: "custom",
          message: `attribute word "${word}" is too long (max ${MAX_ATTRIBUTE_WORD} characters)`,
          path: ["rows", i, "attribute"],
        });
      }
    });
  });
