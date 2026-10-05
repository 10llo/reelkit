import { z } from "zod";
import { accented, colorRef, iconName } from "./schema-parts";

export const compareSchema = z.object({
  items: z
    .array(
      z
        .object({ label: z.string().min(1).max(12), color: colorRef.optional(), icon: iconName.optional() })
        .refine((i) => i.color !== undefined || i.icon !== undefined, { message: "each item needs a color or an icon" }),
    )
    .min(2)
    .max(4),
  meter: z.boolean().default(true),
  conclusion: accented.optional(),
});
