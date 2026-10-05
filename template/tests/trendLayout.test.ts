import { expect, it } from "vitest";
import { overlapScore, pickBy, segmentHitsRect, type Rect, type Segment } from "../src/blocks/parts/placeLabel";
import { BOTTOM, DOT, LEFT, RIGHT, TOP, layoutTrendLabels } from "../src/blocks/parts/trendLayout";
import { trendScale } from "../src/blocks/Trend.schema";

const measure = (text: string, size: number) => text.length * size * 0.5;
const MONTHS = [12, 10, 14, 18, 15, 13, 16, 17, 20, 41, 22, 35];
const run = (ys: number[], index: number, label = "Desparasitación tardía") => {
  const { lo, hi } = trendScale(ys.map((y) => ({ y })));
  const n = ys.length;
  const px = (i: number) => LEFT + ((RIGHT - LEFT) * i) / (n - 1);
  const py = (v: number) => BOTTOM - ((v - lo) / (hi - lo)) * (BOTTOM - TOP);
  const out = layoutTrendLabels({ ys, lo, hi, valueText: String(ys[n - 1]), unit: "casos", note: { index, label }, measure });
  const segments: Segment[] = ys.slice(1).map((y, i) => ({ x1: px(i), y1: py(ys[i]), x2: px(i + 1), y2: py(y) }));
  const dots: Rect[] = ys.map((y, i) => ({ x: px(i) - DOT, y: py(y) - DOT, w: 2 * DOT, h: 2 * DOT }));
  return { out, segments, dots };
};
const expectClean = (ys: number[], index: number) => {
  const { out, segments, dots } = run(ys, index);
  expect(out.clear).toBe(true);
  const b = out.bubble!;
  expect(segments.some((s) => segmentHitsRect(s, b))).toBe(false);
  expect(dots.some((d) => overlapScore(b, { box: { x: 0, y: 0, w: 960, h: 340 }, segments: [], rects: [d] }) > 0)).toBe(false);
  expect(segments.some((s) => segmentHitsRect(s, out.valueRect))).toBe(false);
  expect(overlapScore(b, { box: { x: 0, y: 0, w: 960, h: 340 }, segments: [], rects: [out.valueRect] })).toBe(0);
  return out;
};

it("keeps the sample's bubble adjacent without a leader", () => {
  expect(expectClean(MONTHS, 9).leader).toBeNull();
});
it("handles an annotation next to the peak (index 10, peak at 9)", () => {
  expectClean(MONTHS, 10);
});
it("handles a falling series annotated at the end", () => {
  expectClean([41, 38, 33, 30, 24, 20, 17, 14, 12, 10, 9, 8], 11);
});
it("handles peaks at the first and last points", () => {
  expectClean([41, 12, 10, 14, 18, 15, 13, 16, 17, 20, 22, 35], 0);
  expectClean([12, 10, 14, 18, 15, 13, 16, 17, 20, 22, 30, 41], 11);
});
it("draws a leader only for a non-adjacent bubble", () => {
  const { out } = run([41, 38, 33, 30, 24, 20, 17, 14, 12, 10, 9, 8], 11);
  expect(out.leader).not.toBeNull();
  expect(Math.hypot(out.leader!.x2 - out.leader!.x1, out.leader!.y2 - out.leader!.y1)).toBeGreaterThan(0);
});
it("prefers earlier candidates and falls back to the least bad", () => {
  expect(pickBy([3, 0, 0], (c) => c)).toEqual({ pick: 0, score: 0 });
  expect(pickBy([3, 2, 2], (c) => c)).toEqual({ pick: 2, score: 2 });
});
it("places the value label next to the last dot, not another point's", () => {
  const n = MONTHS.length;
  const { lo, hi } = trendScale(MONTHS.map((y) => ({ y })));
  const px = (i: number) => LEFT + ((RIGHT - LEFT) * i) / (n - 1);
  const py = (v: number) => BOTTOM - ((v - lo) / (hi - lo)) * (BOTTOM - TOP);
  const nearestTo = (r: Rect) => {
    const dist = (i: number) => Math.hypot(px(i) - (r.x + r.w / 2), py(MONTHS[i]) - (r.y + r.h / 2));
    return MONTHS.map((_, i) => i).sort((a, b) => dist(a) - dist(b))[0];
  };
  for (const index of [9, 10, 11]) {
    expect(nearestTo(run(MONTHS, index).out.valueRect)).toBe(n - 1);
  }
});
