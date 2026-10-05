import { expect, it } from "vitest";
import { decisionSchema } from "../../src/blocks/Decision.schema";

const outcome = (label: string, tone = "ok") => ({ label, tone });
const followUp = { question: "¿Ya tiene vómito o temblores?", yes: outcome("Urgencias ya", "danger"), no: outcome("Llama a tu veterinaria", "warn") };
const BASE = { question: "¿Comió chocolate amargo?", yes: followUp, no: outcome("Observa 12 horas") };

it("accepts one follow-up branch and fills the tag labels", () => {
  const p = decisionSchema.parse(BASE);
  expect([p.yesLabel, p.noLabel]).toEqual(["SÍ", "NO"]);
});
it("rejects two follow-up branches (depth ≤ 2)", () => {
  const r = decisionSchema.safeParse({ ...BASE, no: followUp });
  expect(r.success).toBe(false);
  expect(JSON.stringify(r.error?.issues)).toContain("only one branch");
});
it("limits lengths: question 60, outcome 40, follow-up question 44, follow-up outcomes 24", () => {
  expect(decisionSchema.safeParse({ ...BASE, question: "x".repeat(61) }).success).toBe(false);
  expect(decisionSchema.safeParse({ ...BASE, no: outcome("x".repeat(41)) }).success).toBe(false);
  expect(decisionSchema.safeParse({ ...BASE, yes: { ...followUp, question: "x".repeat(45) } }).success).toBe(false);
  expect(decisionSchema.safeParse({ ...BASE, yes: { ...followUp, no: outcome("x".repeat(25)) } }).success).toBe(false);
});
it("rejects unknown tones", () => {
  expect(decisionSchema.safeParse({ ...BASE, no: outcome("a", "maybe") }).success).toBe(false);
});
it("limits single words per box and names the word", () => {
  const long = decisionSchema.safeParse({ ...BASE, no: outcome("Electrocardiogramas ya") });
  expect(long.success).toBe(false);
  expect(JSON.stringify(long.error?.issues)).toContain('word \\"Electrocardiogramas\\" is too long');
  expect(decisionSchema.safeParse({ ...BASE, no: outcome("Esterilización inmediata") }).success).toBe(true);
  const compact = decisionSchema.safeParse({ ...BASE, yes: { ...followUp, no: outcome("Hospitalización") } });
  expect(compact.success).toBe(false);
  expect(decisionSchema.safeParse({ ...BASE, yes: { ...followUp, no: outcome("Llama a tu veterinaria") } }).success).toBe(true);
  expect(decisionSchema.safeParse({ ...BASE, yes: { ...followUp, question: "¿Presenta hipersalivación?" } }).success).toBe(true);
});
