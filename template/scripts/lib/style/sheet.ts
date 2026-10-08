import { PNG } from "pngjs";
import type { Rgba } from "./palette";

// 3×5 bitmap glyphs, row-major, "1" = lit.
const GLYPHS: Record<string, string> = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111",
  "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001",
  "8": "111101111101111", "9": "111101111001111", ".": "000000000000010", s: "000011110001110",
};
const LABEL_H = 24;

export const drawDigits = (img: Rgba, text: string, x: number, y: number, scale: number, color: [number, number, number]) => {
  let cx = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (glyph) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          if (glyph[r * 3 + c] !== "1") continue;
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = cx + c * scale + dx;
              const py = y + r * scale + dy;
              if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
              img.data.set([...color, 255], (py * img.width + px) * 4);
            }
          }
        }
      }
    }
    cx += 4 * scale;
  }
};

export const composeSheet = (frames: Rgba[], labels: string[], cols: number): Buffer => {
  const w = frames[0].width;
  const h = frames[0].height;
  const rows = Math.ceil(frames.length / cols);
  const out: Rgba = { width: w * Math.min(cols, frames.length), height: rows * (h + LABEL_H), data: new Uint8Array(0) };
  out.data = new Uint8Array(out.width * out.height * 4);
  for (let i = 3; i < out.data.length; i += 4) out.data[i] = 255; // opaque black background
  frames.forEach((f, i) => {
    const ox = (i % cols) * w;
    const oy = Math.floor(i / cols) * (h + LABEL_H);
    for (let y = 0; y < Math.min(h, f.height); y++) {
      for (let x = 0; x < Math.min(w, f.width); x++) {
        out.data.set(f.data.subarray((y * f.width + x) * 4, (y * f.width + x) * 4 + 4), ((oy + LABEL_H + y) * out.width + ox + x) * 4);
      }
    }
    drawDigits(out, labels[i] ?? "", ox + 4, oy + 4, 3, [255, 214, 0]);
  });
  const png = new PNG({ width: out.width, height: out.height });
  png.data = Buffer.from(out.data);
  return PNG.sync.write(png);
};
