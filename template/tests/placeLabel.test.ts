import { expect, it } from "vitest";
import { overlapScore, pickCandidate, rectsOverlap, segmentHitsRect } from "../src/blocks/parts/placeLabel";

const box = { x: 0, y: 0, w: 100, h: 100 };
const rect = { x: 40, y: 40, w: 20, h: 20 };

it("detects a segment crossing a rect, one inside it, and one clear of it", () => {
  expect(segmentHitsRect({ x1: 0, y1: 50, x2: 100, y2: 50 }, rect)).toBe(true);
  expect(segmentHitsRect({ x1: 45, y1: 45, x2: 50, y2: 50 }, rect)).toBe(true);
  expect(segmentHitsRect({ x1: 0, y1: 10, x2: 100, y2: 10 }, rect)).toBe(false);
  expect(segmentHitsRect({ x1: 0, y1: 0, x2: 30, y2: 100 }, rect)).toBe(false);
});
it("detects overlapping rects", () => {
  expect(rectsOverlap(rect, { x: 55, y: 55, w: 20, h: 20 })).toBe(true);
  expect(rectsOverlap(rect, { x: 60, y: 40, w: 20, h: 20 })).toBe(false);
});
it("scores out-of-box rects as bad", () => {
  expect(overlapScore({ x: 90, y: 0, w: 20, h: 10 }, { box, segments: [], rects: [] })).toBeGreaterThanOrEqual(100);
});
it("picks the first clear candidate", () => {
  const o = { box, segments: [{ x1: 0, y1: 50, x2: 100, y2: 50 }], rects: [] };
  const bad = { x: 40, y: 45, w: 20, h: 10 };
  const good1 = { x: 40, y: 10, w: 20, h: 10 };
  const good2 = { x: 40, y: 80, w: 20, h: 10 };
  expect(pickCandidate([bad, good1, good2], o)).toBe(good1);
});
it("falls back to the least-overlapping candidate", () => {
  const o = { box, segments: [{ x1: 0, y1: 50, x2: 100, y2: 50 }], rects: [{ x: 0, y: 0, w: 100, h: 20 }] };
  const two = { x: 40, y: 15, w: 20, h: 40 }; // rect + segment
  const one = { x: 40, y: 45, w: 20, h: 10 }; // segment only
  const out = { x: 90, y: 60, w: 30, h: 10 }; // outside
  expect(pickCandidate([two, out, one], o)).toBe(one);
});
