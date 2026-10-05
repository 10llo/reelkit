import { expect, it } from "vitest";
import { ICONS } from "../src/icons";
import { ICON_NAMES } from "../src/icons/names";

it("registers a component for exactly the declared icon names", () => {
  expect(Object.keys(ICONS).sort()).toEqual([...ICON_NAMES].sort());
});
