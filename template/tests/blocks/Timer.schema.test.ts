import { expect, it } from "vitest";
import { timerSchema } from "../../src/blocks/Timer.schema";

const DANI = {
  low: 6,
  high: 12,
  unit: "h",
  caption: "Los síntomas\npueden tardar",
  chips: [
    { icon: "vomit", label: "Vómito" },
    { icon: "panting", label: "Inquietud y jadeo" },
    { icon: "tremor", label: "Temblores" },
  ],
};

it("accepts the Dani timer", () => {
  expect(timerSchema.parse(DANI).chips).toHaveLength(3);
});
it("rejects low > high", () => {
  expect(timerSchema.safeParse({ ...DANI, low: 13 }).success).toBe(false);
});
it("allows at most 3 chips", () => {
  expect(timerSchema.safeParse({ ...DANI, chips: [...DANI.chips, DANI.chips[0]] }).success).toBe(false);
});
