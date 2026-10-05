import { expect, it } from "vitest";
import { hookSchema } from "../../src/blocks/Hook.schema";

const DANI = {
  line1: "¿Tu perro se comió",
  line2: "UN CHOCOLATE?",
  chip: "Halloween · guía de 30 segundos",
  hero: { animation: "bites", color: "chocoMilk" },
  stamp: "paw",
};

it("accepts the Dani hook", () => {
  expect(hookSchema.parse(DANI).hero.color).toBe("chocoMilk");
});
it("requires an icon for pop and shake heroes", () => {
  expect(hookSchema.safeParse({ ...DANI, hero: { animation: "pop" } }).success).toBe(false);
  expect(hookSchema.safeParse({ ...DANI, hero: { animation: "shake", icon: "warning" } }).success).toBe(true);
});
it("limits line2 to 18 characters", () => {
  expect(hookSchema.safeParse({ ...DANI, line2: "UN CHOCOLATE AMARGO?" }).success).toBe(false);
});
