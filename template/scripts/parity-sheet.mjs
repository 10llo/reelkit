#!/usr/bin/env node
// Usage: node scripts/parity-sheet.mjs <dirA> <dirB> <out.png>
// Places same-named PNGs from dirA (left) and dirB (right) side by side, one pair per row, at 1/4 scale.
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const [dirA, dirB, out] = process.argv.slice(2);
if (!dirA || !dirB || !out) {
  console.error("Usage: node scripts/parity-sheet.mjs <dirA> <dirB> <out.png>");
  process.exit(1);
}
const SCALE = 4;
const names = fs.readdirSync(dirA).filter((f) => f.endsWith(".png") && fs.existsSync(path.join(dirB, f))).sort();
const read = (file) => PNG.sync.read(fs.readFileSync(file));
const pairs = names.map((n) => [read(path.join(dirA, n)), read(path.join(dirB, n))]);
const cellW = Math.ceil(pairs[0][0].width / SCALE);
const cellH = Math.ceil(pairs[0][0].height / SCALE);
const sheet = new PNG({ width: cellW * 2, height: cellH * pairs.length });
pairs.forEach((pair, row) => {
  pair.forEach((img, col) => {
    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        const src = ((y * SCALE) * img.width + x * SCALE) * 4;
        const dst = ((row * cellH + y) * sheet.width + col * cellW + x) * 4;
        img.data.copy(sheet.data, dst, src, src + 4);
      }
    }
  });
});
fs.writeFileSync(out, PNG.sync.write(sheet));
console.log(`Wrote ${out} (${names.join(", ")})`);
