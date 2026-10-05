import { expect, it } from "vitest";
import { closeSchema } from "../../src/blocks/Close.schema";

const DANI = {
  line1: "Guárdalo y compártelo",
  line2: { text: "antes del 31", accent: "31" },
  accentIcon: "pumpkin",
};

it("accepts the Dani close with default actions", () => {
  const p = closeSchema.parse(DANI);
  expect(p.actions).toEqual(["bookmark", "share"]);
  expect(p.teaser).toBe("");
});
it("allows at most 3 actions", () => {
  expect(closeSchema.safeParse({ ...DANI, actions: ["bookmark", "share", "info", "check"] }).success).toBe(false);
});
