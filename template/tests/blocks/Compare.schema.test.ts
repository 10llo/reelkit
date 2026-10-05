import { expect, it } from "vitest";
import { compareSchema } from "../../src/blocks/Compare.schema";

const DANI = {
  items: [
    { label: "Blanco", color: "chocoWhite" },
    { label: "De leche", color: "chocoMilk" },
    { label: "Semiamargo", color: "chocoSemi" },
    { label: "Amargo", color: "chocoDark" },
  ],
  conclusion: { text: "Más oscuro = más tóxico", accent: "más tóxico", tone: "danger" },
};

it("accepts the Dani comparison", () => {
  expect(compareSchema.parse(DANI).meter).toBe(true);
});
it("requires a color or an icon per item", () => {
  expect(compareSchema.safeParse({ items: [{ label: "A" }, { label: "B", color: "accent" }] }).success).toBe(false);
});
it("accepts 2–4 items only", () => {
  expect(compareSchema.safeParse({ items: [DANI.items[0]] }).success).toBe(false);
  expect(compareSchema.safeParse({ items: [...DANI.items, DANI.items[0]] }).success).toBe(false);
});
