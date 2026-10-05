import { interpolate, spring, type ExtrapolateType } from "remotion";

export const FPS = 30;
export const CLAMP: { extrapolateLeft: ExtrapolateType; extrapolateRight: ExtrapolateType } = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
};
export const ENTER_FRAMES = 12;
export const STAGGER = 6;
export const FADE_OUT_FRAMES = 8;
export const MIN_SCENE_FRAMES = 30;

export const SCENE_IDS = ["hook", "step1", "step2", "step3", "close"] as const;
export type SceneId = (typeof SCENE_IDS)[number];

// Share of the duration per scene, from the Dani reference (90/210/210/255/135 of 900 frames).
const DEFAULT_SHARES = [90, 210, 210, 255, 135].map((f) => f / 900);

/** No-bounce entrance, 0 → 1 over 12 frames. */
export const enter = (frame: number, fps: number, at: number) =>
  spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: ENTER_FRAMES });

/** Stamp / pop spring with overshoot. */
export const pop = (frame: number, fps: number, at: number) =>
  spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });

/** 1 → peak → 1 over `length` frames. */
export const pulse = (frame: number, at: number, length: number, peak: number) =>
  interpolate(frame, [at, at + length / 2, at + length], [1, peak, 1], CLAMP);

export const fadeOut = (frame: number, duration: number) =>
  interpolate(frame, [duration - FADE_OUT_FRAMES, duration], [1, 0], CLAMP);

export const totalFrames = (durationSeconds: number) => Math.round(durationSeconds * FPS);

export const defaultSceneStarts = (total: number): number[] => {
  let acc = 0;
  return DEFAULT_SHARES.map((share) => {
    const start = Math.round(acc * total);
    acc += share;
    return start;
  });
};

export const resolveSceneStarts = (
  starts: number[] | null,
  total: number,
): { starts: number[]; warning: string | null } => {
  const fallback = defaultSceneStarts(total);
  if (starts === null) {
    return { starts: fallback, warning: null };
  }
  const ok =
    starts.length === SCENE_IDS.length &&
    starts[0] === 0 &&
    starts.every((s) => Number.isInteger(s)) &&
    starts.every((s, i) => i === 0 || s - starts[i - 1] >= MIN_SCENE_FRAMES) &&
    total - starts[starts.length - 1] >= MIN_SCENE_FRAMES;
  if (ok) {
    return { starts, warning: null };
  }
  return {
    starts: fallback,
    warning: `Invalid sceneStarts ${JSON.stringify(starts)} for ${total} frames; using defaults ${JSON.stringify(fallback)}.`,
  };
};

export const sceneDurations = (starts: number[], total: number) =>
  starts.map((s, i) => (i + 1 < starts.length ? starts[i + 1] : total) - s);

export type BeatTiming = {
  readonly from: number;
  readonly duration: number;
  /** Frame (scene-local) at a fraction 0–1 of this beat. */
  readonly at: (fraction: number) => number;
};

export const beatTiming = (from: number, duration: number): BeatTiming => ({
  from,
  duration,
  at: (fraction) => from + fraction * duration,
});

export const splitBeats = (sceneDuration: number, beatCount: number, split: number): BeatTiming[] => {
  if (beatCount === 1) {
    return [beatTiming(0, sceneDuration)];
  }
  const first = Math.round(sceneDuration * split);
  return [beatTiming(0, first), beatTiming(first, sceneDuration - first)];
};
