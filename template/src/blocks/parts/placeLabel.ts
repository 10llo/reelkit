export type Rect = { x: number; y: number; w: number; h: number };
export type Segment = { x1: number; y1: number; x2: number; y2: number };

export const rectsOverlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
const segmentsCross = (a: Segment, b: Segment) =>
  ccw(a.x1, a.y1, b.x1, b.y1, b.x2, b.y2) !== ccw(a.x2, a.y2, b.x1, b.y1, b.x2, b.y2) &&
  ccw(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1) !== ccw(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2);

/** True when the segment touches the rectangle (an end inside it, or a crossing of one of its edges). */
export const segmentHitsRect = (s: Segment, r: Rect) => {
  const inside = (x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  if (inside(s.x1, s.y1) || inside(s.x2, s.y2)) return true;
  const { x, y, w, h } = r;
  return (
    segmentsCross(s, { x1: x, y1: y, x2: x + w, y2: y }) ||
    segmentsCross(s, { x1: x + w, y1: y, x2: x + w, y2: y + h }) ||
    segmentsCross(s, { x1: x + w, y1: y + h, x2: x, y2: y + h }) ||
    segmentsCross(s, { x1: x, y1: y + h, x2: x, y2: y })
  );
};

export type Obstacles = { box: Rect; segments: Segment[]; rects: Rect[] };

/** 0 when `r` is inside the box and touches no segment or obstacle rectangle; higher is worse. */
export const overlapScore = (r: Rect, o: Obstacles) => {
  const { box } = o;
  const outside = r.x < box.x || r.y < box.y || r.x + r.w > box.x + box.w || r.y + r.h > box.y + box.h ? 100 : 0;
  return outside + o.segments.filter((s) => segmentHitsRect(s, r)).length + o.rects.filter((q) => rectsOverlap(r, q)).length;
};

/** The first candidate with score 0, else the lowest-scoring one (earlier wins ties). */
export const pickCandidate = (candidates: Rect[], o: Obstacles) => {
  let best = candidates[0];
  let bestScore = Infinity;
  for (const c of candidates) {
    const score = overlapScore(c, o);
    if (score === 0) return c;
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
};
