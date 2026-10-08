import { PNG } from "pngjs";
import { expect, it } from "vitest";
import { composeSheet, drawDigits } from "../../../scripts/lib/style/sheet";

const solid = (w: number, h: number, rgb: [number, number, number]) => {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([...rgb, 255], i * 4);
  return { width: w, height: h, data };
};

it("lays frames out in a grid with a label strip per cell", () => {
  const frames = Array.from({ length: 5 }, () => solid(10, 20, [200, 0, 0]));
  const png = PNG.sync.read(composeSheet(frames, ["0s", "1s", "2s", "3s", "4s"], 4));
  expect(png.width).toBe(40);
  expect(png.height).toBe(2 * (20 + 24));
  // a pixel inside the first frame (below its label strip) is red
  const i = ((24 + 5) * png.width + 5) * 4;
  expect([...png.data.slice(i, i + 3)]).toEqual([200, 0, 0]);
});

it("draws digit pixels in the given color", () => {
  const img = solid(40, 20, [0, 0, 0]);
  drawDigits(img, "1.5s", 1, 1, 2, [255, 255, 0]);
  let lit = 0;
  for (let i = 0; i < img.data.length; i += 4) if (img.data[i] === 255 && img.data[i + 1] === 255) lit++;
  expect(lit).toBeGreaterThan(10);
});
