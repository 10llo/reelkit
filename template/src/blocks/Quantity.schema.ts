import { z } from "zod";
import { chipItem, colorRef } from "./schema-parts";

const row = z.object({
  label: z.string().min(1).max(28),
  value: z.number().positive(),
  color: colorRef,
  outline: colorRef.optional(),
});

export const quantitySchema = z.object({
  chip: chipItem.optional(),
  unit: z.string().max(4).default(""),
  approx: z.boolean().default(false),
  rows: z.array(row).min(2).max(4),
  highlight: z.enum(["none", "last", "max", "min"]).default("last"),
  conclusion: z.string().min(1).max(36).optional(),
  footnote: z.string().min(1).max(80).optional(),
});

export const highlightIndex = (
  rows: { value: number }[],
  highlight: "none" | "last" | "max" | "min",
): number => {
  if (highlight === "none") return -1;
  if (highlight === "last") return rows.length - 1;
  const values = rows.map((r) => r.value);
  const target = highlight === "max" ? Math.max(...values) : Math.min(...values);
  return values.indexOf(target);
};
