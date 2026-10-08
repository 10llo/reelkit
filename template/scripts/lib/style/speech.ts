import type { TranscriptWord } from "../align";
import type { VideoMetrics } from "./types";

export const HOOK_SECONDS = 3;

export const speechMetrics = (words: TranscriptWord[], durationSec: number, unavailable: string | null): VideoMetrics["speech"] => {
  if (!words.length || durationSec <= 0) {
    return { wordsPerMinute: null, firstWordSec: null, hookText: null, coverage: null, unavailable: unavailable ?? "no speech detected" };
  }
  const spoken = words.reduce((s, w) => s + Math.max(0, w.endMs - w.startMs), 0) / 1000;
  return {
    wordsPerMinute: Math.round((words.length / durationSec) * 60),
    firstWordSec: Math.round(words[0].startMs / 100) / 10,
    hookText: words.filter((w) => w.startMs < HOOK_SECONDS * 1000).map((w) => w.text).join(" ") || null,
    coverage: Math.round((spoken / durationSec) * 100) / 100,
    unavailable: null,
  };
};
