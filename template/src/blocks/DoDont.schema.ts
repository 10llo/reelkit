import { z } from "zod";
import { iconName } from "./schema-parts";

export const doDontSchema = z.strictObject({
  cards: z
    .array(z.strictObject({ icon: iconName, label: z.string().min(1).max(32), verdict: z.enum(["no", "yes"]) }))
    .length(2),
});
