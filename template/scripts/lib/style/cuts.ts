export const CUT_THRESHOLD = 28;
export const CUT_PEAK_RATIO = 2;
export const CUT_MIN_GAP = 0.3;

export const frameDiff = (a: Uint8Array, b: Uint8Array): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return a.length ? sum / a.length : 0;
};

/** A cut is a difference spike: above the threshold and at least twice both neighbours. */
export const detectCuts = (frames: Uint8Array[], times: number[]): number[] => {
  const diffs = frames.map((f, i) => (i === 0 ? 0 : frameDiff(frames[i - 1], f)));
  const cuts: number[] = [];
  for (let i = 1; i < diffs.length; i++) {
    const prev = diffs[i - 1];
    const next = i + 1 < diffs.length ? diffs[i + 1] : 0;
    const spike = diffs[i] >= CUT_THRESHOLD && diffs[i] >= CUT_PEAK_RATIO * prev && diffs[i] >= CUT_PEAK_RATIO * next;
    if (spike && (!cuts.length || times[i] - cuts[cuts.length - 1] >= CUT_MIN_GAP - 1e-9)) {
      cuts.push(Math.round(times[i] * 100) / 100);
    }
  }
  return cuts;
};

export const rhythm = (cuts: number[], durationSec: number) => ({
  cutsPerMinute: durationSec > 0 ? Math.round((cuts.length / durationSec) * 60 * 10) / 10 : 0,
  avgShotSec: Math.round((durationSec / (cuts.length + 1)) * 100) / 100,
  firstCutSec: cuts.length ? cuts[0] : null,
});
