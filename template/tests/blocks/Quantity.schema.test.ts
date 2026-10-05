import { describe, expect, it } from "vitest";
import { highlightIndex, quantitySchema } from "../../src/blocks/Quantity.schema";

const DANI = {
  chip: { icon: "dog", label: "Ejemplo: perro de 5 kg" },
  unit: "g",
  approx: true,
  rows: [
    { label: "De leche", value: 45, color: "chocoMilk" },
    { label: "Semiamargo", value: 20, color: "chocoSemi" },
    { label: "Amargo (100 % cacao)", value: 7, color: "chocoDark", outline: "danger" },
  ],
  highlight: "last",
  conclusion: "Con esto ya hay síntomas",
  footnote: "Dosis orientativa. Cada perro es distinto: ante la duda, llama.",
};

describe("strict props", () => {
  it("rejects a misspelled prop and names the key", () => {
    const result = quantitySchema.safeParse({ ...DANI, footnot: "x" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(/footnot/);
  });
});

describe("quantitySchema", () => {
  it("accepts the Dani chart", () => {
    expect(quantitySchema.parse(DANI).rows).toHaveLength(3);
  });
  it("rejects zero or negative values", () => {
    expect(quantitySchema.safeParse({ ...DANI, rows: [DANI.rows[0], { ...DANI.rows[1], value: 0 }] }).success).toBe(false);
  });
});

describe("highlightIndex", () => {
  const rows = quantitySchema.parse(DANI).rows;
  it("finds last, max and min, or -1 for none", () => {
    expect(highlightIndex(rows, "last")).toBe(2);
    expect(highlightIndex(rows, "max")).toBe(0);
    expect(highlightIndex(rows, "min")).toBe(2);
    expect(highlightIndex(rows, "none")).toBe(-1);
  });
});
it("accepts at most 3 rows", () => {
  expect(quantitySchema.safeParse({ ...DANI, rows: [...DANI.rows, DANI.rows[0]] }).success).toBe(false);
});
it("limits the footnote to 64 characters", () => {
  expect(quantitySchema.safeParse({ ...DANI, footnote: "x".repeat(64) }).success).toBe(true);
  expect(quantitySchema.safeParse({ ...DANI, footnote: "x".repeat(65) }).success).toBe(false);
});
