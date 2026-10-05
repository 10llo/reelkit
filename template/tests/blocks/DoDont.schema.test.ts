import { expect, it } from "vitest";
import { doDontSchema } from "../../src/blocks/DoDont.schema";

const DANI = {
  cards: [
    { icon: "milk", label: "Leche", verdict: "no" },
    { icon: "spoonDrop", label: "Hacerlo vomitar por tu cuenta", verdict: "no" },
  ],
};

it("accepts the Dani cards", () => {
  expect(doDontSchema.parse(DANI).cards).toHaveLength(2);
});
it("needs exactly two cards", () => {
  expect(doDontSchema.safeParse({ cards: [DANI.cards[0]] }).success).toBe(false);
});
it("only accepts no / yes verdicts", () => {
  expect(doDontSchema.safeParse({ cards: [DANI.cards[0], { ...DANI.cards[1], verdict: "maybe" }] }).success).toBe(false);
});
