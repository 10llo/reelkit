import type { Caption } from "@remotion/captions";
import { defaultSceneStarts, FPS, MIN_SCENE_FRAMES, resolveSceneStarts } from "../../src/frame/timing";

/** Frames of lead-in kept before the first word (0.2 s). */
export const LEAD_IN_FRAMES = 6;
/** Frames between a scene cut and that scene's first word (0.1 s). */
export const SCENE_LEAD_FRAMES = 3;
const TRIM_THRESHOLD_MS = 300;

const round2 = (n: number) => Math.round(n * 100) / 100;
const seconds = (frames: number) => (frames / FPS).toFixed(1).replace(".", ",");

export const trimFromLeadingSilence = (firstSpeechMs: number | null): number => {
  if (firstSpeechMs === null || firstSpeechMs <= TRIM_THRESHOLD_MS) {
    return 0;
  }
  return Math.max(0, Math.round((firstSpeechMs / 1000) * FPS) - LEAD_IN_FRAMES);
};

export const refitSceneStarts = (
  sceneFirstWordMs: (number | null)[],
  trimFrames: number,
  total: number,
): { starts: number[]; warnings: string[] } => {
  const defaults = defaultSceneStarts(total);
  const warnings: string[] = [];
  const proposed = sceneFirstWordMs.map((ms, i) => {
    if (i === 0) {
      return 0;
    }
    if (ms === null) {
      warnings.push(`Escena ${i + 1}: no encontré sus primeras palabras; uso el corte por defecto (${seconds(defaults[i])} s).`);
      return defaults[i];
    }
    return Math.round((ms / 1000) * FPS) - trimFrames - SCENE_LEAD_FRAMES;
  });
  const { starts, warning } = resolveSceneStarts(proposed, total);
  if (warning) {
    warnings.push(
      `Los cortes medidos (${proposed.map(seconds).join(" · ")} s) dejan alguna escena con menos de ${MIN_SCENE_FRAMES / FPS} s; uso los cortes por defecto.`,
    );
  }
  return { starts, warnings };
};

export const speechOverrunSeconds = (lastSpeechMs: number | null, trimFrames: number, durationSeconds: number) =>
  lastSpeechMs === null ? 0 : Math.max(0, round2(lastSpeechMs / 1000 - trimFrames / FPS - durationSeconds));

export const clipOverrunSeconds = (clipSeconds: number, trimFrames: number, durationSeconds: number) =>
  Math.max(0, round2(clipSeconds - trimFrames / FPS - durationSeconds));

export const shiftCaptions = (captions: Caption[], trimFrames: number, total: number): Caption[] => {
  const offset = (trimFrames / FPS) * 1000;
  const end = (total / FPS) * 1000;
  return captions.flatMap((c) => {
    const startMs = Math.round(c.startMs - offset);
    const endMs = Math.round(c.endMs - offset);
    if (endMs <= 0 || startMs >= end) {
      return [];
    }
    const clampedStart = Math.max(0, startMs);
    return [{ ...c, startMs: clampedStart, endMs: Math.min(end, endMs), timestampMs: clampedStart }];
  });
};
