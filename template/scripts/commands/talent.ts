import path from "node:path";
import { validateTalent } from "../../src/episode/validate";
import type { Args } from "../lib/args";
import { readJson } from "../lib/episode-files";

export const run = async (args: Args): Promise<number> => {
  const [action, file] = args.positional;
  if (action !== "validate" || !file) {
    console.error("Usage: reelkit talent validate <talents/id.json>");
    return 2;
  }
  try {
    const talent = validateTalent(readJson(file));
    const expected = `${talent.id}.json`;
    if (path.basename(file) !== expected) {
      console.error(`✗ id "${talent.id}" does not match the file name ${path.basename(file)} (expected ${expected})`);
      return 1;
    }
    console.log(`✓ ${talent.id}: ${talent.displayName}`);
    return 0;
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    return 1;
  }
};
