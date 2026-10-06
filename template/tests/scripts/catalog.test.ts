import { describe, expect, it } from "vitest";
import { blockNames, blockSchema, episodeJsonSchema, summarizeBlock, talentJsonSchema } from "../../scripts/lib/catalog";

describe("catalog", () => {
  it("knows all 20 blocks", () => {
    const names = blockNames();
    expect(names).toHaveLength(20);
    expect(names).toContain("Process");
    expect([...names].sort()).toEqual(names);
  });
  it("exports a block's props as JSON Schema", () => {
    const schema = blockSchema("Process") as { properties: { steps: { minItems: number; maxItems: number } } };
    expect(schema.properties.steps.minItems).toBe(3);
    expect(schema.properties.steps.maxItems).toBe(5);
  });
  it("rejects unknown and inherited names", () => {
    expect(() => blockSchema("Nope")).toThrow(/Unknown block "Nope"\. Blocks: Anatomy, BigStat/);
    expect(() => blockSchema("toString")).toThrow(/Unknown block/);
  });
  it("summarizes every block in one line", () => {
    expect(summarizeBlock("Process")).toMatch(/^Process: steps\[3–5\]/);
    for (const name of blockNames()) {
      expect(summarizeBlock(name)).toMatch(new RegExp(`^${name}: .+`));
    }
  });
  it("exports the episode and talent schemas", () => {
    const episode = episodeJsonSchema() as { properties: { durationSeconds: { maximum: number } } };
    expect(episode.properties.durationSeconds.maximum).toBe(60);
    const talent = talentJsonSchema() as { required: string[] };
    expect(talent.required).toContain("disclaimer");
  });
});
