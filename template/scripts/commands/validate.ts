import type { Args } from "../lib/args";
import { loadEpisodeDir } from "../lib/episode-files";

export const run = async (args: Args): Promise<number> => {
  const dir = args.positional[0];
  if (!dir) {
    console.error("Usage: reelkit validate <episodeDir>");
    return 2;
  }
  try {
    const { episode, talent } = loadEpisodeDir(dir);
    console.log(`✓ ${episode.slug}: ${episode.durationSeconds} s, talent ${talent.id}`);
    return 0;
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    return 1;
  }
};
