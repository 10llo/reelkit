import { expect, it } from "vitest";
import { chipColumns, chipsSchema } from "../../src/blocks/Chips.schema";

const item = (label: string) => ({ icon: "info", label });

it("defaults to auto columns: two only when every label is ≤ 14 characters", () => {
  const short = chipsSchema.parse({ items: [item("Calor"), item("Polvo")] });
  expect(short.columns).toBe("auto");
  expect(chipColumns(short.items, short.columns)).toBe(2);
  const long = chipsSchema.parse({ items: [item("Calor"), item("Cargadores genéricos")] });
  expect(chipColumns(long.items, long.columns)).toBe(1);
  expect(chipColumns(long.items, 2)).toBe(2);
});
it("accepts 2–6 items", () => {
  expect(chipsSchema.safeParse({ items: [item("a")] }).success).toBe(false);
  expect(chipsSchema.safeParse({ items: "abcdefg".split("").map(item) }).success).toBe(false);
});
it("limits chip labels to 22 characters", () => {
  expect(chipsSchema.safeParse({ items: [item("a"), item("Una etiqueta demasiado larga")] }).success).toBe(false);
});
