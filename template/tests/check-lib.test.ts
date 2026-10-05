import { describe, expect, it } from "vitest";
import { compareRegion, insideRoundedRect, keyFrames, parseFitLog, parseMinFontLog, parseOverflowLog, slotRegion } from "../scripts/check-lib.mjs";
import layouts from "../src/frame/layouts.json";

const scenes = {
  hook: { beats: [{}] },
  step1: { beats: [{}, {}], split: 0.5 },
  step2: { beats: [{}, {}], split: 0.5 },
  step3: { beats: [{}] },
  close: { beats: [{}] },
};

describe("keyFrames", () => {
  it("covers the first and last frame, sorted and unique, inside the video", () => {
    const frames: number[] = keyFrames([0, 90, 300, 510, 765], 900, scenes);
    expect(frames[0]).toBe(0);
    expect(frames[frames.length - 1]).toBe(899);
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
    expect(new Set(frames).size).toBe(frames.length);
    expect(frames.every((f) => f >= 0 && f < 900)).toBe(true);
    expect(frames).toContain(195 - 9); // just before beat B of step1
  });
});

describe("slot region", () => {
  const region = slotRegion(layouts["9x16"]);
  it("is the slot inflated by the clearance", () => {
    expect(region).toEqual({ x: 534, y: 984, width: 412, height: 532, radius: 56 });
  });
  it("excludes the rounded corners", () => {
    expect(insideRoundedRect(region.x + 1, region.y + 1, region)).toBe(false);
    expect(insideRoundedRect(region.x + 200, region.y + 200, region)).toBe(true);
  });
});

describe("compareRegion", () => {
  const image = (w: number, h: number) => ({ width: w, height: h, data: new Uint8Array(w * h * 4) });
  const region = { x: 0, y: 0, width: 40, height: 40, radius: 10 };
  it("counts changed pixels inside the region only", () => {
    const a = image(50, 50);
    const b = image(50, 50);
    expect(compareRegion(a, b, region)).toBe(0);
    b.data[(20 * 50 + 20) * 4] = 255; // centre: inside
    expect(compareRegion(a, b, region)).toBe(1);
    b.data[(0 * 50 + 0) * 4] = 255; // corner: outside the rounding
    expect(compareRegion(a, b, region)).toBe(1);
    b.data[(45 * 50 + 45) * 4] = 255; // outside the region
    expect(compareRegion(a, b, region)).toBe(1);
  });
  it("ignores differences within tolerance", () => {
    const a = image(50, 50);
    const b = image(50, 50);
    b.data[(20 * 50 + 20) * 4] = 2;
    expect(compareRegion(a, b, region)).toBe(0);
  });
});

it("parses FitStage logs", () => {
  expect(parseFitLog("[reelkit:fit] step3 0.912")).toEqual({ name: "step3", scale: 0.912 });
  expect(parseFitLog("something else")).toBeNull();
});

it("parses min-font logs", () => {
  expect(parseMinFontLog("[reelkit:minfont] step2 44.0")).toEqual({ name: "step2", px: 44 });
  expect(parseMinFontLog("[reelkit:fit] step2 1.000")).toBeNull();
});

it("parses overflow logs", () => {
  expect(parseOverflowLog("[reelkit:overflow] preview-Timeline 2")).toEqual({ name: "preview-Timeline", count: 2 });
  expect(parseOverflowLog("[reelkit:minfont] step2 44.0")).toBeNull();
});
