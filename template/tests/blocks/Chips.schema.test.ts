import { expect, it } from "vitest";
import { chipsSchema } from "../../src/blocks/Chips.schema";

const item = (label: string) => ({ icon: "info", label });

it("defaults to two columns", () => {
  expect(chipsSchema.parse({ items: [item("a"), item("b")] }).columns).toBe(2);
});
it("accepts 2–6 items", () => {
  expect(chipsSchema.safeParse({ items: [item("a")] }).success).toBe(false);
  expect(chipsSchema.safeParse({ items: "abcdefg".split("").map(item) }).success).toBe(false);
});
it("limits chip labels to 22 characters", () => {
  expect(chipsSchema.safeParse({ items: [item("a"), item("Una etiqueta demasiado larga")] }).success).toBe(false);
});
