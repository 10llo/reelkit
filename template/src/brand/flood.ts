import type { Cue } from "./sfx";
import { SCENE_BG } from "./tokens";

export const FLOOD_LEAD = 6;
export const FLOOD_FRAMES = 14;
/** PawShape's main pad (ellipse rx 24, ry 20) in its 100×100 grid. */
export const PAD_CENTER = { x: 50, y: 66 };
const PAD_RY = 20;

export type Flood = {
  readonly color: string;
  readonly progress: number;
  /** Origin corner, canvas px. */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotate: number;
};
export type FloodState = { readonly base: string; readonly flood: Flood | null };

type Canvas = { readonly width: number; readonly height: number };

/** Scale at which the main pad alone, centered on a corner, covers the canvas. */
export const floodScale = (canvas: Canvas) => (Math.hypot(canvas.width, canvas.height) / PAD_RY) * 1.05;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Background at `frame`: the settled scene color, plus the paw growing toward the next scene's color. */
export const floodAt = (frame: number, sceneStarts: readonly number[] | null, canvas: Canvas): FloodState => {
  if (!sceneStarts) {
    return { base: SCENE_BG[0], flood: null };
  }
  let base: string = SCENE_BG[0];
  for (let k = 1; k < sceneStarts.length; k++) {
    const start = sceneStarts[k] - FLOOD_LEAD;
    if (frame < start) {
      break;
    }
    if (frame >= start + FLOOD_FRAMES) {
      base = SCENE_BG[k];
      continue;
    }
    const progress = easeOutCubic((frame - start) / FLOOD_FRAMES);
    const fromLeft = k % 2 === 1;
    // Toes point into the canvas: 135° from the top-left corner, -135° from the top-right; settle from ±15°.
    const rest = fromLeft ? 135 : -135;
    return {
      base,
      flood: {
        color: SCENE_BG[k],
        progress,
        x: fromLeft ? 0 : canvas.width,
        y: 0,
        scale: floodScale(canvas) * progress,
        rotate: rest + (fromLeft ? -15 : 15) * (1 - progress),
      },
    };
  }
  return { base, flood: null };
};

export const floodCues = (sceneStarts: readonly number[]): Cue[] =>
  sceneStarts.slice(1).map((s) => ({ name: "whoosh", at: s - FLOOD_LEAD }));
