import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SFX_DURATION, SFX_NAMES } from "../../src/brand/sfx";
import { PEAK, SFX_RATE, encodeWav16, prng, synthesize } from "../../scripts/lib/sfx-synth";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

describe("prng", () => {
  it("repeats for the same seed", () => {
    const a = prng(7);
    const b = prng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe.each([...SFX_NAMES])("%s", (name) => {
  const samples = synthesize(name);
  it("has the declared duration", () => {
    expect(samples.length).toBe(Math.round(SFX_DURATION[name] * SFX_RATE));
  });
  it("peaks at -3 dBFS without clipping", () => {
    const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeCloseTo(PEAK, 4);
    expect(peak).toBeLessThan(1);
  });
  it("ends at silence (no click)", () => {
    expect(samples[samples.length - 1]).toBe(0);
  });
  it("is deterministic", () => {
    expect(sha(encodeWav16(synthesize(name), SFX_RATE))).toBe(sha(encodeWav16(samples, SFX_RATE)));
  });
  it("matches the committed WAV (run `npm run sfx:build` after changing the synth)", () => {
    const file = path.resolve(__dirname, `../../src/brand/sfx/${name}.wav`);
    expect(sha(fs.readFileSync(file))).toBe(sha(encodeWav16(samples, SFX_RATE)));
  });
});

describe("encodeWav16", () => {
  it("writes a mono 16-bit PCM header", () => {
    const buf = encodeWav16(new Float32Array([0, 1, -1]), 48_000);
    expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
    expect(buf.toString("ascii", 8, 12)).toBe("WAVE");
    expect(buf.readUInt16LE(22)).toBe(1);
    expect(buf.readUInt32LE(24)).toBe(48_000);
    expect(buf.readUInt16LE(34)).toBe(16);
    expect(buf.readUInt32LE(40)).toBe(6);
    expect(buf.readInt16LE(46)).toBe(32767);
    expect(buf.readInt16LE(48)).toBe(-32767);
  });
});
