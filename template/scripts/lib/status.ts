import fs from "node:fs";
import path from "node:path";
import type { STAGES } from "../../src/episode/schema";
import { loadEpisodeDir } from "./episode-files";

type Stage = (typeof STAGES)[number];

export const NEXT_STEP: Record<Stage, string> = {
  researched: "Pick an angle and write the script: continue /reelkit:new",
  scripted: "Build the video from script-draft.md: continue /reelkit:new",
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

const draftStage = (dir: string): Stage | null =>
  fs.existsSync(path.join(dir, "script-draft.md")) ? "scripted" : fs.existsSync(path.join(dir, "research.md")) ? "researched" : null;

export const listEpisodes = (root: string): EpisodeStatus[] => {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root)
    .filter((name) => fs.statSync(path.join(root, name)).isDirectory())
    .sort()
    .flatMap((folder): EpisodeStatus[] => {
      const dir = path.join(root, folder);
      if (!fs.existsSync(path.join(dir, "episode.json"))) {
        const stage = draftStage(dir);
        return stage ? [{ folder, stage, hasClip: false, captions: "provisional", next: NEXT_STEP[stage] }] : [];
      }
      try {
        const { episode } = loadEpisodeDir(dir);
        return [
          {
            folder,
            slug: episode.slug,
            stage: episode.stage,
            durationSeconds: episode.durationSeconds,
            hasClip: episode.clip.src !== "",
            captions: episode.captionsSrc ? "synced" : "provisional",
            next: NEXT_STEP[episode.stage],
          },
        ];
      } catch (err) {
        return [{ folder, hasClip: false, captions: "provisional", next: "Fix the episode files", error: (err as Error).message }];
      }
    });
};

export const formatStatus = (list: EpisodeStatus[]): string => {
  if (!list.length) {
    return "No episodes yet.";
  }
  return list
    .map((e) => {
      if (e.error) {
        return `✗ ${e.folder}: ${e.error.split("\n")[0]}`;
      }
      if (e.durationSeconds === undefined) {
        return `• ${e.folder} — ${e.stage} (no video yet)\n  next: ${e.next}`;
      }
      return `• ${e.folder} — ${e.stage}, ${e.durationSeconds} s, clip: ${e.hasClip ? "yes" : "no"}, captions: ${e.captions}\n  next: ${e.next}`;
    })
    .join("\n");
};
