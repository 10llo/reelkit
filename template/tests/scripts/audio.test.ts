import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decodeMono16k, SAMPLE_RATE } from "../../scripts/lib/audio";
import { probeMedia, speechBounds } from "../../scripts/lib/probe";
import { concat, silence, tone, writeWav } from "./wav";

describe("speechBounds", () => {
  it("finds the loud part", () => {
    const wave = concat(silence(0.5, SAMPLE_RATE), tone(1, SAMPLE_RATE), silence(0.5, SAMPLE_RATE));
    const bounds = speechBounds(wave)!;
    expect(bounds.startSeconds).toBeCloseTo(0.5, 1);
    expect(bounds.endSeconds).toBeCloseTo(1.5, 1);
  });
  it("ignores a low noise floor", () => {
    const noise = Float32Array.from({ length: SAMPLE_RATE }, () => (Math.random() - 0.5) * 0.002);
    const bounds = speechBounds(concat(noise, tone(1, SAMPLE_RATE), noise))!;
    expect(bounds.startSeconds).toBeCloseTo(1, 1);
    expect(bounds.endSeconds).toBeCloseTo(2, 1);
  });
  it("returns null for silence", () => {
    expect(speechBounds(silence(1, SAMPLE_RATE))).toBeNull();
  });
});

describe("decodeMono16k and probeMedia", () => {
  let dir: string;
  let wav: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-audio-"));
    wav = path.join(dir, "stereo44k.wav");
    writeWav(wav, concat(silence(0.5, 44100), tone(1, 44100), silence(0.5, 44100)), 44100, 2);
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("resamples a 44.1 kHz stereo WAV to 16 kHz mono", async () => {
    const wave = await decodeMono16k(wav);
    expect(Math.abs(wave.length - 2 * SAMPLE_RATE)).toBeLessThan(SAMPLE_RATE * 0.01);
    const bounds = speechBounds(wave)!;
    expect(bounds.startSeconds).toBeCloseTo(0.5, 1);
    expect(bounds.endSeconds).toBeCloseTo(1.5, 1);
  });

  it("describes an audio-only file", async () => {
    const info = await probeMedia(wav);
    expect(info).toMatchObject({ hasAudio: true, hasVideo: false, width: 0, height: 0, fps: null, videoCodec: null });
    expect(info.durationSeconds).toBeCloseTo(2, 2);
  });

  it("rejects a file that isn't media", async () => {
    const bogus = path.join(dir, "notes.txt");
    fs.writeFileSync(bogus, "hola");
    await expect(probeMedia(bogus)).rejects.toThrow();
  });
});
