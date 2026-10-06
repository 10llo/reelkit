import { describe, expect, it } from "vitest";
import { defaultSceneStarts } from "../../src/frame/timing";
import {
  clipOverrunSeconds,
  refitSceneStarts,
  shiftCaptions,
  speechOverrunSeconds,
  trimFromLeadingSilence,
} from "../../scripts/lib/refit";

describe("trimFromLeadingSilence", () => {
  it.each([
    [null, 0],
    [150, 0],
    [300, 0],
    [1000, 24],
    [2500, 69],
  ])("first speech at %s ms → %d frames", (ms, frames) => {
    expect(trimFromLeadingSilence(ms)).toBe(frames);
  });
});

describe("refitSceneStarts", () => {
  it("cuts each scene 3 frames before its first word", () => {
    const { starts, warnings } = refitSceneStarts([1000, 4000, 11000, 18000, 26500], 24, 900);
    expect(starts).toEqual([0, 93, 303, 513, 768]);
    expect(warnings).toEqual([]);
  });
  it("keeps the default start for a scene whose first word wasn't found", () => {
    const { starts, warnings } = refitSceneStarts([1000, 4000, null, 18000, 26500], 24, 900);
    expect(starts).toEqual([0, 93, defaultSceneStarts(900)[2], 513, 768]);
    expect(warnings.join("\n")).toContain("Escena 3");
  });
  it("falls back to all defaults when scenes would be shorter than a second", () => {
    const { starts, warnings } = refitSceneStarts([1000, 1500, 1600, 18000, 26500], 24, 900);
    expect(starts).toEqual(defaultSceneStarts(900));
    expect(warnings.join("\n")).toContain("cortes por defecto");
  });
});

describe("overruns", () => {
  it("measures voice past the end in video time", () => {
    expect(speechOverrunSeconds(31500, 24, 30)).toBe(0.7);
    expect(speechOverrunSeconds(30500, 24, 30)).toBe(0);
    expect(speechOverrunSeconds(null, 0, 30)).toBe(0);
  });
  it("measures the clip past the end", () => {
    expect(clipOverrunSeconds(32, 30, 30)).toBe(1);
    expect(clipOverrunSeconds(29, 0, 30)).toBe(0);
  });
});

describe("shiftCaptions", () => {
  const cap = (text: string, startMs: number, endMs: number) => ({ text, startMs, endMs, timestampMs: startMs, confidence: null });
  it("moves captions into video time and drops the ones outside it", () => {
    const shifted = shiftCaptions(
      [cap("antes", 500, 900), cap("hola", 1200, 1500), { ...cap("fin", 30800, 31600), pageBreakAfter: true }, cap("tarde", 31500, 31800)],
      30,
      900,
    );
    expect(shifted).toEqual([
      { text: "hola", startMs: 200, endMs: 500, timestampMs: 200, confidence: null },
      { text: "fin", startMs: 29800, endMs: 30000, timestampMs: 29800, confidence: null, pageBreakAfter: true },
    ]);
  });
});
