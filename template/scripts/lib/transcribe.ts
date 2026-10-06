import os from "node:os";
import path from "node:path";
import type { TranscriptWord } from "./align";

export const MODELS = ["tiny", "base", "small", "medium", "large-v3-turbo"] as const;
export type Model = (typeof MODELS)[number];
export const DEFAULT_MODEL: Model = "large-v3-turbo";
export const MODEL_SIZES_MB: Record<Model, number> = { tiny: 120, base: 206, small: 586, medium: 1699, "large-v3-turbo": 1609 };
export const isModel = (value: string): value is Model => (MODELS as readonly string[]).includes(value);

const LANGUAGES: Record<string, string> = {
  es: "spanish",
  en: "english",
  pt: "portuguese",
  fr: "french",
  it: "italian",
  de: "german",
};

export const whisperLanguage = (locale: string): string => {
  const language = LANGUAGES[locale.slice(0, 2).toLowerCase()];
  if (!language) {
    throw new Error(`No Whisper language for locale ${locale}. Known: ${Object.keys(LANGUAGES).join(", ")}`);
  }
  return language;
};

export const whisperCacheDir = () =>
  process.env.REELKIT_WHISPER_CACHE ?? path.join(os.homedir(), ".cache", "reelkit", "whisper");

export class TranscriptionUnavailable extends Error {}

/** Loads Whisper with Transformers.js pointed at the shared model cache. */
const loadWhisper = async () => {
  const { env } = await import("@huggingface/transformers");
  env.cacheDir = whisperCacheDir();
  return import("@remotion/whisper-webgpu");
};

export type Transcriber = (wave: Float32Array, options: { model: Model; language: string }) => Promise<TranscriptWord[]>;

export const transcribeWithWhisper: Transcriber = async (wave, { model, language }) => {
  let whisper: Awaited<ReturnType<typeof loadWhisper>>;
  try {
    whisper = await loadWhisper();
  } catch (err) {
    throw new TranscriptionUnavailable(`Whisper could not load: ${(err as Error).message}`);
  }
  const support = await whisper.canUseWhisperWebGpu();
  if (!support.supported) {
    throw new TranscriptionUnavailable(`WebGPU is not available: ${support.detailedReason}`);
  }
  try {
    if (!(await whisper.isWhisperModelCached({ model }))) {
      console.log(`Downloading Whisper model ${model} (${MODEL_SIZES_MB[model]} MB, first time only)…`);
    }
    await whisper.downloadWhisperModel({ model });
    const output = await whisper.transcribe({ channelWaveform: wave, model, language });
    return output.words
      .map((w) => ({ text: w.text.trim(), startMs: Math.round(w.startInSeconds * 1000), endMs: Math.round(w.endInSeconds * 1000) }))
      .filter((w) => w.text);
  } catch (err) {
    throw new TranscriptionUnavailable(`Transcription failed: ${(err as Error).message}`);
  }
};

export const whisperStatus = async (model: Model) => {
  const whisper = await loadWhisper();
  const support = await whisper.canUseWhisperWebGpu();
  return {
    webgpu: support.supported ? null : support.detailedReason,
    cached: await whisper.isWhisperModelCached({ model }),
    cacheDir: whisperCacheDir(),
  };
};

export const downloadModel = async (model: Model, onProgress?: (fraction: number) => void) => {
  const whisper = await loadWhisper();
  return whisper.downloadWhisperModel({
    model,
    onProgress: (p) => onProgress?.(p.totalBytes ? p.loadedBytes / p.totalBytes : 0),
  });
};
