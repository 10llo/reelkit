import { expect, it } from "vitest";
import { audioLevels, toDb } from "../../../scripts/lib/style/levels";

const RATE = 1000;
const tone = (amp: number, n: number) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(i));

it("converts rms to dBFS", () => {
  expect(toDb(1)).toBe(0);
  expect(toDb(0.1)).toBe(-20);
  expect(toDb(0)).toBeNull();
});

it("separates voice from the gaps under it", () => {
  // 0–1 s loud (speech), 1–2 s quiet (music bed)
  const wave = new Float32Array([...tone(0.5, RATE), ...tone(0.05, RATE)]);
  const words = [{ text: "hola", startMs: 0, endMs: 1000 }];
  const a = audioLevels(wave, words, RATE);
  expect(a.speechDb!).toBeGreaterThan(a.gapDb! + 15);
  expect(a.peakDb!).toBeLessThanOrEqual(0);
});

it("has no speech level without words, and no gap level when speech fills everything", () => {
  const wave = tone(0.2, RATE);
  expect(audioLevels(wave, [], RATE).speechDb).toBeNull();
  expect(audioLevels(wave, [{ text: "x", startMs: 0, endMs: 1000 }], RATE).gapDb).toBeNull();
  expect(audioLevels(new Float32Array(0), [], RATE)).toEqual({ speechDb: null, gapDb: null, peakDb: null });
});
