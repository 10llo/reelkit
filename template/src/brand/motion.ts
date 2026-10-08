import { interpolate, spring } from "remotion";
import { CLAMP } from "../frame/timing";
import { TILT } from "./tokens";

/** Style fragment a preset returns; spread it into the element it moves. */
export type Motion = Pick<React.CSSProperties, "opacity" | "scale" | "rotate" | "translate" | "transformOrigin">;

const SLAP = { damping: 10, stiffness: 200 };
const DROP = { damping: 9, stiffness: 170 };
const POP_IN = { damping: 12, stiffness: 180 };
const SQUASH = 0.18;
const DROP_SQUASH = 1.5;
export const WIGGLE_FRAMES = 18;
export const JELLY_FRAMES = 16;

/** Slapped on like a sticker: grows squashed, overshoots, settles on its tilt. Pair with `pop`. */
export const slap = (frame: number, fps: number, at: number, tilt = TILT): Motion => {
  if (frame < at) {
    return { opacity: 0, scale: "0 0" };
  }
  const p = spring({ frame: frame - at, fps, config: SLAP });
  const squash = Math.sin(Math.min(1, p) * Math.PI) * SQUASH;
  return {
    opacity: 1,
    scale: `${p * (1 + squash)} ${p * (1 - squash)}`,
    rotate: `${interpolate(p, [0, 1], [-12, tilt])}deg`,
  };
};

/** Falls from `distance` px above; the spring's overshoot squashes it on the ground. Pair with `boing`. */
export const drop = (frame: number, fps: number, at: number, distance = 260): Motion => {
  if (frame < at) {
    return { opacity: 0, translate: `0px ${-distance}px` };
  }
  const p = spring({ frame: frame - at, fps, config: DROP });
  const over = Math.max(0, p - 1);
  // Snap the spring's sub-pixel tail to the ground (also avoids "-0px").
  const raw = Math.min(0, -(1 - p) * distance);
  const y = raw > -0.5 ? 0 : raw;
  return {
    opacity: 1,
    translate: `0px ${y}px`,
    scale: `${1 + over * DROP_SQUASH} ${1 - over * DROP_SQUASH}`,
    transformOrigin: "50% 100%",
  };
};

/** Degrees of a decaying shake; add it to an element's own tilt. Pair with `bonk`. */
export const wiggleDeg = (frame: number, at: number, amp = 9): number => {
  const t = frame - at;
  if (t <= 0 || t > WIGGLE_FRAMES) {
    return 0;
  }
  return amp * Math.sin(t * 1.2) * (1 - t / WIGGLE_FRAMES);
};

export const wiggle = (frame: number, at: number, amp = 9): Motion => ({ rotate: `${wiggleDeg(frame, at, amp)}deg` });

/** Scales in with a little overshoot. Pair with `chime`. */
export const popIn = (frame: number, fps: number, at: number): Motion => {
  if (frame < at) {
    return { opacity: 0, scale: "0" };
  }
  const p = spring({ frame: frame - at, fps, config: POP_IN });
  return { opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP), scale: `${p}` };
};

/** Elastic wobble when a number lands. Pair with `ding`. */
export const jelly = (frame: number, at: number): Motion => {
  const t = (frame - at) / JELLY_FRAMES;
  if (t <= 0 || t >= 1) {
    return { scale: "1 1" };
  }
  const k = Math.sin(t * Math.PI * 3) * (1 - t) * 0.22;
  return { scale: `${1 + k} ${1 - k}` };
};
