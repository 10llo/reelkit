import fs from "node:fs";
import path from "node:path";
import type { Episode } from "../../src/episode/schema";
import type { Talent } from "../../src/episode/talent";
import { validateColors, validateEpisode, validateTalent } from "../../src/episode/validate";

export const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));

export const writeJson = (file: string, value: unknown) =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

export type LoadedEpisode = {
  dir: string;
  episodeFile: string;
  raw: Record<string, unknown>;
  episode: Episode;
  talent: Talent;
};

export const loadEpisodeDir = (dir: string): LoadedEpisode => {
  const episodeFile = path.join(dir, "episode.json");
  const talentFile = path.join(dir, "talent.json");
  if (!fs.existsSync(episodeFile)) {
    throw new Error(`No episode.json in ${dir}`);
  }
  if (!fs.existsSync(talentFile)) {
    throw new Error(`No talent.json in ${dir} (each episode keeps a snapshot of its talent profile)`);
  }
  const raw = readJson(episodeFile);
  const episode = validateEpisode(raw);
  const talent = validateTalent(readJson(talentFile));
  validateColors(episode, talent);
  return { dir, episodeFile, raw, episode, talent };
};

/** Merges `patch` into the author's raw JSON and validates it, without saving. */
export const validateEpisodeRaw = (loaded: LoadedEpisode, patch: Record<string, unknown>): Episode => {
  const episode = validateEpisode({ ...loaded.raw, ...patch });
  validateColors(episode, loaded.talent);
  return episode;
};

/** Merges `patch` into the author's raw JSON, validates, and saves. */
export const saveEpisodeRaw = (loaded: LoadedEpisode, patch: Record<string, unknown>): Episode => {
  const episode = validateEpisodeRaw(loaded, patch);
  const next = { ...loaded.raw, ...patch };
  writeJson(loaded.episodeFile, next);
  loaded.raw = next;
  loaded.episode = episode;
  return episode;
};
