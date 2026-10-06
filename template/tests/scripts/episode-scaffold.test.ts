import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEpisode, episodeFolderName } from "../../scripts/lib/episode-scaffold";
import { TEMPLATE_ROOT } from "./paths";

const NOW = new Date(2026, 9, 6);
let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-ws-"));
  fs.mkdirSync(path.join(root, "talents"));
  fs.copyFileSync(path.join(TEMPLATE_ROOT, "examples", "dani-chocolate", "talent.json"), path.join(root, "talents", "dani.json"));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("createEpisode", () => {
  it("names folders by month and slug", () => {
    expect(episodeFolderName("pulgas", NOW)).toBe("2026-10-pulgas");
  });
  it("creates the folder with a talent snapshot", () => {
    const dir = createEpisode(root, { slug: "pulgas", talentId: "dani", now: NOW });
    expect(dir).toBe(path.join(root, "episodes", "2026-10-pulgas"));
    expect(fs.readdirSync(dir)).toEqual(["talent.json"]);
    expect(JSON.parse(fs.readFileSync(path.join(dir, "talent.json"), "utf8")).id).toBe("dani");
  });
  it("refuses an existing folder", () => {
    createEpisode(root, { slug: "pulgas", talentId: "dani", now: NOW });
    expect(() => createEpisode(root, { slug: "pulgas", talentId: "dani", now: NOW })).toThrow(/already exists/);
  });
  it("explains a missing or mismatched talent", () => {
    expect(() => createEpisode(root, { slug: "pulgas", talentId: "ana", now: NOW })).toThrow(/No talent profile .*ana\.json.*\/reelkit:setup/);
    fs.copyFileSync(path.join(root, "talents", "dani.json"), path.join(root, "talents", "ana.json"));
    expect(() => createEpisode(root, { slug: "pulgas", talentId: "ana", now: NOW })).toThrow(/id "dani" does not match/);
  });
  it("rejects a bad slug", () => {
    expect(() => createEpisode(root, { slug: "Pulgas en Otoño", talentId: "dani", now: NOW })).toThrow(/a-z, 0-9/);
  });
});
