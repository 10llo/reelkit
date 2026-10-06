import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import type { Caption } from "@remotion/captions";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import type { Args } from "../lib/args";
import { WHATSAPP_LIMIT_BYTES, whatsappSettings } from "../lib/bitrate";
import { loadEpisodeDir, readJson, saveEpisodeRaw } from "../lib/episode-files";
import { buildSrt } from "../lib/srt";
import { verifyPngFile, verifyVideoFile } from "../lib/verify-output";

const TEMPLATE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const EXPORT_TARGETS = ["9x16", "whatsapp", "4x5", "cover-9x16", "cover-4x5", "srt"] as const;
export type ExportTarget = (typeof EXPORT_TARGETS)[number];
const VIDEO_TARGETS = new Set<ExportTarget>(["9x16", "whatsapp", "4x5"]);

export const parseTargets = (only: string | undefined): ExportTarget[] => {
  if (!only) {
    return [...EXPORT_TARGETS];
  }
  const list = only.split(",").map((t) => t.trim()).filter(Boolean);
  const unknown = list.filter((t) => !(EXPORT_TARGETS as readonly string[]).includes(t));
  if (unknown.length) {
    throw new Error(`Unknown export target(s): ${unknown.join(", ")}. Use: ${EXPORT_TARGETS.join(", ")}`);
  }
  return [...new Set(list)] as ExportTarget[];
};

export const isFullExport = (targets: ExportTarget[]): boolean => EXPORT_TARGETS.every((t) => targets.includes(t));

export const outputName = (slug: string, target: ExportTarget): string =>
  ({
    "9x16": `${slug}-9x16.mp4`,
    whatsapp: `${slug}-whatsapp.mp4`,
    "4x5": `${slug}-4x5.mp4`,
    "cover-9x16": "cover-9x16.png",
    "cover-4x5": "cover-4x5.png",
    srt: `${slug}.srt`,
  })[target];

const compositionFor = (target: ExportTarget) => {
  const wide = target.endsWith("4x5");
  const cover = target.startsWith("cover");
  return {
    id: cover ? (wide ? "Cover45" : "Cover") : wide ? "Episode45" : "Episode",
    inputProps: {
      layoutName: wide ? "4x5" : "9x16",
      showGuides: false,
      checkMode: cover,
      episode: null,
      talent: null,
      sceneStarts: null,
    },
  };
};

const onBrowserLog = (log: { text: string }) => {
  if (log.text.includes("[reelkit]")) {
    console.warn(`  ${log.text}`);
  }
};

export const run = async (args: Args): Promise<number> => {
  const dir = args.positional[0];
  if (!dir) {
    console.error(`Usage: reelkit export <episodeDir> [--only=${EXPORT_TARGETS.join(",")}]`);
    return 2;
  }
  let targets: ExportTarget[];
  try {
    targets = parseTargets(typeof args.flags.only === "string" ? args.flags.only : undefined);
  } catch (err) {
    console.error((err as Error).message);
    return 2;
  }
  const loaded = loadEpisodeDir(dir);
  const { episode } = loaded;
  if (targets.some((t) => VIDEO_TARGETS.has(t)) && !episode.clip.src) {
    console.error(
      `✗ ${episode.slug} has no talent clip yet. Run: npm run reelkit -- sync prepare ${dir} <clip>, then sync apply.\n` +
        "  (Covers and subtitles can be exported now with --only=cover-9x16,cover-4x5,srt.)",
    );
    return 1;
  }
  if (!episode.captionsSrc) {
    console.warn("⚠ Captions are timed from the script (provisional): they were not synced to the voice.");
  }

  const outDir = path.join(dir, "exports");
  fs.mkdirSync(outDir, { recursive: true });
  let serveUrl: string | null = null;
  const getServeUrl = async () => {
    serveUrl ??= await bundle({ entryPoint: path.join(TEMPLATE_ROOT, "src/index.ts"), publicDir: path.resolve(dir) });
    return serveUrl;
  };

  const problems: string[] = [];
  for (const target of targets) {
    const name = outputName(episode.slug, target);
    const file = path.join(outDir, name);
    console.log(`→ ${name}`);
    try {
      if (target === "srt") {
        const captions = episode.captionsSrc ? (readJson(path.join(dir, episode.captionsSrc)) as Caption[]) : null;
        fs.writeFileSync(file, buildSrt(episode, captions));
        continue;
      }
      const { id, inputProps } = compositionFor(target);
      const url = await getServeUrl();
      const composition = await selectComposition({ serveUrl: url, id, inputProps, onBrowserLog });
      if (target.startsWith("cover")) {
        await renderStill({ serveUrl: url, composition, output: file, inputProps, imageFormat: "png", onBrowserLog });
        problems.push(...verifyPngFile(file, composition).map((p) => `${name}: ${p}`));
        continue;
      }
      const whatsapp = target === "whatsapp" ? whatsappSettings(episode.durationSeconds) : null;
      let shown = -1;
      await renderMedia({
        serveUrl: url,
        composition,
        inputProps,
        codec: "h264",
        pixelFormat: "yuv420p",
        outputLocation: file,
        onBrowserLog,
        ...(whatsapp ?? { crf: 18, audioBitrate: "192k" }),
        onProgress: ({ progress }) => {
          const pct = Math.floor(progress * 10) * 10;
          if (pct !== shown) {
            shown = pct;
            process.stdout.write(`\r  ${pct} %`);
          }
        },
      });
      process.stdout.write("\n");
      const found = await verifyVideoFile(file, {
        durationSeconds: episode.durationSeconds,
        width: composition.width,
        height: composition.height,
        maxBytes: whatsapp ? WHATSAPP_LIMIT_BYTES : undefined,
      });
      problems.push(...found.map((p) => `${name}: ${p}`));
    } catch (err) {
      problems.push(`${name}: ${(err as Error).message}`);
    }
  }

  for (const target of targets) {
    const file = path.join(outDir, outputName(episode.slug, target));
    if (!fs.existsSync(file)) {
      continue;
    }
    console.log(`  ${path.relative(process.cwd(), file)}  ${(fs.statSync(file).size / 1_000_000).toFixed(1)} MB`);
  }
  if (problems.length) {
    console.error(problems.map((p) => `✗ ${p}`).join("\n"));
    return 1;
  }
  if (isFullExport(targets)) {
    saveEpisodeRaw(loaded, { stage: "exported" });
  }
  console.log(`✓ Exported ${targets.length} file(s) to ${outDir}`);
  return 0;
};
