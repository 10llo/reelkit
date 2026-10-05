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

const niceFloor = (v: number, step: number) => Math.floor(v / step + 1e-9) * step;

/**
 * Vertical range: from yMin when set; otherwise 0, unless every value is positive and close together
 * (min/max > 0.5), where the baseline sits 10 % of the span below the lowest value, rounded down to a nice step.
 * The top is the highest value plus 10 % of the span.
 */
export const trendScale = (points: { y: number }[], yMin?: number) => {
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const top = Math.max(...ys);
  let lo = yMin ?? Math.min(0, ...ys);
  if (yMin === undefined && min > 0 && min / top > 0.5) {
    const range = top - min;
    if (range > 0) {
      const raw = range / 10;
      const mag = 10 ** Math.floor(Math.log10(raw));
      const step = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? raw;
      lo = Math.round(niceFloor(min - range * HEADROOM, step) * 1e6) / 1e6;
    }
  }
  const span = top - lo || 1;
  return { lo, hi: Math.round((top + span * HEADROOM) * 1e6) / 1e6 };
};
