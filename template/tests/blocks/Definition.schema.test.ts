import { expect, it } from "vitest";
import { definitionSchema } from "../../src/blocks/Definition.schema";

const BASE = {
  term: "Leptospirosis canina",
  pronunciation: "lep-tos-pi-RO-sis ca-NI-na",
  category: "Infección bacteriana",
  meaning: "Infección que tu perro puede contraer por agua o charcos con orina de ratas, y que nos afecta.",
  icon: "drop",
};

it("accepts a full definition and fills defaults", () => {
  const p = definitionSchema.parse({ term: "Fiebre", meaning: "Temperatura alta.", icon: "thermometer" });
  expect([p.pronunciation, p.category]).toEqual(["", ""]);
  expect(definitionSchema.parse(BASE).term).toBe("Leptospirosis canina");
});
it("rejects meanings over 18 words", () => {
  expect(definitionSchema.safeParse({ ...BASE, meaning: new Array(19).fill("palabra").join(" ") }).success).toBe(false);
});
it("rejects a term over 24 characters and unknown props", () => {
  expect(definitionSchema.safeParse({ ...BASE, term: "x".repeat(25) }).success).toBe(false);
  expect(definitionSchema.safeParse({ ...BASE, subtitle: "x" }).success).toBe(false);
});
