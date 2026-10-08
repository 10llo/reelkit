import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { accountId, profileUrl } from "./accounts";
import type { AccountEntry, AccountRef } from "./types";

export type YtDlpResult = { code: number; stdout: string; stderr: string };
export type YtDlp = (args: string[]) => Promise<YtDlpResult>;

/** Runs the system yt-dlp; a missing binary resolves code 127 instead of throwing. */
export const systemYtDlp: YtDlp = (args) =>
  new Promise((resolve) => {
    const child = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", () => resolve({ code: 127, stdout, stderr }));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });

const cookieArgs = (cookies?: string) => (cookies ? ["--cookies-from-browser", cookies] : []);

export const listArgs = (url: string, count: number, cookies?: string) => [
  ...cookieArgs(cookies),
  "--flat-playlist",
  "--playlist-end",
  String(count),
  "-J",
  url,
];

export const downloadArgs = (videoUrl: string, outDir: string, cookies?: string) => [
  ...cookieArgs(cookies),
  "-f",
  "b[ext=mp4]/b",
  "--no-playlist",
  "--write-info-json",
  "-o",
  path.join(outDir, "video.%(ext)s"),
  videoUrl,
];

export const classifyError = (stderr: string): { status: "needs-login" | "failed"; reason: string } => {
  if (/login required|log in|cookies-from-browser|sign in/i.test(stderr)) return { status: "needs-login", reason: "login required" };
  if (/private/i.test(stderr)) return { status: "failed", reason: "private account" };
  if (/429|too many requests/i.test(stderr)) return { status: "failed", reason: "rate limited" };
  if (/404|not found|does not exist|unable to extract/i.test(stderr)) return { status: "failed", reason: "not found" };
  const last = stderr.trim().split("\n").pop() ?? "";
  return { status: "failed", reason: last.replace(/^ERROR:\s*/, "").slice(0, 120) || "yt-dlp failed" };
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

export const trimInfo = (raw: Record<string, unknown>) => {
  const caption = str(raw.description) ?? str(raw.title);
  const date = str(raw.upload_date);
  return {
    id: String(raw.id),
    url: str(raw.webpage_url),
    caption,
    hashtags: caption ? [...caption.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]) : [],
    views: num(raw.view_count),
    likes: num(raw.like_count),
    comments: num(raw.comment_count),
    uploadDate: date && /^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}` : null,
    duration: num(raw.duration),
  };
};

type FetchOptions = { root: string; count: number; own: boolean; cookies?: string; ytdlp: YtDlp };

const entry = (ref: AccountRef, own: boolean, patch: Partial<AccountEntry>): AccountEntry => ({
  id: accountId(ref),
  network: ref.network,
  handle: ref.handle,
  own,
  status: "ok",
  reason: null,
  profileUrl: profileUrl(ref),
  videos: [],
  median: null,
  failedVideos: [],
  ...patch,
});

export const fetchAccount = async (ref: AccountRef, opts: FetchOptions): Promise<AccountEntry> => {
  const list = await opts.ytdlp(listArgs(profileUrl(ref), opts.count, opts.cookies));
  if (list.code !== 0) {
    const { status, reason } = classifyError(list.stderr);
    return entry(ref, opts.own, { status, reason });
  }
  let entries: { id: string; url?: string; webpage_url?: string }[];
  try {
    entries = ((JSON.parse(list.stdout) as { entries?: typeof entries }).entries ?? []).slice(0, opts.count);
  } catch {
    return entry(ref, opts.own, { status: "failed", reason: "unreadable yt-dlp output" });
  }
  const videos: string[] = [];
  let last: { status: "needs-login" | "failed"; reason: string } | null = null;
  let failed = 0;
  const fail = (c: { status: "needs-login" | "failed"; reason: string }) => {
    last = c;
    failed++;
  };
  for (const item of entries) {
    if (typeof item?.id !== "string" || !/^[\w-]+$/.test(item.id)) {
      fail({ status: "failed", reason: "unexpected video id" });
      continue;
    }
    const videoUrl = item.webpage_url ?? item.url;
    const dir = path.join(opts.root, accountId(ref), item.id);
    const done = fs.existsSync(path.join(dir, "video.mp4")) && fs.existsSync(path.join(dir, "info.json"));
    if (!done) {
      if (!videoUrl) {
        fail({ status: "failed", reason: "entry without URL" });
        continue;
      }
      const res = await opts.ytdlp(downloadArgs(videoUrl, dir, opts.cookies));
      const rawInfo = path.join(dir, "video.info.json");
      if (res.code !== 0 || !fs.existsSync(rawInfo)) {
        fail(classifyError(res.stderr));
        continue;
      }
      if (!fs.existsSync(path.join(dir, "video.mp4"))) {
        fail({ status: "failed", reason: "not an mp4" });
        continue;
      }
      try {
        fs.writeFileSync(path.join(dir, "info.json"), `${JSON.stringify(trimInfo(JSON.parse(fs.readFileSync(rawInfo, "utf8"))), null, 2)}\n`);
      } catch {
        fail({ status: "failed", reason: "unreadable video info" });
        continue;
      }
      fs.rmSync(rawInfo);
    }
    videos.push(item.id);
  }
  if (videos.length) {
    const partial = failed ? `${failed} of ${entries.length} videos failed: ${(last as { reason: string } | null)?.reason}` : null;
    return entry(ref, opts.own, { videos, reason: partial });
  }
  const l = last as { status: "needs-login" | "failed"; reason: string } | null;
  if (l?.status === "needs-login") return entry(ref, opts.own, { status: "needs-login", reason: l.reason });
  return entry(ref, opts.own, { status: "failed", reason: l?.reason ?? "no videos found" });
};

export const fetchAll = async (
  refs: { ref: AccountRef; own: boolean }[],
  opts: { root: string; count: number; cookies?: string; ytdlp: YtDlp },
): Promise<{ entries: AccountEntry[]; missingBinary: boolean }> => {
  const entries: AccountEntry[] = [];
  const probe = await opts.ytdlp(["--version"]);
  if (probe.code === 127) return { entries: [], missingBinary: true };
  for (const { ref, own } of refs) {
    try {
      entries.push(await fetchAccount(ref, { ...opts, own }));
    } catch (err) {
      entries.push(entry(ref, own, { status: "failed", reason: (err as Error).message }));
    }
  }
  return { entries, missingBinary: false };
};
