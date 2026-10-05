import { overlapScore, pickBy, segmentHitsRect, segmentsCross, type Rect, type Segment } from "./placeLabel";

export const W = 960;
export const H = 420;
export const LEFT = 190;
export const RIGHT = 900;
export const TOP = 80;
export const BOTTOM = 340;
export const BUBBLE_PAD = 46; // 2 × 20 px padding + 2 × 3 px border
export const BUBBLE_H = 58; // 42 px line + 10 px padding + 2 × 3 px border
export const RING = 26;
export const DOT = 14;
export const GAP = 12;
const VALUE_H = 68;

export type Measure = (text: string, fontSize: number) => number;
export type TrendLabels = {
  valueRect: Rect;
  ring: Rect | null;
  bubble: Rect | null;
  /** Thin line from the ring's edge to the bubble, only when the bubble is not adjacent. */
  leader: Segment | null;
  /** False when no candidate was free of overlaps (the least-overlapping one was used). */
  clear: boolean;
};

const around = (x: number, y: number, r: number): Rect => ({ x: x - r, y: y - r, w: 2 * r, h: 2 * r });
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

/** Positions the last-value label and the annotation bubble (with an optional leader line) so they avoid the data. */
export const layoutTrendLabels = (input: {
  ys: number[];
  lo: number;
  hi: number;
  valueText: string;
  unit: string;
  note?: { index: number; label: string };
  measure: Measure;
}): TrendLabels => {
  const { ys, lo, hi, note, measure } = input;
  const n = ys.length;
  const px = (i: number) => LEFT + ((RIGHT - LEFT) * i) / (n - 1);
  const py = (v: number) => BOTTOM - ((v - lo) / (hi - lo)) * (BOTTOM - TOP);
  const segments: Segment[] = ys.slice(1).map((y, i) => ({ x1: px(i), y1: py(ys[i]), x2: px(i + 1), y2: py(y) }));
  const dots = ys.map((y, i) => around(px(i), py(y), DOT));
  const axisLabels: Rect[] = [
    { x: 0, y: TOP - 24, w: LEFT - 20, h: 42 },
    { x: 0, y: BOTTOM - 24, w: LEFT - 20, h: 42 },
  ];
  const box: Rect = { x: 0, y: 0, w: W, h: BOTTOM };
  const lastX = px(n - 1);
  const lastY = py(ys[n - 1]);
  const nx = note ? px(note.index) : 0;
  const ny = note ? py(ys[note.index]) : 0;
  const ring = note ? around(nx, ny, RING) : null;

  const valueW = Math.ceil(measure(input.valueText, 64) + (input.unit ? measure(input.unit, 40) + 8 : 0)) + 4;
  /** Index of the data dot closest to the centre of a rectangle. */
  const nearestDot = (r: Rect) => {
    let best = 0;
    let bestD = Infinity;
    ys.forEach((y, i) => {
      const d = Math.hypot(px(i) - (r.x + r.w / 2), py(y) - (r.y + r.h / 2));
      if (d < bestD - 1e-9) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };
  const placeValue = (avoid: Rect | null, extra?: (r: Rect) => number) => {
    // Dots drawn at their true visual radius (10 + half the 4 px stroke) so a label may sit flush beside one.
    const o = { box, segments, rects: [...ys.slice(0, -1).map((y, i) => around(px(i), py(y), 12)), ...axisLabels, ...(ring ? [ring] : []), ...(avoid ? [avoid] : [])] };
    const score = (r: Rect) => overlapScore(r, o) + (extra ? extra(r) : 0);
    // Spots hugging the last dot come first, so the value cannot be read as another point's.
    const preferred: Rect[] = [
      { x: lastX + 40 - valueW, y: lastY - DOT - 8 - VALUE_H, w: valueW, h: VALUE_H },
      { x: lastX + 40 - valueW, y: lastY + DOT + 8, w: valueW, h: VALUE_H },
      { x: W - valueW, y: lastY - DOT - 8 - VALUE_H, w: valueW, h: VALUE_H },
      { x: W - valueW, y: lastY + DOT + 8, w: valueW, h: VALUE_H },
      { x: W - valueW, y: lastY - DOT - 8 - VALUE_H - 40, w: valueW, h: VALUE_H },
      { x: W - valueW, y: lastY - DOT - 8 - VALUE_H - 80, w: valueW, h: VALUE_H },
      { x: lastX - valueW - 12, y: lastY - RING - 4 - VALUE_H, w: valueW, h: VALUE_H },
      { x: lastX - valueW - 12, y: lastY + RING + 4, w: valueW, h: VALUE_H },
      { x: lastX - valueW - RING - 4, y: lastY - VALUE_H / 2, w: valueW, h: VALUE_H },
    ];
    const hugging = preferred.filter((r) => nearestDot(r) === n - 1);
    const others: Rect[] = [
      { x: lastX - valueW - 12, y: lastY - RING - 4 - VALUE_H - 40, w: valueW, h: VALUE_H },
      { x: lastX - valueW - 12, y: lastY - RING - 4 - VALUE_H - 80, w: valueW, h: VALUE_H },
    ];
    const first = pickBy(hugging, score);
    if (hugging.length && first.score === 0) return first;
    const rest = pickBy([...preferred, ...others], score);
    return hugging.length && first.score <= rest.score ? first : rest;
  };

  const nearest = (r: Rect) => ({ x: clamp(nx, r.x, r.x + r.w), y: clamp(ny, r.y, r.y + r.h) });
  const leaderFor = (r: Rect): Segment | null => {
    const q = nearest(r);
    const dist = Math.hypot(q.x - nx, q.y - ny);
    if (dist - RING <= 1.5 * GAP) return null;
    return { x1: nx + ((q.x - nx) / dist) * RING, y1: ny + ((q.y - ny) / dist) * RING, x2: q.x, y2: q.y };
  };

  const bubbleCandidates = () => {
    if (!note || !ring) return [];
    const bw = Math.ceil(measure(note.label, 40) + BUBBLE_PAD);
    const cx = clamp(nx - bw / 2, 0, W - bw);
    const candidates: Rect[] = [];
    for (const k of [1, 2, 3]) {
      const g = RING + GAP * k; // nearest edge sits k × GAP from the ring
      candidates.push(
        { x: cx, y: ny - g - BUBBLE_H, w: bw, h: BUBBLE_H },
        { x: cx, y: ny + g, w: bw, h: BUBBLE_H },
        { x: nx - g - bw, y: ny - BUBBLE_H / 2, w: bw, h: BUBBLE_H },
        { x: nx + g, y: ny - BUBBLE_H / 2, w: bw, h: BUBBLE_H },
      );
    }
    // Free-floating spots: a strip above the plot (9 columns) plus a 5 × 3 grid over it, tried nearest to the point first.
    const free: Rect[] = [];
    const rows = [0, ...[1 / 6, 1 / 2, 5 / 6].map((f) => TOP + (BOTTOM - TOP) * f - BUBBLE_H / 2)];
    for (const y of rows) {
      for (const fx of y === 0 ? [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1] : [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const ax = LEFT + (RIGHT - LEFT) * fx;
        free.push({ x: clamp(ax - bw / 2, 0, W - bw), y: clamp(y, 0, BOTTOM - BUBBLE_H), w: bw, h: BUBBLE_H });
      }
    }
    const dist = (r: Rect) => Math.hypot(r.x + r.w / 2 - nx, r.y + r.h / 2 - ny);
    free.sort((a, b) => dist(a) - dist(b));
    candidates.push(...free);
    return candidates;
  };
  const scoreBubble = (r: Rect, avoid: Rect | null) => {
    let score = overlapScore(r, { box, segments, rects: [...dots, ...axisLabels, ...(avoid ? [avoid] : [])] });
    const leader = leaderFor(r);
    if (leader) {
      // A leader may cross the line once; running along it, hitting another dot or the value label is not allowed.
      score += Math.max(0, segments.filter((s) => segmentsCross(leader, s)).length - 1);
      score += dots.filter((d, i) => i !== note?.index && segmentHitsRect(leader, d)).length;
      if (avoid && segmentHitsRect(leader, avoid)) score += 1;
    }
    return score;
  };

  const candidates = bubbleCandidates();
  // Pick the first bubble that is clear of the data and leaves room for a clear value label.
  let chosen: { bubble: Rect | null; valueRect: Rect; clear: boolean } | null = null;
  for (const b of candidates) {
    if (scoreBubble(b, null) !== 0) continue;
    const v = placeValue(b, (r) => scoreBubble(b, r));
    if (v.score === 0 && scoreBubble(b, v.pick) === 0) {
      chosen = { bubble: b, valueRect: v.pick, clear: true };
      break;
    }
  }
  if (!chosen) {
    // Nothing is fully clear: take the least-overlapping bubble, then the value label around it.
    const best = pickBy(candidates, (b) => scoreBubble(b, placeValue(b).pick));
    const bubble = candidates.length ? best.pick : null;
    chosen = { bubble, valueRect: placeValue(bubble).pick, clear: candidates.length === 0 && placeValue(null).score === 0 };
  }
  return { valueRect: chosen.valueRect, ring, bubble: chosen.bubble, leader: chosen.bubble ? leaderFor(chosen.bubble) : null, clear: chosen.clear };
};
