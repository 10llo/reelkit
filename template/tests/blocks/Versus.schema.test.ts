import { expect, it } from "vitest";
import { versusSchema } from "../../src/blocks/Versus.schema";

const row = (attribute: string, winner?: string) => ({ attribute, left: "Sí", right: "No", ...(winner ? { winner } : {}) });
const BASE = {
  left: { name: "Pipeta", icon: "drop" },
  right: { name: "Pastilla", icon: "pill" },
  rows: [row("Dura un mes", "left"), row("Precio", "right")],
};

it("defaults the VS label", () => {
  expect(versusSchema.parse(BASE).vsLabel).toBe("VS");
});
it("accepts 2–4 rows", () => {
  expect(versusSchema.safeParse({ ...BASE, rows: [row("a")] }).success).toBe(false);
  expect(versusSchema.safeParse({ ...BASE, rows: new Array(5).fill(row("a")) }).success).toBe(false);
});
it("limits names to 14, attributes to 14 and values to 12 characters", () => {
  expect(versusSchema.safeParse({ ...BASE, left: { name: "x".repeat(15), icon: "pill" } }).success).toBe(false);
  expect(versusSchema.safeParse({ ...BASE, rows: [row("x".repeat(15)), row("b")] }).success).toBe(false);
  expect(versusSchema.safeParse({ ...BASE, rows: [{ attribute: "a", left: "x".repeat(13), right: "b" }, row("b")] }).success).toBe(false);
});
it("rejects unknown winners", () => {
  expect(versusSchema.safeParse({ ...BASE, rows: [row("a", "both"), row("b")] }).success).toBe(false);
});

it("limits the longest attribute word to what fits the middle column", () => {
  expect(versusSchema.safeParse({ ...BASE, rows: [row("Antiinflamat"), row("Baño después")] }).success).toBe(true);
  const r = versusSchema.safeParse({ ...BASE, rows: [row("Desparasitaci"), row("b")] });
  expect(r.success).toBe(false);
  expect(r.error?.issues[0].message).toBe('attribute word "Desparasitaci" is too long (max 12 characters)');
});
