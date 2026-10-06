import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { validateEpisode, validateTalent } from "../../src/episode/validate";
import { buildScriptSheet } from "../../scripts/lib/script-sheet";
import { TEMPLATE_ROOT } from "./paths";

const load = (name: string) => {
  const dir = path.join(TEMPLATE_ROOT, "examples", name);
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  return { episode: validateEpisode(read("episode.json")), talent: validateTalent(read("talent.json")) };
};

it("builds Dani's chocolate sheet", () => {
  const { episode, talent } = load("dani-chocolate");
  const md = buildScriptSheet(episode, talent);
  expect(md).toContain("# Guion — Dogtora Dani");
  expect(md).toContain("**71 palabras · 30 s**");
  expect(md).toContain("| 1 | Gancho | 0,0–3,0 s | ¿Tu perro se comió un chocolate? Mira esto. | — |");
  expect(md).toContain("| 2 | Cuándo | 3,0–10,0 s | ¿Cuándo preocuparte?");
  expect(md).toContain("Pausa breve antes de empezar");
  expect(md).toContain("Una sola toma de menos de 30 segundos");
  expect(md).toContain("| Signos leves desde ≈ 20 mg/kg de metilxantinas |");
  expect(md).not.toMatch(/dueño/i);
});

it("warns when the text is too long for the duration", () => {
  const { episode, talent } = load("dani-chocolate");
  const long = { ...episode, durationSeconds: 15 };
  expect(buildScriptSheet(long, talent)).toContain("⚠");
});

it("escapes pipes in script lines", () => {
  const { episode, talent } = load("dani-chocolate");
  const piped = { ...episode, script: ["a | b", ...episode.script.slice(1)] };
  expect(buildScriptSheet(piped, talent)).toContain("a \\| b");
});
