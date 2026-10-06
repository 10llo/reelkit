import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const whisper = vi.hoisted(() => ({
  canUseWhisperWebGpu: vi.fn(),
  downloadWhisperModel: vi.fn(),
  isWhisperModelCached: vi.fn(),
  transcribe: vi.fn(),
}));
const transformersEnv = vi.hoisted(() => ({ cacheDir: "" }));
vi.mock("@remotion/whisper-webgpu", () => whisper);
vi.mock("@huggingface/transformers", () => ({ env: transformersEnv }));

import {
  isModel,
  MODEL_SIZES_MB,
  MODELS,
  TranscriptionUnavailable,
  transcribeWithWhisper,
  whisperCacheDir,
  whisperLanguage,
} from "../../scripts/lib/transcribe";

describe("settings", () => {
  afterEach(() => {
    delete process.env.REELKIT_WHISPER_CACHE;
  });
  it("maps locales to Whisper languages", () => {
    expect(whisperLanguage("es-CO")).toBe("spanish");
    expect(whisperLanguage("en-US")).toBe("english");
    expect(() => whisperLanguage("xx-YY")).toThrow(/No Whisper language/);
  });
  it("knows the multilingual models", () => {
    expect(isModel("small")).toBe(true);
    expect(isModel("small.en")).toBe(false);
    expect(Object.keys(MODEL_SIZES_MB)).toEqual([...MODELS]);
  });
  it("shares one model cache per machine", () => {
    expect(whisperCacheDir()).toBe(path.join(os.homedir(), ".cache", "reelkit", "whisper"));
    process.env.REELKIT_WHISPER_CACHE = "/tmp/models";
    expect(whisperCacheDir()).toBe("/tmp/models");
  });
});

describe("transcribeWithWhisper", () => {
  const wave = new Float32Array(16000);
  beforeEach(() => {
    vi.resetAllMocks();
    whisper.canUseWhisperWebGpu.mockResolvedValue({ supported: true });
    whisper.downloadWhisperModel.mockResolvedValue({ alreadyDownloaded: true });
  });

  it("returns trimmed words in ms and points Transformers.js at the shared cache", async () => {
    whisper.transcribe.mockResolvedValue({
      text: "Hola",
      model: "small",
      words: [
        { text: " Hola", startInSeconds: 0.12, endInSeconds: 0.3004 },
        { text: " ", startInSeconds: 0.3, endInSeconds: 0.31 },
      ],
    });
    const words = await transcribeWithWhisper(wave, { model: "small", language: "spanish" });
    expect(words).toEqual([{ text: "Hola", startMs: 120, endMs: 300 }]);
    expect(transformersEnv.cacheDir).toBe(whisperCacheDir());
    expect(whisper.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({ channelWaveform: wave, model: "small", language: "spanish" }),
    );
  });
  it("reports missing WebGPU as unavailable", async () => {
    whisper.canUseWhisperWebGpu.mockResolvedValue({ supported: false, reason: "webgpu-unavailable", detailedReason: "no adapter" });
    const attempt = transcribeWithWhisper(wave, { model: "small", language: "spanish" });
    await expect(attempt).rejects.toBeInstanceOf(TranscriptionUnavailable);
    await expect(attempt).rejects.toThrow(/no adapter/);
  });
  it("reports download or inference failures as unavailable", async () => {
    whisper.downloadWhisperModel.mockRejectedValue(new Error("ECONNRESET"));
    await expect(transcribeWithWhisper(wave, { model: "small", language: "spanish" })).rejects.toThrow(
      /Transcription failed: ECONNRESET/,
    );
  });
});
