import type { PaletteColor } from "./types";

export type Rgba = { width: number; height: number; data: Uint8Array };

const hex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
const centre = (v: number) => (v >> 4) * 16 + 8;

export const dominantColors = (frames: Rgba[], k = 5): PaletteColor[] => {
  const counts = new Map<number, number>();
  let total = 0;
  for (const { data } of frames) {
    for (let i = 0; i < data.length; i += 4) {
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      total++;
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([key, n]) => ({
      hex: `#${hex(centre((key >> 8) << 4))}${hex(centre(((key >> 4) & 15) << 4))}${hex(centre((key & 15) << 4))}`,
      share: Math.round((n / total) * 1000) / 1000,
    }));
};

export const hsvStats = (frames: Rgba[]) => {
  let v = 0;
  let s = 0;
  let n = 0;
  for (const { data } of frames) {
    for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]) / 255;
      const min = Math.min(data[i], data[i + 1], data[i + 2]) / 255;
      v += max;
      s += max === 0 ? 0 : (max - min) / max;
      n++;
    }
  }
  return { brightness: n ? Math.round((v / n) * 1000) / 1000 : 0, saturation: n ? Math.round((s / n) * 1000) / 1000 : 0 };
};
