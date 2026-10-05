import { z } from "zod";

const PEOPLE_MAX = 20;

/** Longest single word (characters) the wrapping label (48 px) and source (30 px) may hold in the 540 px text column. */
export const MAX_LABEL_WORD = 20;
export const MAX_SOURCE_WORD = 32;

const longWord = (text: string, max: number) =>
  text.split(/\s+/).find((w) => w.length > max);

export const proportionSchema = z
  .strictObject({
    numerator: z.number().int().min(0),
    denominator: z.number().int().min(2).max(100),
    style: z.enum(["dots", "donut", "people"]).default("dots"),
    ofWord: z.string().min(1).max(10).default("de cada"),
    label: z.string().min(1).max(60),
    source: z.string().max(80).default(""),
  })
  .refine((p) => p.numerator <= p.denominator, {
    message: "numerator must be ≤ denominator",
    path: ["numerator"],
  })
  .refine((p) => p.style !== "people" || p.denominator <= PEOPLE_MAX, {
    message: `"people" style supports at most ${PEOPLE_MAX} units`,
    path: ["style"],
  })
  .superRefine((p, ctx) => {
    const label = longWord(p.label, MAX_LABEL_WORD);
    if (label)
      ctx.addIssue({
        code: "custom",
        message: `label word "${label}" is too long (max ${MAX_LABEL_WORD} characters)`,
        path: ["label"],
      });
    const source = longWord(p.source, MAX_SOURCE_WORD);
    if (source)
      ctx.addIssue({
        code: "custom",
        message: `source word "${source}" is too long (max ${MAX_SOURCE_WORD} characters)`,
        path: ["source"],
      });
  });

/** Columns × rows for `denominator` units, as square as possible. */
export const gridShape = (denominator: number) => {
  const cols = Math.ceil(Math.sqrt(denominator));
  return { cols, rows: Math.ceil(denominator / cols) };
};
