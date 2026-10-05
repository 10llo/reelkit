import { expect, it } from "vitest";
import { trendSchema, trendScale } from "../../src/blocks/Trend.schema";

const pts = (...ys: number[]) => ys.map((y, i) => ({ x: `M${i + 1}`, y }));

it("accepts 3–12 points", () => {
  expect(trendSchema.safeParse({ points: pts(1, 2) }).success).toBe(false);
  expect(trendSchema.safeParse({ points: pts(...new Array(13).fill(1)) }).success).toBe(false);
  expect(trendSchema.safeParse({ points: pts(1, 2, 3) }).success).toBe(true);
});
it("limits x labels to 5 characters", () => {
  expect(trendSchema.safeParse({ points: [{ x: "Enero", y: 1 }, { x: "Febrero", y: 2 }, { x: "Mar", y: 3 }] }).success).toBe(false);
});
it("rejects an annotation past the last point and a yMin above the data", () => {
  expect(trendSchema.safeParse({ points: pts(1, 2, 3), annotate: { index: 3, label: "x" } }).success).toBe(false);
  expect(trendSchema.safeParse({ points: pts(5, 6, 7), yMin: 6 }).success).toBe(false);
});
it("scales from 0 (or yMin) with 10 % headroom", () => {
  expect(trendScale(pts(10, 20, 40))).toEqual({ lo: 0, hi: 44 });
  expect(trendScale(pts(-10, 0, 10))).toEqual({ lo: -10, hi: 12 });
  expect(trendScale(pts(36, 38, 40), 35)).toEqual({ lo: 35, hi: 40.5 });
});
it("lifts the baseline for tightly clustered positive data (a fever curve)", () => {
  const { lo, hi } = trendScale(pts(39.9, 39.6, 39.3, 39.1, 38.9, 38.8, 38.6, 38.5));
  expect(lo).toBeLessThanOrEqual(38.5);
  expect(lo).toBeGreaterThan(30);
  expect(hi).toBeGreaterThan(39.9);
  expect(trendScale(pts(39.9, 38.5, 39), 0).lo).toBe(0);
});
