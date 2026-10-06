import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEpisodeDir, readJson, saveEpisodeRaw } from "../../scripts/lib/episode-files";
import { TEMPLATE_ROOT } from "./paths";

const examples = path.join(TEMPLATE_ROOT, "examples");
let tmp: string;
const copyExample = (name: string) => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-ep-"));
  fs.cpSync(path.join(examples, name), tmp, { recursive: true });
  return tmp;
};
afterEach(() => tmp && fs.rmSync(tmp, { recursive: true, force: true }));

describe("loadEpisodeDir", () => {
  it("loads and validates an example", () => {
    const loaded = loadEpisodeDir(copyExample("dani-chocolate"));
    expect(loaded.episode.slug).toBe("2026-10-chocolate");
    expect(loaded.talent.id).toBe("dani");
    expect(loaded.raw.slug).toBe("2026-10-chocolate");
  });
  it("names the folder when episode.json is missing", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-ep-"));
    expect(() => loadEpisodeDir(tmp)).toThrow(/No episode\.json in .*reelkit-ep-/);
  });
  it("reports a bad colour token with its path", () => {
    const dir = copyExample("dani-chocolate");
    const raw = readJson(path.join(dir, "episode.json"));
    raw.scenes.hook.beats[0].props.hero.color = "chocoMilks";
    fs.writeFileSync(path.join(dir, "episode.json"), JSON.stringify(raw));
    expect(() => loadEpisodeDir(dir)).toThrow(/scenes\.hook\.beats\[0\]\.props\.hero\.color/);
  });
});

describe("saveEpisodeRaw", () => {
  it("merges into the raw JSON (no defaults written) and validates", () => {
    const loaded = loadEpisodeDir(copyExample("smoke"));
    const episode = saveEpisodeRaw(loaded, { stage: "synced", captionsSrc: "captions.json" });
    expect(episode.stage).toBe("synced");
    const written = readJson(path.join(tmp, "episode.json"));
    expect(written.captionsSrc).toBe("captions.json");
    expect(written.facts).toBeUndefined(); // default not materialised
  });
  it("refuses to save an invalid patch", () => {
    const loaded = loadEpisodeDir(copyExample("smoke"));
    expect(() => saveEpisodeRaw(loaded, { durationSeconds: 90 })).toThrow(/durationSeconds/);
  });
});
