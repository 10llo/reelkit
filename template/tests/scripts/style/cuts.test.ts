import { describe, expect, it } from "vitest";
import { detectCuts, frameDiff, rhythm } from "../../../scripts/lib/style/cuts";

const flat = (v: number, n = 64) => new Uint8Array(n).fill(v);
const times = (n: number, fps = 10) => Array.from({ length: n }, (_, i) => i / fps);

it("measures the mean absolute difference", () => {
  expect(frameDiff(flat(0), flat(100))).toBe(100);
  expect(frameDiff(flat(50), flat(50))).toBe(0);
});

describe("detectCuts", () => {
  it("finds a hard cut", () => {
    const frames = [...Array(10).fill(flat(20)), ...Array(10).fill(flat(200))];
    expect(detectCuts(frames, times(20))).toEqual([1]);
  });
  it("ignores a gradual fade", () => {
    const frames = Array.from({ length: 30 }, (_, i) => flat(i * 8));
    expect(detectCuts(frames, times(30))).toEqual([]);
  });
  it("keeps cuts at least 0.3 s apart", () => {
    const frames = [flat(0), flat(0), flat(200), flat(200), flat(0), flat(0), flat(0), flat(0), flat(200), flat(200)];
    // spikes at 0.2 and 0.4 (only 0.2 apart) → keep the first; another at 0.8
    expect(detectCuts(frames, times(10))).toEqual([0.2, 0.8]);
  });
  it("is empty for one frame", () => {
    expect(detectCuts([flat(0)], [0])).toEqual([]);
  });
});

it("summarizes rhythm", () => {
  expect(rhythm([2, 4, 6], 8)).toEqual({ cutsPerMinute: 22.5, avgShotSec: 2, firstCutSec: 2 });
  expect(rhythm([], 30)).toEqual({ cutsPerMinute: 0, avgShotSec: 30, firstCutSec: null });
});
