import { describe, expect, it } from "vitest";
import { FLOOD_FRAMES, FLOOD_LEAD, floodAt, floodCues, floodScale } from "../../src/brand/flood";
import { SCENE_BG } from "../../src/brand/tokens";
import { defaultSceneStarts } from "../../src/frame/timing";

const V916 = { width: 1080, height: 1920 };
const V45 = { width: 1080, height: 1350 };
const starts = defaultSceneStarts(900); // [0, 90, 300, 510, 765]

describe("floodAt", () => {
  it("is the hook color with no flood before the first cut", () => {
    expect(floodAt(0, starts, V916)).toEqual({ base: SCENE_BG[0], flood: null });
    expect(floodAt(90 - FLOOD_LEAD - 1, starts, V916).flood).toBeNull();
  });
  it("grows the next scene's color from the top-left at the first cut", () => {
    const s = floodAt(90 - FLOOD_LEAD, starts, V916);
    expect(s.base).toBe(SCENE_BG[0]);
    expect(s.flood).toMatchObject({ color: SCENE_BG[1], progress: 0, x: 0, y: 0, scale: 0 });
  });
  it("alternates to the top-right on the next cut", () => {
    expect(floodAt(300 - FLOOD_LEAD + 3, starts, V916).flood).toMatchObject({ color: SCENE_BG[2], x: 1080, y: 0 });
  });
  it("eases out and finishes after 14 frames, leaving the new base", () => {
    const mid = floodAt(90 - FLOOD_LEAD + 7, starts, V916).flood!;
    expect(mid.progress).toBeGreaterThan(0.8);
    expect(floodAt(90 - FLOOD_LEAD + FLOOD_FRAMES, starts, V916)).toEqual({ base: SCENE_BG[1], flood: null });
  });
  it("reaches the close color and stays there", () => {
    expect(floodAt(899, starts, V916)).toEqual({ base: SCENE_BG[4], flood: null });
  });
  it("has no flood without scene starts (block previews)", () => {
    expect(floodAt(500, null, V916)).toEqual({ base: SCENE_BG[0], flood: null });
  });
  it("never overlaps two cuts for 30-frame scenes in a 15 s episode", () => {
    const tight = [0, 30, 60, 90, 120];
    for (let f = 0; f < 450; f++) {
      const s = floodAt(f, tight, V916);
      if (s.flood) {
        expect(s.base).toBe(SCENE_BG[SCENE_BG.indexOf(s.flood.color as (typeof SCENE_BG)[number]) - 1]);
      }
    }
  });
});

describe("floodScale", () => {
  it.each([["9x16", V916], ["4x5", V45]])("covers the whole %s canvas with the main pad", (_, canvas) => {
    expect(floodScale(canvas) * 20).toBeGreaterThanOrEqual(Math.hypot(canvas.width, canvas.height));
  });
});

describe("floodCues", () => {
  it("whooshes when each flood starts", () => {
    expect(floodCues(starts)).toEqual([84, 294, 504, 759].map((at) => ({ name: "whoosh", at })));
  });
  it("stays inside a 15 s video", () => {
    for (const cue of floodCues([0, 30, 60, 90, 120])) {
      expect(cue.at).toBeGreaterThanOrEqual(0);
      expect(cue.at).toBeLessThan(450);
    }
  });
});
