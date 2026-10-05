import { z } from "zod";
import { tone } from "./schema-parts";

export const gaugeSchema = z
  .strictObject({
    value: z.number(),
    unit: z.string().max(6).default(""),
    decimals: z.number().int().min(0).max(2).default(0),
    min: z.number().default(0),
    max: z.number(),
    zones: z.array(z.strictObject({ to: z.number(), label: z.string().min(1).max(12), tone })).min(2).max(4),
    needleLabel: z.string().max(30).default(""),
  })
  .refine((g) => g.max > g.min, { message: "max must be greater than min", path: ["max"] })
  .refine((g) => g.zones.every((zone, i) => zone.to > (i === 0 ? g.min : g.zones[i - 1].to)), {
    message: "zones must be strictly ascending, starting above min",
    path: ["zones"],
  })
  .refine((g) => g.zones[g.zones.length - 1].to === g.max, { message: "the last zone must end at max", path: ["zones"] })
  .refine((g) => g.value >= g.min && g.value <= g.max, { message: "value must be within min–max", path: ["value"] });

/** Index of the zone that holds `value` (zones end at their `to`, inclusive). */
export const zoneIndex = (zones: { to: number }[], value: number) => {
  const i = zones.findIndex((zone) => value <= zone.to);
  return i === -1 ? zones.length - 1 : i;
};
