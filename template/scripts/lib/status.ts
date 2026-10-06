import fs from "node:fs";
import path from "node:path";
import type { STAGES } from "../../src/episode/schema";
import { loadEpisodeDir } from "./episode-files";

type Stage = (typeof STAGES)[number];

export const NEXT_STEP: Record<Stage, string> = {
  researched: "Write the script: continue /reelkit:new",
  scripted: "Build the video: continue /reelkit:new",
  built: "Record the talent, then: /reelkit:clip <video>",
  synced: "Export: /reelkit:export",
  exported: "Ready to publish",
};

export type EpisodeStatus = {
  folder: string;
  slug?: string;
  stage?: Stage;
  durationSeconds?: number;
  hasClip: boolean;
  captions: "synced" | "provisional";
  next: string;
  error?: string;
};

export const listEpisodes = (root: string): EpisodeStatus[] => {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root)
    .filter((name) => fs.existsSync(path.join(root, name, "episode.json")))
    .sort()
    .map((folder) => {
      try {
        const { episode } = loadEpisodeDir(path.join(root, folder));
        return {
          folder,
          slug: episode.slug,
          stage: episode.stage,
          durationSeconds: episode.durationSeconds,
          hasClip: episode.clip.src !== "",
          captions: episode.captionsSrc ? "synced" : "provisional",
          next: NEXT_STEP[episode.stage],
        };
      } catch (err) {
        return { folder, hasClip: false, captions: "provisional", next: "Fix the episode files", error: (err as Error).message };
      }
    });
};

export const formatStatus = (list: EpisodeStatus[]): string => {
  if (!list.length) {
    return "No episodes yet.";
  }
  return list
    .map((e) =>
      e.error
        ? `✗ ${e.folder}: ${e.error.split("\n")[0]}`
        : `• ${e.folder} — ${e.stage}, ${e.durationSeconds} s, clip: ${e.hasClip ? "yes" : "no"}, captions: ${e.captions}\n  next: ${e.next}`,
    )
    .join("\n");
};
