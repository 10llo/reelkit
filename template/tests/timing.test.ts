import { describe, expect, it } from "vitest";
import {
  defaultSceneStarts,
  enter,
  pulse,
  resolveSceneStarts,
  sceneDurations,
  splitBeats,
  totalFrames,
} from "../src/frame/timing";

describe("scene starts", () => {
  it("reproduces the Dani timing at 30 s", () => {
    expect(defaultSceneStarts(900)).toEqual([0, 90, 300, 510, 765]);
  });
  it("scales to 15 s and 60 s", () => {
    expect(defaultSceneStarts(450)).toEqual([0, 45, 150, 255, 383]);
    expect(defaultSceneStarts(1800)).toEqual([0, 180, 600, 1020, 1530]);
  });
  it("converts seconds to frames", () => {
    expect(totalFrames(20)).toBe(600);
  });
  it("accepts valid re-fitted starts", () => {
    expect(resolveSceneStarts([0, 80, 290, 520, 780], 900)).toEqual({
      starts: [0, 80, 290, 520, 780],
      warning: null,
    });
  });
  it("uses defaults for null", () => {
    expect(resolveSceneStarts(null, 900)).toEqual({ starts: [0, 90, 300, 510, 765], warning: null });
  });
  it("falls back with a warning when starts decrease", () => {
    const r = resolveSceneStarts([0, 90, 80, 500, 700], 900);
    expect(r.starts).toEqual([0, 90, 300, 510, 765]);
    expect(r.warning).toContain("Invalid sceneStarts");
  });
  it("falls back when the last scene is shorter than 1 s", () => {
    expect(resolveSceneStarts([0, 90, 300, 510, 880], 900).warning).not.toBeNull();
  });
  it("falls back when the first start is not 0 or values are fractional", () => {
    expect(resolveSceneStarts([5, 90, 300, 510, 765], 900).warning).not.toBeNull();
    expect(resolveSceneStarts([0, 90.5, 300, 510, 765], 900).warning).not.toBeNull();
  });
  it("computes durations", () => {
    expect(sceneDurations([0, 90, 300, 510, 765], 900)).toEqual([90, 210, 210, 255, 135]);
  });
});

describe("beats", () => {
  it("returns one beat spanning the scene", () => {
    const [b] = splitBeats(255, 1, 0.5);
    expect(b.from).toBe(0);
    expect(b.duration).toBe(255);
    expect(b.at(190 / 255)).toBeCloseTo(190);
  });
  it("splits two beats", () => {
    const [a, b] = splitBeats(210, 2, 0.5);
    expect([a.from, a.duration, b.from, b.duration]).toEqual([0, 105, 105, 105]);
    expect(b.at(12 / 105)).toBeCloseTo(117);
  });
});

describe("springs", () => {
  it("enter is 0 at its start and ~1 after 12 frames", () => {
    expect(enter(10, 30, 10)).toBe(0);
    expect(enter(22, 30, 10)).toBeGreaterThan(0.99);
  });
  it("pulse peaks halfway and returns to 1", () => {
    expect(pulse(52.5, 45, 15, 1.05)).toBeCloseTo(1.05);
    expect(pulse(70, 45, 15, 1.05)).toBe(1);
  });
});
