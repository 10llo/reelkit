import type { Caption } from "@remotion/captions";
import type { Episode } from "../../src/episode/schema";
import { paginate, wordsFromCaptions, wordsFromScript, type Page } from "../../src/frame/captions-model";
import { FPS, resolveSceneStarts, totalFrames } from "../../src/frame/timing";

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export const srtTime = (ms: number): string => {
  const t = Math.max(0, Math.round(ms));
  return `${pad(Math.floor(t / 3_600_000))}:${pad(Math.floor(t / 60_000) % 60)}:${pad(Math.floor(t / 1000) % 60)},${pad(t % 1000, 3)}`;
};

export const pagesToSrt = (pages: Page[], fps = FPS): string =>
  pages
    .map(
      (page, i) =>
        `${i + 1}\n${srtTime((page.from / fps) * 1000)} --> ${srtTime((page.to / fps) * 1000)}\n${page.words.map((w) => w.text).join(" ")}\n`,
    )
    .join("\n");

/** The same caption pages the video shows. */
export const buildSrt = (episode: Episode, captions: Caption[] | null): string => {
  const total = totalFrames(episode.durationSeconds);
  const { starts } = resolveSceneStarts(episode.sceneStarts, total);
  const groups = captions ? wordsFromCaptions(captions, FPS) : wordsFromScript(episode.script, starts, total);
  return pagesToSrt(paginate(groups));
};
