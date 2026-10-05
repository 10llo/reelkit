# reelkit — design spec

**Date:** 2026-10-05
**Status:** approved in conversation, awaiting written-spec review
**Origin:** generalizes the hand-built "Dogtora Dani · ¿Tu perro se comió un chocolate?" video (`/Volumes/Developer/my-video/src/dani`, brief `dogtora-dani-chocolate-halloween-remotion-brief.md`).

## 1. Goal

A Claude Code plugin that turns one professional explainer video into a repeatable flow: set up tools → pick a field → research what's trending → choose a duration → generate the video → hand the talent a timed script → take their recording, sync and correct captions → export for every social platform.

**Users:** content producers on a team or agency (installed from GitHub), each making short vertical explainers for professionals ("talents") such as a veterinarian, a doctor or an engineer. The talent appears as a talking head in a reserved bottom-right slot.

**Success criteria**
- A new episode goes from `/reelkit:new` to a previewable video and talent script in one session, without anyone editing component code.
- After the talent's clip arrives, `/reelkit:clip` + `/reelkit:export` produce all deliverables with captions that match the spoken words in text and timing.
- The layout guarantees from the Dani brief (slot plus 16 px clearance always empty, safe zones respected, exact duration) are enforced automatically on every episode.
- The Dani chocolate video can be rebuilt from the block library with no custom code.
- The 20 blocks cover informative videos in any field (health, veterinary, engineering, finance, education, technology…) without new code in the typical case; a new block is the exception.

## 2. Decisions made

| Topic | Decision |
|---|---|
| Video structure | Chosen per topic: always hook + 3 steps + close; the 3-step frame (e.g. cuándo/cómo/cuánto, mito/realidad/qué hacer, problema/causa/solución) is picked per episode. |
| Scene building | Approach A: library of prop-driven blocks; Claude writes `episode.json` per video and adds a new block only when none fits. |
| Transcription | Local whisper.cpp (via `@remotion/install-whisper-cpp`), word-level timestamps. |
| Trend research | Web search plus the Chrome extension (TikTok Creative Center, Google Trends); falls back to web search alone if Chrome isn't connected. |
| Exports | 9:16 master, WhatsApp-optimized 9:16, 4:5 feed layout, covers per platform, plus `.srt`. |
| Distribution | GitHub repo acting as both marketplace and plugin, installed by a team on their own machines. No machine-specific paths. |

## 3. Packaging

```
reelkit/                              (GitHub repo)
  .claude-plugin/
    plugin.json                       plugin manifest
    marketplace.json                  single-plugin marketplace pointing at ./
  commands/
    setup.md  new.md  clip.md  export.md  status.md
  skills/
    trend-research/SKILL.md           sources, query patterns, how to score angles
    script-writing/SKILL.md           word budget, voice, structure picking, talent tone
    episode-authoring/SKILL.md        episode.json schema, block catalog, validation loop
    block-authoring/SKILL.md          contract for adding a new block
    caption-sync/SKILL.md             transcription, alignment rules, review table
    social-export/SKILL.md            render presets, size targets, verification
  agents/
    trend-researcher.md               runs research in the background, returns ranked angles
  scripts/                            Node (ESM), invoked by commands
    doctor.mjs                        environment checks with exact fix messages
    init-workspace.mjs                copy template → workspace, npm install, update mode
    transcribe.mjs                    whisper.cpp → captions.raw.json (Caption[])
    align.mjs                         script ↔ transcript alignment → captions.json + report
    probe.mjs                         clip duration, size, rotation, audio, leading silence
    export.mjs                        renders + encodes all deliverables, verifies outputs
  template/                           Remotion project copied into each workspace
  README.md
```

### Studio workspace (one per user, created by setup)

Default `~/reelkit-studio` (user may choose). Contents: the template project plus

```
talents/<id>.json
episodes/<yyyy-mm>-<slug>/
  episode.json        single source of truth
  research.md         angles considered, sources, chosen angle
  script.md           talent's timeline script (also published as a doc when available)
  clip.<ext>          talent recording (after step 7)
  captions.raw.json   whisper output
  captions.json       aligned captions used by the video
  sync-report.md      every correction: heard → shown, time, kind
  exports/
```

`reelkit.json` at the workspace root records the template version, so `/reelkit:setup --update` can bring in new blocks without touching `talents/` or `episodes/`.

### Talent profile (`talents/<id>.json`)

`id, displayName, pillName, profession, city, country, locale (e.g. es-CO), voiceNotes, handles {instagram, tiktok, whatsapp, facebook} (all optional, never invented), colors {bg, bg2, accent, text, danger, safe, extra[]}, disclaimer [2 lines], recordingNotes`.

## 4. Commands (the flow)

| Command | Steps | Behaviour |
|---|---|---|
| `/reelkit:setup [--update]` | 1 | Runs `doctor.mjs`: Node ≥ 18, git, free disk space (≥ 3 GB), Chrome extension connection (warn only). Creates or updates the workspace, runs `npm install`, installs whisper.cpp and downloads `large-v3-turbo`. Creates the first talent profile through questions. Idempotent; each failed check prints its fix. |
| `/reelkit:new` | 2–6 | 1. Ask the field and the talent. 2. Launch `trend-researcher` for the talent's country and language. 3. Present 3–5 angles (hook, why now, sources) and the user picks one. 4. Ask the duration: 15 / 30 / 45 / 60 s. 5. Pick the 3-step frame and draft the script within the word budget (≈ 2.4 words/s, minus pauses). User approves or edits. 6. Write and validate `episode.json`, open Studio on the episode. 7. Generate `script.md` in timeline format and publish it as a doc when a docs connector is available. Stage → `built`. |
| `/reelkit:clip <path> [episode]` | 7 | Probe → copy into the episode → transcribe → align → re-fit scene starts → write `sync-report.md` → show the review table and Studio preview → user approves. Stage → `synced`. |
| `/reelkit:export [episode]` | 8 | Run `npm run check`, then `export.mjs`; report each file's size, duration and resolution. Stage → `exported`. |
| `/reelkit:status [episode]` | — | List episodes with their stage and the next command to run. |

Every command pauses for user approval at its decision points: angle, script, caption corrections, overrun handling.

### Timeline script format (`script.md`)

One row per scene: `# · scene · time range · exact words · direction` (pause before each question, emphasis). Header: total words, target seconds, recording checklist (vertical, chest-up, eyes in the top third, hands out of frame, quiet room, single take under the duration). Footer: on-screen facts for the talent to confirm, each with its source.

## 5. Template (Remotion project)

### Frame (shared by all episodes)

- `layout.ts` (1080×1920) — the Dani regions: top safe 0–220, tracker 220–296, stage 60–1020 × 320–940, captions 60–510 × 1040–1400, disclaimer 1420–1500, slot 550,1000 380×500 r40 plus 16 px clearance, right gutter background-only, bottom safe 1500–1920.
- `layout45.ts` (1080×1350): stage x 60–1020, y 160–700 (tracker y 60–136); captions x 60–600, y 760–1150; disclaimer y 1170–1250; slot x 700, y 830, 320×420, r36 plus 16 px clearance. No platform-UI dead zones on feed posts, only 60 px margins.
- Persistent layers: background (radial gradient + drifting pattern masked from the slot), step tracker (labels from the episode), captions, disclaimer, slot frame + name pill, optional music, guides.
- Fonts: Baloo 2 800 and Inter 600 by default, overridable per talent; latin subset.
- All existing safeguards carry over: scene-relative keyframes scaled to actual scene length, `FitStage` auto-fit, fonts gate before measuring, no emoji, no external images, no CSS animation.

### Scenes and duration

- 5 scenes: `hook`, `step1`, `step2`, `step3`, `close`. Default share of the duration: 10 % / 23 % / 23 % / 28 % / 16 % (the Dani ratio), overridden by `sceneStarts` after sync.
- Duration comes from `episode.durationSeconds` via `calculateMetadata`; never longer.
- Each step scene has 1–2 beats; each beat is one block. Beat B enters when beat A leaves (existing grid-overlay pattern).

### `episode.json` (validated by zod)

```jsonc
{
  "schemaVersion": 1,
  "talent": "dani",
  "slug": "2026-10-chocolate",
  "durationSeconds": 30,
  "stage": "built",                    // researched | scripted | built | synced | exported
  "frame": { "steps": ["CUÁNDO", "CÓMO", "CUÁNTO"] },
  "script": ["…hook…", "…step1…", "…step2…", "…step3…", "…close…"],
  "sceneStarts": null,                 // null = default shares; set by /reelkit:clip
  "scenes": {
    "hook":  { "block": "Hook", "props": { … } },
    "step1": { "beats": [ { "block": "Compare", "props": { … } }, { "block": "Timer", "props": { … } } ] },
    "step2": { "beats": [ … ] },
    "step3": { "beats": [ … ] },
    "close": { "block": "Close", "props": { … } }
  },
  "facts": [ { "claim": "≈ 7 g amargo, perro 5 kg", "source": "Merck Veterinary Manual, Feb 2026" } ],
  "clip": { "src": "", "trimStartFrames": 0 },
  "captionsSrc": "",
  "coverFrame": 60,
  "musicSrc": ""
}
```

Keyframes inside block props are written as fractions of the beat (0–1) or frames at the default duration; the block scales them with the scene timing helper.

### Core blocks (v1, from the Dani video)

| Block | Props (summary) | Origin |
|---|---|---|
| `Hook` | line1, line2 (accent), chip, heroIcon, heroAnimation (`bites` / `pop` / `shake`) | chocolate hook |
| `Compare` | title, items[{label, color or icon}], scale {from, to, label} | swatches + danger meter |
| `Timer` | title, low, high, unit, caption, chips[] | clock ring + symptom chips |
| `DoDont` | title, cards[{icon, label, verdict: no/yes}] | "no" cards with X stamps |
| `Checklist` | title, rows[], pill | checklist |
| `Quantity` | title, chip, rows[{label, value, unit, color, highlight}], conclusion, footnote | gram bars |
| `BigStat` | value, unit, label, source | new |
| `MythFact` | myth, fact | new |
| `Chips` | title, items[{icon, label}] | symptom chips |
| `Close` | headline lines, accent, icons, brand lockup, contacts from the talent profile, teaser | cierre |

### Explainer blocks (v1, any subject)

Ten more blocks cover the common ways an informative video explains something, whatever the field. Limits are the maximum content each block accepts; the schema enforces them so every block fits the stage at full size.

| Block | Shows | Props (summary) | Limits | Example uses |
|---|---|---|---|---|
| `Definition` | What something is | term, pronunciation?, category chip, meaning, icon | meaning ≤ 18 words | "¿Qué es la teobromina?", "What is torque?", "¿Qué es la inflación?" |
| `Process` | How it works, as a linear flow | title, steps[{icon, label}], connector (`arrow` / `chevron`), highlightStep? | 3–5 steps, label ≤ 4 words | How a vaccine works, how solar panels make power, a sales funnel |
| `Cycle` | A loop that repeats | title, stages[{icon, label}], centerLabel?, direction | 3–6 stages | Flea life cycle, water cycle, a feedback loop, sleep cycle |
| `Timeline` | Events in time order | title, events[{when, label, icon?}], nowMarker? | 3–5 events | Symptom onset by hour, a disease's history, phases of a build |
| `Versus` | Two options compared on several attributes | title, left{name, icon}, right{name, icon}, rows[{attribute, left, right, winner?}] | 2–4 rows, cell ≤ 3 words | Cat vs dog food, LED vs halogen, generic vs brand drug |
| `Anatomy` | Parts of one thing, with labels | title, subject{icon or built-in diagram}, callouts[{label, anchor x/y in %}], highlight? | 2–6 callouts | Parts of a tooth, a car brake, a paw pad, a circuit |
| `Proportion` | "X out of N" or a share of a whole | title, numerator, denominator, style (`dots` / `donut` / `people`), label, source | denominator ≤ 100 | "1 de cada 4 perros", 30 % of energy lost as heat |
| `Trend` | A quantity changing over time | title, points[{x, y}], xLabel, yUnit, annotate{x, label}?, direction cue | 3–12 points | Cases by month, price over years, temperature after a dose |
| `Gauge` | One reading against zones | title, value, unit, zones[{to, label, tone: ok/warn/danger}], needleLabel | 2–4 zones | Normal body temperature, blood pressure, tyre pressure, a credit score |
| `Decision` | When to do what: a yes/no path | title, question, yes{label, tone}, no{label, tone}, followUp?{question, yes, no} | depth ≤ 2 | "¿Vomitó en la última hora?", "Is the breaker hot?", "When to go to the ER" |

Shared animation language for all of them: entrances use the existing `enter` spring with a 6-frame stagger, emphasis uses `pop` / `pulse`, connectors and lines draw on with stroke-dashoffset, and numbers count up. Every keyframe is beat-relative, so blocks keep working when sync re-fits the scenes.

### Choosing a block

The `episode-authoring` skill picks blocks by the shape of what is being said, not by subject:

| The line is about… | Block |
|---|---|
| what something is | `Definition` |
| how it works, step by step | `Process` |
| something that repeats | `Cycle` |
| when things happen | `Timeline`, `Timer` (a time window) |
| how much / how many | `Quantity` (several amounts), `BigStat` (one number), `Proportion` (a share) |
| whether a value is normal | `Gauge` |
| how it changes | `Trend` |
| which option is better | `Versus` (attributes), `Compare` (items on one scale) |
| what it's made of | `Anatomy` |
| what to do | `Checklist`, `DoDont`, `Decision` (depends on a condition) |
| what people get wrong | `MythFact` |
| signs, causes, examples | `Chips` |

### Icons

Shared `icons.tsx`: about 100 SVG icons in one consistent style (rounded 100×100 grid, solid fills, two colors at most), grouped by domain: health, veterinary, food, engineering and tools, energy, technology, money, education, nature and weather, home, transport, time, people, warnings, actions and arrows. `Anatomy` also includes built-in diagrams: human body, dog, cat, tooth, car, house, circuit board. New icons and diagrams may be added through `block-authoring`.

A `BlockGallery` composition shows every block with sample props at its maximum content, for previewing and for the block-authoring workflow.

### Block contract (for new blocks)

Renders inside `FitStage`. Uses `enter` / `pop` / `pulse` and scene timing (`at`). Exports a zod props schema and is registered in `blocks/registry.ts`. Text ≥ 40 px except footnotes. Every interpolate is clamped. Appears in `BlockGallery`. Passes `npm run check`.

### `npm run check`

For each episode (or a given one): validates `episode.json`, renders key frames (scene starts, mid-beats, the last frame) at 9:16 and 4:5, and runs:
- **Slot test:** the slot rect plus clearance is pixel-identical across checked frames, ignoring only the background-pattern pixels outside the rounded mask.
- **Fit report:** warns if any scene's `FitStage` scale is below 0.85.
- **Duration:** asserts frames = durationSeconds × 30.

`npm run check --gallery` renders every block in `BlockGallery` at its maximum content, at 9:16 and 4:5, and fails if a block needs `FitStage` to scale below 0.85 or if any text is under 40 px (footnotes excepted).

## 6. Research (`trend-researcher` agent + `trend-research` skill)

Inputs: field, talent profile (country, locale), today's date, optional seed topic.
Sources: web search (news, seasonal dates and holidays in the next 30 days, viral topics in the niche); with Chrome, TikTok Creative Center trending hashtags for the country, Google Trends rising queries, and a quick look at top search results for candidate hashtags.
Output (`research.md`): 3–5 angles, each with a hook line, why it's timely, a suggested 3-step frame, the facts needed (with sources to verify), and links to every page actually opened. Facts used on screen must cite a source page that was actually opened; medical and veterinary figures are flagged for the talent to confirm.

## 7. Clip sync (`caption-sync`)

1. **Probe:** duration, dimensions, rotation, fps, audio present, leading silence. Rejects files without audio. If the talking exceeds the duration, report the overrun in seconds and offer: trim leading silence (automatic), cut a marked pause, or re-record. Never extend.
2. **Transcribe:** whisper.cpp `large-v3-turbo`, language from the locale, token-level timestamps, converted with `@remotion/install-whisper-cpp`'s `toCaptions` → `captions.raw.json`.
3. **Align:** normalize words (lowercase, strip accents and punctuation, numerals ↔ words in the locale). Global sequence alignment (Needleman–Wunsch) of script words vs transcript words.
   - Match → script spelling, transcript timing.
   - Substitution with similarity ≥ 0.6 (normalized Levenshtein) or a known homophone → script word, transcript timing, logged as `corrected`.
   - Other substitution → transcript word kept, logged as `check`.
   - Insertion (ad-lib) → kept, logged as `ad-lib`.
   - Deletion (script word not spoken) → logged as `missing`; if a whole sentence is missing, warn that the on-screen visuals may no longer match.
4. **Re-fit:** each scene start = the first aligned word of that scene's script line minus 3 frames, clamped and validated (strictly increasing, last scene ≥ 1 s). `trimStartFrames` = leading silence minus 6 frames if > 0.3 s.
5. **Review:** a table of every logged change, plus the scene starts before and after; the user approves or edits words and times. Then write `captions.json`, set `captionsSrc`, open Studio.

## 8. Export (`social-export`)

| Output | Composition | Settings |
|---|---|---|
| `<slug>-9x16.mp4` | `Episode` | 1080×1920, H.264, CRF 18, AAC 192 kbps, yuv420p |
| `<slug>-whatsapp.mp4` | `Episode` | 9:16. Video bitrate = (15.5 MB × 8 / duration) − 96 kbps audio, capped at 6 Mbps; if under 2.5 Mbps, render at 720×1280 (scale 2/3) |
| `<slug>-4x5.mp4` | `Episode45` | 1080×1350, same encoding as the master |
| `cover-9x16.png` | `Cover` | `coverFrame`; headline must sit inside the centre 1080×1440 crop (checked) |
| `cover-4x5.png` | `Cover45` | same frame |
| `<slug>.srt` | — | from `captions.json`, pages as shown on screen |

Post-render verification reads each file back (mediabunny) and reports size, duration, resolution and codec; any miss is an error.

## 9. Error handling

- `doctor.mjs` failures are blocking only for Node, npm and disk space. A missing Chrome extension is a warning (research degrades). A failed whisper install blocks `/reelkit:clip` only.
- Invalid `episode.json` → Claude repairs it before preview; the user never sees a validation-broken render.
- Whisper failure → captions fall back to evenly spread script timing (phase 1), and the episode is marked `captions: provisional`.
- Commands read `stage` and refuse out-of-order steps with the next valid command (e.g. `export` before `clip` warns that captions are provisional; proceeding needs confirmation).
- All file paths are workspace-relative; no user-specific absolute paths in the plugin.

## 10. Testing

- **Vitest unit tests** (template and scripts): alignment cases (match, near-miss, ad-lib, missing sentence, numerals), scene-time scaling, `resolveSceneStarts`, caption pagination and fit, WhatsApp bitrate math, `episode.json` schema with valid and invalid fixtures.
- **Reference episodes:** `examples/dani-chocolate` (rebuilt from blocks; visual parity with the hand-built version at frames 0, 170, 280, 400, 500, 740, 899, judged by eye) and `examples/engineering-sample` (a different field, different 3-step frame, 45 s, built only from the new explainer blocks: `Definition`, `Process`, `Gauge`, `Versus`, `Decision`).
- `npm run check` on both reference episodes, and `npm run check --gallery` on all 20 blocks.
- Schema tests reject content over each block's limits (e.g. a 6-step `Process`).
- **GitHub Actions** on push: install, typecheck, lint, Vitest, `npm run check` and `npm run check --gallery` (headless Chrome via Remotion), and plugin manifest validation.

## 11. Out of scope (v1)

Posting to platforms, writing post copy or hashtag captions, music selection or licensing, more than one talent on screen, landscape 16:9 exports, cloud rendering.

## 12. Open items for the implementation plan

- Exact whisper.cpp version and model download URL pinned by `@remotion/install-whisper-cpp` at implementation time.
- Confirm the current WhatsApp size limit when implementing (the 15.5 MB target is configurable in `export.mjs`).
- Migration path for the existing `my-video` Dani project (keep it as is; the reference episode lives in the template).
