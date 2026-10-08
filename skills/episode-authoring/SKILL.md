---
name: episode-authoring
description: Use when building or editing a reelkit episode.json — choosing blocks for each scene, writing their props from the block catalog, and looping validate and npm run check until the video fits.
---

# Episode authoring

`episode.json` is the single source of truth for one video. You write it; the template renders it. Never edit component code to make an episode fit — change the props, the block or the split.

All commands run from the workspace root.

## 1. Create the folder

```bash
npm run reelkit -- episode create <slug> --talent=<id>
```

This creates `episodes/<yyyy-mm>-<slug>/` with `talent.json` (a snapshot of the talent profile). The episode's `slug` field must be that folder name (e.g. `2026-10-chocolate`).

## 2. Start from an example

Read `examples/dani-chocolate/episode.json` (30 s, `CUÁNDO · CÓMO · CUÁNTO`, core blocks) and `examples/dani-fiebre/episode.json` (45 s, explainer blocks) in the workspace. Copy the structure, not the content.

## 3. Read the catalog

```bash
npm run reelkit -- catalog                  # every block, its props, list lengths
npm run reelkit -- catalog --block=Gauge    # the exact JSON Schema of one block
npm run reelkit -- catalog --icons          # icon and diagram names
npm run reelkit -- catalog --episode        # the episode.json schema
```

Use only props, icons and enum values the catalog lists.

## 4. Fill in `episode.json`

| Field | Value |
|---|---|
| `schemaVersion` | `1` |
| `talent` | the talent id |
| `slug` | the folder name |
| `durationSeconds` | 15, 30, 45 or 60 |
| `stage` | `"built"` |
| `frame.steps` | the 3 labels from the approved script (≤ 12 characters each) |
| `script` | the 5 approved lines, verbatim |
| `sceneStarts` | `null` (sync sets it later) |
| `scenes.hook` | one beat with the `Hook` block |
| `scenes.step1` … `step3` | `title` (`{ text, accent?, tone? }`, text ≤ 40 characters, `accent` must appear in `text`) and 1–2 beats; `split` (0.3–0.7) is when beat 2 takes over |
| `scenes.close` | one beat with the `Close` block (contacts come from the talent profile) |
| `facts` | every on-screen number or claim, with the source page |
| `clip`, `captionsSrc`, `coverFrame`, `musicSrc`, `sfx` | leave the defaults (`coverFrame` 60; `sfx` true, set `false` only if the user asks for no sound effects) |

## 5. Choose blocks by what the line says

| The line is about… | Block |
|---|---|
| the opening question | `Hook` |
| what something is | `Definition` |
| how it works, step by step | `Process` |
| something that repeats | `Cycle` |
| when things happen | `Timeline`, `Timer` (a time window) |
| how much / how many | `Quantity` (several amounts), `BigStat` (one number), `Proportion` (a share) |
| whether a value is normal | `Gauge` |
| how it changes over time | `Trend` |
| which option is better | `Versus` (attributes), `Compare` (items on one scale) |
| what it's made of | `Anatomy` |
| what to do | `Checklist`, `DoDont`, `Decision` (depends on a condition) |
| what people get wrong | `MythFact` |
| signs, causes, examples | `Chips` |
| the sign-off | `Close` |

Two beats in a step when the line has two ideas (e.g. `Compare` then `Timer`).

## 6. Rules the schema can't show

- Colours are `#RRGGBB` or a palette token: `bg`, `bg2`, `accent`, `text`, `danger`, `safe`, or a name in the talent's `colors.extra`. The brand sets bg (cream), bg2 (white sticker) and text (ink); prefer accent, danger, safe or an extra for meaning.
- Two tone vocabularies: titles and accented text use `accent` / `danger` / `safe`; gauge zones and status items use `ok` / `warn` / `danger`.
- Per-word limits: long single words (e.g. "metilxantinas") overflow narrow columns; `validate` names the field and the limit — shorten or rephrase.
- `Anatomy`: at most 3 callouts per side. `Trend`: the y axis starts automatically unless you set `yMin`.
- Keyframes inside props are fractions of the beat (0–1), so they survive re-timing after sync.
- No emoji, no external images, no invented contacts.

## 7. Validate and check — loop until both pass

```bash
npm run reelkit -- validate episodes/<folder>
npm run check -- episodes/<folder>
```

- `validate` prints every schema problem with its path (e.g. `scenes.step2.beats[0].props.rows[1].label`). Fix and re-run.
- `npm run check --` renders key frames at 9:16 and 4:5. A `✗` line (talent-slot collision, wrong duration) means exit 1: a failure.
- It also prints `⚠` lines and still exits 0, for example `⚠ 9x16: scene "step2" is scaled to 0.80 to fit the stage`, `⚠ 9x16: scene "step2" has text at 34 px` and `⚠ 9x16: scene "step2" has 2 overflowing text element(s)`. Exit 0 with `⚠` lines is NOT a pass for authoring: shorten text, move content to a second beat, or pick a roomier block, then re-run until there are no `⚠` lines.
- At the end it prints `Frames: <dir>` with the key-frame PNGs it rendered; view them to find the frame of each beat.

## 8. Look at it

Render stills of each scene and view them:

```bash
npx remotion still Episode out/<folder>-f<N>.png --public-dir episodes/<folder> --frame=<N>
```

Use frames around the middle of each beat (30 frames per second); the PNGs in `Frames: <dir>` from `npm run check --` show where each beat sits. Offer the user Studio: `npm run studio -- episodes/<folder>`.

## 9. The talent's script

```bash
npm run reelkit -- script episodes/<folder>
```

writes `script.md`, the timed script the talent records from.
