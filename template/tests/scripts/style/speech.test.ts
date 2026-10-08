import { expect, it } from "vitest";
import { speechMetrics } from "../../../scripts/lib/style/speech";

const w = (text: string, s: number, e: number) => ({ text, startMs: s * 1000, endMs: e * 1000 });

it("measures pace, first word, hook text and coverage", () => {
  const words = [w("¿Tu", 0.4, 0.6), w("perro", 0.6, 1), w("come", 1, 1.4), w("chocolate?", 2.8, 3.4), w("Mira.", 5, 5.5)];
  expect(speechMetrics(words, 10, null)).toEqual({
    wordsPerMinute: 30,
    firstWordSec: 0.4,
    hookText: "¿Tu perro come chocolate?",
    coverage: 0.21,
    unavailable: null,
  });
});

it("is null with a reason when there are no words", () => {
  expect(speechMetrics([], 10, null)).toEqual({ wordsPerMinute: null, firstWordSec: null, hookText: null, coverage: null, unavailable: "no speech detected" });
  expect(speechMetrics([], 10, "WebGPU is not available").unavailable).toBe("WebGPU is not available");
});
