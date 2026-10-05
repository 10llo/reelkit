#!/usr/bin/env node
// Usage: npm run check -- [episodeDir] [--layouts=9x16,4x5] | npm run check -- --gallery [--block=A,B]
// With no episodeDir, checks every folder in examples/ that has an episode.json.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { compareRegion, keyFrames, parseFitLog, parseMinFontLog, slotRegion } from "./check-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dirArg = args.find((a) => !a.startsWith("--"));
const layoutNames = (args.find((a) => a.startsWith("--layouts=")) ?? "--layouts=9x16,4x5").split("=")[1].split(",");
const layouts = JSON.parse(fs.readFileSync(path.join(root, "src/frame/layouts.json"), "utf8"));
const COMPOSITIONS = { "9x16": "Episode", "4x5": "Episode45" };
const FIT_WARN = 0.85;
const MIN_TEXT_PX = 40;
const GALLERY_MIN_SCALE = 0.85;
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`✗ ${msg}`);
};

const checkLayout = async (serveUrl, raw, layoutName, outDir) => {
  const id = COMPOSITIONS[layoutName];
  if (!id) {
    fail(`Unknown layout "${layoutName}". Use 9x16 or 4x5.`);
    return;
  }
  const inputProps = { layoutName, showGuides: false, checkMode: true, episode: null, talent: null, sceneStarts: null };
  let composition;
  try {
    composition = await selectComposition({ serveUrl, id, inputProps });
  } catch (err) {
    fail(`${layoutName}: the episode did not load:\n${err.message}`);
    return;
  }
  const before = failures;
  const expected = Math.round(raw.durationSeconds * 30);
  if (composition.durationInFrames !== expected) {
    fail(`${layoutName}: ${composition.durationInFrames} frames, expected ${expected}`);
  }
  const frames = keyFrames(composition.props.sceneStarts, composition.durationInFrames, raw.scenes);
  const images = {};
  const fits = new Map();
  const minFonts = new Map();
  for (const frame of frames) {
    const output = path.join(outDir, `${layoutName}-${frame}.png`);
    await renderStill({
      serveUrl,
      composition,
      frame,
      output,
      imageFormat: "png",
      inputProps,
      onBrowserLog: (log) => {
        const fit = parseFitLog(log.text);
        if (fit) fits.set(fit.name, Math.min(fits.get(fit.name) ?? 1, fit.scale));
        const font = parseMinFontLog(log.text);
        if (font) minFonts.set(font.name, Math.min(minFonts.get(font.name) ?? Infinity, font.px));
      },
    });
    images[frame] = PNG.sync.read(fs.readFileSync(output));
  }
  const region = slotRegion(layouts[layoutName]);
  const reference = images[frames[frames.length - 1]];
  // Skip the slot's own 12-frame entrance.
  for (const frame of frames.filter((f) => f >= 12)) {
    const changed = compareRegion(reference, images[frame], region);
    if (changed > 0) {
      fail(`${layoutName}: ${changed} pixels changed inside the talent slot at frame ${frame} (${path.join(outDir, `${layoutName}-${frame}.png`)})`);
    }
  }
  for (const [name, scale] of fits) {
    if (scale < FIT_WARN) console.warn(`⚠ ${layoutName}: scene "${name}" is scaled to ${scale.toFixed(2)} to fit the stage`);
  }
  for (const [name, px] of minFonts) {
    if (px < MIN_TEXT_PX) console.warn(`⚠ ${layoutName}: scene "${name}" has text at ${px} px`);
  }
  if (failures === before) {
    console.log(`✓ ${layoutName}: ${frames.length} frames checked, slot clear, ${composition.durationInFrames} frames`);
  }
};

const checkEpisode = async (episodeDir) => {
  const episodeFile = path.join(episodeDir, "episode.json");
  if (!fs.existsSync(episodeFile)) {
    fail(`No episode.json in ${episodeDir}`);
    return;
  }
  const raw = JSON.parse(fs.readFileSync(episodeFile, "utf8"));
  console.log(`Bundling with public dir ${episodeDir}…`);
  const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: episodeDir });
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-check-"));
  for (const layoutName of layoutNames) {
    await checkLayout(serveUrl, raw, layoutName, outDir);
  }
  console.log(`Frames: ${outDir}`);
};

const checkGallery = async () => {
  const samples = JSON.parse(fs.readFileSync(path.join(root, "src/gallery/samples.json"), "utf8"));
  const only = args.find((a) => a.startsWith("--block="))?.split("=")[1].split(",");
  const selected = samples.map((sample, i) => ({ sample, i })).filter(({ sample }) => !only || only.includes(sample.block));
  if (!selected.length) {
    fail(`No gallery samples match --block=${only}`);
    return;
  }
  const publicDir = path.join(root, "examples/smoke");
  console.log("Bundling the gallery…");
  const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir });
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-gallery-"));
  for (const layoutName of layoutNames) {
    for (const { sample, i } of selected) {
      const inputProps = {
        layoutName,
        block: sample.block,
        props: sample.props,
        title: sample.title,
        durationInFrames: sample.durationInFrames,
        talent: null,
      };
      let composition;
      try {
        composition = await selectComposition({ serveUrl, id: "BlockPreview", inputProps });
      } catch (err) {
        fail(`${layoutName} ${sample.block}: the sample did not validate:\n${err.message}`);
        continue;
      }
      let scale = 1;
      let minFont = null;
      const output = path.join(outDir, `${layoutName}-${String(i).padStart(2, "0")}-${sample.block}.png`);
      await renderStill({
        serveUrl,
        composition,
        frame: composition.durationInFrames - 1,
        output,
        imageFormat: "png",
        inputProps,
        onBrowserLog: (log) => {
          const fit = parseFitLog(log.text);
          if (fit) scale = Math.min(scale, fit.scale);
          const font = parseMinFontLog(log.text);
          if (font) minFont = minFont === null ? font.px : Math.min(minFont, font.px);
        },
      });
      const problems = [];
      if (scale < GALLERY_MIN_SCALE) problems.push(`scaled to ${scale.toFixed(2)}`);
      if (minFont !== null && minFont < MIN_TEXT_PX) problems.push(`text at ${minFont} px`);
      if (problems.length) {
        fail(`${layoutName} ${sample.block}: ${problems.join(", ")} (${output})`);
      } else {
        console.log(`✓ ${layoutName} ${sample.block}: fit ${scale.toFixed(2)}, smallest text ${minFont ?? "-"} px`);
      }
    }
  }
  console.log(`Frames: ${outDir}`);
};

const main = async () => {
  if (args.includes("--gallery")) {
    await checkGallery();
    return;
  }
  if (dirArg) {
    await checkEpisode(path.resolve(dirArg));
    return;
  }
  const examplesDir = path.join(root, "examples");
  const dirs = fs.existsSync(examplesDir)
    ? fs
        .readdirSync(examplesDir)
        .sort()
        .map((name) => path.join(examplesDir, name))
        .filter((dir) => fs.existsSync(path.join(dir, "episode.json")))
    : [];
  if (!dirs.length) {
    fail(`No examples with an episode.json in ${examplesDir}`);
    return;
  }
  for (const dir of dirs) {
    console.log(`\n== ${path.basename(dir)}`);
    try {
      await checkEpisode(dir);
    } catch (err) {
      fail(err.stack ?? String(err));
    }
  }
};

main()
  .catch((err) => fail(err.stack ?? String(err)))
  .finally(() => {
    process.exitCode = failures ? 1 : 0;
  });
