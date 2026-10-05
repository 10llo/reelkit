import { expect, it } from "vitest";
import { missingFileMessage } from "../src/episode/fetchJson";

it("tells the user to point --public-dir at an episode folder", () => {
  expect(missingFileMessage("episode.json", 404)).toBe(
    "Could not load episode.json (HTTP 404). Start Studio or render with --public-dir pointing at an episode folder, e.g. --public-dir examples/smoke.",
  );
});
