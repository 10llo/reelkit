import { expect, it } from "vitest";
import { mythFactSchema } from "../../src/blocks/MythFact.schema";

it("fills the default tags", () => {
  const p = mythFactSchema.parse({ myth: "Dejarlo enchufado lo explota", fact: "El cargador corta al llegar al 100 %" });
  expect([p.mythTag, p.factTag]).toEqual(["MITO", "REALIDAD"]);
});
it("limits the myth to 70 and the fact to 90 characters", () => {
  expect(mythFactSchema.safeParse({ myth: "x".repeat(71), fact: "y" }).success).toBe(false);
  expect(mythFactSchema.safeParse({ myth: "x", fact: "y".repeat(91) }).success).toBe(false);
});
