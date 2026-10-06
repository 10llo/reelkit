import fs from "node:fs";
import path from "node:path";
import type { Caption } from "@remotion/captions";
import { resolveSceneStarts, totalFrames } from "../../src/frame/timing";
import { alignTranscript, type Alignment } from "../lib/align";
import { flagString, type Args } from "../lib/args";
import { decodeMono16k } from "../lib/audio";
import { loadEpisodeDir, readJson, saveEpisodeRaw, writeJson } from "../lib/episode-files";
import { probeMedia, speechBounds, type ClipInfo } from "../lib/probe";
import {
  clipOverrunSeconds,
  refitSceneStarts,
  shiftCaptions,
  speechOverrunSeconds,
  trimFromLeadingSilence,
} from "../lib/refit";
import { buildSyncReport, type SyncProposal } from "../lib/sync-report";
import {
  DEFAULT_MODEL,
  isModel,
  MODELS,
  TranscriptionUnavailable,
  transcribeWithWhisper,
  whisperLanguage,
  type Model,
  type Transcriber,
} from "../lib/transcribe";

export const FILES = {
  proposal: "sync-proposal.json",
  report: "sync-report.md",
  raw: "captions.raw.json",
  proposed: "captions.proposed.json",
  final: "captions.json",
} as const;

const READY_STAGES = new Set(["built", "synced", "exported"]);

export type SyncDeps = {
  probe: (file: string) => Promise<ClipInfo>;
  decode: (file: string) => Promise<Float32Array>;
  transcribe: Transcriber;
  now: () => Date;
};

const REAL_DEPS: SyncDeps = {
  probe: probeMedia,
  decode: decodeMono16k,
  transcribe: transcribeWithWhisper,
  now: () => new Date(),
};

export const prepare = async (
  dir: string,
  clipPath: string,
  options: { model: Model },
  overrides: Partial<SyncDeps> = {},
): Promise<number> => {
  const deps = { ...REAL_DEPS, ...overrides };
  const { episode, talent } = loadEpisodeDir(dir);
  if (!READY_STAGES.has(episode.stage)) {
    console.error(`✗ ${episode.slug} is at stage "${episode.stage}"; build the video before adding the talent clip.`);
    return 1;
  }
  if (!fs.existsSync(clipPath)) {
    console.error(`✗ No file at ${clipPath}`);
    return 1;
  }
  const info = await deps.probe(clipPath);
  if (!info.hasVideo || !info.hasAudio) {
    console.error(
      `✗ ${clipPath} needs both video and audio (video: ${info.hasVideo ? "yes" : "no"}, audio: ${info.hasAudio ? "yes" : "no"}).`,
    );
    return 1;
  }
  for (const stale of [FILES.raw, FILES.proposed]) {
    fs.rmSync(path.join(dir, stale), { force: true });
  }
  const clipName = `talent${path.extname(clipPath).toLowerCase() || ".mp4"}`;
  const clipDest = path.join(dir, clipName);
  if (path.resolve(clipPath) !== path.resolve(clipDest)) {
    fs.copyFileSync(clipPath, clipDest);
  }

  const wave = await deps.decode(clipDest);
  const speech = speechBounds(wave);
  const total = totalFrames(episode.durationSeconds);
  let alignment: Alignment | null = null;
  let unavailable: string | null = null;
  try {
    const transcript = await deps.transcribe(wave, { model: options.model, language: whisperLanguage(talent.locale) });
    writeJson(path.join(dir, FILES.raw), transcript);
    alignment = alignTranscript(episode.script, transcript);
    if (!alignment.captions.length) {
      unavailable = "Whisper no escuchó ninguna palabra en el clip.";
      alignment = null;
    }
  } catch (err) {
    if (!(err instanceof TranscriptionUnavailable)) {
      throw err;
    }
    unavailable = err.message;
  }

  const captions: Caption[] = alignment?.captions ?? [];
  const firstMs = captions.length ? captions[0].startMs : speech ? speech.startSeconds * 1000 : null;
  const lastMs = captions.length ? captions[captions.length - 1].endMs : speech ? speech.endSeconds * 1000 : null;
  const trimStartFrames = trimFromLeadingSilence(firstMs);
  const warnings: string[] = [];
  let sceneStarts: number[] | null = null;
  if (alignment) {
    const refit = refitSceneStarts(alignment.sceneFirstWordMs, trimStartFrames, total);
    sceneStarts = refit.starts;
    warnings.push(...alignment.warnings, ...refit.warnings);
    writeJson(path.join(dir, FILES.proposed), shiftCaptions(captions, trimStartFrames, total));
  }

  const proposal: SyncProposal = {
    clip: { src: clipName, trimStartFrames },
    sceneStarts,
    captionsSrc: alignment ? FILES.final : "",
    transcribed: alignment !== null,
    model: options.model,
    speechOverrunSeconds: speechOverrunSeconds(lastMs, trimStartFrames, episode.durationSeconds),
    clipOverrunSeconds: clipOverrunSeconds(info.durationSeconds, trimStartFrames, episode.durationSeconds),
    createdAt: deps.now().toISOString(),
  };
  writeJson(path.join(dir, FILES.proposal), proposal);
  const report = buildSyncReport({
    dir,
    episode,
    info,
    proposal,
    alignment,
    unavailable,
    warnings,
    previousStarts: resolveSceneStarts(episode.sceneStarts, total).starts,
  });
  fs.writeFileSync(path.join(dir, FILES.report), report);

  console.log(`✓ Clip copied to ${clipDest}`);
  console.log(alignment ? `✓ Transcribed with ${options.model}` : `⚠ No transcript: ${unavailable}`);
  if (proposal.speechOverrunSeconds > 0) {
    console.log(`⚠ The voice runs ${proposal.speechOverrunSeconds} s past the end of the video.`);
  }
  console.log(`Review ${path.join(dir, FILES.report)}, then: npm run reelkit -- sync apply ${dir}`);
  return 0;
};

const captionProblem = (captions: unknown): string | null => {
  if (!Array.isArray(captions)) {
    return "must be a list of captions";
  }
  const bad = captions.findIndex(
    (c) =>
      typeof c?.text !== "string" ||
      typeof c?.startMs !== "number" ||
      typeof c?.endMs !== "number" ||
      c.endMs < c.startMs,
  );
  return bad < 0 ? null : `entry ${bad} needs "text", "startMs" and "endMs" (endMs ≥ startMs)`;
};

export const apply = async (dir: string, options: { acceptOverrun: boolean }): Promise<number> => {
  const loaded = loadEpisodeDir(dir);
  const proposalFile = path.join(dir, FILES.proposal);
  if (!fs.existsSync(proposalFile)) {
    console.error(`✗ No sync proposal in ${dir}. Run: npm run reelkit -- sync prepare ${dir} <clip>`);
    return 1;
  }
  const proposal = readJson(proposalFile) as SyncProposal;
  if (proposal.speechOverrunSeconds > 0 && !options.acceptOverrun) {
    console.error(
      `✗ The voice runs ${proposal.speechOverrunSeconds} s past the ${loaded.episode.durationSeconds} s video, so its last words would be cut. ` +
        "Re-record, or apply anyway with --accept-overrun.",
    );
    return 1;
  }
  if (!fs.existsSync(path.join(dir, proposal.clip.src))) {
    console.error(`✗ The clip ${proposal.clip.src} is missing from ${dir}. Run sync prepare again.`);
    return 1;
  }
  if (proposal.captionsSrc) {
    const captions = readJson(path.join(dir, FILES.proposed));
    const problem = captionProblem(captions);
    if (problem) {
      console.error(`✗ ${FILES.proposed}: ${problem}`);
      return 1;
    }
    writeJson(path.join(dir, proposal.captionsSrc), captions);
  }
  saveEpisodeRaw(loaded, {
    clip: proposal.clip,
    sceneStarts: proposal.sceneStarts ?? loaded.raw.sceneStarts ?? null,
    captionsSrc: proposal.captionsSrc,
    stage: "synced",
  });
  console.log(`✓ ${loaded.episode.slug} is synced. Check it with: npm run studio -- ${dir}`);
  return 0;
};

const USAGE = `Usage: reelkit sync prepare <episodeDir> <clip> [--model=${DEFAULT_MODEL}]
       reelkit sync apply <episodeDir> [--accept-overrun]`;

export const run = async (args: Args): Promise<number> => {
  const [action, dir, clip] = args.positional;
  if (action === "prepare" && dir && clip) {
    const model = flagString(args, "model", DEFAULT_MODEL);
    if (!isModel(model)) {
      console.error(`Unknown model "${model}". Use one of: ${MODELS.join(", ")}`);
      return 2;
    }
    return prepare(dir, clip, { model });
  }
  if (action === "apply" && dir) {
    return apply(dir, { acceptOverrun: args.flags["accept-overrun"] === true });
  }
  console.error(USAGE);
  return 2;
};
