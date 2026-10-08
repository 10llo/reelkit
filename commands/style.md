---
description: Analyze TikTok or Instagram creators' video style and write a report with proposals for reelkit
argument-hint: "<@account or URL> [more…] [--own=@account] [--videos=N]"
---

Analyze the style of reference creators. Arguments (accounts, optional `--own=`, optional `--videos=N`): `$ARGUMENTS`.

## 1. Workspace

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"`. If it fails, show its message and stop (the user needs `/reelkit:setup`). Line 1 is the workspace path `<ws>`. If this session's working directory is not `<ws>` or a folder inside it, tell the user once, before any other work, that Claude Code works best started in the studio (`cd "<ws>" && claude`), or that they can run `/add-dir <ws>` now; then continue. If it prints a `⚠` line (the workspace template is older than the plugin), stop and ask (AskUserQuestion) whether to run `/reelkit:setup --update` now (recommended). This command needs the update (`style` is missing from templates older than 0.6.0): don't continue until the workspace is updated. All later shell steps run as `cd "<ws>" && …`.

## 2. Accounts

- Parse the arguments. For each bare `@handle`, ask (AskUserQuestion) whether it is TikTok or Instagram, then write it as `tiktok:@h` or `instagram:h`. Profile URLs (`tiktok.com/@x`, `instagram.com/x`) are used as they are. At most 5 references.
- **Own account:** `--own=…`, or the talent's `handles`. List `<ws>/talents/*.json`; if there are several talents, ask which one. List the talent's non-empty `handles.tiktok` and `handles.instagram` and ask (AskUserQuestion) which one to use, then write it as `tiktok:@h` or `instagram:h`. Confirm with the user before including the own account. If there is none, skip it.
- Ask for a short folder name (default `referencias`). The folder is `styles/<yyyy-mm-dd>-<slug>`.

## 3. Fetch

Run `cd "<ws>" && npm run reelkit -- style fetch styles/<…> <accounts…> [--own=…] [--videos=N]`.

- Exit 2 means either that yt-dlp is missing or a usage error. If the message says "yt-dlp is not installed", show the install line (`brew install yt-dlp` on macOS, `pip install yt-dlp` on Windows or Linux) and stop. On a usage error, show the message and fix the account list (or `--own` / `--videos`) with the user, then run again.
- Exit 3 (an account needs login): ask (AskUserQuestion) whether to use the user's Chrome cookies for the accounts that need it. Explain that yt-dlp reads the browser's existing session for instagram.com and that no password is shared. Only on a yes, re-run `fetch` with only those accounts plus `--cookies-from-browser=chrome` (and the same `--videos`). If the account that needs login is the own account, retry it as `--own=<spec>`, never as a positional argument. Never do it without asking, and never ask twice.
- If the user declines cookies: continue with the accounts that are already OK (read `styles/<…>/accounts.json`). If none is OK, stop as for exit 1.
- If the cookie retry exits 3 again: report those accounts as still needing login (Chrome is probably not signed in to Instagram) and continue with the rest.
- Exit 1: no account worked. Show the reasons and stop.

Accounts that fail (private, not found, rate limit) are listed with their reason; the others continue.

## 4. Analyze

Run `cd "<ws>" && npm run reelkit -- whisper check --model=large-v3-turbo`. If the model is not downloaded, tell the user once that it is a 1.6 GB download, once per machine (the same one `reelkit:caption-sync` uses), and offer `--no-speech`. Then run `cd "<ws>" && npm run reelkit -- style analyze styles/<…> --locale=<talent locale>`.

## 5. Report

Load the `reelkit:style-analysis` skill and follow it: open every sheet and hook strip, then write `styles/<…>/report.md`.

## 6. Close

- Show 5 lines: the top proposals, each with its type and impact.
- Ask (AskUserQuestion) whether to delete the downloaded videos, and say that the report, sheets and metrics stay. Delete only on a clear yes, and only `styles/<this folder>/*/*/video.mp4`; nothing else.
- Offer to take one proposal into design: brainstorming, then a spec, then a plan.

## 7. Responsible use

This is analysis only. Never reuse downloaded media in episodes, cite each video by its URL, and propose patterns, not copies of another creator's design, logo or content.
