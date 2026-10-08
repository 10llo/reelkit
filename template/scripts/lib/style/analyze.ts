import fs from "node:fs";
import path from "node:path";
import { decodeMono16k, SAMPLE_RATE } from "../audio";
import { probeMedia } from "../probe";
import { TranscriptionUnavailable, type Model, type Transcriber } from "../transcribe";
import type { TranscriptWord } from "../align";
import { readAccounts, summarizeAccount, writeAccounts } from "./accounts";
import { detectCuts, rhythm } from "./cuts";
import { sampleFrames, toGray } from "./frames";
import { audioLevels } from "./levels";
import { dominantColors, hsvStats } from "./palette";
import { composeSheet } from "./sheet";
import { HOOK_SECONDS, speechMetrics } from "./speech";
import type { AccountsFile, VideoMetrics } from "./types";

export const MAX_SECONDS = 180;
const CUT_FPS = 10;
const CUT_WIDTH = 64;
const SHEET_WIDTH = 270;
const PALETTE_FRAMES = 24;
const SHEET_FRAMES = 12;

export type AnalyzeDeps = { transcribe: Transcriber | null; model: Model; language: string };

const range = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i));
const label = (t: number) => `${Math.round(t * 10) / 10}s`;

/** Samples frames and fails with the video's name when none could be decoded. */
const framesOf = async (file: string, times: number[], width: number, what: string) => {
  const frames = await sampleFrames(file, times, width);
  if (frames.length === 0) throw new Error(`Could not decode any ${what} frame from ${file}`);
  return frames;
};

export const analyzeVideo = async (dir: string, deps: AnalyzeDeps): Promise<VideoMetrics> => {
  const file = path.join(dir, "video.mp4");
  const info = JSON.parse(fs.readFileSync(path.join(dir, "info.json"), "utf8"));
  const probe = await probeMedia(file);
  const truncated = probe.durationSeconds > MAX_SECONDS;
  const duration = Math.min(probe.durationSeconds, MAX_SECONDS);
  const last = Math.max(0, duration - 0.05);

  const cutTimes = range(Math.floor(duration * CUT_FPS), (i) => i / CUT_FPS);
  const cutSamples = await framesOf(file, cutTimes, CUT_WIDTH, "cut-detection");
  const cuts = detectCuts(cutSamples.map((s) => toGray(s.frame)), cutSamples.map((s) => s.t));

  const paletteFrames = (await framesOf(file, range(PALETTE_FRAMES, (i) => (last * i) / (PALETTE_FRAMES - 1)), CUT_WIDTH, "palette")).map((s) => s.frame);
  const sheet = await framesOf(file, range(SHEET_FRAMES, (i) => (last * i) / (SHEET_FRAMES - 1)), SHEET_WIDTH, "sheet");
  fs.writeFileSync(path.join(dir, "sheet.png"), composeSheet(sheet.map((s) => s.frame), sheet.map((s) => label(s.t)), 4));
  const hook = await framesOf(file, range(HOOK_SECONDS * 2, (i) => Math.min(i * 0.5, last)), SHEET_WIDTH, "hook");
  fs.writeFileSync(path.join(dir, "hook.png"), composeSheet(hook.map((s) => s.frame), hook.map((s) => label(s.t)), 6));

  let wave: Float32Array = new Float32Array(0);
  let words: TranscriptWord[] = [];
  let unavailable: string | null = null;
  if (!probe.hasAudio) {
    unavailable = "no audio track";
  } else {
    wave = (await decodeMono16k(file)).subarray(0, Math.round(MAX_SECONDS * SAMPLE_RATE));
    if (!deps.transcribe) {
      unavailable = "skipped";
    } else {
      try {
        words = await deps.transcribe(wave, { model: deps.model, language: deps.language });
      } catch (err) {
        if (!(err instanceof TranscriptionUnavailable)) throw err;
        unavailable = err.message;
      }
    }
  }

  const metrics: VideoMetrics = {
    id: String(info.id ?? path.basename(dir)),
    durationSec: Math.round(duration * 100) / 100,
    width: probe.width,
    height: probe.height,
    fps: probe.fps,
    truncated,
    cuts,
    ...rhythm(cuts, duration),
    speech: speechMetrics(words, duration, unavailable),
    audio: audioLevels(wave, words, SAMPLE_RATE),
    palette: dominantColors(paletteFrames),
    ...hsvStats(paletteFrames),
    post: {
      url: info.url ?? null,
      caption: info.caption ?? null,
      hashtags: info.hashtags ?? [],
      views: info.views ?? null,
      likes: info.likes ?? null,
      comments: info.comments ?? null,
      uploadDate: info.uploadDate ?? null,
    },
  };
  fs.writeFileSync(path.join(dir, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);
  return metrics;
};

export const analyzeFolder = async (root: string, deps: AnalyzeDeps): Promise<AccountsFile> => {
  const file = readAccounts(root);
  if (!file) throw new Error(`No accounts.json in ${root}. Run: npm run reelkit -- style fetch ${root} <accounts…>`);
  for (const account of file.accounts) {
    if (account.status !== "ok") continue;
    const metrics: VideoMetrics[] = [];
    const failedVideos: { id: string; reason: string }[] = [];
    const dirs = account.videos.map((id) => ({ id, dir: path.join(root, account.id, id) }));
    const withVideo = dirs.filter((d) => fs.existsSync(path.join(d.dir, "video.mp4")));
    if (withVideo.length === 0 && dirs.length > 0 && dirs.every((d) => fs.existsSync(path.join(d.dir, "metrics.json")))) {
      // Videos were deleted after a first analysis: keep the medians, recomputed from the saved metrics.
      for (const d of dirs) metrics.push(JSON.parse(fs.readFileSync(path.join(d.dir, "metrics.json"), "utf8")) as VideoMetrics);
    }
    for (const { id, dir } of withVideo) {
      console.log(`→ ${account.id}/${id}`);
      try {
        metrics.push(await analyzeVideo(dir, deps));
      } catch (err) {
        const reason = (err as Error).message;
        console.error(`✗ ${account.id}/${id}: ${reason}`);
        failedVideos.push({ id, reason });
      }
    }
    account.failedVideos = failedVideos;
    account.median = summarizeAccount(metrics);
  }
  writeAccounts(root, file);
  return file;
};
