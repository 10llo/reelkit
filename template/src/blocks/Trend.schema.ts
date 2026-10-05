import { z } from "zod";

const HEADROOM = 0.1;

export const trendSchema = z
  .strictObject({
    points: z.array(z.strictObject({ x: z.string().min(1).max(5), y: z.number() })).min(3).max(12),
    yUnit: z.string().max(6).default(""),
    decimals: z.number().int().min(0).max(2).default(0),
    yMin: z.number().optional(),
    annotate: z.strictObject({ index: z.number().int().min(0), label: z.string().min(1).max(24) }).optional(),
  })
  .refine((t) => !t.annotate || t.annotate.index < t.points.length, {
    message: "annotate.index must point at a point",
    path: ["annotate", "index"],
  })
  .refine((t) => t.yMin === undefined || t.yMin <= Math.min(...t.points.map((p) => p.y)), {
    message: "yMin must be at or below the smallest value",
    path: ["yMin"],
  });

/** Vertical range: from yMin (or 0, or the lowest value if negative) to the highest value plus 10 % of the span. */
export const trendScale = (points: { y: number }[], yMin?: number) => {
  const ys = points.map((p) => p.y);
  const lo = yMin ?? Math.min(0, ...ys);
  const top = Math.max(...ys);
  const span = top - lo || 1;
  return { lo, hi: Math.round((top + span * HEADROOM) * 1e6) / 1e6 };
};
