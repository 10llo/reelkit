import fs from "node:fs";
import path from "node:path";
import type { Caption } from "@remotion/captions";
import { resolveSceneStarts, totalFrames } from "../../src/frame/timing";
import { alignTranscript, type Alignment } from "../lib/align";
import { flagString, type Args } from "../lib/args";
import { decodeMono16k } from "../lib/audio";
import { loadEpisodeDir, readJson, saveEpisodeRaw, validateEpisodeRaw, writeJson } from "../lib/episode-files";
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
  let info: ClipInfo;
  try {
    info = await deps.probe(clipPath);
  } catch (err) {
    console.error(`✗ ${clipPath} is not a readable video file: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
  if (!info.hasVideo || !info.hasAudio) {
    console.error(
      `✗ ${clipPath} needs both video and audio (video: ${info.hasVideo ? "yes" : "no"}, audio: ${info.hasAudio ? "yes" : "no"}).`,
    );
    return 1;
  }
  for (const stale of [FILES.proposal, FILES.report, FILES.raw, FILES.proposed]) {
    fs.rmSync(path.join(dir, stale), { force: true });
  }
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith("talent.proposed.")) {
      fs.rmSync(path.join(dir, name), { force: true });
    }
  }
  const ext = path.extname(clipPath).toLowerCase() || ".mp4";
  const clipName = `talent${ext}`;
  const stagedName = `talent.proposed${ext}`;
  const stagedPath = path.join(dir, stagedName);
  fs.copyFileSync(clipPath, stagedPath);

  const total = totalFrames(episode.durationSeconds);
  let alignment: Alignment | null = null;
  let unavailable: string | null = null;
  let speech: ReturnType<typeof speechBounds> = null;
  let wave: Float32Array | null = null;
  try {
    wave = await deps.decode(stagedPath);
    speech = speechBounds(wave);
  } catch (err) {
    unavailable = `Could not decode the clip's audio: ${err instanceof Error ? err.message : String(err)}`;
  }
  if (wave) {
    try {
      let language: string;
      try {
        language = whisperLanguage(talent.locale);
      } catch (err) {
        throw new TranscriptionUnavailable(err instanceof Error ? err.message : String(err));
      }
      const transcript = await deps.transcribe(wave, { model: options.model, language });
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
    stagedClip: stagedName,
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

  console.log(`✓ Clip copied to ${stagedPath}`);
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const proposalProblem = (proposal: unknown): string | null => {
  if (!isRecord(proposal)) {
    return "must be a JSON object";
  }
  const clip = proposal.clip;
  if (!isRecord(clip) || typeof clip.src !== "string") {
    return '"clip.src" must be a string';
  }
  if (!Number.isInteger(clip.trimStartFrames) || (clip.trimStartFrames as number) < 0) {
    return '"clip.trimStartFrames" must be an integer ≥ 0';
  }
  if (typeof proposal.stagedClip !== "string") {
    return '"stagedClip" must be a string';
  }
  const starts = proposal.sceneStarts;
  if (starts !== null && !(Array.isArray(starts) && starts.every((s) => typeof s === "number"))) {
    return '"sceneStarts" must be null or a list of numbers';
  }
  if (typeof proposal.captionsSrc !== "string") {
    return '"captionsSrc" must be a string';
  }
  if (typeof proposal.speechOverrunSeconds !== "number") {
    return '"speechOverrunSeconds" must be a number';
  }
  return null;
};

export const apply = async (dir: string, options: { acceptOverrun: boolean }): Promise<number> => {
  const loaded = loadEpisodeDir(dir);
  const proposalFile = path.join(dir, FILES.proposal);
  if (!fs.existsSync(proposalFile)) {
    console.error(`✗ No sync proposal in ${dir}. Run: npm run reelkit -- sync prepare ${dir} <clip>`);
    return 1;
  }
  let parsed: unknown;
  try {
    parsed = readJson(proposalFile);
  } catch (err) {
    console.error(`✗ ${FILES.proposal}: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
  const shape = proposalProblem(parsed);
  if (shape) {
    console.error(`✗ ${FILES.proposal}: ${shape}`);
    return 1;
  }
  const proposal = parsed as SyncProposal;
  if (proposal.speechOverrunSeconds > 0 && !options.acceptOverrun) {
    console.error(
      `✗ The voice runs ${proposal.speechOverrunSeconds} s past the ${loaded.episode.durationSeconds} s video, so its last words would be cut. ` +
        "Re-record, or apply anyway with --accept-overrun.",
    );
    return 1;
  }
  const stagedPath = path.join(dir, proposal.stagedClip);
  if (!fs.existsSync(stagedPath)) {
    console.error(`✗ The new clip is missing from ${dir}. Run sync prepare again.`);
    return 1;
  }
  let captions: unknown = null;
  if (proposal.captionsSrc) {
    try {
      captions = readJson(path.join(dir, FILES.proposed));
    } catch (err) {
      console.error(`✗ ${FILES.proposed}: ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }
    const problem = captionProblem(captions);
    if (problem) {
      console.error(`✗ ${FILES.proposed}: ${problem}`);
      return 1;
    }
  }
  const patch = {
    clip: proposal.clip,
    sceneStarts: proposal.sceneStarts ?? loaded.raw.sceneStarts ?? null,
    captionsSrc: proposal.captionsSrc,
    stage: "synced",
  };
  try {
    validateEpisodeRaw(loaded, patch);
  } catch (err) {
    console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }

  const previous = loaded.episode.clip.src;
  fs.renameSync(stagedPath, path.join(dir, proposal.clip.src));
  if (proposal.captionsSrc) {
    writeJson(path.join(dir, proposal.captionsSrc), captions);
  }
  saveEpisodeRaw(loaded, patch);
  fs.rmSync(proposalFile, { force: true });

  if (previous && previous !== proposal.clip.src) {
    fs.rmSync(path.join(dir, previous), { force: true });
  }
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith("talent.proposed.")) {
      fs.rmSync(path.join(dir, name), { force: true });
    }
  }
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
