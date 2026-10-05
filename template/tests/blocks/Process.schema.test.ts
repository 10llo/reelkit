import { expect, it } from "vitest";
import { maxProcessWord, processSchema } from "../../src/blocks/Process.schema";

const step = (label: string) => ({ icon: "paw", label });
const BASE = { steps: [step("Pipeta en la nuca"), step("Se esparce en piel"), step("Muere en horas")] };

it("defaults to arrow connectors", () => {
  expect(processSchema.parse(BASE).connector).toBe("arrow");
});
it("accepts 3–5 steps", () => {
  expect(processSchema.safeParse({ steps: BASE.steps.slice(0, 2) }).success).toBe(false);
  expect(processSchema.safeParse({ steps: [...BASE.steps, ...BASE.steps] }).success).toBe(false);
});
it("limits labels to 4 words and 20 characters", () => {
  expect(processSchema.safeParse({ steps: [step("uno dos tres cuatro cinco"), ...BASE.steps.slice(1)] }).success).toBe(false);
  expect(processSchema.safeParse({ steps: [step("x".repeat(21)), ...BASE.steps.slice(1)] }).success).toBe(false);
});
it("rejects a highlightStep past the last step", () => {
  const r = processSchema.safeParse({ ...BASE, highlightStep: 3 });
  expect(r.success).toBe(false);
  expect(JSON.stringify(r.error?.issues)).toContain("highlightStep");
});
it("limits the longest label word to what fits a column", () => {
  expect([3, 4, 5].map(maxProcessWord)).toEqual([14, 10, 8]);
  const five = processSchema.safeParse({ steps: new Array(5).fill(step("Desparasitación")) });
  expect(five.success).toBe(false);
  expect(five.error?.issues[0].message).toContain('"Desparasitación"');
  expect(processSchema.safeParse({ steps: new Array(3).fill(step("Desparasitar")) }).success).toBe(true);
});
