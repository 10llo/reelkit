import { z } from "zod";
import { iconName } from "./schema-parts";

/** Longest single word (characters) a label may hold: it must fit its column at 40 px. */
export const maxTimelineWord = (n: number) => Math.floor((960 / n - 12) / 22);

export const timelineSchema = z
  .strictObject({
    events: z
      .array(z.strictObject({ when: z.string().min(1).max(8), label: z.string().min(1).max(24), icon: iconName.optional() }))
      .min(3)
      .max(5),
    nowMarker: z.number().int().min(0).optional(),
  })
  .refine((t) => t.nowMarker === undefined || t.nowMarker < t.events.length, {
    message: "nowMarker must point at an event",
    path: ["nowMarker"],
  })
  .superRefine((t, ctx) => {
    const k = maxTimelineWord(t.events.length);
    t.events.forEach((e, i) => {
      const word = e.label.split(/\s+/).find((w) => w.length > k);
      if (word) {
        ctx.addIssue({
          code: "custom",
          message: `label word "${word}" is too long for ${t.events.length} events (max ${k} characters)`,
          path: ["events", i, "label"],
        });
      }
    });
  });
