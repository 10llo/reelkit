import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { afterAll, describe, expect, it } from "vitest";
import { outputName, parseTargets } from "../../scripts/commands/export";
import { whatsappSettings } from "../../scripts/lib/bitrate";
import type { ClipInfo } from "../../scripts/lib/probe";
import { buildSrt, srtTime } from "../../scripts/lib/srt";
import { checkImage, checkVideo, pngSize } from "../../scripts/lib/verify-output";
import { validateEpisode } from "../../src/episode/validate";
import { TEMPLATE_ROOT } from "./paths";

const dani = validateEpisode(
  JSON.parse(fs.readFileSync(path.join(TEMPLATE_ROOT, "examples", "dani-chocolate", "episode.json"), "utf8")),
);

describe("srt", () => {
  it("formats timestamps", () => {
    expect(srtTime(3_723_456)).toBe("01:02:03,456");
    expect(srtTime(-5)).toBe("00:00:00,000");
  });
  it("uses script timing when there are no captions", () => {
    expect(buildSrt(dani, null)).toMatch(
      /^1\n00:00:00,200 --> 00:00:01,250\n¿Tu perro se\n\n2\n00:00:01,250 --> 00:00:02,300\ncomió un chocolate\?\n/,
    );
  });
  it("uses synced captions and their page breaks", () => {
    const cap = (text: string, startMs: number, endMs: number) => ({ text, startMs, endMs, timestampMs: startMs, confidence: null });
    const srt = buildSrt(dani, [cap("Hola", 0, 400), { ...cap(" a", 400, 500), pageBreakAfter: true }, cap(" todos", 2000, 2400)]);
    expect(srt).toBe("1\n00:00:00,000 --> 00:00:00,500\nHola a\n\n2\n00:00:02,000 --> 00:00:02,400\ntodos\n");
  });
});

describe("whatsappSettings", () => {
  it.each([
    [30, "3913k", 1],
    [45, "2576k", 1],
    [60, "1908k", 2 / 3],
    [15, "6000k", 1],
  ])("%d s → %s at scale %d", (seconds, bitrate, scale) => {
    expect(whatsappSettings(seconds)).toEqual({ videoBitrate: bitrate, audioBitrate: "96k", scale });
  });
});

describe("checkVideo", () => {
  const good: ClipInfo = {
    durationSeconds: 30.02, width: 1080, height: 1920, rotation: 0, fps: 30,
    hasVideo: true, hasAudio: true, videoCodec: "avc", audioCodec: "aac",
  };
  const want = { durationSeconds: 30, width: 1080, height: 1920 };
  it("accepts a good file", () => {
    expect(checkVideo(good, 9_000_000, want)).toEqual([]);
  });
  it.each<[string, Partial<ClipInfo>, number, RegExp]>([
    ["duration", { durationSeconds: 30.5 }, 1, /duration 30\.50 s, expected 30 s/],
    ["size", { width: 720, height: 1280 }, 1, /size 720×1280, expected 1080×1920/],
    ["codec", { videoCodec: "hevc" }, 1, /H\.264/],
    ["audio", { hasAudio: false }, 1, /no audio/],
  ])("reports a wrong %s", (_, change, bytes, message) => {
    expect(checkVideo({ ...good, ...change }, bytes, want).join("\n")).toMatch(message);
  });
  it("reports a WhatsApp file over the limit", () => {
    expect(checkVideo(good, 16_400_000, { ...want, maxBytes: 16_000_000 })).toEqual([
      "16.4 MB is over the 16.0 MB limit",
    ]);
  });
});

describe("images", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-png-"));
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
  it("reads PNG dimensions from the header", () => {
    const file = path.join(dir, "a.png");
    fs.writeFileSync(file, PNG.sync.write(new PNG({ width: 4, height: 2 })));
    expect(pngSize(file)).toEqual({ width: 4, height: 2 });
    expect(checkImage({ width: 4, height: 2 }, { width: 4, height: 2 })).toEqual([]);
    expect(checkImage({ width: 4, height: 2 }, { width: 1080, height: 1920 })).toEqual(["size 4×2, expected 1080×1920"]);
  });
  it("rejects a file that isn't a PNG", () => {
    const file = path.join(dir, "b.png");
    fs.writeFileSync(file, "nope");
    expect(() => pngSize(file)).toThrow(/not a PNG/);
  });
});

describe("targets", () => {
  it("parses --only", () => {
    expect(parseTargets(undefined)).toEqual(["9x16", "whatsapp", "4x5", "cover-9x16", "cover-4x5", "srt"]);
    expect(parseTargets("srt, cover-4x5")).toEqual(["srt", "cover-4x5"]);
    expect(() => parseTargets("9x16,tiktok")).toThrow(/Unknown export target.*tiktok/);
  });
  it("names the files", () => {
    expect(outputName("2026-10-chocolate", "whatsapp")).toBe("2026-10-chocolate-whatsapp.mp4");
    expect(outputName("2026-10-chocolate", "cover-4x5")).toBe("cover-4x5.png");
    expect(outputName("2026-10-chocolate", "srt")).toBe("2026-10-chocolate.srt");
  });
});
