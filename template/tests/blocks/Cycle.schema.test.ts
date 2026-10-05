import { expect, it } from "vitest";
import { cycleSchema } from "../../src/blocks/Cycle.schema";

const stage = (label: string) => ({ icon: "refresh", label });

it("defaults centre label and direction", () => {
  const p = cycleSchema.parse({ stages: [stage("a"), stage("b"), stage("c")] });
  expect([p.centerLabel, p.direction]).toEqual(["", "cw"]);
});
it("accepts 3–6 stages with labels ≤ 16 characters", () => {
  expect(cycleSchema.safeParse({ stages: [stage("a"), stage("b")] }).success).toBe(false);
  expect(cycleSchema.safeParse({ stages: new Array(7).fill(stage("a")) }).success).toBe(false);
  expect(cycleSchema.safeParse({ stages: [stage("x".repeat(17)), stage("b"), stage("c")] }).success).toBe(false);
});
it("limits the centre label to 10 characters", () => {
  expect(cycleSchema.safeParse({ stages: [stage("a"), stage("b"), stage("c")], centerLabel: "x".repeat(11) }).success).toBe(false);
});
