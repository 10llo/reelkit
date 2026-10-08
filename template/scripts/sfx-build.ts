// Usage: npm run sfx:build. Regenerates src/brand/sfx/*.wav (committed; the render imports them).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SFX_NAMES } from "../src/brand/sfx";
import { SFX_RATE, encodeWav16, synthesize } from "./lib/sfx-synth";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/brand/sfx");
fs.mkdirSync(outDir, { recursive: true });
for (const name of SFX_NAMES) {
  const file = path.join(outDir, `${name}.wav`);
  fs.writeFileSync(file, encodeWav16(synthesize(name), SFX_RATE));
  console.log(`✓ ${path.relative(process.cwd(), file)}`);
}
