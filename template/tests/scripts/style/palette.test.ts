import { expect, it } from "vitest";
import { dominantColors, hsvStats } from "../../../scripts/lib/style/palette";

const image = (pixels: [number, number, number][]) => {
  const data = new Uint8Array(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => data.set([r, g, b, 255], i * 4));
  return { width: pixels.length, height: 1, data };
};

it("ranks colors by share", () => {
  const img = image([...Array(6).fill([255, 0, 0]), ...Array(3).fill([0, 0, 255]), [255, 255, 255]]);
  const colors = dominantColors([img], 5);
  expect(colors.map((c) => c.hex)).toEqual(["#F80808", "#0808F8", "#F8F8F8"]);
  expect(colors[0].share).toBeCloseTo(0.6);
  expect(colors.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1);
});

it("averages brightness and saturation", () => {
  expect(hsvStats([image([[255, 255, 255]])])).toEqual({ brightness: 1, saturation: 0 });
  const red = hsvStats([image([[255, 0, 0]])]);
  expect(red.brightness).toBe(1);
  expect(red.saturation).toBe(1);
});
