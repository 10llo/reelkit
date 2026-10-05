import { z } from "zod";
import { iconName } from "./schema-parts";

export const doDontSchema = z.object({
  cards: z
    .array(z.object({ icon: iconName, label: z.string().min(1).max(32), verdict: z.enum(["no", "yes"]) }))
    .length(2),
});
