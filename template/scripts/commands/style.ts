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
