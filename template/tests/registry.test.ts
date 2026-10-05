import { expect, it } from "vitest";
import { BLOCKS } from "../src/blocks/registry";
import { BLOCK_SCHEMAS } from "../src/blocks/schemas";

it("has a component for every registered schema", () => {
  expect(Object.keys(BLOCKS).sort()).toEqual(Object.keys(BLOCK_SCHEMAS).sort());
});
