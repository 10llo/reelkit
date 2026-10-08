import { SFX_DURATION, type SfxName } from "../../src/brand/sfx";

export const SFX_RATE = 48_000;
export const PEAK = 10 ** (-3 / 20);
const TAU = 2 * Math.PI;
const FADE_OUT = 0.005;

/** mulberry32: a seeded PRNG, so the noise (and the WAV bytes) never change between runs. */
export const prng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Linear attack, exponential decay with time constant `tau`. */
const env = (t: number, attack: number, tau: number) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));

const sweep = (n: number, rate: number, freq: (t: number) => number, amp: (t: number) => number) => {
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    phase += (TAU * freq(t)) / rate;
    out[i] = Math.sin(phase) * amp(t);
  }
  return out;
};

// Inharmonic bell partials: [ratio, amplitude, decay factor].
const PARTIALS = [
  [1, 1, 1],
  [2.76, 0.4, 0.5],
  [5.4, 0.2, 0.25],
] as const;

const bell = (out: Float32Array, rate: number, f0: number, start: number, tau: number) => {
  for (let i = Math.round(start * rate); i < out.length; i++) {
    const t = i / rate - start;
    let v = 0;
    for (const [ratio, amp, k] of PARTIALS) {
      v += amp * Math.sin(TAU * f0 * ratio * t) * env(t, 0.002, tau * k);
    }
    out[i] += v;
  }
  return out;
};

const VOICES: Record<SfxName, (n: number, rate: number) => Float32Array> = {
  // Filtered noise sweeping 300 Hz → 4 kHz under a sin² swell.
  whoosh: (n, rate) => {
    const rand = prng(7);
    const out = new Float32Array(n);
    const total = n / rate;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      const cutoff = 300 * (4000 / 300) ** (t / total);
      y += (1 - Math.exp((-TAU * cutoff) / rate)) * (rand() * 2 - 1 - y);
      out[i] = y * Math.sin((Math.PI * t) / total) ** 2;
    }
    return out;
  },
  // A bubble: pitch drops 900 → 300 Hz in a few ms.
  pop: (n, rate) =>
    sweep(n, rate, (t) => 300 + 600 * Math.exp(-t / 0.012), (t) => env(t, 0.002, 0.015)),
  // A spring: falling pitch with an 18 Hz vibrato.
  boing: (n, rate) =>
    sweep(n, rate, (t) => 420 * (1 - 1.5 * t) * (1 + 0.06 * Math.sin(TAU * 18 * t)), (t) => env(t, 0.003, 0.09)),
  ding: (n, rate) => bell(new Float32Array(n), rate, 1320, 0, 0.25),
  // Two rising bell notes (C6, G6).
  chime: (n, rate) => bell(bell(new Float32Array(n), rate, 1046.5, 0, 0.18), rate, 1568, 0.12, 0.18),
  // A dull low knock: 140 → 90 Hz body plus a short muffled thump.
  bonk: (n, rate) => {
    const rand = prng(11);
    const out = sweep(n, rate, (t) => 90 + 50 * Math.exp(-t / 0.03), (t) => env(t, 0.002, 0.05));
    let y = 0;
    for (let i = 0; i < n; i++) {
      y += 0.08 * (rand() * 2 - 1 - y);
      out[i] += 3 * y * env(i / rate, 0.001, 0.008);
    }
    return out;
  },
  // A dry click: a 3 kHz blip plus a noise transient.
  tick: (n, rate) => {
    const rand = prng(3);
    const out = sweep(n, rate, () => 3000, (t) => 0.5 * env(t, 0.0005, 0.004));
    for (let i = 0; i < n; i++) {
      out[i] += (rand() * 2 - 1) * env(i / rate, 0.0002, 0.002);
    }
    return out;
  },
};

export const synthesize = (name: SfxName, rate = SFX_RATE): Float32Array => {
  const n = Math.round(SFX_DURATION[name] * rate);
  const out = VOICES[name](n, rate);
  const fade = Math.min(n, Math.round(FADE_OUT * rate));
  for (let i = 0; i < fade; i++) {
    out[n - 1 - i] = out[n - 1 - i] * (i / fade) + 0; // + 0 turns -0 into 0
  }
  const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (peak > 0) {
    for (let i = 0; i < n; i++) {
      out[i] *= PEAK / peak;
    }
  }
  return out;
};

/** Mono 16-bit PCM WAV. */
export const encodeWav16 = (samples: Float32Array, rate: number): Buffer => {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
  return buf;
};
