import { expect, it } from "vitest";
import { anatomySchema, calloutSlots } from "../../src/blocks/Anatomy.schema";

const callout = (label: string, x: number, y: number) => ({ label, x, y });
const BASE = { subject: { diagram: "dog" }, callouts: [callout("Nariz", 10, 40), callout("Cola", 90, 45)] };

it("accepts a diagram or an icon as subject, not both or neither", () => {
  expect(anatomySchema.safeParse(BASE).success).toBe(true);
  expect(anatomySchema.safeParse({ ...BASE, subject: { icon: "tooth" } }).success).toBe(true);
  expect(anatomySchema.safeParse({ ...BASE, subject: { diagram: "dog", icon: "tooth" } }).success).toBe(false);
  expect(anatomySchema.safeParse({ ...BASE, subject: { diagram: "robot" } }).success).toBe(false);
});
it("allows at most 3 callouts per side and 2–6 in total", () => {
  const left = [callout("a", 10, 10), callout("b", 20, 20), callout("c", 30, 30), callout("d", 40, 40)];
  const r = anatomySchema.safeParse({ ...BASE, callouts: left });
  expect(r.success).toBe(false);
  expect(JSON.stringify(r.error?.issues)).toContain("at most 3 callouts per side");
  expect(anatomySchema.safeParse({ ...BASE, callouts: [callout("a", 10, 10)] }).success).toBe(false);
});
it("rejects a highlight past the last callout and anchors outside 0–100", () => {
  expect(anatomySchema.safeParse({ ...BASE, highlight: 2 }).success).toBe(false);
  expect(anatomySchema.safeParse({ ...BASE, callouts: [callout("a", 101, 10), BASE.callouts[1]] }).success).toBe(false);
});
it("assigns slots per side in y order", () => {
  const slots = calloutSlots([callout("low", 10, 80), callout("high", 10, 20), callout("right", 70, 50)]);
  expect(slots).toEqual([
    { side: "left", slot: 1, count: 2 },
    { side: "left", slot: 0, count: 2 },
    { side: "right", slot: 0, count: 1 },
  ]);
});
it("limits a single label word to the column width", () => {
  expect(anatomySchema.safeParse({ ...BASE, callouts: [callout("Almohadillas", 10, 40), BASE.callouts[1]] }).success).toBe(true);
  const r = anatomySchema.safeParse({ ...BASE, callouts: [callout("Electrocardiograma", 10, 40), BASE.callouts[1]] });
  expect(r.success).toBe(false);
});
it("names a too-long word", () => {
  const r = anatomySchema.safeParse({ ...BASE, callouts: [callout("Hipersalivación", 10, 40), BASE.callouts[1]] });
  expect(JSON.stringify(r.error?.issues)).toContain('word \\"Hipersalivación\\" is too long');
});
