import { z } from "zod";
import { diagramName, iconName } from "./schema-parts";

const PER_SIDE = 3;
export const ANATOMY_COLUMN = 250;
/** Longest single word (characters) a callout label may hold at 40 px in its label column. */
export const maxAnatomyWord = Math.floor(ANATOMY_COLUMN / 19);
const callout = z.strictObject({
  label: z.string().min(1).max(16),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const anatomySchema = z
  .strictObject({
    subject: z.union([z.strictObject({ diagram: diagramName }), z.strictObject({ icon: iconName })]),
    callouts: z.array(callout).min(2).max(6),
    highlight: z.number().int().min(0).optional(),
  })
  .refine(
    (a) => a.callouts.filter((c) => c.x < 50).length <= PER_SIDE && a.callouts.filter((c) => c.x >= 50).length <= PER_SIDE,
    { message: `at most ${PER_SIDE} callouts per side (x < 50 is the left side)`, path: ["callouts"] },
  )
  .superRefine((a, ctx) => {
    a.callouts.forEach((c, i) => {
      const word = c.label.split(/\s+/).find((w) => w.length > maxAnatomyWord);
      if (word) {
        ctx.addIssue({
          code: "custom",
          message: `label word "${word}" is too long (max ${maxAnatomyWord} characters)`,
          path: ["callouts", i, "label"],
        });
      }
    });
  })
  .refine((a) => a.highlight === undefined || a.highlight < a.callouts.length, {
    message: "highlight must point at a callout",
    path: ["highlight"],
  });

export type CalloutSlot = { side: "left" | "right"; slot: number; count: number };

/** Each callout's column and its position in that column (sorted top to bottom by anchor y). */
export const calloutSlots = (callouts: { x: number; y: number }[]): CalloutSlot[] => {
  const sideOf = (c: { x: number }) => (c.x < 50 ? "left" : "right");
  return callouts.map((c, i) => {
    const same = callouts.map((o, j) => ({ o, j })).filter(({ o }) => sideOf(o) === sideOf(c));
    const ordered = [...same].sort((a, b) => a.o.y - b.o.y || a.j - b.j);
    return { side: sideOf(c), slot: ordered.findIndex(({ j }) => j === i), count: same.length };
  });
};
