import { expect, it } from "vitest";
import { parseArgs } from "../../scripts/lib/args";

it("splits positionals and flags", () => {
  expect(parseArgs(["sync", "prepare", "episodes/a", "--model=small", "--yes", "clip.mp4"])).toEqual({
    positional: ["sync", "prepare", "episodes/a", "clip.mp4"],
    flags: { model: "small", yes: true },
  });
});
it("keeps = inside flag values", () => {
  expect(parseArgs(["--title=a=b"]).flags.title).toBe("a=b");
});
