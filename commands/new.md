---
description: Create a new reelkit episode — field, talent, trend research, angle, duration, script, video, and the talent's timed script
argument-hint: "[field or topic]"
---

Create a new episode. Arguments (optional field or seed topic): `$ARGUMENTS`.

## 1. Workspace

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"`. If it fails, show its message and stop (the user needs `/reelkit:setup`). Line 1 is the workspace path `<ws>`; show a `⚠` line if present. All later shell steps run as `cd "<ws>" && …`.

## 2. Field and talent

- Field: from the arguments, or ask (AskUserQuestion): veterinary, medical, engineering, other.
- Talent: list `<ws>/talents/*.json` (id and displayName). One talent → use it; several → ask. None → stop and send the user to `/reelkit:setup`.

## 3. Research

Launch the `reelkit:trend-researcher` agent (Agent tool) with: the field, the seed topic (if any), the talent profile path `<ws>/talents/<id>.json`, today's date, and the output path `<ws>/episodes/.research/<yyyy-mm-dd>-<field>.md`. If that agent type isn't available, do the research yourself following the `reelkit:trend-research` skill. While it runs, you may ask step 5's question.

## 4. Pick the angle

Show the 3–5 angles (title, hook, why now, suggested frame) and let the user choose one or propose their own (AskUserQuestion). Don't continue until they approve an angle.

## 5. Duration

Ask: 15, 30, 45 or 60 seconds (AskUserQuestion; 30 s recommended).

## 6. Episode folder

Choose a short slug from the angle (a-z, 0-9, "-", e.g. `chocolate`) and run `npm run reelkit -- episode create <slug> --talent=<id>`. Move the research file into the new folder as `research.md`.

## 7. Script

Load the `reelkit:script-writing` skill and draft the 5 lines within the word budget for the chosen duration, with the 3-step frame. Write `script-draft.md` in the episode folder and show it. Ask the user to approve or edit; repeat until they approve.

## 8. Build the video

Load the `reelkit:episode-authoring` skill and follow it: catalog → write `episode.json` → `npm run reelkit -- validate episodes/<folder>` → `npm run check -- episodes/<folder>`, looping until both pass with no warnings. Render a still from each scene and look at them; fix anything that looks wrong. Offer to open Studio (`npm run studio -- episodes/<folder>`, in the background).

## 9. The talent's script

Run `npm run reelkit -- script episodes/<folder>` and show `script.md`. If a document connector (such as Claude Docs) is available, offer to publish it as a document the talent can open on their phone.

## 10. Summary

Tell the user: the episode folder, the facts the talent must confirm (from `facts`), and the next step — send `script.md` to the talent, then run `/reelkit:clip <video>` when the recording arrives.
