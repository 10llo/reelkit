import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { validateEpisode } from "../src/episode/validate";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../examples/dani-fiebre");

it("is a 45 s vet episode whose steps use only the new explainer blocks", () => {
  const episode = validateEpisode(JSON.parse(fs.readFileSync(path.join(dir, "episode.json"), "utf8")));
  expect(episode.durationSeconds).toBe(45);
  expect(episode.talent).toBe("dani");
  const stepBlocks = [episode.scenes.step1, episode.scenes.step2, episode.scenes.step3].flatMap((s) => s.beats.map((b) => b.block));
  expect(new Set(stepBlocks)).toEqual(new Set(["Definition", "Gauge", "Process", "Versus", "Decision"]));
  expect(JSON.stringify(episode)).not.toMatch(/dueño/i);
});
