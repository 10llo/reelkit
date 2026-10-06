# reelkit

A Claude Code plugin that turns one professional explainer video into a repeatable flow: pick a field → research what's trending → choose a duration → generate the video → hand the talent a timed script → sync their recording's captions → export for TikTok, Instagram Reels, WhatsApp and Facebook.

The talent (a veterinarian, a doctor, an engineer…) appears as a talking head in a reserved bottom-right slot. Everything else is built from a library of 20 animated blocks.

## Install (each team member)

Requirements: macOS, Linux or Windows with Node 20+, npm, git, ~3 GB free disk, Claude Code.

```
/plugin marketplace add 10llo/reelkit
/plugin install reelkit@reelkit
```

Restart Claude Code, then run:

```
/reelkit:setup
```

Setup checks your machine, creates your studio workspace (default `~/reelkit-studio`), installs its dependencies, downloads the Whisper speech model (~1.6 GB, once per machine) and creates your first talent profile by asking you a few questions.

After setup, open Claude Code from your studio folder so the commands can run and edit files there without permission prompts:

```
cd ~/reelkit-studio && claude
```

(Use the folder you chose at setup if it's not the default.) In a session you already started elsewhere, run `/add-dir ~/reelkit-studio` instead.

## The flow

Run these from a Claude Code session started in your studio folder (`cd ~/reelkit-studio && claude`, or the folder chosen at setup), or after `/add-dir <studio>` in an existing session.

| Command | What it does |
|---|---|
| `/reelkit:new` | Asks the field and the talent, researches trending angles (web search, plus TikTok Creative Center and Google Trends when the Chrome extension is connected), lets you pick one, asks the duration (15/30/45/60 s), drafts the script for your approval, builds the video and writes the talent's timed script (`script.md`). |
| `/reelkit:clip <video> [episode]` | Takes the talent's recording, transcribes it locally, corrects the captions to the script's spelling with the real timing, re-times the scenes, and shows you a review before applying anything. |
| `/reelkit:export [episode]` | Renders the 9:16 master, the WhatsApp version (under 16 MB), the 4:5 feed version, both covers and an `.srt`, and checks every file. |
| `/reelkit:status [episode]` | Lists your episodes, where each one is, and the next command to run. |

Every command stops for your approval at its decisions: the angle, the script, caption corrections, and what to do if the recording runs long.

## Your workspace

```
~/reelkit-studio/
  talents/<id>.json          talent profiles (name, colours, handles, disclaimer, recording notes)
  episodes/<yyyy-mm>-<slug>/ one folder per video: episode.json, research.md, script.md, the clip, captions, exports/
```

Updating: `/plugin marketplace update reelkit`, restart Claude Code, then `/reelkit:setup --update`. That last step updates the workspace template (new blocks and fixes) without touching talents or episodes; replaced files are backed up in `.reelkit-backup/`.

## Developing the plugin

- `template/` is the Remotion project copied into each workspace: `npm test`, `npm run lint`, `npm run check`, `npm run check:gallery`, `npm run reelkit -- <command>`.
- Plugin-root tests: `node --test scripts/tests/*.test.mjs` (includes a lint that checks commands and skills against the code).
- Releases: bump `template/package.json`, `.claude-plugin/plugin.json` and the marketplace entry to the same version.
