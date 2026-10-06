import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { formatStatus, listEpisodes } from "../../scripts/lib/status";
import { TEMPLATE_ROOT } from "./paths";

const examples = path.join(TEMPLATE_ROOT, "examples");
let tmp: string;
afterEach(() => tmp && fs.rmSync(tmp, { recursive: true, force: true }));

it("lists every episode with its stage and next step", () => {
  const list = listEpisodes(examples);
  expect(list.map((e) => e.folder)).toEqual(["dani-chocolate", "dani-fiebre", "smoke"]);
  const dani = list[0];
  expect(dani).toMatchObject({ slug: "2026-10-chocolate", stage: "built", hasClip: false, captions: "provisional" });
  expect(dani.next).toContain("/reelkit:clip");
});

it("reports a broken episode instead of failing", () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-status-"));
  fs.mkdirSync(path.join(tmp, "broken"));
  fs.writeFileSync(path.join(tmp, "broken", "episode.json"), "{}");
  fs.writeFileSync(path.join(tmp, "broken", "talent.json"), "{}");
  const [broken] = listEpisodes(tmp);
  expect(broken.error).toMatch(/schemaVersion|talent/);
  expect(formatStatus([broken])).toContain("✗ broken");
});

it("returns an empty list for a missing folder", () => {
  expect(listEpisodes(path.join(os.tmpdir(), "does-not-exist-reelkit"))).toEqual([]);
});
