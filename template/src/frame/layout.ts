import layouts from "./layouts.json";

export type Rect = { x: number; y: number; width: number; height: number };
export type LayoutName = "9x16" | "4x5";
export type Layout = {
  name: LayoutName;
  canvas: { width: number; height: number };
  safe: { top: number; bottom: number; left: number; right: number };
  tracker: Rect;
  stage: Rect;
  captions: Rect;
  disclaimer: Rect;
  slot: Rect & { radius: number };
  slotClearance: number;
  slotBorder: number;
  slotRing: number;
  namePill: { height: number; maxWidth: number; fontSize: number };
  captionsBaseSize: number;
  rightGutter: number;
};

export const LAYOUTS: Record<LayoutName, Layout> = {
  "9x16": { name: "9x16", ...layouts["9x16"] },
  "4x5": { name: "4x5", ...layouts["4x5"] },
};

export const inflate = (r: Rect, by: number): Rect => ({
  x: r.x - by,
  y: r.y - by,
  width: r.width + by * 2,
  height: r.height + by * 2,
});

export const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The slot plus its clearance: nothing but the slot frame may render here. */
export const slotKeepOut = (l: Layout): Rect => inflate(l.slot, l.slotClearance);
