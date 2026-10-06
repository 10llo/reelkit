import { describe, expect, it } from "vitest";
import { LAYOUTS, intersects, slotKeepOut, type Layout, type Rect } from "../src/frame/layout";

const regions = (l: Layout): [string, Rect][] => [
  ["tracker", l.tracker],
  ["stage", l.stage],
  ["captions", l.captions],
  ["disclaimer", l.disclaimer],
];
const inside = (r: Rect, l: Layout) =>
  r.x >= 0 && r.y >= 0 && r.x + r.width <= l.canvas.width && r.y + r.height <= l.canvas.height;

describe.each(Object.values(LAYOUTS))("layout $name", (layout) => {
  it("keeps every region inside the canvas", () => {
    for (const [, r] of regions(layout)) expect(inside(r, layout)).toBe(true);
    expect(inside(slotKeepOut(layout), layout)).toBe(true);
  });
  it("keeps every region out of the slot plus clearance", () => {
    for (const [name, r] of regions(layout)) {
      expect({ name, hit: intersects(r, slotKeepOut(layout)) }).toEqual({ name, hit: false });
    }
  });
  it("keeps the name pill narrower than the slot", () => {
    expect(layout.namePill.maxWidth).toBeLessThan(layout.slot.width);
  });
  it("keeps the stage clear of the name pill", () => {
    const pillTop = layout.slot.y - layout.namePill.height / 2;
    expect(layout.stage.y + layout.stage.height).toBeLessThan(pillTop);
  });
  it("respects the platform safe zones", () => {
    for (const [, r] of regions(layout)) {
      expect(r.y).toBeGreaterThanOrEqual(layout.safe.top);
      expect(r.y + r.height).toBeLessThanOrEqual(layout.canvas.height - layout.safe.bottom);
    }
    expect(layout.slot.y + layout.slot.height).toBeLessThanOrEqual(layout.canvas.height - layout.safe.bottom);
    expect(layout.canvas.width - (layout.slot.x + layout.slot.width)).toBeGreaterThanOrEqual(layout.rightGutter);
  });
});

it("matches the Dani brief at 9:16", () => {
  const l = LAYOUTS["9x16"];
  expect(l.slot).toEqual({ x: 550, y: 1000, width: 380, height: 500, radius: 40 });
  expect(l.stage).toEqual({ x: 60, y: 320, width: 960, height: 620 });
  expect(l.rightGutter).toBe(150);
});

it("keeps the 9:16 stage inside the centre 3:4 crop used by the profile grid", () => {
  const l = LAYOUTS["9x16"];
  const cropTop = (l.canvas.height - (l.canvas.width * 4) / 3) / 2; // 1080×1440 centred → 240
  expect(l.stage.y).toBeGreaterThanOrEqual(cropTop);
  expect(l.stage.y + l.stage.height).toBeLessThanOrEqual(cropTop + (l.canvas.width * 4) / 3);
});
