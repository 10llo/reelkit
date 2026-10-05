const SCENE_IDS = ["hook", "step1", "step2", "step3", "close"];

/** Frames worth checking: start, entrances settled, beat changes, before each fade, last frame. */
export const keyFrames = (starts, total, scenes) => {
  const set = new Set([0, total - 1]);
  starts.forEach((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : total;
    const duration = end - start;
    set.add(start + Math.min(20, duration - 1));
    const scene = scenes[SCENE_IDS[i]];
    if (scene.beats.length === 2) {
      const split = start + Math.round(duration * (scene.split ?? 0.5));
      set.add(split - 9);
      set.add(Math.min(end - 9, split + 30));
    } else {
      set.add(start + Math.round(duration * 0.6));
    }
    set.add(end - 9);
  });
  return [...set].filter((f) => f >= 0 && f < total).sort((a, b) => a - b);
};

export const slotRegion = (layout) => ({
  x: layout.slot.x - layout.slotClearance,
  y: layout.slot.y - layout.slotClearance,
  width: layout.slot.width + layout.slotClearance * 2,
  height: layout.slot.height + layout.slotClearance * 2,
  radius: layout.slot.radius + layout.slotClearance,
});

/** Is the centre of pixel (px, py) inside the rounded rect? */
export const insideRoundedRect = (px, py, r) => {
  const x = px + 0.5;
  const y = py + 0.5;
  if (x < r.x || y < r.y || x > r.x + r.width || y > r.y + r.height) {
    return false;
  }
  const cx = Math.min(Math.max(x, r.x + r.radius), r.x + r.width - r.radius);
  const cy = Math.min(Math.max(y, r.y + r.radius), r.y + r.height - r.radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r.radius ** 2;
};

/**
 * Counts pixels inside `region` (shrunk by `edge` px to skip the anti-aliased mask edge,
 * where the drifting background may show) whose RGB differs by more than `tolerance`.
 */
export const compareRegion = (a, b, region, tolerance = 2, edge = 1.5) => {
  const inner = {
    x: region.x + edge,
    y: region.y + edge,
    width: region.width - edge * 2,
    height: region.height - edge * 2,
    radius: Math.max(0, region.radius - edge),
  };
  let changed = 0;
  for (let py = Math.floor(inner.y); py < Math.ceil(inner.y + inner.height); py++) {
    for (let px = Math.floor(inner.x); px < Math.ceil(inner.x + inner.width); px++) {
      if (!insideRoundedRect(px, py, inner)) {
        continue;
      }
      const i = (py * a.width + px) * 4;
      if (
        Math.abs(a.data[i] - b.data[i]) > tolerance ||
        Math.abs(a.data[i + 1] - b.data[i + 1]) > tolerance ||
        Math.abs(a.data[i + 2] - b.data[i + 2]) > tolerance
      ) {
        changed++;
      }
    }
  }
  return changed;
};

export const parseFitLog = (text) => {
  const match = /^\[reelkit:fit\] (\S+) ([0-9.]+)$/.exec(text);
  return match ? { name: match[1], scale: Number(match[2]) } : null;
};

export const parseMinFontLog = (text) => {
  const match = /^\[reelkit:minfont\] (\S+) ([0-9.]+)$/.exec(text);
  return match ? { name: match[1], px: Number(match[2]) } : null;
};

export const parseOverflowLog = (text) => {
  const match = /^\[reelkit:overflow\] (\S+) ([0-9]+)$/.exec(text);
  return match ? { name: match[1], count: Number(match[2]) } : null;
};
