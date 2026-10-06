---
description: Export a reelkit episode for TikTok, Reels, WhatsApp and Facebook — renders every format and checks each file
argument-hint: "[episode]"
---

Export an episode. Arguments: `$ARGUMENTS` (optional episode folder).

## 1. Workspace and episode

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"`. If it fails, show its message and stop. Line 1 is `<ws>`.

Pick the episode from the arguments, or from `cd "<ws>" && npm run reelkit -- status episodes` (stage `synced`; ask if several).

## 2. Before rendering

- If the status shows captions `provisional`, explain that the captions follow the script timing rather than the voice and ask whether to export anyway or run `/reelkit:clip` first.
- If the episode has no clip, offer covers and subtitles only (`--only=cover-9x16,cover-4x5,srt`) or stop.
- Run `npm run check -- episodes/<folder>`; if it fails, fix the episode (the `reelkit:episode-authoring` skill) before exporting.

## 3. Export

Load the `reelkit:social-export` skill and run `npm run reelkit -- export episodes/<folder>` (several minutes). If any `✗` line appears, report it and don't hand over that file.

## 4. Report

Show a table of the files in `episodes/<folder>/exports/` (size, duration, resolution, where each goes) and the folder path.
