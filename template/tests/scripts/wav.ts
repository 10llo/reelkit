import fs from "node:fs";

export const tone = (seconds: number, rate: number, amp = 0.3, hz = 440) =>
  Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));

export const silence = (seconds: number, rate: number) => new Float32Array(Math.round(seconds * rate));

export const concat = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

/** 16-bit PCM WAV; every channel gets the same samples. */
export const writeWav = (file: string, mono: Float32Array, rate: number, channels = 1) => {
  const dataSize = mono.length * channels * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * channels * 2, 28);
  buf.writeUInt16LE(channels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  let offset = 44;
  for (const v of mono) {
    for (let c = 0; c < channels; c++) {
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), offset);
      offset += 2;
    }
  }
  fs.writeFileSync(file, buf);
};
