import { VideoSampleSink } from "mediabunny";
import { openMedia } from "../audio";
import type { Rgba } from "./palette";

/** Pairs each timestamp with its decoded frame, dropping timestamps whose frame is missing. */
export const alignSamples = (timestamps: number[], samples: (Rgba | null)[]): { t: number; frame: Rgba }[] =>
  timestamps.flatMap((t, i) => (samples[i] ? [{ t, frame: samples[i] as Rgba }] : []));

/** Decodes the frame at each timestamp and downsizes it (nearest neighbour) to `width`, keeping the aspect ratio. */
export const sampleFrames = async (file: string, timestamps: number[], width: number): Promise<{ t: number; frame: Rgba }[]> => {
  const input = openMedia(file);
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error(`${file} has no video track`);
    const sink = new VideoSampleSink(track);
    const first = await track.getFirstTimestamp();
    const times = timestamps.map((t) => Math.max(t, first));
    const out: (Rgba | null)[] = [];
    for await (const sample of sink.samplesAtTimestamps(times)) {
      if (!sample) {
        out.push(null);
        continue;
      }
      const sw = sample.displayWidth;
      const sh = sample.displayHeight;
      const full = new Uint8Array(sample.allocationSize({ format: "RGBA" } as never));
      await sample.copyTo(full, { format: "RGBA" } as never);
      sample.close();
      const w = Math.min(width, sw);
      const h = Math.max(1, Math.round((sh * w) / sw));
      const data = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) {
        const sy = Math.floor((y * sh) / h);
        for (let x = 0; x < w; x++) {
          const sx = Math.floor((x * sw) / w);
          data.set(full.subarray((sy * sw + sx) * 4, (sy * sw + sx) * 4 + 4), (y * w + x) * 4);
        }
      }
      out.push({ width: w, height: h, data });
    }
    return alignSamples(times, out);
  } finally {
    input.dispose();
  }
};

export const toGray = ({ data }: Rgba): Uint8Array => {
  const g = new Uint8Array(data.length / 4);
  for (let i = 0; i < g.length; i++) g[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  return g;
};
