import type { TranscriptWord } from "../align";
import type { VideoMetrics } from "./types";

export const toDb = (rms: number): number | null => (rms > 0 ? Math.round(20 * Math.log10(rms) * 10) / 10 : null);

export const audioLevels = (wave: Float32Array, words: TranscriptWord[], sampleRate: number): VideoMetrics["audio"] => {
  if (!wave.length) return { speechDb: null, gapDb: null, peakDb: null };
  const inWord = new Uint8Array(wave.length);
  for (const w of words) {
    inWord.fill(1, Math.max(0, Math.floor((w.startMs / 1000) * sampleRate)), Math.min(wave.length, Math.ceil((w.endMs / 1000) * sampleRate)));
  }
  let speech = 0;
  let speechN = 0;
  let gap = 0;
  let gapN = 0;
  let peak = 0;
  for (let i = 0; i < wave.length; i++) {
    const v = wave[i] * wave[i];
    peak = Math.max(peak, Math.abs(wave[i]));
    if (inWord[i]) {
      speech += v;
      speechN++;
    } else {
      gap += v;
      gapN++;
    }
  }
  return {
    speechDb: speechN ? toDb(Math.sqrt(speech / speechN)) : null,
    gapDb: gapN ? toDb(Math.sqrt(gap / gapN)) : null,
    peakDb: toDb(peak),
  };
};
