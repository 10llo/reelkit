---
description: Set up reelkit on this machine — check tools, create or update the studio workspace, download the Whisper model, and create a talent profile
argument-hint: "[--update]"
---

Set up reelkit. Arguments: `$ARGUMENTS`. This command is safe to run again: it only does what's missing.

## 1. Check the machine

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" "<user's home folder>"` (so disk space is checked on that drive) and show its lines. A ✗ on Node, npm or disk space blocks setup: show the fix and stop. A ✗ on git is a warning only.

Check whether the `mcp__claude-in-chrome__*` tools are available in this session. They may be deferred: search for them (ToolSearch for "claude-in-chrome") before concluding they're unavailable. If they're not available, tell the user trend research will use web search only, and that connecting the Claude in Chrome extension adds TikTok Creative Center and Google Trends.

## 2. Workspace

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs" --json`.

- **`--update` in the arguments:** if the JSON's `dir` contains a `reelkit.json`, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/init-workspace.mjs" "<dir>" --update` (it runs `npm install`; a few minutes) and tell the user where the previous files were backed up. If there is no workspace, say so and continue as a new setup.
- If the environment variable `REELKIT_STUDIO` is set, say that it overrides the remembered path.
- If `message` says `reelkit.json` is not valid JSON, tell the user to fix or move that file (`--update` can't read it) and stop.
- **`ok: true`:** the workspace exists. Say where it is; if `notice` is set, show it and offer to run `/reelkit:setup --update`.
- **`ok: false`:** ask the user where to create the studio (AskUserQuestion; default: the JSON's `dir`, which is `~/reelkit-studio` expanded to an absolute path). If that folder already holds a reelkit workspace, use `--update` on it instead. Otherwise run `node "${CLAUDE_PLUGIN_ROOT}/scripts/init-workspace.mjs" "<dir>"` (copies the template and runs `npm install`; a few minutes). If it says the folder is not empty, ask for another folder. Then remember it: `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs" --set="<dir>"`.

## 3. Whisper model

Run `cd "<dir>" && npm run reelkit -- whisper check --model=large-v3-turbo`.

- WebGPU unavailable: warn that clip sync will attach the clip but keep captions timed from the script.
- Model not downloaded: ask whether to download it now (about 1.6 GB, once per machine). If yes: `cd "<dir>" && npm run reelkit -- whisper download --model=large-v3-turbo`.

## 4. Talent profile

List `<dir>/talents/*.json`. If there are none, or the user wants another talent, create one by asking (AskUserQuestion where there are choices, otherwise plain questions, a few at a time):

- `displayName` (e.g. "Dogtora Dani"), `pillName` (≤ 18 characters, shown on the slot), `profession`, `city`, `country` (ISO code, e.g. CO), `locale` (e.g. es-CO).
- `voiceNotes`: how they speak (formal/informal, `tú`/`usted`, words they avoid).
- `handles`: ask for Instagram, TikTok, WhatsApp and Facebook one by one; leave a handle empty when they have none — never invent a handle or a phone number.
- `colors`: `bg`, `bg2`, `accent`, `text`, `danger`, `safe` as `#RRGGBB`; propose a palette from their brand colours and let them change it; optional named `extra` colours. In the current brand (Consultorio Pop) bg, bg2 and text are set by the brand (cream, white, ink); ask mainly for accent, danger and safe, which must read on cream and white.
- `disclaimer`: two short lines; propose one that fits the profession ("Contenido educativo." / "No reemplaza la consulta veterinaria.") and let them edit it.
- `recordingNotes`: anything about where and how they record (optional).

Pick an `id` (lowercase, a-z 0-9 and "-", e.g. `dani`), write `<dir>/talents/<id>.json` (with `"id": "<id>"` inside the JSON too, matching the file name), then run `cd "<dir>" && npm run reelkit -- talent validate talents/<id>.json`. Fix and re-run until it prints ✓.

## 5. Done

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" "<dir>"` and show the summary: workspace path, Whisper status, talents.

Then print the exact command to start Claude Code in the studio, with the real absolute path in place of `<dir>`:

```
cd "<dir>" && claude
```

Explain why: the reelkit commands run `npm` and write episode files inside the studio, and a session started there can do that without asking permission for every step. In a session started elsewhere, `/add-dir <dir>` gives the same access. Next step (in that session): `/reelkit:new`.
