import { DIAGRAM_NAMES, ICON_NAMES } from "../../src/icons/names";
import type { Args } from "../lib/args";
import { blockNames, blockSchema, episodeJsonSchema, summarizeBlock, talentJsonSchema } from "../lib/catalog";

const print = (value: unknown) => console.log(JSON.stringify(value, null, 2));

export const run = async (args: Args): Promise<number> => {
  const { block, episode, talent, icons } = args.flags;
  if (block === true) {
    console.error("Usage: reelkit catalog --block=<Name>");
    return 2;
  }
  if (typeof block === "string") {
    print(blockSchema(block));
  } else if (episode) {
    print(episodeJsonSchema());
  } else if (talent) {
    print(talentJsonSchema());
  } else if (icons) {
    print({ icons: ICON_NAMES, diagrams: DIAGRAM_NAMES });
  } else {
    console.log("Blocks (props; ? = optional, [min–max] = list length):");
    for (const name of blockNames()) {
      console.log(`  ${summarizeBlock(name)}`);
    }
    console.log("Details: npm run reelkit -- catalog --block=<Name> | --episode | --talent | --icons");
  }
  return 0;
};
