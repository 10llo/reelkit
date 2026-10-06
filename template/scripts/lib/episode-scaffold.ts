import fs from "node:fs";
import path from "node:path";
import { validateTalent } from "../../src/episode/validate";
import { readJson, writeJson } from "./episode-files";

const SLUG = /^[a-z0-9-]+$/;

export const episodeFolderName = (slug: string, now: Date): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${slug}`;

export const createEpisode = (
  root: string,
  { slug, talentId, now = new Date() }: { slug: string; talentId: string; now?: Date },
): string => {
  if (!SLUG.test(slug)) {
    throw new Error(`Slug "${slug}" must use only a-z, 0-9 and "-"`);
  }
  const talentFile = path.join(root, "talents", `${talentId}.json`);
  if (!fs.existsSync(talentFile)) {
    throw new Error(`No talent profile at ${talentFile}. Create one with /reelkit:setup.`);
  }
  const raw = readJson(talentFile);
  const talent = validateTalent(raw);
  if (talent.id !== talentId) {
    throw new Error(`${talentFile}: id "${talent.id}" does not match "${talentId}"`);
  }
  const dir = path.join(root, "episodes", episodeFolderName(slug, now));
  if (fs.existsSync(dir)) {
    throw new Error(`${dir} already exists`);
  }
  fs.mkdirSync(dir, { recursive: true });
  writeJson(path.join(dir, "talent.json"), raw);
  return dir;
};
