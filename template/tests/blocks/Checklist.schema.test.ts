import { expect, it } from "vitest";
import { checklistSchema } from "../../src/blocks/Checklist.schema";

const DANI = {
  rows: ["Guarda el empaque", "Calcula cuánto comió y a qué hora", "Llama a tu veterinaria"],
  pill: "Las primeras 2 horas cuentan",
};

it("accepts the Dani checklist", () => {
  expect(checklistSchema.parse(DANI).rows).toHaveLength(3);
});
it("accepts 2–4 rows", () => {
  expect(checklistSchema.safeParse({ rows: ["a"] }).success).toBe(false);
  expect(checklistSchema.safeParse({ rows: ["a", "b", "c", "d", "e"] }).success).toBe(false);
});
it("limits rows to 34 characters", () => {
  expect(checklistSchema.safeParse({ rows: ["a", "x".repeat(34)] }).success).toBe(true);
  expect(checklistSchema.safeParse({ rows: ["a", "x".repeat(35)] }).success).toBe(false);
});
