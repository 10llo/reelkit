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
