import path from "node:path";
import { flagString, type Args } from "../lib/args";
import { createEpisode } from "../lib/episode-scaffold";

export const run = async (args: Args): Promise<number> => {
  const [action, slug] = args.positional;
  const talentId = flagString(args, "talent", "");
  if (action !== "create" || !slug || !talentId) {
    console.error("Usage: reelkit episode create <slug> --talent=<id>   (run from the workspace root)");
    return 2;
  }
  try {
    const dir = createEpisode(process.cwd(), { slug, talentId });
    console.log(`✓ Created ${path.relative(process.cwd(), dir)}`);
    return 0;
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    return 1;
  }
};
