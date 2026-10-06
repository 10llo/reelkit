import type { Args } from "../lib/args";
import { formatStatus, listEpisodes } from "../lib/status";

export const run = async (args: Args): Promise<number> => {
  console.log(formatStatus(listEpisodes(args.positional[0] ?? "episodes")));
  return 0;
};
