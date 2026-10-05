import { describe, expect, it } from "vitest";
import smokeTalent from "../examples/smoke/talent.json";
import { BLOCK_SCHEMAS } from "../src/blocks/schemas";
import { validateBeat, validateBeatColors, validateTalent } from "../src/episode/validate";
import samples from "../src/gallery/samples.json";

const talent = validateTalent(smokeTalent);

describe.each(samples.map((sample, i) => [i, sample] as const))("gallery sample %i", (i, sample) => {
  it(`${sample.block} validates against its schema and the palette`, () => {
    const beat = validateBeat({ block: sample.block, props: sample.props as Record<string, unknown> }, `gallery[${i}]`);
    expect(() => validateBeatColors(beat, `gallery[${i}]`, talent)).not.toThrow();
    expect(sample.durationInFrames).toBeGreaterThanOrEqual(60);
  });
});

it("has exactly one sample per registered block", () => {
  expect(samples.map((s) => s.block).sort()).toEqual(Object.keys(BLOCK_SCHEMAS).sort());
});
