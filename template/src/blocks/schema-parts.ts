import { z } from "zod";
import { ICON_NAMES } from "../icons/names";

export const iconName = z.enum(ICON_NAMES);

/** #RRGGBB or a palette token such as "accent" or "chocoMilk". */
export const colorRef = z
  .string()
  .regex(/^(#[0-9a-fA-F]{6}|[a-zA-Z][a-zA-Z0-9]*)$/, "use #RRGGBB or a palette color name");

export const accented = z
  .strictObject({
    text: z.string().min(1).max(40),
    accent: z.string().optional(),
    tone: z.enum(["accent", "danger", "safe"]).default("accent"),
  })
  .refine((v) => v.accent === undefined || v.text.includes(v.accent), {
    message: "accent must appear in text",
  });
export type Accented = z.infer<typeof accented>;

export const chipItem = z.strictObject({ icon: iconName, label: z.string().min(1).max(22) });
