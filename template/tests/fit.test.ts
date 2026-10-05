import { expect, it } from "vitest";
import { fitWordsFontSize } from "../src/frame/fit";

const measure = (word: string, size: number) => word.length * size * 0.6;

it("returns base when the widest word fits", () => {
  expect(fitWordsFontSize("hola mundo", 300, 40, "x", 800, measure)).toBe(40);
});
it("scales down by the widest word, never up", () => {
  expect(fitWordsFontSize("a HOSPITALIZA b", 200, 40, "x", 800, measure)).toBe(Math.floor((40 * 200) / (11 * 24)));
  expect(fitWordsFontSize("a", 2000, 40, "x", 800, measure)).toBe(40);
});
it("handles empty text", () => {
  expect(fitWordsFontSize("  ", 100, 40, "x", 800, measure)).toBe(40);
});
