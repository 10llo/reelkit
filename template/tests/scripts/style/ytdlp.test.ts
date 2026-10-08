import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { classifyError, downloadArgs, fetchAccount, fetchAll, listArgs, trimInfo, type YtDlp } from "../../../scripts/lib/style/ytdlp";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "style-yt-"));
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

const LIST = (ids: string[]) =>
  JSON.stringify({ entries: ids.map((id) => ({ id, url: `https://www.tiktok.com/@a/video/${id}` })) });

/** Fake yt-dlp: answers the listing, and "downloads" by writing video.mp4 + video.info.json into -o's folder. */
const fake = (ids: string[], calls: string[][] = []): YtDlp => async (args) => {
  if (args[0] === "--version") return { code: 0, stdout: "2026.09.01", stderr: "" };
  calls.push(args);
  if (args.includes("--flat-playlist")) return { code: 0, stdout: LIST(ids), stderr: "" };
  const out = args[args.indexOf("-o") + 1];
  const dir = path.dirname(out);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "video.mp4"), "mp4");
  fs.writeFileSync(
    path.join(dir, "video.info.json"),
    JSON.stringify({ id: path.basename(dir), webpage_url: "u", description: "hola #perros", view_count: 10, like_count: 2, comment_count: 1, upload_date: "20261001", formats: [1, 2, 3] }),
  );
  return { code: 0, stdout: "", stderr: "" };
};

it("builds listing and download arguments", () => {
  expect(listArgs("https://www.tiktok.com/@a", 5)).toEqual(["--flat-playlist", "--playlist-end", "5", "-J", "https://www.tiktok.com/@a"]);
  expect(listArgs("https://www.instagram.com/b/", 3, "chrome")).toContain("--cookies-from-browser");
  const dl = downloadArgs("https://v/1", "/tmp/x/1");
  expect(dl).toEqual(["-f", "b[ext=mp4]/b", "--no-playlist", "--write-info-json", "-o", "/tmp/x/1/video.%(ext)s", "https://v/1"]);
});

describe("classifyError", () => {
  it.each([
    ["ERROR: [Instagram] x: Requested content is not available, rate-limit reached or login required. Use --cookies-from-browser", "needs-login"],
    ["ERROR: [instagram:user] This account is private", "failed"],
    ["ERROR: [TikTok] Unable to extract secondary user ID; HTTP Error 404: Not Found", "failed"],
    ["ERROR: HTTP Error 429: Too Many Requests", "failed"],
  ])("%s → %s", (stderr, status) => {
    expect(classifyError(stderr).status).toBe(status);
  });
  it("gives a short human reason", () => {
    expect(classifyError("ERROR: This account is private").reason).toBe("private account");
    expect(classifyError("HTTP Error 429: Too Many Requests").reason).toBe("rate limited");
    expect(classifyError("HTTP Error 404: Not Found").reason).toBe("not found");
  });
});

it("trims info.json to the fields the report uses", () => {
  expect(trimInfo({ id: "1", webpage_url: "u", description: "hola #perros #gatos", view_count: 3, like_count: 2, comment_count: 1, upload_date: "20261001", duration: 30, formats: [] })).toEqual({
    id: "1",
    url: "u",
    caption: "hola #perros #gatos",
    hashtags: ["perros", "gatos"],
    views: 3,
    likes: 2,
    comments: 1,
    uploadDate: "2026-10-01",
    duration: 30,
  });
});

describe("fetchAccount", () => {
  it("downloads every listed video into <root>/<id>/<video-id>/ and records them", async () => {
    const root = tmp();
    dirs.push(root);
    const entry = await fetchAccount({ network: "tiktok", handle: "a" }, { root, count: 2, own: false, ytdlp: fake(["11", "22"]) });
    expect(entry).toMatchObject({ id: "tiktok-a", status: "ok", reason: null, videos: ["11", "22"], own: false });
    const info = JSON.parse(fs.readFileSync(path.join(root, "tiktok-a", "11", "info.json"), "utf8"));
    expect(info.hashtags).toEqual(["perros"]);
    expect(fs.existsSync(path.join(root, "tiktok-a", "11", "video.info.json"))).toBe(false);
  });
  it("does not download a video twice", async () => {
    const root = tmp();
    dirs.push(root);
    const calls: string[][] = [];
    await fetchAccount({ network: "tiktok", handle: "a" }, { root, count: 1, own: false, ytdlp: fake(["11"], calls) });
    await fetchAccount({ network: "tiktok", handle: "a" }, { root, count: 1, own: false, ytdlp: fake(["11"], calls) });
    expect(calls.filter((c) => !c.includes("--flat-playlist"))).toHaveLength(1);
  });
  it("marks a login wall as needs-login", async () => {
    const root = tmp();
    dirs.push(root);
    const ytdlp: YtDlp = async () => ({ code: 1, stdout: "", stderr: "ERROR: login required. Use --cookies-from-browser" });
    const entry = await fetchAccount({ network: "instagram", handle: "b" }, { root, count: 1, own: true, ytdlp });
    expect(entry).toMatchObject({ status: "needs-login", own: true, videos: [] });
  });
});

describe("fetchAll", () => {
  it("keeps going when one account fails", async () => {
    const root = tmp();
    dirs.push(root);
    const ok = fake(["1"]);
    const ytdlp: YtDlp = async (args) =>
      args.some((a) => a.includes("private")) ? { code: 1, stdout: "", stderr: "ERROR: This account is private" } : ok(args);
    const { entries, missingBinary } = await fetchAll(
      [{ ref: { network: "tiktok", handle: "a" }, own: false }, { ref: { network: "tiktok", handle: "private" }, own: false }],
      { root, count: 1, ytdlp },
    );
    expect(missingBinary).toBe(false);
    expect(entries.map((e) => e.status)).toEqual(["ok", "failed"]);
    expect(entries[1].reason).toBe("private account");
  });
  it("stops early when yt-dlp is missing", async () => {
    const root = tmp();
    dirs.push(root);
    const { missingBinary, entries } = await fetchAll([{ ref: { network: "tiktok", handle: "a" }, own: false }], {
      root,
      count: 1,
      ytdlp: async () => ({ code: 127, stdout: "", stderr: "" }),
    });
    expect(missingBinary).toBe(true);
    expect(entries).toEqual([]);
  });
});
