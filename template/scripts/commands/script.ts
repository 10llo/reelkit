import fs from "node:fs";
import path from "node:path";
import type { Args } from "../lib/args";
import { loadEpisodeDir } from "../lib/episode-files";
import { buildScriptSheet } from "../lib/script-sheet";

export const run = async (args: Args): Promise<number> => {
  const dir = args.positional[0];
  if (!dir) {
    console.error("Usage: reelkit script <episodeDir>");
    return 2;
  }
  const { episode, talent } = loadEpisodeDir(dir);
  const out = path.join(dir, "script.md");
  fs.writeFileSync(out, buildScriptSheet(episode, talent));
  console.log(`✓ Wrote ${out}`);
  return 0;
};
