import { z } from "zod";
import { iconName } from "./schema-parts";

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
  });
