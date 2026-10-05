import { z } from "zod";
import { colorRef, iconName } from "./schema-parts";

export const hookSchema = z.object({
  line1: z.string().min(1).max(28),
  line2: z.string().min(1).max(18),
  chip: z.string().max(40).default(""),
  hero: z
    .object({
      animation: z.enum(["bites", "pop", "shake"]),
      icon: iconName.optional(),
      color: colorRef.default("accent"),
    })
    .refine((h) => h.animation === "bites" || h.icon !== undefined, {
      message: 'hero.icon is required unless animation is "bites"',
    }),
  stamp: iconName.optional(),
});
