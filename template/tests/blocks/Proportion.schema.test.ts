import { expect, it } from "vitest";
import { gridShape, proportionSchema } from "../../src/blocks/Proportion.schema";

const BASE = { numerator: 1, denominator: 4, label: "de los perros intoxicados comieron chocolate" };

it("fills defaults", () => {
  const p = proportionSchema.parse(BASE);
  expect([p.style, p.ofWord, p.source]).toEqual(["dots", "de cada", ""]);
});
it("rejects a numerator above the denominator", () => {
  const r = proportionSchema.safeParse({ ...BASE, numerator: 5 });
  expect(r.success).toBe(false);
  expect(JSON.stringify(r.error?.issues)).toContain("numerator");
});
it("limits the denominator to 2–100 and people to 20", () => {
  expect(proportionSchema.safeParse({ ...BASE, denominator: 101 }).success).toBe(false);
  expect(proportionSchema.safeParse({ ...BASE, denominator: 1, numerator: 1 }).success).toBe(false);
  expect(proportionSchema.safeParse({ ...BASE, style: "people", denominator: 21 }).success).toBe(false);
  expect(proportionSchema.safeParse({ ...BASE, style: "people", denominator: 20 }).success).toBe(true);
});
it("lays out grids as close to square as possible", () => {
  expect(gridShape(4)).toEqual({ cols: 2, rows: 2 });
  expect(gridShape(10)).toEqual({ cols: 4, rows: 3 });
  expect(gridShape(100)).toEqual({ cols: 10, rows: 10 });
});

it("limits the longest word of the label and the source to what fits the text column", () => {
  expect(proportionSchema.safeParse({ ...BASE, label: "otorrinolaringología crónica" }).success).toBe(true);
  const label = proportionSchema.safeParse({ ...BASE, label: "x".repeat(21) });
  expect(label.success).toBe(false);
  expect(label.error?.issues[0].message).toBe(`label word "${"x".repeat(21)}" is too long (max 20 characters)`);
  const source = proportionSchema.safeParse({ ...BASE, source: "y".repeat(33) });
  expect(source.error?.issues[0].message).toBe(`source word "${"y".repeat(33)}" is too long (max 32 characters)`);
});
