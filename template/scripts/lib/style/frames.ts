import { VideoSampleSink } from "mediabunny";
import { openMedia } from "../audio";
import type { Rgba } from "./palette";

/** Decodes the frame at each timestamp and downsizes it (nearest neighbour) to `width`, keeping the aspect ratio. */
export const sampleFrames = async (file: string, timestamps: number[], width: number): Promise<Rgba[]> => {
  const input = openMedia(file);
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error(`${file} has no video track`);
    const sink = new VideoSampleSink(track);
    const out: Rgba[] = [];
    for await (const sample of sink.samplesAtTimestamps(timestamps)) {
      if (!sample) continue;
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
    return out;
  } finally {
    input.dispose();
  }
};

export const toGray = ({ data }: Rgba): Uint8Array => {
  const g = new Uint8Array(data.length / 4);
  for (let i = 0; i < g.length; i++) g[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  return g;
};
