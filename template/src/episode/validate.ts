import type { z } from "zod";
import { BLOCK_SCHEMAS, isBlockName } from "../blocks/schemas";
import { SCENE_IDS, totalFrames } from "../frame/timing";
import { episodeSchema, type Beat, type Episode } from "./schema";
import { resolveColor, talentSchema, type Talent } from "./talent";

export class EpisodeError extends Error {}

const joinPath = (base: string, keys: PropertyKey[]) =>
  keys.reduce<string>((acc, key) => (typeof key === "number" ? `${acc}[${key}]` : `${acc}.${String(key)}`), base);

/** Lines for one issue; a union failure reports the branch with the fewest issues (the first on ties). */
const issueLines = (path: string, issue: z.core.$ZodIssue): string[] => {
  const here = joinPath(path, issue.path);
  if (issue.code === "invalid_union" && issue.errors.length) {
    const best = issue.errors.reduce((a, b) => (b.length < a.length ? b : a));
    return best.flatMap((inner) => issueLines(here, inner));
  }
  return [`${here}: ${issue.message}`];
};

const formatIssues = (path: string, error: z.ZodError) => error.issues.flatMap((issue) => issueLines(path, issue)).join("\n");

export const validateBeat = (beat: Beat, path: string): Beat => {
  if (!isBlockName(beat.block)) {
    throw new EpisodeError(
      `${path}: unknown block "${beat.block}". Known blocks: ${Object.keys(BLOCK_SCHEMAS).join(", ")}`,
    );
  }
  const result = BLOCK_SCHEMAS[beat.block].safeParse(beat.props);
  if (!result.success) {
    throw new EpisodeError(formatIssues(`${path}.props`, result.error));
  }
  return { block: beat.block, props: result.data as Record<string, unknown> };
};

export const validateEpisode = (raw: unknown): Episode => {
  const parsed = episodeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new EpisodeError(formatIssues("episode", parsed.error));
  }
  const episode = parsed.data;
  const problems: string[] = [];
  for (const id of SCENE_IDS) {
    const scene = episode.scenes[id];
    scene.beats = scene.beats.map((beat, i) => {
      try {
        return validateBeat(beat, `scenes.${id}.beats[${i}]`);
      } catch (err) {
        problems.push((err as Error).message);
        return beat;
      }
    });
  }
  if (episode.coverFrame >= totalFrames(episode.durationSeconds)) {
    problems.push(`episode.coverFrame: ${episode.coverFrame} is past the last frame`);
  }
  if (problems.length) {
    throw new EpisodeError(problems.join("\n"));
  }
  return episode;
};

export const validateTalent = (raw: unknown): Talent => {
  const parsed = talentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new EpisodeError(formatIssues("talent", parsed.error));
  }
  return parsed.data;
};

const COLOR_KEYS = ["color", "outline"];

const collectColorProblems = (value: unknown, path: string, talent: Talent, problems: string[]) => {
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectColorProblems(item, `${path}[${i}]`, talent, problems));
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (COLOR_KEYS.includes(key) && typeof child === "string") {
        try {
          resolveColor(child, talent.colors);
        } catch (err) {
          problems.push(`${childPath}: ${(err as Error).message}`);
        }
      } else {
        collectColorProblems(child, childPath, talent, problems);
      }
    }
  }
};

/** Checks every `color`, `outline` and `hero.color` prop of one beat against the talent palette. */
export const validateBeatColors = (beat: Beat, path: string, talent: Talent): void => {
  const problems: string[] = [];
  collectColorProblems(beat.props, `${path}.props`, talent, problems);
  if (problems.length) {
    throw new EpisodeError(problems.join("\n"));
  }
};

/** Run after both files validate: a typo'd color token fails here instead of mid-render. */
export const validateColors = (episode: Episode, talent: Talent): void => {
  const problems: string[] = [];
  for (const id of SCENE_IDS) {
    episode.scenes[id].beats.forEach((beat, i) => {
      collectColorProblems(beat.props, `scenes.${id}.beats[${i}].props`, talent, problems);
    });
  }
  if (problems.length) {
    throw new EpisodeError(problems.join("\n"));
  }
};
