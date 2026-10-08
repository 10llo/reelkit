import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { run } from "../../../scripts/commands/style";
import { parseArgs } from "../../../scripts/lib/args";
import { readAccounts } from "../../../scripts/lib/style/accounts";
import type { YtDlp } from "../../../scripts/lib/style/ytdlp";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
const tmp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "style-cmd-"));
  dirs.push(d);
  return d;
};

const okYt: YtDlp = async (args) => {
  if (args[0] === "--version") return { code: 0, stdout: "2026.09.01", stderr: "" };
  if (args.includes("--flat-playlist")) return { code: 0, stdout: JSON.stringify({ entries: [{ id: "1", url: "https://v/1" }] }), stderr: "" };
  const dir = path.dirname(args[args.indexOf("-o") + 1]);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "video.mp4"), "x");
  fs.writeFileSync(path.join(dir, "video.info.json"), JSON.stringify({ id: "1" }));
  return { code: 0, stdout: "", stderr: "" };
};

it("fetch writes accounts.json with own and reference accounts", async () => {
  const dir = tmp();
  const code = await run(parseArgs(["fetch", dir, "tiktok:@a", "--own=instagram:b", "--videos=1"]), { ytdlp: okYt });
  expect(code).toBe(0);
  const file = readAccounts(dir)!;
  expect(file.accounts.map((a) => [a.id, a.own, a.status])).toEqual([
    ["tiktok-a", false, "ok"],
    ["instagram-b", true, "ok"],
  ]);
});

it("fetch exits 2 when yt-dlp is missing", async () => {
  expect(await run(parseArgs(["fetch", tmp(), "tiktok:@a"]), { ytdlp: async () => ({ code: 127, stdout: "", stderr: "" }) })).toBe(2);
});

it("fetch exits 3 when an account needs login, and 1 when nothing worked", async () => {
  const login: YtDlp = async (args) => (args[0] === "--version" ? { code: 0, stdout: "", stderr: "" } : { code: 1, stdout: "", stderr: "login required" });
  expect(await run(parseArgs(["fetch", tmp(), "instagram:b"]), { ytdlp: login })).toBe(3);
  const priv: YtDlp = async (args) => (args[0] === "--version" ? { code: 0, stdout: "", stderr: "" } : { code: 1, stdout: "", stderr: "This account is private" });
  expect(await run(parseArgs(["fetch", tmp(), "tiktok:@p"]), { ytdlp: priv })).toBe(1);
});

it("fetch rejects bad account specs and too many accounts", async () => {
  expect(await run(parseArgs(["fetch", tmp(), "@bare"]), { ytdlp: okYt })).toBe(2);
  const six = ["a", "b", "c", "d", "e", "f"].map((h) => `tiktok:@${h}`);
  expect(await run(parseArgs(["fetch", tmp(), ...six]), { ytdlp: okYt })).toBe(2);
});

it("fetch merges a re-run into the existing accounts.json (retry one account with cookies)", async () => {
  const dir = tmp();
  await run(parseArgs(["fetch", dir, "tiktok:@a", "--videos=1"]), { ytdlp: okYt });
  await run(parseArgs(["fetch", dir, "instagram:b", "--videos=1", "--cookies-from-browser=chrome"]), { ytdlp: okYt });
  expect(readAccounts(dir)!.accounts.map((a) => a.id).sort()).toEqual(["instagram-b", "tiktok-a"]);
});

it("analyze fails clearly without accounts.json", async () => {
  expect(await run(parseArgs(["analyze", tmp(), "--no-speech"]), {})).toBe(1);
});

it("unknown subcommand prints usage", async () => {
  expect(await run(parseArgs(["nope"]), {})).toBe(2);
});
