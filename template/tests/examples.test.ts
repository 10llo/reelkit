import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateColors, validateEpisode, validateTalent } from "../src/episode/validate";

const here = typeof __dirname === "undefined" ? path.dirname(fileURLToPath(import.meta.url)) : __dirname;
const examples = fs.existsSync(path.join(here, "../examples")) ? fs.readdirSync(path.join(here, "../examples")) : [];

describe.each(examples)("example %s", (name) => {
  const dir = path.join(here, "../examples", name);
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  it("has a valid episode and talent", () => {
    expect(() => validateEpisode(read("episode.json"))).not.toThrow();
    expect(() => validateTalent(read("talent.json"))).not.toThrow();
  });
  it("uses only palette colors that exist", () => {
    const talent = validateTalent(read("talent.json"));
    expect(() => validateColors(validateEpisode(read("episode.json")), talent)).not.toThrow();
  });
});
