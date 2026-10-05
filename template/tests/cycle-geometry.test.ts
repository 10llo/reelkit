import { describe, expect, it } from "vitest";
import { CYCLE_NODE, CYCLE_RADIUS, cycleLayout } from "../src/blocks/Cycle.schema";

describe.each([3, 4, 5, 6])("cycleLayout with %i stages", (n) => {
  const layout = cycleLayout(n, "cw");
  it("places every node on the ring", () => {
    for (const node of layout.nodes) expect(Math.hypot(node.x, node.y)).toBeCloseTo(CYCLE_RADIUS);
  });
  it("keeps every label inside the 960 px row", () => {
    for (const node of layout.nodes) {
      const left = node.labelSide === "left" ? node.x - CYCLE_NODE / 2 - 16 - 210 : node.x - 105;
      const right = node.labelSide === "right" ? node.x + CYCLE_NODE / 2 + 16 + 210 : node.x + 105;
      expect(left).toBeGreaterThanOrEqual(-480);
      expect(right).toBeLessThanOrEqual(480);
    }
  });
  it("is at most 560 px tall", () => {
    expect(layout.height).toBeLessThanOrEqual(560);
  });
});

it("mirrors counter-clockwise", () => {
  const cw = cycleLayout(3, "cw").nodes[0];
  const ccw = cycleLayout(3, "ccw").nodes[0];
  expect(ccw.x).toBeCloseTo(-cw.x);
  expect(ccw.y).toBeCloseTo(cw.y);
});
