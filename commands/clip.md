---
description: Add the talent's recording to a reelkit episode — transcribe locally, correct captions to the script, re-time scenes, review, and apply
argument-hint: "<video> [episode]"
---

Add the talent's clip. Arguments: `$ARGUMENTS` (the video path, then optionally the episode folder).

## 1. Workspace and episode

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"`. If it fails, show its message and stop. Line 1 is `<ws>`. If it prints a `⚠` line (the workspace template is older than the plugin), ask (AskUserQuestion) whether to run `/reelkit:setup --update` now (recommended) or continue anyway.

- The video path must exist (it can be anywhere, e.g. `~/Downloads`). If it's missing from the arguments, ask for it. Convert it to an absolute path before any `cd` (expand `~`, resolve relative paths against the user's current folder).
- The episode: from the arguments, or run `cd "<ws>" && npm run reelkit -- status episodes` and pick the episode at stage `built`, `synced` or `exported` (the last two replace a clip, i.e. a re-record); if several fit, ask.

## 2. Sync

Load the `reelkit:caption-sync` skill and follow it:

1. `npm run reelkit -- whisper check`, and tell the user if a model download will happen.
2. `npm run reelkit -- sync prepare episodes/<folder> "<video>"` — writes proposals only.
3. Read `sync-report.md` and present the review: scene cuts before → after, every flagged word, warnings, and any overrun.
4. Ask the user to approve, or to list caption fixes (edit `captions.proposed.json` and show the result). If the voice runs past the end, recommend re-recording; use `--accept-overrun` only if the user explicitly accepts losing the last words.
5. After approval: `npm run reelkit -- sync apply episodes/<folder>` (plus `--accept-overrun` when agreed).
6. `npm run check -- episodes/<folder>`, then a still mid-sentence to confirm the clip and captions.

## 3. Next

Offer Studio (`npm run studio -- episodes/<folder>`) and tell the user the next step: `/reelkit:export`.
