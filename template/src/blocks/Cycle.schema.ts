import { z } from "zod";
import { iconName } from "./schema-parts";

export const cycleSchema = z.strictObject({
  stages: z.array(z.strictObject({ icon: iconName, label: z.string().min(1).max(16) })).min(3).max(6),
  centerLabel: z
    .string()
    .max(10)
    .refine((s) => s.split(/\s+/).every((w) => w.length <= 7), { message: "centre label words must be at most 7 characters" })
    .default(""),
  direction: z.enum(["cw", "ccw"]).default("cw"),
});

export const CYCLE_RADIUS = 150;
export const CYCLE_NODE = 120;
export const CYCLE_LABEL_W = 210;
export const CYCLE_LABEL_H = 92;
const GAP = 16;
const MARGIN = 14;

export type CycleNode = { x: number; y: number; angle: number; labelSide: "left" | "right" | "above" | "below" };

/** Node centres relative to the ring centre, label sides, and the block height / centre offset. */
export const cycleLayout = (n: number, direction: "cw" | "ccw") => {
  const dir = direction === "cw" ? 1 : -1;
  const nodes: CycleNode[] = Array.from({ length: n }, (_, i) => {
    const angle = -90 + (dir * (2 * i + 1) * 180) / n;
    const rad = (angle * Math.PI) / 180;
    const x = CYCLE_RADIUS * Math.cos(rad);
    const y = CYCLE_RADIUS * Math.sin(rad);
    const vertical = Math.abs(Math.cos(rad)) < 0.25;
    const labelSide = vertical ? (y > 0 ? "below" : "above") : x > 0 ? "right" : "left";
    return { x, y, angle, labelSide };
  });
  const tops = nodes.map((p) => p.y - CYCLE_NODE / 2 - (p.labelSide === "above" ? CYCLE_LABEL_H + GAP : 0));
  const bottoms = nodes.map((p) => p.y + CYCLE_NODE / 2 + (p.labelSide === "below" ? CYCLE_LABEL_H + GAP : 0));
  const minY = Math.min(-CYCLE_RADIUS - 12, ...tops);
  const maxY = Math.max(CYCLE_RADIUS + 12, ...bottoms);
  return { nodes, height: maxY - minY + MARGIN * 2, centerY: -minY + MARGIN };
};
