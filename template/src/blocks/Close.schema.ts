import { z } from "zod";
import { accented, iconName } from "./schema-parts";

export const closeSchema = z.strictObject({
  line1: z.string().min(1).max(26),
  line2: accented,
  accentIcon: iconName.optional(),
  actions: z.array(iconName).max(3).default(["bookmark", "share"]),
  teaser: z.string().max(40).default(""),
});
