# Creator Style Analysis (`/reelkit:style`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user pass TikTok/Instagram accounts (references + optional own account), download their recent public videos with `yt-dlp`, measure each video's style in code, and have Claude write a report with concrete reelkit proposals.

**Architecture:** A `style` CLI command in the workspace template has two subcommands, `fetch` and `analyze`. Pure, unit-tested modules under `template/scripts/lib/style/` hold the logic. `fetch` wraps `yt-dlp` behind an injectable runner. `analyze` decodes frames and audio with mediabunny (already a dependency), measures cuts, palette, speech and levels, and draws PNG contact sheets with `pngjs`. A plugin command `/reelkit:style` orchestrates the flow. A skill, `reelkit:style-analysis`, tells Claude how to read the sheets and metrics and how to write `report.md`.

**Tech Stack:** TypeScript (tsx), mediabunny 1.56.1 + @mediabunny/server 1.61.3, pngjs 7, vitest 3, Node `child_process`, plugin markdown (commands/skills), node:test for plugin-root scripts.

**Spec:** `docs/superpowers/specs/2026-10-07-style-analysis-design.md`

All template paths are relative to `template/` and commands run from `template/`, unless the path starts with `commands/`, `skills/`, `scripts/doctor.mjs`, `scripts/tests/`, `README.md` or `.claude-plugin/` (plugin root, run from the repo root).

## Global Constraints

- Node ≥ 20. Add no new npm dependencies. `yt-dlp` is an external binary the user installs: `brew install yt-dlp` (macOS) or `pip install yt-dlp` (Windows/Linux).
- No test calls the network or the real `yt-dlp`. The runner is injected and mocked.
- Account specs on the CLI are `tiktok:@handle`, `instagram:handle`, or a profile URL (`https://www.tiktok.com/@handle`, `https://www.instagram.com/handle/`). The plugin command resolves bare `@handle` by asking the user for the network.
- Folder layout is `styles/<yyyy-mm-dd>-<slug>/<network>-<handle>/<video-id>/` and holds `video.mp4`, `info.json`, `metrics.json`, `sheet.png` and `hook.png`. `styles/<…>/accounts.json` and `report.md` sit at the top of the folder.
- Default 5 videos per account, at most 5 reference accounts.
- `yt-dlp` format `-f "b[ext=mp4]/b"`. Use cookies only through `--cookies-from-browser=<browser>`, and only when the user approved it in chat.
- Exit codes:
  - `style fetch`: 0 when at least one account is OK, 1 when none is, 2 when `yt-dlp` is missing, 3 when an account needs login.
  - `style analyze`: 0 / 1.
- Analysis caps at 180 s per video (`truncated: true`). Cut sampling is 10 fps at 64 px width, gray. The palette uses 24 frames, 4-bit RGB bins, top 5. The sheet is 12 frames, 4×3, 270 px wide. The hook strip is 6 frames at 0, 0.5 … 2.5 s.
- Measurement constants (exact):
  - `CUT_THRESHOLD = 28`: mean absolute gray difference, 0–255.
  - `CUT_PEAK_RATIO = 2`: the diff must be ≥ 2× both neighbours.
  - `CUT_MIN_GAP = 0.3` s.
  - `HOOK_SECONDS = 3`.
  - `MAX_SECONDS = 180`.
- Speech fields are `null` (with `speech.unavailable` reason) when there are no words, no audio, or Whisper is unavailable. Never invent values.
- Report language follows the talent's `locale`. Every number in the report comes from the JSON. Image-based judgements are labelled as observations. No proposal copies another creator's design, logo or content.
- Version 0.6.0 in `template/package.json`, `template/package-lock.json` (both places), `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.

## Review Focus

1. **A handle typed with `@`, a trailing slash or a `?lang=` query** must still parse to the right network and handle. *Test:* Task 1 `parseAccount` cases.
2. **One account fails** (private, rate-limited) while others work: the run continues, `accounts.json` records the reason and the exit code reflects success. *Test:* Task 2 `fetchAll` with a mixed fake runner.
3. **A music-only video, or a video without an audio track:** speech is `null` with a reason and the analysis does not crash. *Test:* Task 6 integration fixture with no speech, plus Task 4 `speechMetrics([])`.
4. **Re-running `fetch` on the same folder** must not re-download videos that already have `video.mp4` and `info.json`. *Test:* Task 2 idempotency case.
5. **A slow cross-fade or camera pan** must not count as cuts. *Test:* Task 3 gradual-ramp case.

---

## File structure

**Create (template)**
- `scripts/lib/style/types.ts`: shared types (`Network`, `Account`, `AccountStatus`, `VideoMetrics`, `AccountsFile`).
- `scripts/lib/style/accounts.ts`: `parseAccount`, `accountId`, `profileUrl`, `median`, `summarizeAccount`, `readAccounts`, `writeAccounts`.
- `scripts/lib/style/ytdlp.ts`: argument builders, `classifyError`, `trimInfo`, `YtDlp` runner type, `systemYtDlp`, `fetchAccount`, `fetchAll`.
- `scripts/lib/style/cuts.ts`: `frameDiff`, `detectCuts`, `rhythm`.
- `scripts/lib/style/palette.ts`: `dominantColors`, `hsvStats`.
- `scripts/lib/style/speech.ts`: `speechMetrics`.
- `scripts/lib/style/levels.ts`: `audioLevels`.
- `scripts/lib/style/sheet.ts`: `drawDigits`, `composeSheet` (PNG buffer).
- `scripts/lib/style/frames.ts`: `sampleFrames` (mediabunny → downscaled RGBA), `toGray`.
- `scripts/lib/style/analyze.ts`: `analyzeVideo`, `analyzeFolder`.
- `scripts/commands/style.ts`: `run(args)`, which dispatches `fetch` / `analyze`.
- `tests/scripts/style/*.test.ts` and `tests/scripts/style/fixtures/two-colors.mp4`.

**Create (plugin root)**
- `commands/style.md`
- `skills/style-analysis/SKILL.md`

**Modify**
- `template/scripts/reelkit.ts`: register `style`.
- `scripts/doctor.mjs` and `scripts/tests/doctor.test.mjs`: optional `yt-dlp` check.
- `scripts/tests/plugin-content.test.mjs`: CLI list, skills list, README check.
- `README.md`: table row and the `yt-dlp` note.
- Version files.

---

### Task 1: Types and account parsing

**Files:**
- Create: `scripts/lib/style/types.ts`, `scripts/lib/style/accounts.ts`, `tests/scripts/style/accounts.test.ts`

**Interfaces:**
- Produces:
  - `type Network = "tiktok" | "instagram"`
  - `type AccountRef = { network: Network; handle: string }`
  - `type AccountStatus = "ok" | "failed" | "needs-login"`
  - `type AccountEntry = { id: string; network: Network; handle: string; own: boolean; status: AccountStatus; reason: string | null; profileUrl: string; videos: string[]; median: Median | null }`
  - `type Median = { durationSec: number | null; cutsPerMinute: number | null; wordsPerMinute: number | null; firstWordSec: number | null; gapDb: number | null; brightness: number | null; saturation: number | null }`
  - `type AccountsFile = { createdAt: string; accounts: AccountEntry[] }`
  - `type VideoMetrics` (see Task 6)
  - `parseAccount(spec: string): AccountRef`, which throws `Error` with a usage message
  - `accountId(ref): string` (`"<network>-<handle>"`)
  - `profileUrl(ref): string`
  - `median(values: (number | null)[]): number | null`
  - `summarizeAccount(metrics: VideoMetrics[]): Median | null`
  - `readAccounts(dir): AccountsFile | null`
  - `writeAccounts(dir, file): void`

- [ ] **Step 1: Write the failing test**

`tests/scripts/style/accounts.test.ts`:

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { accountId, median, parseAccount, profileUrl, readAccounts, writeAccounts } from "../../../scripts/lib/style/accounts";

describe("parseAccount", () => {
  it.each([
    ["tiktok:@dogtora.dani", "tiktok", "dogtora.dani"],
    ["tiktok:dogtora.dani", "tiktok", "dogtora.dani"],
    ["instagram:dogtoradanivet", "instagram", "dogtoradanivet"],
    ["ig:@dogtoradanivet", "instagram", "dogtoradanivet"],
    ["https://www.tiktok.com/@dogtora.dani", "tiktok", "dogtora.dani"],
    ["https://www.tiktok.com/@dogtora.dani?lang=es", "tiktok", "dogtora.dani"],
    ["tiktok.com/@Dogtora.Dani/", "tiktok", "dogtora.dani"],
    ["https://www.instagram.com/dogtoradanivet/", "instagram", "dogtoradanivet"],
    ["https://instagram.com/dogtoradanivet/reels/", "instagram", "dogtoradanivet"],
  ])("%s → %s %s", (spec, network, handle) => {
    expect(parseAccount(spec)).toEqual({ network, handle });
  });
  it("rejects a bare handle (the plugin command asks for the network)", () => {
    expect(() => parseAccount("@dogtora.dani")).toThrow(/tiktok:@handle/);
  });
  it("rejects other sites and empty handles", () => {
    expect(() => parseAccount("https://youtube.com/@x")).toThrow();
    expect(() => parseAccount("tiktok:@")).toThrow();
  });
});

it("builds ids and profile URLs", () => {
  expect(accountId({ network: "tiktok", handle: "dogtora.dani" })).toBe("tiktok-dogtora.dani");
  expect(profileUrl({ network: "tiktok", handle: "dogtora.dani" })).toBe("https://www.tiktok.com/@dogtora.dani");
  expect(profileUrl({ network: "instagram", handle: "dogtoradanivet" })).toBe("https://www.instagram.com/dogtoradanivet/");
});

describe("median", () => {
  it("ignores nulls", () => {
    expect(median([3, null, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
  it("is null when every value is null or the list is empty", () => {
    expect(median([null, null])).toBeNull();
    expect(median([])).toBeNull();
  });
});

it("round-trips accounts.json", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "style-acc-"));
  expect(readAccounts(dir)).toBeNull();
  const file = { createdAt: "2026-10-07T00:00:00.000Z", accounts: [] };
  writeAccounts(dir, file);
  expect(readAccounts(dir)).toEqual(file);
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/scripts/style/accounts.test.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement**

`scripts/lib/style/types.ts`:

```ts
export type Network = "tiktok" | "instagram";
export type AccountRef = { network: Network; handle: string };
export type AccountStatus = "ok" | "failed" | "needs-login";

export type Median = {
  durationSec: number | null;
  cutsPerMinute: number | null;
  wordsPerMinute: number | null;
  firstWordSec: number | null;
  gapDb: number | null;
  brightness: number | null;
  saturation: number | null;
};

export type AccountEntry = {
  id: string;
  network: Network;
  handle: string;
  own: boolean;
  status: AccountStatus;
  reason: string | null;
  profileUrl: string;
  videos: string[];
  median: Median | null;
};

export type AccountsFile = { createdAt: string; accounts: AccountEntry[] };

export type PaletteColor = { hex: string; share: number };

export type VideoMetrics = {
  id: string;
  durationSec: number;
  width: number;
  height: number;
  fps: number | null;
  truncated: boolean;
  cuts: number[];
  cutsPerMinute: number;
  avgShotSec: number;
  firstCutSec: number | null;
  speech: {
    wordsPerMinute: number | null;
    firstWordSec: number | null;
    hookText: string | null;
    coverage: number | null;
    unavailable: string | null;
  };
  audio: { speechDb: number | null; gapDb: number | null; peakDb: number | null };
  palette: PaletteColor[];
  brightness: number;
  saturation: number;
  post: {
    url: string | null;
    caption: string | null;
    hashtags: string[];
    views: number | null;
    likes: number | null;
    comments: number | null;
    uploadDate: string | null;
  };
};
```

`scripts/lib/style/accounts.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import type { AccountRef, AccountsFile, Median, Network, VideoMetrics } from "./types";

const USAGE = 'Use tiktok:@handle, instagram:handle, or a profile URL (https://www.tiktok.com/@handle, https://www.instagram.com/handle/).';
const HANDLE = /^[a-z0-9._]{1,30}$/;
const PREFIX: Record<string, Network> = { tiktok: "tiktok", tt: "tiktok", instagram: "instagram", ig: "instagram" };

const clean = (raw: string): string => raw.replace(/^@/, "").toLowerCase();

export const parseAccount = (spec: string): AccountRef => {
  const s = spec.trim();
  const prefixed = /^([a-z]+):(?!\/\/)(.*)$/i.exec(s);
  if (prefixed && PREFIX[prefixed[1].toLowerCase()]) {
    const handle = clean(prefixed[2]);
    if (!HANDLE.test(handle)) throw new Error(`"${spec}" has no valid handle. ${USAGE}`);
    return { network: PREFIX[prefixed[1].toLowerCase()], handle };
  }
  const url = /^(?:https?:\/\/)?(?:www\.|m\.)?(tiktok\.com\/@|instagram\.com\/)([^/?#]+)/i.exec(s);
  if (url) {
    const handle = clean(url[2]);
    if (!HANDLE.test(handle)) throw new Error(`"${spec}" has no valid handle. ${USAGE}`);
    return { network: url[1].toLowerCase().startsWith("tiktok") ? "tiktok" : "instagram", handle };
  }
  throw new Error(`Unknown account "${spec}". ${USAGE}`);
};

export const accountId = (ref: AccountRef) => `${ref.network}-${ref.handle}`;

export const profileUrl = (ref: AccountRef) =>
  ref.network === "tiktok" ? `https://www.tiktok.com/@${ref.handle}` : `https://www.instagram.com/${ref.handle}/`;

export const median = (values: (number | null)[]): number | null => {
  const xs = values.filter((v): v is number => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
};

export const summarizeAccount = (metrics: VideoMetrics[]): Median | null =>
  metrics.length
    ? {
        durationSec: median(metrics.map((m) => m.durationSec)),
        cutsPerMinute: median(metrics.map((m) => m.cutsPerMinute)),
        wordsPerMinute: median(metrics.map((m) => m.speech.wordsPerMinute)),
        firstWordSec: median(metrics.map((m) => m.speech.firstWordSec)),
        gapDb: median(metrics.map((m) => m.audio.gapDb)),
        brightness: median(metrics.map((m) => m.brightness)),
        saturation: median(metrics.map((m) => m.saturation)),
      }
    : null;

const FILE = "accounts.json";

export const readAccounts = (dir: string): AccountsFile | null => {
  const file = path.join(dir, FILE);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as AccountsFile) : null;
};

export const writeAccounts = (dir: string, data: AccountsFile) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, FILE), `${JSON.stringify(data, null, 2)}\n`);
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/scripts/style/accounts.test.ts`
Expected: PASS. Then run `npm run lint` and expect it clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/style/types.ts scripts/lib/style/accounts.ts tests/scripts/style/accounts.test.ts
git commit -m "feat(style): account specs, ids, medians and accounts.json"
```

---

### Task 2: `yt-dlp` wrapper and fetch

**Files:**
- Create: `scripts/lib/style/ytdlp.ts`, `tests/scripts/style/ytdlp.test.ts`

**Interfaces:**
- Consumes (Task 1): `AccountRef`, `AccountEntry`, `accountId`, `profileUrl`.
- Produces:
  - `type YtDlpResult = { code: number; stdout: string; stderr: string }`
  - `type YtDlp = (args: string[]) => Promise<YtDlpResult>`
  - `systemYtDlp: YtDlp`, which spawns `yt-dlp` and resolves `code: 127` when the binary is missing
  - `listArgs(url, count, cookies?)`, `downloadArgs(videoUrl, outDir, cookies?)`
  - `classifyError(stderr): { status: "needs-login" | "failed"; reason: string }`
  - `trimInfo(raw): Record<string, unknown>`
  - `fetchAccount(ref, opts): Promise<AccountEntry>` with `opts = { root: string; count: number; own: boolean; cookies?: string; ytdlp: YtDlp }`
  - `fetchAll(refs, opts): Promise<{ entries: AccountEntry[]; missingBinary: boolean }>`

- [ ] **Step 1: Write the failing test**

`tests/scripts/style/ytdlp.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/scripts/style/ytdlp.test.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement**

`scripts/lib/style/ytdlp.ts`:

```ts
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
  ...patch,
});

export const fetchAccount = async (ref: AccountRef, opts: FetchOptions): Promise<AccountEntry> => {
  const list = await opts.ytdlp(listArgs(profileUrl(ref), opts.count, opts.cookies));
  if (list.code !== 0) {
    const { status, reason } = classifyError(list.stderr);
    return entry(ref, opts.own, { status, reason });
  }
  const entries = ((JSON.parse(list.stdout) as { entries?: { id: string; url?: string; webpage_url?: string }[] }).entries ?? []).slice(0, opts.count);
  const videos: string[] = [];
  let lastError: string | null = null;
  for (const item of entries) {
    const dir = path.join(opts.root, accountId(ref), item.id);
    const done = fs.existsSync(path.join(dir, "video.mp4")) && fs.existsSync(path.join(dir, "info.json"));
    if (!done) {
      const res = await opts.ytdlp(downloadArgs(item.webpage_url ?? item.url ?? "", dir, opts.cookies));
      const rawInfo = path.join(dir, "video.info.json");
      if (res.code !== 0 || !fs.existsSync(rawInfo)) {
        lastError = classifyError(res.stderr).reason;
        continue;
      }
      fs.writeFileSync(path.join(dir, "info.json"), `${JSON.stringify(trimInfo(JSON.parse(fs.readFileSync(rawInfo, "utf8"))), null, 2)}\n`);
      fs.rmSync(rawInfo);
    }
    videos.push(item.id);
  }
  return videos.length ? entry(ref, opts.own, { videos }) : entry(ref, opts.own, { status: "failed", reason: lastError ?? "no videos found" });
};

export const fetchAll = async (
  refs: { ref: AccountRef; own: boolean }[],
  opts: { root: string; count: number; cookies?: string; ytdlp: YtDlp },
): Promise<{ entries: AccountEntry[]; missingBinary: boolean }> => {
  const entries: AccountEntry[] = [];
  const probe = await opts.ytdlp(["--version"]);
  if (probe.code === 127) return { entries: [], missingBinary: true };
  for (const { ref, own } of refs) {
    entries.push(await fetchAccount(ref, { ...opts, own }));
  }
  return { entries, missingBinary: false };
};
```

`fetchAll` probes `yt-dlp --version` once, before the loop, and returns early on `127`.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/scripts/style/ytdlp.test.ts && npm run lint`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/style/ytdlp.ts tests/scripts/style/ytdlp.test.ts
git commit -m "feat(style): yt-dlp wrapper — listing, idempotent downloads, error classes"
```

---

### Task 3: Cuts and palette

**Files:**
- Create: `scripts/lib/style/cuts.ts`, `scripts/lib/style/palette.ts`, `tests/scripts/style/cuts.test.ts`, `tests/scripts/style/palette.test.ts`

**Interfaces:**
- Produces:
  - `CUT_THRESHOLD = 28`, `CUT_PEAK_RATIO = 2`, `CUT_MIN_GAP = 0.3`
  - `frameDiff(a: Uint8Array, b: Uint8Array): number` (mean absolute difference)
  - `detectCuts(frames: Uint8Array[], times: number[]): number[]` (cut times in s; a cut at `times[i]` means between frame i-1 and i)
  - `rhythm(cuts, durationSec): { cutsPerMinute: number; avgShotSec: number; firstCutSec: number | null }`
  - `type Rgba = { width: number; height: number; data: Uint8Array }`
  - `dominantColors(frames: Rgba[], k = 5): PaletteColor[]`
  - `hsvStats(frames: Rgba[]): { brightness: number; saturation: number }`

- [ ] **Step 1: Write the failing tests**

`tests/scripts/style/cuts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectCuts, frameDiff, rhythm } from "../../../scripts/lib/style/cuts";

const flat = (v: number, n = 64) => new Uint8Array(n).fill(v);
const times = (n: number, fps = 10) => Array.from({ length: n }, (_, i) => i / fps);

it("measures the mean absolute difference", () => {
  expect(frameDiff(flat(0), flat(100))).toBe(100);
  expect(frameDiff(flat(50), flat(50))).toBe(0);
});

describe("detectCuts", () => {
  it("finds a hard cut", () => {
    const frames = [...Array(10).fill(flat(20)), ...Array(10).fill(flat(200))];
    expect(detectCuts(frames, times(20))).toEqual([1]);
  });
  it("ignores a gradual fade", () => {
    const frames = Array.from({ length: 30 }, (_, i) => flat(i * 8));
    expect(detectCuts(frames, times(30))).toEqual([]);
  });
  it("keeps cuts at least 0.3 s apart", () => {
    const frames = [flat(0), flat(0), flat(200), flat(200), flat(0), flat(0), flat(0), flat(0), flat(200), flat(200)];
    // spikes at 0.2 and 0.4 (only 0.2 apart) → keep the first; another at 0.8
    expect(detectCuts(frames, times(10))).toEqual([0.2, 0.8]);
  });
  it("is empty for one frame", () => {
    expect(detectCuts([flat(0)], [0])).toEqual([]);
  });
});

it("summarizes rhythm", () => {
  expect(rhythm([2, 4, 6], 8)).toEqual({ cutsPerMinute: 22.5, avgShotSec: 2, firstCutSec: 2 });
  expect(rhythm([], 30)).toEqual({ cutsPerMinute: 0, avgShotSec: 30, firstCutSec: null });
});
```

`tests/scripts/style/palette.test.ts`:

```ts
import { expect, it } from "vitest";
import { dominantColors, hsvStats } from "../../../scripts/lib/style/palette";

const image = (pixels: [number, number, number][]) => {
  const data = new Uint8Array(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => data.set([r, g, b, 255], i * 4));
  return { width: pixels.length, height: 1, data };
};

it("ranks colors by share", () => {
  const img = image([...Array(6).fill([255, 0, 0]), ...Array(3).fill([0, 0, 255]), [255, 255, 255]]);
  const colors = dominantColors([img], 5);
  expect(colors.map((c) => c.hex)).toEqual(["#F80808", "#0808F8", "#F8F8F8"]);
  expect(colors[0].share).toBeCloseTo(0.6);
  expect(colors.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1);
});

it("averages brightness and saturation", () => {
  expect(hsvStats([image([[255, 255, 255]])])).toEqual({ brightness: 1, saturation: 0 });
  const red = hsvStats([image([[255, 0, 0]])]);
  expect(red.brightness).toBe(1);
  expect(red.saturation).toBe(1);
});
```

The bin centre for 4-bit quantization is `(v >> 4) * 16 + 8`, so pure red reports as `#F80808`.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run tests/scripts/style/cuts.test.ts tests/scripts/style/palette.test.ts`
Expected: FAIL, the modules are not found.

- [ ] **Step 3: Implement**

`scripts/lib/style/cuts.ts`:

```ts
export const CUT_THRESHOLD = 28;
export const CUT_PEAK_RATIO = 2;
export const CUT_MIN_GAP = 0.3;

export const frameDiff = (a: Uint8Array, b: Uint8Array): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return a.length ? sum / a.length : 0;
};

/** A cut is a difference spike: above the threshold and at least twice both neighbours. */
export const detectCuts = (frames: Uint8Array[], times: number[]): number[] => {
  const diffs = frames.map((f, i) => (i === 0 ? 0 : frameDiff(frames[i - 1], f)));
  const cuts: number[] = [];
  for (let i = 1; i < diffs.length; i++) {
    const prev = diffs[i - 1];
    const next = i + 1 < diffs.length ? diffs[i + 1] : 0;
    const spike = diffs[i] >= CUT_THRESHOLD && diffs[i] >= CUT_PEAK_RATIO * prev && diffs[i] >= CUT_PEAK_RATIO * next;
    if (spike && (!cuts.length || times[i] - cuts[cuts.length - 1] >= CUT_MIN_GAP - 1e-9)) {
      cuts.push(Math.round(times[i] * 100) / 100);
    }
  }
  return cuts;
};

export const rhythm = (cuts: number[], durationSec: number) => ({
  cutsPerMinute: durationSec > 0 ? Math.round((cuts.length / durationSec) * 60 * 10) / 10 : 0,
  avgShotSec: Math.round((durationSec / (cuts.length + 1)) * 100) / 100,
  firstCutSec: cuts.length ? cuts[0] : null,
});
```

In the min-gap fixture, the spikes at 0.2, 0.4 and 0.8 each have zero-difference neighbours, so all three pass the peak test. The gap rule drops 0.4, which is only 0.2 after 0.2.

`scripts/lib/style/palette.ts`:

```ts
import type { PaletteColor } from "./types";

export type Rgba = { width: number; height: number; data: Uint8Array };

const hex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
const centre = (v: number) => (v >> 4) * 16 + 8;

export const dominantColors = (frames: Rgba[], k = 5): PaletteColor[] => {
  const counts = new Map<number, number>();
  let total = 0;
  for (const { data } of frames) {
    for (let i = 0; i < data.length; i += 4) {
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      total++;
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([key, n]) => ({
      hex: `#${hex(centre((key >> 8) << 4))}${hex(centre(((key >> 4) & 15) << 4))}${hex(centre((key & 15) << 4))}`,
      share: Math.round((n / total) * 1000) / 1000,
    }));
};

export const hsvStats = (frames: Rgba[]) => {
  let v = 0;
  let s = 0;
  let n = 0;
  for (const { data } of frames) {
    for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i], data[i + 1], data[i + 2]) / 255;
      const min = Math.min(data[i], data[i + 1], data[i + 2]) / 255;
      v += max;
      s += max === 0 ? 0 : (max - min) / max;
      n++;
    }
  }
  return { brightness: n ? Math.round((v / n) * 1000) / 1000 : 0, saturation: n ? Math.round((s / n) * 1000) / 1000 : 0 };
};
```

The `share` rounding means the shares in the test sum to 1 within `toBeCloseTo`'s precision.

- [ ] **Step 4: Run them and confirm they pass**

Run: `npx vitest run tests/scripts/style/cuts.test.ts tests/scripts/style/palette.test.ts && npm run lint`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/style/cuts.ts scripts/lib/style/palette.ts tests/scripts/style/cuts.test.ts tests/scripts/style/palette.test.ts
git commit -m "feat(style): cut detection (spike + min gap) and dominant palette"
```

---

### Task 4: Speech and audio levels

**Files:**
- Create: `scripts/lib/style/speech.ts`, `scripts/lib/style/levels.ts`, `tests/scripts/style/speech.test.ts`, `tests/scripts/style/levels.test.ts`

**Interfaces:**
- Consumes: `TranscriptWord` from `scripts/lib/align` (`{ text, startMs, endMs }`).
- Produces:
  - `HOOK_SECONDS = 3`
  - `speechMetrics(words: TranscriptWord[], durationSec: number, unavailable: string | null): VideoMetrics["speech"]`
  - `audioLevels(wave: Float32Array, words: TranscriptWord[], sampleRate: number): VideoMetrics["audio"]`
  - `toDb(rms: number): number | null`

- [ ] **Step 1: Write the failing tests**

`tests/scripts/style/speech.test.ts`:

```ts
import { expect, it } from "vitest";
import { speechMetrics } from "../../../scripts/lib/style/speech";

const w = (text: string, s: number, e: number) => ({ text, startMs: s * 1000, endMs: e * 1000 });

it("measures pace, first word, hook text and coverage", () => {
  const words = [w("¿Tu", 0.4, 0.6), w("perro", 0.6, 1), w("come", 1, 1.4), w("chocolate?", 2.8, 3.4), w("Mira.", 5, 5.5)];
  expect(speechMetrics(words, 10, null)).toEqual({
    wordsPerMinute: 30,
    firstWordSec: 0.4,
    hookText: "¿Tu perro come chocolate?",
    coverage: 0.21,
    unavailable: null,
  });
});

it("is null with a reason when there are no words", () => {
  expect(speechMetrics([], 10, null)).toEqual({ wordsPerMinute: null, firstWordSec: null, hookText: null, coverage: null, unavailable: "no speech detected" });
  expect(speechMetrics([], 10, "WebGPU is not available").unavailable).toBe("WebGPU is not available");
});
```

`tests/scripts/style/levels.test.ts`:

```ts
import { expect, it } from "vitest";
import { audioLevels, toDb } from "../../../scripts/lib/style/levels";

const RATE = 1000;
const tone = (amp: number, n: number) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(i));

it("converts rms to dBFS", () => {
  expect(toDb(1)).toBe(0);
  expect(toDb(0.1)).toBe(-20);
  expect(toDb(0)).toBeNull();
});

it("separates voice from the gaps under it", () => {
  // 0–1 s loud (speech), 1–2 s quiet (music bed)
  const wave = new Float32Array([...tone(0.5, RATE), ...tone(0.05, RATE)]);
  const words = [{ text: "hola", startMs: 0, endMs: 1000 }];
  const a = audioLevels(wave, words, RATE);
  expect(a.speechDb!).toBeGreaterThan(a.gapDb! + 15);
  expect(a.peakDb!).toBeLessThanOrEqual(0);
});

it("has no speech level without words, and no gap level when speech fills everything", () => {
  const wave = tone(0.2, RATE);
  expect(audioLevels(wave, [], RATE).speechDb).toBeNull();
  expect(audioLevels(wave, [{ text: "x", startMs: 0, endMs: 1000 }], RATE).gapDb).toBeNull();
  expect(audioLevels(new Float32Array(0), [], RATE)).toEqual({ speechDb: null, gapDb: null, peakDb: null });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run tests/scripts/style/speech.test.ts tests/scripts/style/levels.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`scripts/lib/style/speech.ts`:

```ts
import type { TranscriptWord } from "../align";
import type { VideoMetrics } from "./types";

export const HOOK_SECONDS = 3;

export const speechMetrics = (words: TranscriptWord[], durationSec: number, unavailable: string | null): VideoMetrics["speech"] => {
  if (!words.length || durationSec <= 0) {
    return { wordsPerMinute: null, firstWordSec: null, hookText: null, coverage: null, unavailable: unavailable ?? "no speech detected" };
  }
  const spoken = words.reduce((s, w) => s + Math.max(0, w.endMs - w.startMs), 0) / 1000;
  return {
    wordsPerMinute: Math.round((words.length / durationSec) * 60),
    firstWordSec: Math.round(words[0].startMs / 100) / 10,
    hookText: words.filter((w) => w.startMs < HOOK_SECONDS * 1000).map((w) => w.text).join(" ") || null,
    coverage: Math.round((spoken / durationSec) * 100) / 100,
    unavailable: null,
  };
};
```

`scripts/lib/style/levels.ts`:

```ts
import type { TranscriptWord } from "../align";
import type { VideoMetrics } from "./types";

export const toDb = (rms: number): number | null => (rms > 0 ? Math.round(20 * Math.log10(rms) * 10) / 10 : null);

export const audioLevels = (wave: Float32Array, words: TranscriptWord[], sampleRate: number): VideoMetrics["audio"] => {
  if (!wave.length) return { speechDb: null, gapDb: null, peakDb: null };
  const inWord = new Uint8Array(wave.length);
  for (const w of words) {
    inWord.fill(1, Math.max(0, Math.floor((w.startMs / 1000) * sampleRate)), Math.min(wave.length, Math.ceil((w.endMs / 1000) * sampleRate)));
  }
  let speech = 0;
  let speechN = 0;
  let gap = 0;
  let gapN = 0;
  let peak = 0;
  for (let i = 0; i < wave.length; i++) {
    const v = wave[i] * wave[i];
    peak = Math.max(peak, Math.abs(wave[i]));
    if (inWord[i]) {
      speech += v;
      speechN++;
    } else {
      gap += v;
      gapN++;
    }
  }
  return {
    speechDb: speechN ? toDb(Math.sqrt(speech / speechN)) : null,
    gapDb: gapN ? toDb(Math.sqrt(gap / gapN)) : null,
    peakDb: toDb(peak),
  };
};
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `npx vitest run tests/scripts/style/speech.test.ts tests/scripts/style/levels.test.ts && npm run lint`
Expected: PASS, clean. (Coverage: 0.2 + 0.4 + 0.4 + 0.6 + 0.5 = 2.1 s of speech over 10 s → 0.21.)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/style/speech.ts scripts/lib/style/levels.ts tests/scripts/style/speech.test.ts tests/scripts/style/levels.test.ts
git commit -m "feat(style): speech pace, hook text, coverage and voice/gap levels"
```

---

### Task 5: Contact sheets

**Files:**
- Create: `scripts/lib/style/sheet.ts`, `tests/scripts/style/sheet.test.ts`

**Interfaces:**
- Consumes: `Rgba` (Task 3).
- Produces:
  - `drawDigits(img: Rgba, text: string, x: number, y: number, scale: number, color: [number, number, number]): void` (supports `0-9 . s`)
  - `composeSheet(frames: Rgba[], labels: string[], cols: number): Buffer` (PNG; every frame is placed at the size of `frames[0]`, with a 24 px black label strip above each cell)

- [ ] **Step 1: Write the failing test**

`tests/scripts/style/sheet.test.ts`:

```ts
import { PNG } from "pngjs";
import { expect, it } from "vitest";
import { composeSheet, drawDigits } from "../../../scripts/lib/style/sheet";

const solid = (w: number, h: number, rgb: [number, number, number]) => {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([...rgb, 255], i * 4);
  return { width: w, height: h, data };
};

it("lays frames out in a grid with a label strip per cell", () => {
  const frames = Array.from({ length: 5 }, () => solid(10, 20, [200, 0, 0]));
  const png = PNG.sync.read(composeSheet(frames, ["0s", "1s", "2s", "3s", "4s"], 4));
  expect(png.width).toBe(40);
  expect(png.height).toBe(2 * (20 + 24));
  // a pixel inside the first frame (below its label strip) is red
  const i = ((24 + 5) * png.width + 5) * 4;
  expect([...png.data.slice(i, i + 3)]).toEqual([200, 0, 0]);
});

it("draws digit pixels in the given color", () => {
  const img = solid(40, 20, [0, 0, 0]);
  drawDigits(img, "1.5s", 1, 1, 2, [255, 255, 0]);
  let lit = 0;
  for (let i = 0; i < img.data.length; i += 4) if (img.data[i] === 255 && img.data[i + 1] === 255) lit++;
  expect(lit).toBeGreaterThan(10);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/scripts/style/sheet.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`scripts/lib/style/sheet.ts`:

```ts
import { PNG } from "pngjs";
import type { Rgba } from "./palette";

// 3×5 bitmap glyphs, row-major, "1" = lit.
const GLYPHS: Record<string, string> = {
  "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111",
  "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001",
  "8": "111101111101111", "9": "111101111001111", ".": "000000000000010", s: "000011110001110",
};
const LABEL_H = 24;

export const drawDigits = (img: Rgba, text: string, x: number, y: number, scale: number, color: [number, number, number]) => {
  let cx = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (glyph) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          if (glyph[r * 3 + c] !== "1") continue;
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = cx + c * scale + dx;
              const py = y + r * scale + dy;
              if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
              img.data.set([...color, 255], (py * img.width + px) * 4);
            }
          }
        }
      }
    }
    cx += 4 * scale;
  }
};

export const composeSheet = (frames: Rgba[], labels: string[], cols: number): Buffer => {
  const w = frames[0].width;
  const h = frames[0].height;
  const rows = Math.ceil(frames.length / cols);
  const out: Rgba = { width: w * Math.min(cols, frames.length), height: rows * (h + LABEL_H), data: new Uint8Array(0) };
  out.data = new Uint8Array(out.width * out.height * 4);
  for (let i = 3; i < out.data.length; i += 4) out.data[i] = 255; // opaque black background
  frames.forEach((f, i) => {
    const ox = (i % cols) * w;
    const oy = Math.floor(i / cols) * (h + LABEL_H);
    for (let y = 0; y < Math.min(h, f.height); y++) {
      for (let x = 0; x < Math.min(w, f.width); x++) {
        out.data.set(f.data.subarray((y * f.width + x) * 4, (y * f.width + x) * 4 + 4), ((oy + LABEL_H + y) * out.width + ox + x) * 4);
      }
    }
    drawDigits(out, labels[i] ?? "", ox + 4, oy + 4, 3, [255, 214, 0]);
  });
  const png = new PNG({ width: out.width, height: out.height });
  png.data = Buffer.from(out.data);
  return PNG.sync.write(png);
};
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `npx vitest run tests/scripts/style/sheet.test.ts && npm run lint`
Expected: PASS, clean. `pngjs` is a devDependency of the template; `npm run lint` covers scripts, so confirm its types resolve. The template already uses `pngjs` in `scripts/check.mjs`. If `@types/pngjs` is missing and `tsc` complains, add a minimal `declare module "pngjs"` in `scripts/lib/style/pngjs.d.ts`. Do not add a dependency.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/style/sheet.ts tests/scripts/style/sheet.test.ts
git commit -m "feat(style): PNG contact sheets with bitmap timestamp labels"
```

---

### Task 6: Frame sampling and per-video analysis

**Files:**
- Create: `scripts/lib/style/frames.ts`, `scripts/lib/style/analyze.ts`, `tests/scripts/style/analyze.test.ts`, `tests/scripts/style/fixtures/two-colors.mp4`, `tests/scripts/style/fixtures/make-two-colors.ts`

**Interfaces:**
- Consumes:
  - `openMedia`, `decodeMono16k`, `SAMPLE_RATE` (`scripts/lib/audio.ts`);
  - `probeMedia` (`scripts/lib/probe.ts`);
  - `Transcriber`, `TranscriptionUnavailable`, `transcribeWithWhisper`, `Model` (`scripts/lib/transcribe.ts`);
  - Tasks 1, 3, 4 and 5.
- Produces:
  - `MAX_SECONDS = 180`
  - `sampleFrames(file: string, timestamps: number[], width: number): Promise<Rgba[]>` (nearest-neighbour downscale, aspect kept)
  - `toGray(img: Rgba): Uint8Array`
  - `type AnalyzeDeps = { transcribe: Transcriber | null; model: Model; language: string }` (`transcribe: null` skips speech with reason "skipped")
  - `analyzeVideo(dir: string, deps: AnalyzeDeps): Promise<VideoMetrics>`, which writes `metrics.json`, `sheet.png` and `hook.png` into `dir`
  - `analyzeFolder(root: string, deps: AnalyzeDeps): Promise<AccountsFile>`, which analyzes every video of every `ok` account in `accounts.json`, fills `median` and rewrites the file

- [ ] **Step 1: Create the fixture**

`tests/scripts/style/fixtures/make-two-colors.ts` makes a 2 s, 30 fps, 320×568 mp4: 1 s pure red, then 1 s pure blue, with a 440 Hz tone at 0.3 amplitude and no speech. It uses mediabunny `Output` + `Mp4OutputFormat` + `BufferTarget`, with a `VideoSampleSource` (codec `avc`) and an `AudioSampleSource` (codec `aac`), after `registerMediabunnyServer()`. Run it once:

```bash
npx tsx tests/scripts/style/fixtures/make-two-colors.ts tests/scripts/style/fixtures/two-colors.mp4
```

The output must be ≤ 100 KB. If mediabunny cannot encode in Node, generate the same clip with any local encoder you have and commit the mp4; the test only needs the file. Record which way you used in the report. Reference the API in `node_modules/mediabunny/dist/mediabunny.d.ts` (`VideoSample` constructor from RGBA data with `format: "RGBA"`, `codedWidth`, `codedHeight`, `timestamp`, `duration`).

- [ ] **Step 2: Write the failing integration test**

`tests/scripts/style/analyze.test.ts`:

```ts
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
```

Run: `npx vitest run tests/scripts/style/analyze.test.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Implement `frames.ts`**

```ts
import { VideoSampleSink } from "mediabunny";
import { openMedia } from "../audio";
import type { Rgba } from "./palette";

/** Decodes the frame at each timestamp and downsizes it (nearest neighbour) to `width`, keeping the aspect ratio. */
export const sampleFrames = async (file: string, timestamps: number[], width: number): Promise<Rgba[]> => {
  const input = openMedia(file);
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error(`${file} has no video track`);
    const sink = new VideoSampleSink(track);
    const out: Rgba[] = [];
    for await (const sample of sink.samplesAtTimestamps(timestamps)) {
      if (!sample) continue;
      const sw = sample.displayWidth;
      const sh = sample.displayHeight;
      const full = new Uint8Array(sample.allocationSize({ format: "RGBA" } as never));
      await sample.copyTo(full, { format: "RGBA" } as never);
      sample.close();
      const w = Math.min(width, sw);
      const h = Math.max(1, Math.round((sh * w) / sw));
      const data = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) {
        const sy = Math.floor((y * sh) / h);
        for (let x = 0; x < w; x++) {
          const sx = Math.floor((x * sw) / w);
          data.set(full.subarray((sy * sw + sx) * 4, (sy * sw + sx) * 4 + 4), (y * w + x) * 4);
        }
      }
      out.push({ width: w, height: h, data });
    }
    return out;
  } finally {
    input.dispose();
  }
};

export const toGray = ({ data }: Rgba): Uint8Array => {
  const g = new Uint8Array(data.length / 4);
  for (let i = 0; i < g.length; i++) g[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  return g;
};
```

The RGBA copy was verified in this repo: mediabunny + @mediabunny/server decodes I420 and converts to RGBA in Node. The `as never` casts follow the `.d.ts` typings, which type `format` as a `VideoPixelFormat`. If `"RGBA"` is in that union, drop the cast.

- [ ] **Step 4: Implement `analyze.ts`**

```ts
import fs from "node:fs";
import path from "node:path";
import { decodeMono16k, SAMPLE_RATE } from "../audio";
import { probeMedia } from "../probe";
import { TranscriptionUnavailable, type Model, type Transcriber } from "../transcribe";
import type { TranscriptWord } from "../align";
import { readAccounts, summarizeAccount, writeAccounts } from "./accounts";
import { detectCuts, rhythm } from "./cuts";
import { sampleFrames, toGray } from "./frames";
import { audioLevels } from "./levels";
import { dominantColors, hsvStats } from "./palette";
import { composeSheet } from "./sheet";
import { HOOK_SECONDS, speechMetrics } from "./speech";
import type { AccountsFile, VideoMetrics } from "./types";

export const MAX_SECONDS = 180;
const CUT_FPS = 10;
const CUT_WIDTH = 64;
const SHEET_WIDTH = 270;
const PALETTE_FRAMES = 24;
const SHEET_FRAMES = 12;

export type AnalyzeDeps = { transcribe: Transcriber | null; model: Model; language: string };

const range = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => f(i));
const label = (t: number) => `${Math.round(t * 10) / 10}s`;

export const analyzeVideo = async (dir: string, deps: AnalyzeDeps): Promise<VideoMetrics> => {
  const file = path.join(dir, "video.mp4");
  const info = JSON.parse(fs.readFileSync(path.join(dir, "info.json"), "utf8"));
  const probe = await probeMedia(file);
  const truncated = probe.durationSeconds > MAX_SECONDS;
  const duration = Math.min(probe.durationSeconds, MAX_SECONDS);
  const last = Math.max(0, duration - 0.05);

  const cutTimes = range(Math.floor(duration * CUT_FPS), (i) => i / CUT_FPS);
  const cutFrames = (await sampleFrames(file, cutTimes, CUT_WIDTH)).map(toGray);
  const cuts = detectCuts(cutFrames, cutTimes.slice(0, cutFrames.length));

  const paletteFrames = await sampleFrames(file, range(PALETTE_FRAMES, (i) => (last * i) / (PALETTE_FRAMES - 1)), CUT_WIDTH);
  const sheetTimes = range(SHEET_FRAMES, (i) => (last * i) / (SHEET_FRAMES - 1));
  fs.writeFileSync(path.join(dir, "sheet.png"), composeSheet(await sampleFrames(file, sheetTimes, SHEET_WIDTH), sheetTimes.map(label), 4));
  const hookTimes = range(HOOK_SECONDS * 2, (i) => Math.min(i * 0.5, last));
  fs.writeFileSync(path.join(dir, "hook.png"), composeSheet(await sampleFrames(file, hookTimes, SHEET_WIDTH), hookTimes.map(label), 6));

  let wave = new Float32Array(0);
  let words: TranscriptWord[] = [];
  let unavailable: string | null = null;
  if (!probe.hasAudio) {
    unavailable = "no audio track";
  } else {
    wave = (await decodeMono16k(file)).subarray(0, Math.round(MAX_SECONDS * SAMPLE_RATE));
    if (!deps.transcribe) {
      unavailable = "skipped";
    } else {
      try {
        words = await deps.transcribe(wave, { model: deps.model, language: deps.language });
      } catch (err) {
        if (!(err instanceof TranscriptionUnavailable)) throw err;
        unavailable = err.message;
      }
    }
  }

  const metrics: VideoMetrics = {
    id: String(info.id ?? path.basename(dir)),
    durationSec: Math.round(duration * 100) / 100,
    width: probe.width,
    height: probe.height,
    fps: probe.fps,
    truncated,
    cuts,
    ...rhythm(cuts, duration),
    speech: speechMetrics(words, duration, unavailable),
    audio: audioLevels(wave, words, SAMPLE_RATE),
    palette: dominantColors(paletteFrames),
    ...hsvStats(paletteFrames),
    post: {
      url: info.url ?? null,
      caption: info.caption ?? null,
      hashtags: info.hashtags ?? [],
      views: info.views ?? null,
      likes: info.likes ?? null,
      comments: info.comments ?? null,
      uploadDate: info.uploadDate ?? null,
    },
  };
  fs.writeFileSync(path.join(dir, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);
  return metrics;
};

export const analyzeFolder = async (root: string, deps: AnalyzeDeps): Promise<AccountsFile> => {
  const file = readAccounts(root);
  if (!file) throw new Error(`No accounts.json in ${root}. Run: npm run reelkit -- style fetch ${root} <accounts…>`);
  for (const account of file.accounts) {
    if (account.status !== "ok") continue;
    const metrics: VideoMetrics[] = [];
    for (const id of account.videos) {
      const dir = path.join(root, account.id, id);
      if (!fs.existsSync(path.join(dir, "video.mp4"))) continue;
      console.log(`→ ${account.id}/${id}`);
      metrics.push(await analyzeVideo(dir, deps));
    }
    account.median = summarizeAccount(metrics);
  }
  writeAccounts(root, file);
  return file;
};
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `npx vitest run tests/scripts/style/analyze.test.ts && npm test && npm run lint`
Expected: PASS, clean. If the cut lands at exactly 1.0 s it is inside the 0.85–1.15 window. If the palette test sees encoder colour shift (for example `#F80818`), loosen the test to check the hue family (red channel dominant for one, blue for the other). Do not loosen the cut test.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/style/frames.ts scripts/lib/style/analyze.ts tests/scripts/style/analyze.test.ts tests/scripts/style/fixtures
git commit -m "feat(style): per-video analysis — frames, cuts, palette, speech, levels, sheets"
```

---

### Task 7: The `style` CLI command

**Files:**
- Create: `scripts/commands/style.ts`, `tests/scripts/style/command.test.ts`
- Modify: `scripts/reelkit.ts` (register `style`), `/Volumes/Developer/reelkit/scripts/tests/plugin-content.test.mjs` (CLI list)

**Interfaces:**
- Consumes: Tasks 1, 2 and 6, and `flagString` (`scripts/lib/args.ts`).
- Produces:
  - `run(args: Args, deps?: { ytdlp?: YtDlp; transcribe?: Transcriber | null; now?: () => Date }): Promise<number>`
  - Usage:
    - `style fetch <dir> <account…> [--own=<account>] [--videos=5] [--cookies-from-browser=<browser>]`
    - `style analyze <dir> [--model=large-v3-turbo] [--locale=es-CO] [--no-speech]`

- [ ] **Step 1: Write the failing test**

`tests/scripts/style/command.test.ts`:

```ts
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
```

Run: `npx vitest run tests/scripts/style/command.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement `scripts/commands/style.ts`**

```ts
import path from "node:path";
import { flagString, type Args } from "../lib/args";
import { parseAccount, readAccounts, writeAccounts } from "../lib/style/accounts";
import { analyzeFolder } from "../lib/style/analyze";
import { fetchAll, systemYtDlp, type YtDlp } from "../lib/style/ytdlp";
import type { AccountRef } from "../lib/style/types";
import { DEFAULT_MODEL, isModel, transcribeWithWhisper, whisperLanguage, type Transcriber } from "../lib/transcribe";

const MAX_REFERENCES = 5;
const USAGE = `Usage:
  npm run reelkit -- style fetch <dir> <account…> [--own=<account>] [--videos=5] [--cookies-from-browser=chrome]
  npm run reelkit -- style analyze <dir> [--model=large-v3-turbo] [--locale=es-CO] [--no-speech]
Accounts: tiktok:@handle, instagram:handle, or a profile URL.`;

type Deps = { ytdlp?: YtDlp; transcribe?: Transcriber | null; now?: () => Date };

const fetchCommand = async (args: Args, deps: Deps): Promise<number> => {
  const [, dir, ...specs] = args.positional;
  if (!dir || !specs.length) {
    console.error(USAGE);
    return 2;
  }
  if (specs.length > MAX_REFERENCES) {
    console.error(`✗ At most ${MAX_REFERENCES} reference accounts (got ${specs.length}).`);
    return 2;
  }
  let refs: { ref: AccountRef; own: boolean }[];
  try {
    refs = specs.map((s) => ({ ref: parseAccount(s), own: false }));
    const own = args.flags.own;
    if (typeof own === "string") refs.push({ ref: parseAccount(own), own: true });
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    return 2;
  }
  const count = Number(flagString(args, "videos", "5"));
  const cookies = typeof args.flags["cookies-from-browser"] === "string" ? (args.flags["cookies-from-browser"] as string) : undefined;
  const root = path.resolve(dir);
  const { entries, missingBinary } = await fetchAll(refs, { root, count: Number.isFinite(count) && count > 0 ? count : 5, cookies, ytdlp: deps.ytdlp ?? systemYtDlp });
  if (missingBinary) {
    console.error("✗ yt-dlp is not installed. Install it: brew install yt-dlp (macOS) or pip install yt-dlp (Windows/Linux).");
    return 2;
  }
  const previous = readAccounts(root)?.accounts ?? [];
  const merged = [...previous.filter((p) => !entries.some((e) => e.id === p.id)), ...entries];
  writeAccounts(root, { createdAt: (deps.now ?? (() => new Date()))().toISOString(), accounts: merged });
  for (const e of entries) {
    console.log(`${e.status === "ok" ? "✓" : "✗"} ${e.id}${e.own ? " (own)" : ""}: ${e.status === "ok" ? `${e.videos.length} video(s)` : e.reason}`);
  }
  if (entries.some((e) => e.status === "needs-login")) return 3;
  return merged.some((e) => e.status === "ok") ? 0 : 1;
};

const analyzeCommand = async (args: Args, deps: Deps): Promise<number> => {
  const dir = args.positional[1];
  if (!dir) {
    console.error(USAGE);
    return 2;
  }
  const model = flagString(args, "model", DEFAULT_MODEL);
  if (!isModel(model)) {
    console.error(`✗ Unknown model ${model}`);
    return 2;
  }
  const transcribe = args.flags["no-speech"] ? null : deps.transcribe === undefined ? transcribeWithWhisper : deps.transcribe;
  try {
    const file = await analyzeFolder(path.resolve(dir), { transcribe, model, language: whisperLanguage(flagString(args, "locale", "es-CO")) });
    const ok = file.accounts.filter((a) => a.status === "ok" && a.median);
    console.log(`✓ Analyzed ${ok.length} account(s). Next: write ${path.join(dir, "report.md")} (skill reelkit:style-analysis).`);
    return ok.length ? 0 : 1;
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    return 1;
  }
};

export const run = async (args: Args, deps: Deps = {}): Promise<number> => {
  const sub = args.positional[0];
  if (sub === "fetch") return fetchCommand(args, deps);
  if (sub === "analyze") return analyzeCommand(args, deps);
  console.error(USAGE);
  return 2;
};
```

Register it in `scripts/reelkit.ts`: `style: () => import("./commands/style"),`.

In `scripts/tests/plugin-content.test.mjs` (plugin root), update the expected CLI list in "helpers read the code they lint against" to include `"style"`, keeping it sorted.

- [ ] **Step 3: Run the tests and confirm they pass**

Run: `npx vitest run tests/scripts/style && npm test && npm run lint && (cd .. && node --test scripts/tests/*.test.mjs)`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/commands/style.ts scripts/reelkit.ts tests/scripts/style/command.test.ts ../scripts/tests/plugin-content.test.mjs
git commit -m "feat(style): reelkit style fetch/analyze CLI with exit codes 0/1/2/3"
```

---

### Task 8: Plugin command, skill, doctor, docs and version

**Files:**
- Create: `commands/style.md`, `skills/style-analysis/SKILL.md`
- Modify: `scripts/doctor.mjs`, `scripts/tests/doctor.test.mjs`, `scripts/tests/plugin-content.test.mjs`, `README.md`, `template/package.json`, `template/package-lock.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

**Interfaces:**
- Consumes: the Task 7 CLI. Exit codes: fetch 0/1/2/3, analyze 0/1.
- Produces: `/reelkit:style`, `reelkit:style-analysis`, and `checkOptionalCommand(name, fix)` in doctor.

- [ ] **Step 1: Doctor: optional `yt-dlp` (test first)**

Append to `scripts/tests/doctor.test.mjs` (and add `checkOptionalCommand` to its import):

```js
test("optional command is a warning, not a failure", () => {
  const missing = checkOptionalCommand("reelkit-no-such-command", "brew install it");
  assert.deepEqual(missing, { ok: false, optional: true, label: "reelkit-no-such-command not found (optional)", fix: "brew install it" });
  assert.equal(formatResults([missing]), "⚠ reelkit-no-such-command not found (optional) → brew install it");
  assert.equal(checkOptionalCommand("node", "").ok, true);
});
```

Run `node --test scripts/tests/doctor.test.mjs` and expect it to fail. Then, in `scripts/doctor.mjs`:

```js
export const checkOptionalCommand = (name, fix) => {
  const result = checkCommand(name, fix);
  return result.ok ? result : { ok: false, optional: true, label: `${name} not found (optional)`, fix };
};
```

- Add `checkOptionalCommand("yt-dlp", "Only for /reelkit:style — brew install yt-dlp (macOS) or pip install yt-dlp")` to `runDoctor` after `git`.
- Change `formatResults` to print `⚠` for `r.optional`: `r.ok ? "✓ …" : \`${r.optional ? "⚠" : "✗"} ${r.label} → ${r.fix}\``.
- Change the exit line to `results.every((r) => r.ok || r.optional)`.

Re-run the test and expect it to pass.

- [ ] **Step 2: Write `skills/style-analysis/SKILL.md`**

Frontmatter: `name: style-analysis` and a description over 40 characters. Suggested description: *"Use when analyzing TikTok or Instagram creators' video style for reelkit — reading contact sheets and metrics.json, and writing report.md with evidence-backed style, block and script proposals."*

The body must contain:
- **Inputs:** the folder, `accounts.json`, and per video `metrics.json`, `sheet.png` and `hook.png`; the talent's `locale` sets the report language.
- **How to look:** open every `sheet.png` and `hook.png` with the Read tool. For each account, note:
  - framing (where the creator sits, and their size in frame);
  - typography and captions (position, case, colour, word-by-word or not);
  - graphics and stickers;
  - transitions (hard cuts or effects);
  - colour (compare with `palette`);
  - the hook in the first 3 s (`hookText` plus the strip).
- **The report template**, verbatim from spec §5: the section order, the comparative table columns (duración, cortes/min, palabras/min, 1ª palabra, fondo bajo la voz = `gapDb`, paleta) and the proposal fields (tipo `estilo` | `bloque` | `guion`, evidencia, impacto, esfuerzo, choque con la brand).
- **Proposals map to reelkit:**
  - `estilo` names a file and value in `src/brand/` (`tokens.ts`, `motion.ts`, `sfx.ts`), with the current → proposed value;
  - `bloque` follows the block catalog format: name, purpose, props, motion preset and cue;
  - `guion` names a rule for `reelkit:script-writing`.
- **Rules:**
  - every number comes from the JSON files;
  - image-based judgements say "se ve" / "looks like";
  - no proposal copies another creator's design, logo or content;
  - the own account is compared without judging;
  - failed accounts are listed with their reason;
  - if `speech.unavailable` is set, say so and don't invent pace.

- [ ] **Step 3: Write `commands/style.md`**

Frontmatter: `description: Analyze TikTok or Instagram creators' video style and write a report with proposals for reelkit` and `argument-hint: "<@account or URL> [more…] [--own=@account]"`.

Steps, written in the same voice as `commands/new.md`:
1. **Workspace:** the same `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"` preamble and stale-template prompt as `/reelkit:new`. This command needs `style` in the workspace CLI, so require `/reelkit:setup --update` if the template is older than 0.6.0.
2. **Accounts:**
   - Parse `$ARGUMENTS`. For each bare `@handle`, ask (AskUserQuestion) TikTok or Instagram, then build `tiktok:@h` / `instagram:h`. At most 5 references.
   - **Own account:** `--own`, or the talent's `handles` (list `talents/*.json`; ask which talent if there are several). Confirm with the user before including it; skip it if there is none.
   - Ask a short folder name (default `referencias`). The directory is `styles/<yyyy-mm-dd>-<slug>`.
3. **Fetch:**
   - Run `cd "<ws>" && npm run reelkit -- style fetch styles/<…> <accounts…> [--own=…]`.
   - Exit 2 + "yt-dlp is not installed": show the install line and stop.
   - Exit 3: ask (AskUserQuestion) whether to use the user's Chrome cookies for the accounts that need login. Explain that yt-dlp reads the browser's session for instagram.com and that no password is shared. Only on yes, re-run `fetch` with only those accounts plus `--cookies-from-browser=chrome`.
   - Exit 1: no account worked; show the reasons and stop.
4. **Analyze:**
   - Run `cd "<ws>" && npm run reelkit -- style analyze styles/<…> --locale=<talent locale>`.
   - If Whisper isn't downloaded yet, tell the user first (the same note as `reelkit:caption-sync`), or offer `--no-speech`.
5. **Report:** follow the `reelkit:style-analysis` skill and write `styles/<…>/report.md`.
6. **Close:**
   - Show 5 lines: the top proposals, each with type and impact.
   - Ask whether to delete the downloaded `video.mp4` files (keep sheets, metrics and the report). Delete only on a clear yes.
   - Offer to take a proposal into design: brainstorming → spec → plan.
7. **Responsible use:** analyze only, never reuse downloaded media in episodes, and cite each video by URL.

- [ ] **Step 4: Lint coverage, README and version**

1. In `scripts/tests/plugin-content.test.mjs`, add `"style-analysis"` to `SKILLS`, and add `"/reelkit:style"` to the README check list, renaming that test to "README covers install, setup and the commands".
2. Add a test that the style skill keeps its rules:

   ```js
   test("style analysis keeps its rules", () => {
     const skill = read("skills/style-analysis/SKILL.md");
     assert.match(skill, /metrics\.json/);
     assert.match(skill, /copies|copy/i);
     const command = read("commands/style.md");
     assert.match(command, /cookies-from-browser/);
     assert.match(command, /AskUserQuestion/);
   });
   ```

3. In `README.md`, add a table row: `` | `/reelkit:style <@account…> [--own=@account]` | Downloads recent public videos of reference creators (and optionally your own account) with yt-dlp, measures their style (cuts, pace, hook, colour, music under the voice) and writes a report with proposals for new styles and blocks. | ``. Under Install, add one line: *Optional: `yt-dlp` for `/reelkit:style` (`brew install yt-dlp`).*
4. Set the version to `0.6.0` in `template/package.json`, both version fields of `template/package-lock.json`, `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.

- [ ] **Step 5: Verify and commit**

From the repo root, run `node --test scripts/tests/*.test.mjs`. From `template/`, run `npm test && npm run lint`.
Expected: all PASS.

```bash
git add commands/style.md skills/style-analysis scripts/doctor.mjs scripts/tests README.md template/package.json template/package-lock.json .claude-plugin
git commit -m "feat(plugin): /reelkit:style command, style-analysis skill, optional yt-dlp check, 0.6.0"
```

---

### Task 9: Live smoke run (needs the user)

This task touches the network and installs a tool. The controller does it **with the user's approval**; it is not dispatched to a subagent.

- [ ] Ask the user to install `yt-dlp` (`! brew install yt-dlp`), or ask permission to run it.
- [ ] Update the studio workspace to 0.6.0: `node scripts/init-workspace.mjs <studio> --update`.
- [ ] Run `/reelkit:style` with 1–2 TikTok accounts the user names, and optionally Dani's TikTok as own.
- [ ] Check that each video has `metrics.json`, `sheet.png` and `hook.png`, that `accounts.json` has medians, and that `report.md` follows the template with links and evidence.
- [ ] Note any real-world `yt-dlp` stderr that `classifyError` misclassified, and fix it with a test in a follow-up commit.
