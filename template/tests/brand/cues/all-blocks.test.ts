import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import samples from "../../../src/gallery/samples.json";
import { BLOCK_CUES, cuesFor } from "../../../src/blocks/cues";
import { BLOCK_SCHEMAS, type BlockName } from "../../../src/blocks/schemas";
import { SFX_NAMES } from "../../../src/brand/sfx";
import { validateEpisode, validateTalent } from "../../../src/episode/validate";
import { SCENE_IDS, resolveSceneStarts, sceneDurations, splitBeats, totalFrames } from "../../../src/frame/timing";
import { BRAND_TALENT } from "../samples";

it("every block has a cue function", () => {
  expect(Object.keys(BLOCK_CUES).sort()).toEqual(Object.keys(BLOCK_SCHEMAS).sort());
});

describe.each(samples as { block: BlockName; props: unknown; durationInFrames: number }[])("gallery $block", (sample) => {
  it("has at least one known cue, all inside the beat", () => {
    const [timing] = splitBeats(sample.durationInFrames, 1, 0.5);
    const props = BLOCK_SCHEMAS[sample.block].parse(sample.props);
    const cues = cuesFor(sample.block, props, timing, BRAND_TALENT);
    expect(cues.length).toBeGreaterThan(0);
    for (const cue of cues) {
      expect(SFX_NAMES).toContain(cue.name);
      expect(cue.at).toBeGreaterThanOrEqual(timing.from);
      expect(cue.at).toBeLessThanOrEqual(timing.from + timing.duration);
    }
  });
});

const examples = path.resolve(__dirname, "../../../examples");
describe.each(fs.readdirSync(examples).filter((d) => fs.existsSync(path.join(examples, d, "episode.json"))))("example %s", (dir) => {
  it("every beat's cues stay inside its beat", () => {
    const episode = validateEpisode(JSON.parse(fs.readFileSync(path.join(examples, dir, "episode.json"), "utf8")));
    const talent = validateTalent(JSON.parse(fs.readFileSync(path.join(examples, dir, "talent.json"), "utf8")));
    const total = totalFrames(episode.durationSeconds);
    const durations = sceneDurations(resolveSceneStarts(episode.sceneStarts, total).starts, total);
    SCENE_IDS.forEach((id, s) => {
      const scene = episode.scenes[id];
      splitBeats(durations[s], scene.beats.length, scene.split).forEach((timing, b) => {
        const beat = scene.beats[b];
        for (const cue of cuesFor(beat.block as BlockName, beat.props, timing, talent)) {
          expect(cue.at).toBeGreaterThanOrEqual(timing.from);
          expect(cue.at).toBeLessThanOrEqual(timing.from + timing.duration);
        }
      });
    });
  });
});
