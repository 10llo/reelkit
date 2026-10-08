import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { afterAll, expect, it } from "vitest";
import { analyzeFolder, analyzeVideo } from "../../../scripts/lib/style/analyze";
import { writeAccounts } from "../../../scripts/lib/style/accounts";

const FIXTURE = path.join(__dirname, "fixtures", "two-colors.mp4");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "style-an-"));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const videoDir = (account: string, id: string) => {
  const dir = path.join(root, account, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(FIXTURE, path.join(dir, "video.mp4"));
  fs.writeFileSync(path.join(dir, "info.json"), JSON.stringify({ id, url: "https://x/1", caption: "hola #perros", hashtags: ["perros"], views: 10, likes: 1, comments: 0, uploadDate: "2026-10-01", duration: 2 }));
  return dir;
};

it("measures a red→blue clip: one cut at ~1 s, red and blue palette, no speech", async () => {
  const dir = videoDir("tiktok-a", "1");
  const m = await analyzeVideo(dir, { transcribe: null, model: "tiny", language: "spanish" });
  expect(m.durationSec).toBeCloseTo(2, 0);
  expect(m.cuts).toHaveLength(1);
  expect(m.cuts[0]).toBeGreaterThan(0.85);
  expect(m.cuts[0]).toBeLessThan(1.15);
  expect(m.palette.slice(0, 2).map((c) => c.hex).sort()).toEqual(["#0808F8", "#F80808"]);
  expect(m.speech).toMatchObject({ wordsPerMinute: null, unavailable: "skipped" });
  expect(m.audio.gapDb).not.toBeNull();
  expect(m.post).toMatchObject({ views: 10, hashtags: ["perros"] });
  expect(m.truncated).toBe(false);
  for (const name of ["metrics.json", "sheet.png", "hook.png"]) expect(fs.existsSync(path.join(dir, name))).toBe(true);
  const sheet = PNG.sync.read(fs.readFileSync(path.join(dir, "sheet.png")));
  expect(sheet.width).toBe(270 * 4);
  const hook = PNG.sync.read(fs.readFileSync(path.join(dir, "hook.png")));
  expect(hook.width).toBe(270 * 6);
});

it("fills account medians and skips failed accounts", async () => {
  videoDir("tiktok-b", "1");
  writeAccounts(root, {
    createdAt: "2026-10-07T00:00:00.000Z",
    accounts: [
      { id: "tiktok-b", network: "tiktok", handle: "b", own: false, status: "ok", reason: null, profileUrl: "u", videos: ["1"], median: null },
      { id: "tiktok-c", network: "tiktok", handle: "c", own: false, status: "failed", reason: "private account", profileUrl: "u", videos: [], median: null },
    ],
  });
  const file = await analyzeFolder(root, { transcribe: null, model: "tiny", language: "spanish" });
  expect(file.accounts[0].median?.cutsPerMinute).toBeGreaterThan(0);
  expect(file.accounts[1].median).toBeNull();
});
