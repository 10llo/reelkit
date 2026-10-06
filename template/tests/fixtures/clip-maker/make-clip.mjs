#!/usr/bin/env node
// Usage: node tests/fixtures/clip-maker/make-clip.mjs <episodeDir> <out.mp4> [--lead=1.2]
// macOS only. Speaks the episode's script with a Spanish `say` voice and renders a
// 1080×1920 test clip with that voice: a stand-in for the talent's phone recording.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const [episodeDir, out] = args.filter((a) => !a.startsWith("--"));
const lead = Number((args.find((a) => a.startsWith("--lead=")) ?? "--lead=1.2").split("=")[1]);
if (!episodeDir || !out) {
  console.error("Usage: node tests/fixtures/clip-maker/make-clip.mjs <episodeDir> <out.mp4> [--lead=1.2]");
  process.exit(2);
}

const voices = execFileSync("say", ["-v", "?"], { encoding: "utf8" }).split("\n");
const voice = voices.map((line) => line.match(/^(.+?)\s+es_[A-Z]{2}\s+#/)).find(Boolean)?.[1].trim();
if (!voice) {
  console.error("No Spanish voice for `say`. Add one in System Settings → Accessibility → Spoken Content.");
  process.exit(1);
}

const { script } = JSON.parse(fs.readFileSync(path.join(episodeDir, "episode.json"), "utf8"));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "clip-maker-"));
const wav = path.join(work, "voice.wav");
const text = `[[slnc ${Math.round(lead * 1000)}]] ${script.join(" [[slnc 500]] ")}`;
execFileSync("say", ["-v", voice, "-o", wav, "--data-format=LEI16@48000", text]);
const seconds = Number(execFileSync("afinfo", [wav], { encoding: "utf8" }).match(/estimated duration: ([\d.]+)/)[1]);

const serveUrl = await bundle({ entryPoint: path.join(here, "index.ts"), publicDir: work });
const inputProps = { seconds };
const composition = await selectComposition({ serveUrl, id: "TestClip", inputProps });
await renderMedia({ serveUrl, composition, inputProps, codec: "h264", outputLocation: path.resolve(out) });
console.log(`✓ ${out}: ${seconds.toFixed(1)} s, voice "${voice}", ${lead} s of silence first`);
