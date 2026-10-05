import { expect, it } from "vitest";
import { BLOCK_SCHEMAS } from "../src/blocks/schemas";

it("registers the 10 core blocks", () => {
  expect(Object.keys(BLOCK_SCHEMAS).sort()).toEqual([
    "BigStat",
    "Checklist",
    "Chips",
    "Close",
    "Compare",
    "DoDont",
    "Hook",
    "MythFact",
    "Quantity",
    "Timer",
  ]);
});
