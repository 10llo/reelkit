# reelkit Plan 3 — Pipeline Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the workspace a `reelkit` command-line tool that validates episodes, prints the talent's timed script, shows status, syncs the talent's recording (local Whisper transcription → script alignment → caption correction → scene re-timing, with a review step), and exports every social format — plus zero-dependency setup scripts that check the machine and create/update a workspace.

**Architecture:** Pipeline code lives in `template/scripts/` so it ships inside every workspace and shares its `node_modules`. It is TypeScript run with `tsx`, which lets it import the template's own schemas, timing and caption code instead of duplicating them. Logic is in small pure modules under `scripts/lib/` (unit-tested with Vitest); commands under `scripts/commands/` wire them to files, Whisper and Remotion and take their side effects as injectable dependencies so they can be tested with stubs. Setup scripts that must run before a workspace exists (`doctor.mjs`, `init-workspace.mjs`) live at the plugin root `scripts/`, use only Node built-ins, and are tested with `node --test`.

**Tech Stack:** Node ≥ 20, tsx 4.23.15, Remotion 4.0.532 (`@remotion/bundler`, `@remotion/renderer`), `@remotion/whisper-webgpu` 4.0.532 + `@huggingface/transformers` 4.2.0 + `mediabunny` 1.56.1 + `@mediabunny/server` 1.61.3, zod 4.5.4, Vitest 3.2.4.

**Spec:** `docs/superpowers/specs/2026-10-05-reelkit-design.md` — §3 (packaging, workspace), §4 (`/reelkit:clip`, `/reelkit:export`, `/reelkit:status`, timeline script format), §7 (clip sync), §8 (export), §9 (error handling). Plans 1–2 are merged on `main`.

**Decision carried into this plan (spike, 2026-10-05):** transcription uses `@remotion/whisper-webgpu` (Remotion's current recommendation; runs Whisper locally on the GPU from Node, nothing to compile) instead of building whisper.cpp — this machine has no `cmake`, and the user's choice was "local Whisper", which this keeps. A spike on this Mac (Apple M4) transcribed a Spanish clip with word timestamps using the `small` model in 56 s including the download; the output (`"¡Mira esto!"`, `"Cuando"`, `"Entren"` for `"Mira esto."`, `"¿Cuándo"`, `"Entre"`) is used below as alignment test data. Default model `large-v3-turbo` (1.6 GB, multilingual); `small` (586 MB) is the light option. Models are cached once per machine in `~/.cache/reelkit/whisper` (Transformers.js `env.cacheDir`, overridable with `REELKIT_WHISPER_CACHE`; verified that `isWhisperModelCached` honours it), not inside each workspace.

**Deferred (ruled here, against spec §7):** the "cut a marked pause" remedy for an overrun is not built; the options are automatic leading-silence trim, re-recording, or `--accept-overrun`. "Known homophones" are covered by the 0.6 similarity rule only. Opening Studio after apply is left to the Plan 4 command (`sync apply` prints the command).

## Global Constraints

- Exact pins: `@remotion/*` and `remotion` `4.0.532`; `zod` `4.5.4`; `mediabunny` `1.56.1`; new: `tsx` `4.23.15`, `@remotion/whisper-webgpu` `4.0.532`, `@huggingface/transformers` `4.2.0`, `@mediabunny/server` `1.61.3`.
- The video is always exactly `durationSeconds × 30` frames; a recording is never allowed to extend it.
- Nothing is applied to an episode without a review step: `sync prepare` only writes proposal files; `sync apply` changes `episode.json`.
- `episode.json` is rewritten from the author's raw JSON (not the defaults-expanded parse), then re-validated before saving.
- Captions use the script's spelling (accents, ¿ ¡, numbers as written) with Whisper's timing; ad-libs are kept; every correction is reported.
- Spanish user-facing text in generated files (script sheet, sync report); code, logs and errors in English.
- Plugin-root scripts (`reelkit/scripts/*.mjs`) use only Node built-ins.
- Every commit message ends with a blank line and `Co-Authored-By: Claude <model> <noreply@anthropic.com>` naming the model that wrote it.

## Review Focus

1. **A recording longer than the video** (talking past 30 s, or a long silence before the first word): leading silence is trimmed automatically first; if the *voice* still runs past the end, the overrun is reported in seconds and `sync apply` refuses without `--accept-overrun`. A silent tail after the last word is simply cut, and the report says so. Pinned in Task 8 (`trimFromLeadingSilence`, `speechOverrunSeconds`, `clipOverrunSeconds`) and Task 10 (apply refuses; report wording).
2. **Whisper mishearing, numbers, ad-libs and skipped lines**: captions must show the script's words where they match or nearly match, keep ad-libs, flag low-similarity substitutions and missing words, and warn when a whole scene was not spoken. Pinned in Tasks 6–7 with the spike's real output.
3. **A scene whose first words weren't found** (or re-fitted starts that break the minimum scene length): must keep a safe timing with a readable warning instead of crashing or producing a broken timeline. Pinned in Task 8.
4. **Transcription unavailable** (no WebGPU, model download blocked, decoder failure): the clip must still be attached and captions stay script-timed (provisional), clearly reported. Pinned in Task 9 (every Whisper failure becomes `TranscriptionUnavailable`) and Task 10 (a failing stub transcriber; apply keeps script timing).
5. **Exports that silently miss a target** (wrong size, duration, codec, WhatsApp file over the limit): every output is read back and checked; any miss fails the command. Pinned in Task 11 (`checkVideo` / `checkImage` tests; the command exits 1 on any problem).

---

## File Structure

```
reelkit/
  scripts/                          (plugin root — Node built-ins only)
    doctor.mjs                      machine checks with fix messages
    init-workspace.mjs              create / update a workspace from template/
    tests/doctor.test.mjs  init-workspace.test.mjs   (node --test)
  template/
    package.json                    + tsx, whisper deps; scripts "reelkit", "studio"
    scripts/
      reelkit.ts                    CLI dispatcher: validate | script | status | sync | export | whisper
      lib/
        args.ts                     argv parsing
        episode-files.ts            load / validate / save episode folders
        script-sheet.ts             timed script markdown for the talent
        status.ts                   episode list + next step
        audio.ts                    decode any media to 16 kHz mono Float32Array
        probe.ts                    clip metadata + speech bounds
        normalize.ts                word normalization + Spanish numbers
        align.ts                    script ↔ transcript alignment → captions + report
        refit.ts                    trim, scene re-fit, overrun, caption shift
        transcribe.ts               Whisper (WebGPU) wrapper
        sync-report.ts              sync-report.md writer
        srt.ts                      captions → SRT
        bitrate.ts                  WhatsApp encoding settings
        verify-output.ts            read back and check exported files
      commands/
        validate.ts  script.ts  status.ts  sync.ts  export.ts  whisper.ts
    src/blocks/parts/CountUpText.tsx    reserves the final width of counting numbers
    tests/scripts/*.test.ts         unit tests for scripts/lib and commands
    tests/fixtures/clip-maker/      Remotion entry that turns a WAV into a test clip (e2e only)
```

---

### Task 1: `reelkit` CLI foundation and `validate`

**Files:**
- Create: `template/scripts/reelkit.ts`, `template/scripts/lib/args.ts`, `template/scripts/lib/episode-files.ts`, `template/scripts/commands/validate.ts`
- Modify: `template/package.json` (tsx; scripts `reelkit`, `studio`), `template/tsconfig.json` (include `scripts`)
- Test: `template/tests/scripts/paths.ts` (helper), `template/tests/scripts/args.test.ts`, `template/tests/scripts/episode-files.test.ts`

**Interfaces:**
- Produces:
  - `parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string | true> }` — `--a=b` → `{a:"b"}`, `--x` → `{x:true}`.
  - `readJson(file)`, `writeJson(file, value)` (2-space JSON + trailing newline).
  - `loadEpisodeDir(dir): { dir; episodeFile; raw: Record<string, unknown>; episode: Episode; talent: Talent }` — validates episode, talent and colors; throws `EpisodeError` / `Error` with the episode folder in the message when files are missing.
  - `saveEpisodeRaw(loaded, patch: Record<string, unknown>): Episode` — shallow-merges `patch` into `raw`, validates the result, writes `episode.json`, returns the parsed episode.
  - CLI: `npm run reelkit -- <command> [...]`; each command module exports `run(args: Args): Promise<number>` (exit code). Unknown command → usage, exit 2.
  - `npm run studio -- episodes/<slug>` opens Studio on an episode.
  - `reelkit validate <episodeDir>` → `✓ <slug>: <n> s, talent <id>` or the validation message; exit 1 on error.

- [ ] **Step 1: Install tsx and wire scripts**

Run: `cd template && npm install --save-dev --save-exact tsx@4.23.15`
In `template/package.json` scripts add:
```json
"reelkit": "tsx scripts/reelkit.ts",
"studio": "remotion studio --public-dir"
```
In `template/tsconfig.json` change `"include": ["src"]` to `"include": ["src", "scripts"]`.

- [ ] **Step 2: Write the failing tests**

`template/tests/scripts/paths.ts` (the package is ESM, so tests don't rely on `__dirname`):
```ts
import { fileURLToPath } from "node:url";

/** Absolute path of `template/`, with a trailing separator. */
export const TEMPLATE_ROOT = fileURLToPath(new URL("../../", import.meta.url));
```

`template/tests/scripts/args.test.ts`:
```ts
import { expect, it } from "vitest";
import { parseArgs } from "../../scripts/lib/args";

it("splits positionals and flags", () => {
  expect(parseArgs(["sync", "prepare", "episodes/a", "--model=small", "--yes", "clip.mp4"])).toEqual({
    positional: ["sync", "prepare", "episodes/a", "clip.mp4"],
    flags: { model: "small", yes: true },
  });
});
it("keeps = inside flag values", () => {
  expect(parseArgs(["--title=a=b"]).flags.title).toBe("a=b");
});
```

`template/tests/scripts/episode-files.test.ts`:
```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEpisodeDir, readJson, saveEpisodeRaw } from "../../scripts/lib/episode-files";
import { TEMPLATE_ROOT } from "./paths";

const examples = path.join(TEMPLATE_ROOT, "examples");
let tmp: string;
const copyExample = (name: string) => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-ep-"));
  fs.cpSync(path.join(examples, name), tmp, { recursive: true });
  return tmp;
};
afterEach(() => tmp && fs.rmSync(tmp, { recursive: true, force: true }));

describe("loadEpisodeDir", () => {
  it("loads and validates an example", () => {
    const loaded = loadEpisodeDir(copyExample("dani-chocolate"));
    expect(loaded.episode.slug).toBe("2026-10-chocolate");
    expect(loaded.talent.id).toBe("dani");
    expect(loaded.raw.slug).toBe("2026-10-chocolate");
  });
  it("names the folder when episode.json is missing", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-ep-"));
    expect(() => loadEpisodeDir(tmp)).toThrow(/No episode\.json in .*reelkit-ep-/);
  });
  it("reports a bad colour token with its path", () => {
    const dir = copyExample("dani-chocolate");
    const raw = readJson(path.join(dir, "episode.json"));
    raw.scenes.hook.beats[0].props.hero.color = "chocoMilks";
    fs.writeFileSync(path.join(dir, "episode.json"), JSON.stringify(raw));
    expect(() => loadEpisodeDir(dir)).toThrow(/scenes\.hook\.beats\[0\]\.props\.hero\.color/);
  });
});

describe("saveEpisodeRaw", () => {
  it("merges into the raw JSON (no defaults written) and validates", () => {
    const loaded = loadEpisodeDir(copyExample("smoke"));
    const episode = saveEpisodeRaw(loaded, { stage: "synced", captionsSrc: "captions.json" });
    expect(episode.stage).toBe("synced");
    const written = readJson(path.join(tmp, "episode.json"));
    expect(written.captionsSrc).toBe("captions.json");
    expect(written.facts).toBeUndefined(); // default not materialised
  });
  it("refuses to save an invalid patch", () => {
    const loaded = loadEpisodeDir(copyExample("smoke"));
    expect(() => saveEpisodeRaw(loaded, { durationSeconds: 90 })).toThrow(/durationSeconds/);
  });
});
```
(`examples/smoke/episode.json` has no `facts` key; keep it that way.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/scripts`
Expected: FAIL — cannot resolve `../../scripts/lib/args` / `episode-files`.

- [ ] **Step 4: Implement**

`template/scripts/lib/args.ts`:
```ts
export type Args = { positional: string[]; flags: Record<string, string | true> };

export const parseArgs = (argv: string[]): Args => {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const [key, ...rest] = arg.slice(2).split("=");
      flags[key] = rest.length ? rest.join("=") : true;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
};

export const flagString = (args: Args, name: string, fallback: string): string => {
  const value = args.flags[name];
  return typeof value === "string" ? value : fallback;
};
```

`template/scripts/lib/episode-files.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import type { Episode } from "../../src/episode/schema";
import type { Talent } from "../../src/episode/talent";
import { validateColors, validateEpisode, validateTalent } from "../../src/episode/validate";

export const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));

export const writeJson = (file: string, value: unknown) =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

export type LoadedEpisode = {
  dir: string;
  episodeFile: string;
  raw: Record<string, unknown>;
  episode: Episode;
  talent: Talent;
};

export const loadEpisodeDir = (dir: string): LoadedEpisode => {
  const episodeFile = path.join(dir, "episode.json");
  const talentFile = path.join(dir, "talent.json");
  if (!fs.existsSync(episodeFile)) {
    throw new Error(`No episode.json in ${dir}`);
  }
  if (!fs.existsSync(talentFile)) {
    throw new Error(`No talent.json in ${dir} (each episode keeps a snapshot of its talent profile)`);
  }
  const raw = readJson(episodeFile);
  const episode = validateEpisode(raw);
  const talent = validateTalent(readJson(talentFile));
  validateColors(episode, talent);
  return { dir, episodeFile, raw, episode, talent };
};

/** Merges `patch` into the author's raw JSON, validates, and saves. */
export const saveEpisodeRaw = (loaded: LoadedEpisode, patch: Record<string, unknown>): Episode => {
  const next = { ...loaded.raw, ...patch };
  const episode = validateEpisode(next);
  validateColors(episode, loaded.talent);
  writeJson(loaded.episodeFile, next);
  loaded.raw = next;
  loaded.episode = episode;
  return episode;
};
```

`template/scripts/commands/validate.ts`:
```ts
import type { Args } from "../lib/args";
import { loadEpisodeDir } from "../lib/episode-files";

export const run = async (args: Args): Promise<number> => {
  const dir = args.positional[0];
  if (!dir) {
    console.error("Usage: reelkit validate <episodeDir>");
    return 2;
  }
  try {
    const { episode, talent } = loadEpisodeDir(dir);
    console.log(`✓ ${episode.slug}: ${episode.durationSeconds} s, talent ${talent.id}`);
    return 0;
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    return 1;
  }
};
```

`template/scripts/reelkit.ts`:
```ts
import { parseArgs, type Args } from "./lib/args";

type Command = { run: (args: Args) => Promise<number> };

const COMMANDS: Record<string, () => Promise<Command>> = {
  validate: () => import("./commands/validate"),
};

const USAGE = `Usage: npm run reelkit -- <command> [...]
Commands: ${Object.keys(COMMANDS).join(", ")}`;

const main = async () => {
  const [name, ...rest] = process.argv.slice(2);
  const load = name ? COMMANDS[name] : undefined;
  if (!load) {
    console.error(USAGE);
    return 2;
  }
  const command = await load();
  return command.run(parseArgs(rest));
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(err instanceof Error ? err.stack : String(err));
    process.exitCode = 1;
  },
);
```
Later tasks add entries to `COMMANDS` (one line each: `script`, `status`, `sync`, `export`, `whisper`).

- [ ] **Step 5: Run tests, lint and the command**

Run:
```bash
cd template
npx vitest run && npm run lint
npm run reelkit -- validate examples/dani-chocolate
npm run reelkit -- validate examples/nope; echo "exit=$?"
npm run reelkit -- bogus; echo "exit=$?"
```
Expected: tests PASS; lint exit 0 (now also type-checks `scripts/`); `✓ 2026-10-chocolate: 30 s, talent dani`; `✗ No episode.json in examples/nope` with exit 1; usage with exit 2.

- [ ] **Step 6: Commit**

```bash
git add template/package.json template/package-lock.json template/tsconfig.json template/scripts template/tests/scripts
git commit -m "feat(cli): reelkit command-line tool with validate"
```

---

### Task 2: Counting numbers reserve their final width; cover crop invariant

**Files:**
- Create: `template/src/blocks/parts/CountUpText.tsx`
- Modify: `template/src/blocks/BigStat.tsx`, `template/src/blocks/Proportion.tsx`, `template/src/blocks/parts/QuantityBars.tsx`, `template/src/blocks/Gauge.tsx`
- Test: `template/tests/layout.test.ts`

**Interfaces:**
- Produces: `<CountUpText current={node} final={node} align?="left"|"center"|"right" />` — an `inline-grid` that stacks an invisible copy of `final` under `current`, so the element is always as wide as the final value. FitStage measures each scene once (at mount, which happens up to 30 frames early because of premounting), so a number that grows from "0" to "100" must not change the layout after that measurement.

- [ ] **Step 1: Write the failing test (cover crop)**

Append to `template/tests/layout.test.ts`:
```ts
it("keeps the 9:16 stage inside the centre 3:4 crop used by the profile grid", () => {
  const l = LAYOUTS["9x16"];
  const cropTop = (l.canvas.height - (l.canvas.width * 4) / 3) / 2; // 1080×1440 centred → 240
  expect(l.stage.y).toBeGreaterThanOrEqual(cropTop);
  expect(l.stage.y + l.stage.height).toBeLessThanOrEqual(cropTop + (l.canvas.width * 4) / 3);
});
```

- [ ] **Step 2: Run it**

Run: `cd template && npx vitest run tests/layout.test.ts`
Expected: PASS (stage y 320–940 is inside 240–1680). This pins the spec's "cover headline inside the 3:4 crop" rule so a later layout change can't break it. (It passes immediately because the layout already satisfies it; there is no implementation step for it.)

- [ ] **Step 3: Implement CountUpText and use it**

`template/src/blocks/parts/CountUpText.tsx`:
```tsx
/**
 * Shows `current` while reserving the width of `final`, so a counting number never
 * changes the layout after FitStage has measured the scene.
 */
export const CountUpText: React.FC<{
  readonly current: React.ReactNode;
  readonly final: React.ReactNode;
  readonly align?: "left" | "center" | "right";
}> = ({ current, final, align = "center" }) => (
  <span style={{ display: "inline-grid" }}>
    <span aria-hidden style={{ gridArea: "1 / 1", visibility: "hidden" }}>
      {final}
    </span>
    <span
      style={{
        gridArea: "1 / 1",
        justifySelf: align === "left" ? "start" : align === "right" ? "end" : "center",
      }}
    >
      {current}
    </span>
  </span>
);
```
Replace each counting expression with `CountUpText` (import from `./parts/CountUpText` or `./CountUpText` inside `parts/`):
- `BigStat.tsx`: `{format.format(props.value * count)}` → `<CountUpText current={format.format(props.value * count)} final={format.format(props.value)} />`
- `Proportion.tsx`: the 140 px numerator `{format.format(Math.round(props.numerator * fill))}` → `<CountUpText current={format.format(Math.round(props.numerator * fill))} final={format.format(props.numerator)} align="right" />`
- `parts/QuantityBars.tsx`: `{format.format(shown)}` → `<CountUpText current={format.format(shown)} final={format.format(row.value)} align="left" />`
- `Gauge.tsx`: the value `{format.format(shown)}` → `<CountUpText current={format.format(shown)} final={format.format(props.value)} />`

(Absolutely positioned counters — ClockRing's centre, the Proportion donut percentage, Trend's value label — don't affect layout and stay as they are.)

- [ ] **Step 4: Verify**

Run:
```bash
cd template
npx vitest run && npm run lint && npm run check && npm run check:gallery
npx remotion still BlockPreview /tmp/prop-100.png --public-dir examples/smoke --frame=209 \
  --props='{"layoutName":"9x16","block":"Proportion","props":{"numerator":100,"denominator":100,"label":"de los perros vacunados a tiempo"},"title":null,"durationInFrames":210,"talent":null}'
```
Expected: all PASS; open `/tmp/prop-100.png` with Read: "100 de cada 100" on one line, nothing overlapping.

- [ ] **Step 5: Commit**

```bash
git add template/src/blocks template/tests/layout.test.ts
git commit -m "fix(blocks): counting numbers reserve their final width; pin the cover crop"
```

---

### Task 3: Timed script sheet for the talent (`reelkit script`)

**Files:**
- Create: `template/scripts/lib/script-sheet.ts`, `template/scripts/commands/script.ts`
- Modify: `template/scripts/reelkit.ts` (add `script`)
- Test: `template/tests/scripts/script-sheet.test.ts`

**Interfaces:**
- Produces: `WORDS_PER_SECOND = 2.4`; `cell(text)` (escaped Markdown table cell); `sceneNames(episode): string[]` (`Gancho`, the step labels capitalized, `Cierre`); `buildScriptSheet(episode: Episode, talent: Talent): string` (Markdown, Spanish); `reelkit script <episodeDir>` writes `<episodeDir>/script.md` and prints its path. Format (spec §4): title, word count vs target and a warning if the text is too long for the duration, a table `# · Escena · Tiempo · Qué dices · Indicación` (pause before each question), a recording checklist (plus `talent.recordingNotes`), and the facts to confirm.

- [ ] **Step 1: Write the failing test**

`template/tests/scripts/script-sheet.test.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { validateEpisode, validateTalent } from "../../src/episode/validate";
import { buildScriptSheet } from "../../scripts/lib/script-sheet";
import { TEMPLATE_ROOT } from "./paths";

const load = (name: string) => {
  const dir = path.join(TEMPLATE_ROOT, "examples", name);
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  return { episode: validateEpisode(read("episode.json")), talent: validateTalent(read("talent.json")) };
};

it("builds Dani's chocolate sheet", () => {
  const { episode, talent } = load("dani-chocolate");
  const md = buildScriptSheet(episode, talent);
  expect(md).toContain("# Guion — Dogtora Dani");
  expect(md).toContain("**71 palabras · 30 s**");
  expect(md).toContain("| 1 | Gancho | 0,0–3,0 s | ¿Tu perro se comió un chocolate? Mira esto. | — |");
  expect(md).toContain("| 2 | Cuándo | 3,0–10,0 s | ¿Cuándo preocuparte?");
  expect(md).toContain("Pausa breve antes de empezar");
  expect(md).toContain("Una sola toma de menos de 30 segundos");
  expect(md).toContain("| Signos leves desde ≈ 20 mg/kg de metilxantinas |");
  expect(md).not.toMatch(/dueño/i);
});

it("warns when the text is too long for the duration", () => {
  const { episode, talent } = load("dani-chocolate");
  const long = { ...episode, durationSeconds: 15 };
  expect(buildScriptSheet(long, talent)).toContain("⚠");
});

it("escapes pipes in script lines", () => {
  const { episode, talent } = load("dani-chocolate");
  const piped = { ...episode, script: ["a | b", ...episode.script.slice(1)] };
  expect(buildScriptSheet(piped, talent)).toContain("a \\| b");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd template && npx vitest run tests/scripts/script-sheet.test.ts`
Expected: FAIL — cannot resolve `../../scripts/lib/script-sheet`.

- [ ] **Step 3: Implement**

`template/scripts/lib/script-sheet.ts`:
```ts
import type { Episode } from "../../src/episode/schema";
import type { Talent } from "../../src/episode/talent";
import { FPS, resolveSceneStarts, sceneDurations, totalFrames } from "../../src/frame/timing";

export const WORDS_PER_SECOND = 2.4;

const secs = (frames: number) => (frames / FPS).toFixed(1).replace(".", ",");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** A Markdown table cell: pipes escaped, one line. */
export const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Gancho · the three step labels (capitalized) · Cierre. */
export const sceneNames = (episode: Episode): string[] => ["Gancho", ...episode.frame.steps.map(capitalize), "Cierre"];

export const buildScriptSheet = (episode: Episode, talent: Talent): string => {
  const total = totalFrames(episode.durationSeconds);
  const { starts } = resolveSceneStarts(episode.sceneStarts, total);
  const durations = sceneDurations(starts, total);
  const names = sceneNames(episode);
  const words = episode.script.reduce((sum, line) => sum + line.trim().split(/\s+/).filter(Boolean).length, 0);
  const speakingSeconds = Math.round(words / WORDS_PER_SECOND);

  const lines: string[] = [];
  lines.push(`# Guion — ${talent.displayName}`, "");
  lines.push(`**${words} palabras · ${episode.durationSeconds} s** (≈ ${speakingSeconds} s a ritmo tranquilo)`, "");
  if (speakingSeconds > episode.durationSeconds) {
    lines.push(`> ⚠ El texto es largo para ${episode.durationSeconds} s: acórtalo o graba con ritmo ágil.`, "");
  }
  lines.push("Una sola toma. Haz una pausa breve antes de cada pregunta: ahí se corta cada escena.", "");
  lines.push("| # | Escena | Tiempo | Qué dices | Indicación |", "| --- | --- | --- | --- | --- |");
  episode.script.forEach((line, i) => {
    const from = secs(starts[i]);
    const to = secs(starts[i] + durations[i]);
    const direction = i > 0 && line.trim().startsWith("¿") ? "Pausa breve antes de empezar" : "—";
    lines.push(`| ${i + 1} | ${names[i]} | ${from}–${to} s | ${cell(line.trim())} | ${direction} |`);
  });
  lines.push("", "## Cómo grabar", "");
  lines.push(
    "- [ ] Celular en vertical, a la altura de los ojos",
    "- [ ] Encuadre de pecho hacia arriba, con los ojos en el tercio superior",
    "- [ ] Mirando al lente; cabeza y hombros al centro, manos fuera del cuadro",
    "- [ ] Lugar silencioso: tu voz es el único audio del video",
    `- [ ] Una sola toma de menos de ${episode.durationSeconds} segundos`,
  );
  if (talent.recordingNotes.trim()) {
    lines.push(`- [ ] ${talent.recordingNotes.trim()}`);
  }
  if (episode.facts.length) {
    lines.push("", "## Para confirmar antes de publicar", "", "| Dato en pantalla | Fuente |", "| --- | --- |");
    for (const fact of episode.facts) {
      lines.push(`| ${cell(fact.claim)} | ${cell(fact.source)} |`);
    }
  }
  return `${lines.join("\n")}\n`;
};
```

`template/scripts/commands/script.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import type { Args } from "../lib/args";
import { loadEpisodeDir } from "../lib/episode-files";
import { buildScriptSheet } from "../lib/script-sheet";

export const run = async (args: Args): Promise<number> => {
  const dir = args.positional[0];
  if (!dir) {
    console.error("Usage: reelkit script <episodeDir>");
    return 2;
  }
  const { episode, talent } = loadEpisodeDir(dir);
  const out = path.join(dir, "script.md");
  fs.writeFileSync(out, buildScriptSheet(episode, talent));
  console.log(`✓ Wrote ${out}`);
  return 0;
};
```
Add `script: () => import("./commands/script"),` to `COMMANDS` in `scripts/reelkit.ts`.

- [ ] **Step 4: Run tests and the command**

Run: `cd template && npx vitest run tests/scripts && npm run lint && npm run reelkit -- script examples/dani-fiebre && cat examples/dani-fiebre/script.md; rm -f examples/dani-fiebre/script.md`
Expected: tests PASS; the printed sheet shows 5 rows with times from 0,0 to 45,0 s, the checklist, and the four facts. (The generated `script.md` is removed afterwards — examples don't ship one.)

- [ ] **Step 5: Commit**

```bash
git add template/scripts template/tests/scripts
git commit -m "feat(cli): reelkit script writes the talent's timed script"
```

---

### Task 4: Episode status (`reelkit status`)

**Files:**
- Create: `template/scripts/lib/status.ts`, `template/scripts/commands/status.ts`
- Modify: `template/scripts/reelkit.ts` (add `status`)
- Test: `template/tests/scripts/status.test.ts`

**Interfaces:**
- Produces: `NEXT_STEP: Record<Stage, string>`; `listEpisodes(root: string): EpisodeStatus[]` where `EpisodeStatus = { folder: string; slug?: string; stage?: Stage; durationSeconds?: number; hasClip: boolean; captions: "synced" | "provisional"; next: string; error?: string }` (sorted by folder; invalid episodes appear with `error`); `formatStatus(list): string`; `reelkit status [root=episodes]`.

- [ ] **Step 1: Write the failing test**

`template/tests/scripts/status.test.ts`:
```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { formatStatus, listEpisodes } from "../../scripts/lib/status";
import { TEMPLATE_ROOT } from "./paths";

const examples = path.join(TEMPLATE_ROOT, "examples");
let tmp: string;
afterEach(() => tmp && fs.rmSync(tmp, { recursive: true, force: true }));

it("lists every episode with its stage and next step", () => {
  const list = listEpisodes(examples);
  expect(list.map((e) => e.folder)).toEqual(["dani-chocolate", "dani-fiebre", "smoke"]);
  const dani = list[0];
  expect(dani).toMatchObject({ slug: "2026-10-chocolate", stage: "built", hasClip: false, captions: "provisional" });
  expect(dani.next).toContain("/reelkit:clip");
});

it("reports a broken episode instead of failing", () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-status-"));
  fs.mkdirSync(path.join(tmp, "broken"));
  fs.writeFileSync(path.join(tmp, "broken", "episode.json"), "{}");
  fs.writeFileSync(path.join(tmp, "broken", "talent.json"), "{}");
  const [broken] = listEpisodes(tmp);
  expect(broken.error).toMatch(/schemaVersion|talent/);
  expect(formatStatus([broken])).toContain("✗ broken");
});

it("returns an empty list for a missing folder", () => {
  expect(listEpisodes(path.join(os.tmpdir(), "does-not-exist-reelkit"))).toEqual([]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd template && npx vitest run tests/scripts/status.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`template/scripts/lib/status.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import type { STAGES } from "../../src/episode/schema";
import { loadEpisodeDir } from "./episode-files";

type Stage = (typeof STAGES)[number];

export const NEXT_STEP: Record<Stage, string> = {
  researched: "Write the script: continue /reelkit:new",
  scripted: "Build the video: continue /reelkit:new",
  built: "Record the talent, then: /reelkit:clip <video>",
  synced: "Export: /reelkit:export",
  exported: "Ready to publish",
};

export type EpisodeStatus = {
  folder: string;
  slug?: string;
  stage?: Stage;
  durationSeconds?: number;
  hasClip: boolean;
  captions: "synced" | "provisional";
  next: string;
  error?: string;
};

export const listEpisodes = (root: string): EpisodeStatus[] => {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root)
    .filter((name) => fs.existsSync(path.join(root, name, "episode.json")))
    .sort()
    .map((folder) => {
      try {
        const { episode } = loadEpisodeDir(path.join(root, folder));
        return {
          folder,
          slug: episode.slug,
          stage: episode.stage,
          durationSeconds: episode.durationSeconds,
          hasClip: episode.clip.src !== "",
          captions: episode.captionsSrc ? "synced" : "provisional",
          next: NEXT_STEP[episode.stage],
        };
      } catch (err) {
        return { folder, hasClip: false, captions: "provisional", next: "Fix the episode files", error: (err as Error).message };
      }
    });
};

export const formatStatus = (list: EpisodeStatus[]): string => {
  if (!list.length) {
    return "No episodes yet.";
  }
  return list
    .map((e) =>
      e.error
        ? `✗ ${e.folder}: ${e.error.split("\n")[0]}`
        : `• ${e.folder} — ${e.stage}, ${e.durationSeconds} s, clip: ${e.hasClip ? "yes" : "no"}, captions: ${e.captions}\n  next: ${e.next}`,
    )
    .join("\n");
};
```

`template/scripts/commands/status.ts`:
```ts
import type { Args } from "../lib/args";
import { formatStatus, listEpisodes } from "../lib/status";

export const run = async (args: Args): Promise<number> => {
  console.log(formatStatus(listEpisodes(args.positional[0] ?? "episodes")));
  return 0;
};
```
Add `status: () => import("./commands/status"),` to `COMMANDS`.

- [ ] **Step 4: Run tests and the command**

Run: `cd template && npx vitest run tests/scripts && npm run lint && npm run reelkit -- status examples`
Expected: tests PASS; three bullet entries, each "built … captions: provisional … next: Record the talent, then: /reelkit:clip <video>".

- [ ] **Step 5: Commit**

```bash
git add template/scripts template/tests/scripts
git commit -m "feat(cli): reelkit status lists episodes and their next step"
```

---

### Task 5: Decode audio and probe clips

**Files:**
- Create: `template/scripts/lib/audio.ts`, `template/scripts/lib/probe.ts`, `template/tests/scripts/wav.ts` (test helper)
- Modify: `template/package.json` (devDependency `@mediabunny/server`)
- Test: `template/tests/scripts/audio.test.ts`

**Interfaces:**
- Produces:
  - `SAMPLE_RATE = 16000` (what Whisper expects).
  - `openMedia(file): Input` (registers the `@mediabunny/server` decoders once — Node has no WebCodecs).
  - `decodeMono16k(file): Promise<Float32Array>` — any audio/video file → 16 kHz mono samples. Throws `"<file> has no audio track"`.
  - `ClipInfo = { durationSeconds: number; width: number; height: number; rotation: number; fps: number | null; hasVideo: boolean; hasAudio: boolean; videoCodec: string | null; audioCodec: string | null }`; `probeMedia(file): Promise<ClipInfo>` (width/height are display dimensions, after rotation).
  - `speechBounds(wave, sampleRate = SAMPLE_RATE): { startSeconds: number; endSeconds: number } | null` — first and last 20 ms window louder than `max(0.003, 10 % of the loudest window)`; `null` for silence.
  - Test helper `tests/scripts/wav.ts`: `tone(seconds, rate, amp?)`, `silence(seconds, rate)`, `concat(...parts)`, `writeWav(file, mono, rate, channels?)` (16-bit PCM).

- [ ] **Step 1: Install the decoder package**

Run: `cd template && npm install --save-dev --save-exact @mediabunny/server@1.61.3`

- [ ] **Step 2: Write the failing tests**

`template/tests/scripts/wav.ts`:
```ts
import fs from "node:fs";

export const tone = (seconds: number, rate: number, amp = 0.3, hz = 440) =>
  Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));

export const silence = (seconds: number, rate: number) => new Float32Array(Math.round(seconds * rate));

export const concat = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

/** 16-bit PCM WAV; every channel gets the same samples. */
export const writeWav = (file: string, mono: Float32Array, rate: number, channels = 1) => {
  const dataSize = mono.length * channels * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * channels * 2, 28);
  buf.writeUInt16LE(channels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  let offset = 44;
  for (const v of mono) {
    for (let c = 0; c < channels; c++) {
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), offset);
      offset += 2;
    }
  }
  fs.writeFileSync(file, buf);
};
```

`template/tests/scripts/audio.test.ts`:
```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decodeMono16k, SAMPLE_RATE } from "../../scripts/lib/audio";
import { probeMedia, speechBounds } from "../../scripts/lib/probe";
import { concat, silence, tone, writeWav } from "./wav";

describe("speechBounds", () => {
  it("finds the loud part", () => {
    const wave = concat(silence(0.5, SAMPLE_RATE), tone(1, SAMPLE_RATE), silence(0.5, SAMPLE_RATE));
    const bounds = speechBounds(wave)!;
    expect(bounds.startSeconds).toBeCloseTo(0.5, 1);
    expect(bounds.endSeconds).toBeCloseTo(1.5, 1);
  });
  it("ignores a low noise floor", () => {
    const noise = Float32Array.from({ length: SAMPLE_RATE }, () => (Math.random() - 0.5) * 0.002);
    const bounds = speechBounds(concat(noise, tone(1, SAMPLE_RATE), noise))!;
    expect(bounds.startSeconds).toBeCloseTo(1, 1);
    expect(bounds.endSeconds).toBeCloseTo(2, 1);
  });
  it("returns null for silence", () => {
    expect(speechBounds(silence(1, SAMPLE_RATE))).toBeNull();
  });
});

describe("decodeMono16k and probeMedia", () => {
  let dir: string;
  let wav: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-audio-"));
    wav = path.join(dir, "stereo44k.wav");
    writeWav(wav, concat(silence(0.5, 44100), tone(1, 44100), silence(0.5, 44100)), 44100, 2);
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("resamples a 44.1 kHz stereo WAV to 16 kHz mono", async () => {
    const wave = await decodeMono16k(wav);
    expect(Math.abs(wave.length - 2 * SAMPLE_RATE)).toBeLessThan(SAMPLE_RATE * 0.01);
    const bounds = speechBounds(wave)!;
    expect(bounds.startSeconds).toBeCloseTo(0.5, 1);
    expect(bounds.endSeconds).toBeCloseTo(1.5, 1);
  });

  it("describes an audio-only file", async () => {
    const info = await probeMedia(wav);
    expect(info).toMatchObject({ hasAudio: true, hasVideo: false, width: 0, height: 0, fps: null, videoCodec: null });
    expect(info.durationSeconds).toBeCloseTo(2, 2);
  });

  it("rejects a file that isn't media", async () => {
    const bogus = path.join(dir, "notes.txt");
    fs.writeFileSync(bogus, "hola");
    await expect(probeMedia(bogus)).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/scripts/audio.test.ts`
Expected: FAIL — cannot resolve `../../scripts/lib/audio`.

- [ ] **Step 4: Implement**

`template/scripts/lib/audio.ts` (the decode loop is the Whisper spike's, which ran on this machine):
```ts
import { registerMediabunnyServer } from "@mediabunny/server";
import { ALL_FORMATS, Conversion, FilePathSource, Input, NullTarget, Output, WavOutputFormat } from "mediabunny";

/** Whisper's input rate (WHISPER_WEBGPU_SAMPLE_RATE). */
export const SAMPLE_RATE = 16_000;

let decodersRegistered = false;

/** Node has no WebCodecs; @mediabunny/server supplies the decoders (AAC, Opus, H.264, …). */
export const openMedia = (file: string): Input => {
  if (!decodersRegistered) {
    registerMediabunnyServer();
    decodersRegistered = true;
  }
  return new Input({ formats: ALL_FORMATS, source: new FilePathSource(file) });
};

export const decodeMono16k = async (file: string): Promise<Float32Array> => {
  const input = openMedia(file);
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) {
      throw new Error(`${file} has no audio track`);
    }
    const chunks: { start: number; data: Float32Array }[] = [];
    const conversion = await Conversion.init({
      input,
      output: new Output({ format: new WavOutputFormat(), target: new NullTarget() }),
      video: { discard: true },
      audio: (t) =>
        t.id !== track.id
          ? { discard: true }
          : {
              codec: "pcm-f32",
              forceTranscode: true,
              numberOfChannels: 1,
              sampleFormat: "f32",
              sampleRate: SAMPLE_RATE,
              process: (sample) => {
                const data = new Float32Array(sample.allocationSize({ format: "f32", planeIndex: 0 }) / 4);
                sample.copyTo(data, { format: "f32", planeIndex: 0 });
                chunks.push({ start: Math.round(sample.timestamp * SAMPLE_RATE), data });
                return sample;
              },
            },
    });
    await conversion.execute();
    const length = chunks.reduce((max, c) => Math.max(max, c.start + c.data.length), 0);
    const wave = new Float32Array(Math.max(0, length));
    for (const { start, data } of chunks) {
      // Encoder priming can give the first chunk a slightly negative timestamp.
      wave.set(start < 0 ? data.subarray(-start) : data, Math.max(0, start));
    }
    return wave;
  } finally {
    input.dispose();
  }
};
```

`template/scripts/lib/probe.ts`:
```ts
import { openMedia, SAMPLE_RATE } from "./audio";

export type ClipInfo = {
  durationSeconds: number;
  width: number;
  height: number;
  rotation: number;
  fps: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
};

export const probeMedia = async (file: string): Promise<ClipInfo> => {
  const input = openMedia(file);
  try {
    const video = await input.getPrimaryVideoTrack();
    const audio = await input.getPrimaryAudioTrack();
    if (!video && !audio) {
      throw new Error(`${file} has no audio or video track`);
    }
    const stats = video ? await video.computePacketStats(100) : null;
    return {
      durationSeconds: await input.computeDuration(),
      width: video?.displayWidth ?? 0,
      height: video?.displayHeight ?? 0,
      rotation: video?.rotation ?? 0,
      fps: stats ? Math.round(stats.averagePacketRate * 100) / 100 : null,
      hasVideo: video !== null,
      hasAudio: audio !== null,
      videoCodec: video?.codec ?? null,
      audioCodec: audio?.codec ?? null,
    };
  } finally {
    input.dispose();
  }
};

const WINDOW_SECONDS = 0.02;
const FLOOR = 0.003;
const RELATIVE = 0.1;

/** First and last 20 ms window louder than 10 % of the loudest one (and above a noise floor). */
export const speechBounds = (
  wave: Float32Array,
  sampleRate = SAMPLE_RATE,
): { startSeconds: number; endSeconds: number } | null => {
  const size = Math.round(sampleRate * WINDOW_SECONDS);
  const rms: number[] = [];
  for (let i = 0; i + size <= wave.length; i += size) {
    let sum = 0;
    for (let j = i; j < i + size; j++) {
      sum += wave[j] * wave[j];
    }
    rms.push(Math.sqrt(sum / size));
  }
  const peak = rms.reduce((max, v) => Math.max(max, v), 0);
  const threshold = Math.max(FLOOR, peak * RELATIVE);
  const first = rms.findIndex((v) => v >= threshold);
  if (peak < FLOOR || first < 0) {
    return null;
  }
  let last = rms.length - 1;
  while (rms[last] < threshold) {
    last--;
  }
  return { startSeconds: (first * size) / sampleRate, endSeconds: ((last + 1) * size) / sampleRate };
};
```

- [ ] **Step 5: Run tests and lint**

Run: `cd template && npx vitest run tests/scripts && npm run lint`
Expected: PASS. If `decodeMono16k` returns a length that is off by a whole chunk, print `chunks.map(c => [c.start, c.data.length])` — chunk timestamps must be in seconds (mediabunny `AudioSample.timestamp`).

- [ ] **Step 6: Commit**

```bash
git add template/package.json template/package-lock.json template/scripts/lib template/tests/scripts
git commit -m "feat(cli): decode clip audio to 16 kHz mono and probe clips"
```

---

### Task 6: Word normalization and Spanish numbers

**Files:**
- Create: `template/scripts/lib/normalize.ts`
- Test: `template/tests/scripts/normalize.test.ts`

**Interfaces:**
- Produces:
  - `normalizeWord(word): string` — strips accents (NFD), punctuation and case; maps aliases (`un`/`una` → `uno`, `veintiun`/`veintiuna` → `veintiuno`, `-ientas` → `-ientos`, `punto` → `con`, `kg`/`kilogramos` → `kilos`, `g` → `gramos`, `mg` → `miligramos`). `""` for a word with no letters or digits.
  - `spanishNumberWords(n): string[]` — integers 0–999 999, accented spelling (`["veintidós"]`, `["treinta", "y", "uno"]`, `["cien"]`, `["ciento", "uno"]`, `["dos", "mil", "veintiséis"]`). RangeError outside.
  - `expandToken(token): string[]` — one script or transcript token → normalized comparison keys. Numbers become their words (`"12"` → `["doce"]`; `"39,2"` / `"39.2"` → `["treinta","y","nueve","con","dos"]`; `"5%"` → `["cinco","por","ciento"]`; `"6-12"` → `["seis","a","doce"]`; `"1.000"` → `["mil"]`); other tokens → `[normalizeWord(token)]`, or `[]` when empty.

- [ ] **Step 1: Write the failing test**

`template/tests/scripts/normalize.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { expandToken, normalizeWord, spanishNumberWords } from "../../scripts/lib/normalize";

describe("normalizeWord", () => {
  it.each([
    ["¡Mira", "mira"],
    ["tóxico!", "toxico"],
    ["¿Cuándo", "cuando"],
    ["Doce", "doce"],
    ["UNA", "uno"],
    ["un", "uno"],
    ["doscientas", "doscientos"],
    ["kg", "kilos"],
    ["niño", "nino"],
    ["—", ""],
  ])("%s → %s", (input, expected) => {
    expect(normalizeWord(input)).toBe(expected);
  });
});

describe("spanishNumberWords", () => {
  it.each([
    [0, ["cero"]],
    [7, ["siete"]],
    [12, ["doce"]],
    [16, ["dieciséis"]],
    [22, ["veintidós"]],
    [30, ["treinta"]],
    [31, ["treinta", "y", "uno"]],
    [45, ["cuarenta", "y", "cinco"]],
    [100, ["cien"]],
    [101, ["ciento", "uno"]],
    [222, ["doscientos", "veintidós"]],
    [500, ["quinientos"]],
    [1000, ["mil"]],
    [2026, ["dos", "mil", "veintiséis"]],
    [15500, ["quince", "mil", "quinientos"]],
  ])("%d", (n, expected) => {
    expect(spanishNumberWords(n)).toEqual(expected);
  });
  it("rejects what it can't say", () => {
    expect(() => spanishNumberWords(1_000_000)).toThrow(RangeError);
    expect(() => spanishNumberWords(2.5)).toThrow(RangeError);
  });
});

describe("expandToken", () => {
  it.each([
    ["12", ["doce"]],
    ["12.", ["doce"]],
    ["31,", ["treinta", "y", "uno"]],
    ["39,2", ["treinta", "y", "nueve", "con", "dos"]],
    ["39.2", ["treinta", "y", "nueve", "con", "dos"]],
    ["0,5", ["cero", "con", "cinco"]],
    ["5%", ["cinco", "por", "ciento"]],
    ["6-12", ["seis", "a", "doce"]],
    ["1.000", ["mil"]],
    ["veintidós", ["veintidos"]],
    ["¿Cuándo", ["cuando"]],
    ["—", []],
  ])("%s", (token, expected) => {
    expect(expandToken(token)).toEqual(expected);
  });
  it("gives a spoken number and its digits the same keys", () => {
    const spoken = "treinta y uno".split(" ").flatMap(expandToken);
    expect(spoken).toEqual(expandToken("31"));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd template && npx vitest run tests/scripts/normalize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`template/scripts/lib/normalize.ts`:
```ts
const UNITS = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
  "veintiocho", "veintinueve",
];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

const ALIASES: Record<string, string> = {
  un: "uno",
  una: "uno",
  veintiun: "veintiuno",
  veintiuna: "veintiuno",
  punto: "con",
  kg: "kilos",
  kilogramos: "kilos",
  g: "gramos",
  mg: "miligramos",
};

export const normalizeWord = (word: string): string => {
  const plain = word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return ALIASES[plain] ?? plain.replace(/ientas$/, "ientos");
};

const below100 = (n: number): string[] => {
  if (n < 30) {
    return [UNITS[n]];
  }
  const tens = TENS[Math.floor(n / 10)];
  return n % 10 === 0 ? [tens] : [tens, "y", UNITS[n % 10]];
};

const below1000 = (n: number): string[] => {
  if (n === 100) {
    return ["cien"];
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [...(hundreds ? [HUNDREDS[hundreds]] : []), ...(rest || !hundreds ? below100(rest) : [])];
};

export const spanishNumberWords = (n: number): string[] => {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) {
    throw new RangeError(`Can't spell ${n} in Spanish (0–999 999 only)`);
  }
  if (n < 1000) {
    return below1000(n);
  }
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  return [...(thousands === 1 ? [] : below1000(thousands)), "mil", ...(rest ? below1000(rest) : [])];
};

// 12 · 1.000 · 39,2 · 39.2 · 5% — thousands use dots in groups of three.
const NUMBER = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d+))?(%?)$/;
const RANGE = /^(\d+)[-–](\d+)$/;
const EDGE_PUNCTUATION = /^[¿¡"'«“(\[]+|[?!"'»”)\].,;:…]+$/g;

const decimalWords = (digits: string): string[] =>
  digits.startsWith("0") ? [...digits].flatMap((d) => spanishNumberWords(Number(d))) : spanishNumberWords(Number(digits));

export const expandToken = (token: string): string[] => {
  const t = token.trim().replace(EDGE_PUNCTUATION, "");
  const range = t.match(RANGE);
  if (range) {
    return [...expandToken(range[1]), "a", ...expandToken(range[2])];
  }
  const number = t.match(NUMBER);
  if (number) {
    const whole = Number(number[1].replace(/\./g, ""));
    if (whole <= 999_999) {
      const words = spanishNumberWords(whole);
      if (number[2]) {
        words.push("con", ...decimalWords(number[2]));
      }
      if (number[3]) {
        words.push("por", "ciento");
      }
      return words.map(normalizeWord);
    }
  }
  const word = normalizeWord(t);
  return word ? [word] : [];
};
```

- [ ] **Step 4: Run tests**

Run: `cd template && npx vitest run tests/scripts/normalize.test.ts && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add template/scripts/lib/normalize.ts template/tests/scripts/normalize.test.ts
git commit -m "feat(sync): word normalization with Spanish number spelling"
```

---

### Task 7: Align the transcript to the script

**Files:**
- Create: `template/scripts/lib/align.ts`
- Test: `template/tests/scripts/align.test.ts`

**Interfaces:**
- Consumes: `expandToken` (Task 6); `Caption` from `@remotion/captions` (`{ text, startMs, endMs, timestampMs, confidence, pageBreakAfter? }`).
- Produces:
  - `TranscriptWord = { text: string; startMs: number; endMs: number }` (clip time).
  - `WordStatus = "match" | "corrected" | "check" | "missing"`.
  - `AlignedWord = { text: string; scene: number; status: WordStatus; heard: string; startMs: number | null; endMs: number | null }`.
  - `AdLib = TranscriptWord & { scene: number }`.
  - `Alignment = { words: AlignedWord[]; adLibs: AdLib[]; sceneFirstWordMs: (number | null)[]; captions: Caption[]; warnings: string[] }`.
  - `alignTranscript(script: string[], transcript: TranscriptWord[]): Alignment` — captions are in **clip** time (Task 8 shifts them).
  - `similarity(a, b)`, `alignTokens(a: string[], b: string[]): [number, number][]` (−1 = gap).

Rules (spec §7): the script's spelling with Whisper's timing. Needleman–Wunsch over normalized keys (match +2; substitution +1 when similarity ≥ 0.6, else −1; gap −1). A script word is **match** when all its keys match exactly, **corrected** when some match or nearly match (the caption shows the script word), **check** when only far substitutions were found (the caption shows what was heard, as spec §7 says, and the report asks for review), **missing** when nothing was heard. A transcript word aligned to nothing is an **ad-lib**: it stays in the captions with Whisper's text and belongs to the scene of the last script word before it. Missing words are left out of the captions. The last caption of each scene gets `pageBreakAfter`. A number spoken as one transcript token ("31") spreads its time evenly across the script words it covers ("treinta y uno").

- [ ] **Step 1: Write the failing test**

`template/tests/scripts/align.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { alignTranscript, alignTokens, similarity, type TranscriptWord } from "../../scripts/lib/align";

const words = (rows: [string, number, number][]): TranscriptWord[] =>
  rows.map(([text, startMs, endMs]) => ({ text, startMs, endMs }));

// Real output of whisper-webgpu "small" on a synthesized Spanish voice (Plan 3 spike).
const SPIKE = words([
  ["¿Tu", 120, 300], [" perro", 300, 540], [" se", 540, 720], [" comió", 720, 960], [" un", 960, 1180],
  [" chocolate?", 1180, 1920], [" ¡Mira", 2060, 2440], [" esto!", 2440, 2880], [" ¡Cuando", 2960, 3540],
  [" preocuparte!", 3540, 4000], [" ¡Entren", 4560, 4860], [" más", 4860, 5020], [" oscuro,", 5020, 5600],
  [" más", 5740, 5900], [" tóxico!", 5900, 6000],
]);
const SPIKE_SCRIPT = ["¿Tu perro se comió un chocolate? Mira esto.", "¿Cuándo preocuparte? Entre más oscuro, más tóxico."];

describe("alignTranscript on the spike output", () => {
  const result = alignTranscript(SPIKE_SCRIPT, SPIKE);

  it("keeps the script's spelling with Whisper's timing", () => {
    expect(result.captions).toHaveLength(15);
    expect(result.captions[0]).toMatchObject({ text: "¿Tu", startMs: 120, endMs: 300 });
    expect(result.captions[8]).toMatchObject({ text: " ¿Cuándo", startMs: 2960 });
    expect(result.captions[10]).toMatchObject({ text: " Entre", startMs: 4560, endMs: 4860 });
  });
  it("classifies each word", () => {
    const entre = result.words.find((w) => w.text === "Entre")!;
    expect(entre).toMatchObject({ status: "corrected", heard: "¡Entren", scene: 1 });
    expect(result.words.filter((w) => w.status === "match")).toHaveLength(14);
    expect(result.adLibs).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
  it("finds each scene's first word and breaks pages at scene ends", () => {
    expect(result.sceneFirstWordMs).toEqual([120, 2960]);
    expect(result.captions[7].pageBreakAfter).toBe(true);
    expect(result.captions[14].pageBreakAfter).toBe(true);
    expect(result.captions[6].pageBreakAfter).toBeUndefined();
  });
});

describe("alignTranscript edge cases", () => {
  it("matches digits to spelled-out numbers", () => {
    const r = alignTranscript(
      ["Puede tardar hasta doce horas."],
      words([["Puede", 0, 200], ["tardar", 200, 400], ["hasta", 400, 600], ["12", 600, 900], ["horas.", 900, 1200]]),
    );
    expect(r.words.every((w) => w.status === "match")).toBe(true);
    expect(r.captions[3]).toMatchObject({ text: " doce", startMs: 600, endMs: 900 });
  });
  it("spreads one spoken number over the script words it covers", () => {
    const r = alignTranscript(["antes del treinta y uno."], words([["antes", 0, 400], ["del", 400, 1000], ["31.", 1000, 1600]]));
    expect(r.captions.map((c) => [c.text.trim(), c.startMs, c.endMs])).toEqual([
      ["antes", 0, 400], ["del", 400, 1000], ["treinta", 1000, 1200], ["y", 1200, 1400], ["uno.", 1400, 1600],
    ]);
  });
  it("flags a far substitution for review", () => {
    const r = alignTranscript(["Signos de metilxantinas hoy"], words([["Signos", 0, 300], ["de", 300, 400], ["metal", 400, 900], ["hoy", 900, 1200]]));
    expect(r.words[2]).toMatchObject({ text: "metilxantinas", status: "check", heard: "metal", startMs: 400 });
    expect(r.captions[2].text).toBe(" metal");
  });
  it("keeps ad-libs with Whisper's text", () => {
    const r = alignTranscript(["Hola a todos."], words([["Bueno,", 0, 300], ["hola", 400, 600], ["a", 600, 700], ["todos.", 700, 1000]]));
    expect(r.adLibs).toEqual([{ text: "Bueno,", startMs: 0, endMs: 300, scene: 0 }]);
    expect(r.captions.map((c) => c.text.trim())).toEqual(["Bueno,", "Hola", "a", "todos."]);
  });
  it("warns about a scene that wasn't spoken and leaves its words out", () => {
    const r = alignTranscript(
      ["Hola a todos.", "Esto no se dijo.", "Chao."],
      words([["Hola", 0, 300], ["a", 300, 400], ["todos.", 400, 800], ["Chao.", 1500, 1900]]),
    );
    expect(r.words.filter((w) => w.scene === 1).every((w) => w.status === "missing")).toBe(true);
    expect(r.sceneFirstWordMs).toEqual([0, null, 1500]);
    expect(r.captions.map((c) => c.text.trim())).toEqual(["Hola", "a", "todos.", "Chao."]);
    expect(r.warnings.join("\n")).toContain("Escena 2");
  });
  it("warns when the clip barely matches the script", () => {
    const r = alignTranscript(["Uno dos tres cuatro cinco"], words([["perro", 0, 300], ["gato", 300, 600]]));
    expect(r.warnings.join("\n")).toMatch(/¿Es el clip correcto\?/);
  });
  it("handles an empty transcript", () => {
    const r = alignTranscript(["Hola."], []);
    expect(r.captions).toEqual([]);
    expect(r.words[0].status).toBe("missing");
    expect(r.warnings.join("\n")).toContain("No se escuchó voz");
  });
});

describe("helpers", () => {
  it("similarity", () => {
    expect(similarity("entre", "entren")).toBeCloseTo(5 / 6);
    expect(similarity("perro", "perro")).toBe(1);
  });
  it("alignTokens marks gaps with -1", () => {
    expect(alignTokens(["a", "b", "c"], ["a", "c"])).toEqual([[0, 0], [1, -1], [2, 1]]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd template && npx vitest run tests/scripts/align.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`template/scripts/lib/align.ts`:
```ts
import type { Caption } from "@remotion/captions";
import { expandToken } from "./normalize";

export type TranscriptWord = { text: string; startMs: number; endMs: number };
export type WordStatus = "match" | "corrected" | "check" | "missing";
export type AlignedWord = {
  text: string;
  scene: number;
  status: WordStatus;
  heard: string;
  startMs: number | null;
  endMs: number | null;
};
export type AdLib = TranscriptWord & { scene: number };
export type Alignment = {
  words: AlignedWord[];
  adLibs: AdLib[];
  sceneFirstWordMs: (number | null)[];
  captions: Caption[];
  warnings: string[];
};

const MATCH = 2;
const NEAR = 1;
const MISMATCH = -1;
const GAP = -1;
export const NEAR_SIMILARITY = 0.6;
const LOW_AGREEMENT = 0.6;

const levenshtein = (a: string, b: string): number => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
};

export const similarity = (a: string, b: string): number =>
  a === b ? 1 : 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

const pairScore = (a: string, b: string) => (a === b ? MATCH : similarity(a, b) >= NEAR_SIMILARITY ? NEAR : MISMATCH);

/** Needleman–Wunsch global alignment; -1 marks a gap. Ties prefer diagonal, then a gap in `b`. */
export const alignTokens = (a: string[], b: string[]): [number, number][] => {
  const score = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j * GAP : j === 0 ? i * GAP : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      score[i][j] = Math.max(
        score[i - 1][j - 1] + pairScore(a[i - 1], b[j - 1]),
        score[i - 1][j] + GAP,
        score[i][j - 1] + GAP,
      );
    }
  }
  const pairs: [number, number][] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && score[i][j] === score[i - 1][j - 1] + pairScore(a[i - 1], b[j - 1])) {
      pairs.push([--i, --j]);
    } else if (i > 0 && score[i][j] === score[i - 1][j] + GAP) {
      pairs.push([--i, -1]);
    } else {
      pairs.push([-1, --j]);
    }
  }
  return pairs.reverse();
};

type Token = { key: string; word: number; startMs: number; endMs: number };
type Found = { scores: number[]; heard: Set<number>; startMs: number | null; endMs: number | null };

const statusOf = (scores: number[]): WordStatus => {
  if (scores.every((s) => s === 0)) {
    return "missing";
  }
  if (scores.every((s) => s === MATCH)) {
    return "match";
  }
  return scores.some((s) => s === MATCH || s === NEAR) ? "corrected" : "check";
};

export const alignTranscript = (script: string[], transcript: TranscriptWord[]): Alignment => {
  const scriptWords = script.flatMap((line, scene) =>
    line
      .split(/\s+/)
      .filter((text) => expandToken(text).length > 0)
      .map((text) => ({ text, scene })),
  );
  const a: Token[] = scriptWords.flatMap((w, word) =>
    expandToken(w.text).map((key) => ({ key, word, startMs: 0, endMs: 0 })),
  );
  const b: Token[] = transcript.flatMap((w, word) => {
    const keys = expandToken(w.text);
    const step = (w.endMs - w.startMs) / Math.max(1, keys.length);
    return keys.map((key, k) => ({ key, word, startMs: w.startMs + k * step, endMs: w.startMs + (k + 1) * step }));
  });

  const found: Found[] = scriptWords.map(() => ({ scores: [], heard: new Set(), startMs: null, endMs: null }));
  const heardUsed = new Set<number>();
  const adLibScene = new Map<number, number>();
  let scene = 0;
  for (const [i, j] of alignTokens(
    a.map((t) => t.key),
    b.map((t) => t.key),
  )) {
    if (i < 0) {
      if (!adLibScene.has(b[j].word)) {
        adLibScene.set(b[j].word, scene);
      }
      continue;
    }
    const f = found[a[i].word];
    scene = scriptWords[a[i].word].scene;
    if (j < 0) {
      f.scores.push(0);
      continue;
    }
    f.scores.push(pairScore(a[i].key, b[j].key));
    f.heard.add(b[j].word);
    heardUsed.add(b[j].word);
    f.startMs = Math.min(f.startMs ?? Infinity, b[j].startMs);
    f.endMs = Math.max(f.endMs ?? -Infinity, b[j].endMs);
  }

  const words: AlignedWord[] = scriptWords.map((w, k) => ({
    text: w.text,
    scene: w.scene,
    status: statusOf(found[k].scores),
    heard: [...found[k].heard]
      .sort((x, y) => x - y)
      .map((h) => transcript[h].text.trim())
      .join(" "),
    startMs: found[k].startMs === null ? null : Math.round(found[k].startMs!),
    endMs: found[k].endMs === null ? null : Math.round(found[k].endMs!),
  }));
  const adLibs: AdLib[] = transcript.flatMap((w, k) =>
    heardUsed.has(k) || !expandToken(w.text).length
      ? []
      : [{ text: w.text.trim(), startMs: w.startMs, endMs: w.endMs, scene: adLibScene.get(k) ?? 0 }],
  );

  const sceneFirstWordMs = script.map((_, s) => words.find((w) => w.scene === s && w.startMs !== null)?.startMs ?? null);

  const entries = [
    ...words.flatMap((w) =>
      w.startMs === null
        ? []
        : [{ text: w.status === "check" ? w.heard : w.text, scene: w.scene, startMs: w.startMs, endMs: w.endMs! }],
    ),
    ...adLibs.map((w) => ({ text: w.text, scene: w.scene, startMs: w.startMs, endMs: w.endMs })),
  ].sort((x, y) => x.startMs - y.startMs);
  const lastOfScene = new Map(entries.map((e, k) => [e.scene, k]));
  const breaks = new Set(lastOfScene.values());
  const captions: Caption[] = entries.map((e, k) => ({
    text: k === 0 ? e.text : ` ${e.text}`,
    startMs: e.startMs,
    endMs: e.endMs,
    timestampMs: e.startMs,
    confidence: null,
    ...(breaks.has(k) ? { pageBreakAfter: true } : {}),
  }));

  const warnings: string[] = [];
  if (!transcript.length) {
    warnings.push("No se escuchó voz en el clip.");
  }
  script.forEach((_, s) => {
    const sceneWords = words.filter((w) => w.scene === s);
    if (transcript.length && sceneWords.length && sceneWords.every((w) => w.status === "missing")) {
      warnings.push(`Escena ${s + 1}: no se escuchó ninguna palabra del guion; lo que se ve en pantalla puede no coincidir con lo que se dice.`);
    }
  });
  const agreed = words.filter((w) => w.status === "match" || w.status === "corrected").length;
  if (transcript.length && words.length && agreed / words.length < LOW_AGREEMENT) {
    warnings.push(
      `Solo ${Math.round((agreed / words.length) * 100)} % de las palabras del guion coinciden con lo que se escuchó. ¿Es el clip correcto?`,
    );
  }
  return { words, adLibs, sceneFirstWordMs, captions, warnings };
};
```

- [ ] **Step 4: Run tests**

Run: `cd template && npx vitest run tests/scripts/align.test.ts && npm run lint`
Expected: PASS. If the ad-lib test aligns "Bueno" against "Hola", check the tie-break order in `alignTokens` (diagonal first, then a gap in `b`, then a gap in `a`) and that `pairScore("bueno", "hola")` is −1.

- [ ] **Step 5: Commit**

```bash
git add template/scripts/lib/align.ts template/tests/scripts/align.test.ts
git commit -m "feat(sync): align the transcript to the script (script spelling, Whisper timing)"
```

---

### Task 8: Trim, scene re-fit, overrun and caption shift

**Files:**
- Create: `template/scripts/lib/refit.ts`
- Test: `template/tests/scripts/refit.test.ts`

**Interfaces:**
- Consumes: `FPS`, `MIN_SCENE_FRAMES`, `defaultSceneStarts`, `resolveSceneStarts` from `src/frame/timing.ts`.
- Produces:
  - `trimFromLeadingSilence(firstSpeechMs: number | null): number` — frames to skip at the clip start: 0 when speech starts within 0.3 s, else `round(first × 30) − 6` (keeps 0.2 s of lead-in).
  - `refitSceneStarts(sceneFirstWordMs: (number | null)[], trimFrames: number, total: number): { starts: number[]; warnings: string[] }` — scene *i* ≥ 1 starts 3 frames before its first word (video time); a scene whose first word wasn't found keeps its default start with a warning; starts that break `resolveSceneStarts` (each scene ≥ 30 frames) fall back to all defaults with a warning.
  - `speechOverrunSeconds(lastSpeechMs: number | null, trimFrames, durationSeconds): number` — how long the voice runs past the video's end (≥ 0, 2 decimals). This is what `sync apply` refuses.
  - `clipOverrunSeconds(clipSeconds, trimFrames, durationSeconds): number` — how long the clip runs past the end (informational: a silent tail is just cut).
  - `shiftCaptions(captions: Caption[], trimFrames, total): Caption[]` — clip time → video time; drops captions that end before 0 or start at/after the end, clamps the rest.

- [ ] **Step 1: Write the failing test**

`template/tests/scripts/refit.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { defaultSceneStarts } from "../../src/frame/timing";
import {
  clipOverrunSeconds,
  refitSceneStarts,
  shiftCaptions,
  speechOverrunSeconds,
  trimFromLeadingSilence,
} from "../../scripts/lib/refit";

describe("trimFromLeadingSilence", () => {
  it.each([
    [null, 0],
    [150, 0],
    [300, 0],
    [1000, 24],
    [2500, 69],
  ])("first speech at %s ms → %d frames", (ms, frames) => {
    expect(trimFromLeadingSilence(ms)).toBe(frames);
  });
});

describe("refitSceneStarts", () => {
  it("cuts each scene 3 frames before its first word", () => {
    const { starts, warnings } = refitSceneStarts([1000, 4000, 11000, 18000, 26500], 24, 900);
    expect(starts).toEqual([0, 93, 303, 513, 768]);
    expect(warnings).toEqual([]);
  });
  it("keeps the default start for a scene whose first word wasn't found", () => {
    const { starts, warnings } = refitSceneStarts([1000, 4000, null, 18000, 26500], 24, 900);
    expect(starts).toEqual([0, 93, defaultSceneStarts(900)[2], 513, 768]);
    expect(warnings.join("\n")).toContain("Escena 3");
  });
  it("falls back to all defaults when scenes would be shorter than a second", () => {
    const { starts, warnings } = refitSceneStarts([1000, 1500, 1600, 18000, 26500], 24, 900);
    expect(starts).toEqual(defaultSceneStarts(900));
    expect(warnings.join("\n")).toContain("cortes por defecto");
  });
});

describe("overruns", () => {
  it("measures voice past the end in video time", () => {
    expect(speechOverrunSeconds(31500, 24, 30)).toBe(0.7);
    expect(speechOverrunSeconds(30500, 24, 30)).toBe(0);
    expect(speechOverrunSeconds(null, 0, 30)).toBe(0);
  });
  it("measures the clip past the end", () => {
    expect(clipOverrunSeconds(32, 30, 30)).toBe(1);
    expect(clipOverrunSeconds(29, 0, 30)).toBe(0);
  });
});

describe("shiftCaptions", () => {
  const cap = (text: string, startMs: number, endMs: number) => ({ text, startMs, endMs, timestampMs: startMs, confidence: null });
  it("moves captions into video time and drops the ones outside it", () => {
    const shifted = shiftCaptions(
      [cap("antes", 500, 900), cap("hola", 1200, 1500), { ...cap("fin", 30800, 31600), pageBreakAfter: true }, cap("tarde", 31500, 31800)],
      30,
      900,
    );
    expect(shifted).toEqual([
      { text: "hola", startMs: 200, endMs: 500, timestampMs: 200, confidence: null },
      { text: "fin", startMs: 29800, endMs: 30000, timestampMs: 29800, confidence: null, pageBreakAfter: true },
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd template && npx vitest run tests/scripts/refit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`template/scripts/lib/refit.ts`:
```ts
import type { Caption } from "@remotion/captions";
import { defaultSceneStarts, FPS, MIN_SCENE_FRAMES, resolveSceneStarts } from "../../src/frame/timing";

/** Frames of lead-in kept before the first word (0.2 s). */
export const LEAD_IN_FRAMES = 6;
/** Frames between a scene cut and that scene's first word (0.1 s). */
export const SCENE_LEAD_FRAMES = 3;
const TRIM_THRESHOLD_MS = 300;

const round2 = (n: number) => Math.round(n * 100) / 100;
const seconds = (frames: number) => (frames / FPS).toFixed(1).replace(".", ",");

export const trimFromLeadingSilence = (firstSpeechMs: number | null): number => {
  if (firstSpeechMs === null || firstSpeechMs <= TRIM_THRESHOLD_MS) {
    return 0;
  }
  return Math.max(0, Math.round((firstSpeechMs / 1000) * FPS) - LEAD_IN_FRAMES);
};

export const refitSceneStarts = (
  sceneFirstWordMs: (number | null)[],
  trimFrames: number,
  total: number,
): { starts: number[]; warnings: string[] } => {
  const defaults = defaultSceneStarts(total);
  const warnings: string[] = [];
  const proposed = sceneFirstWordMs.map((ms, i) => {
    if (i === 0) {
      return 0;
    }
    if (ms === null) {
      warnings.push(`Escena ${i + 1}: no encontré sus primeras palabras; uso el corte por defecto (${seconds(defaults[i])} s).`);
      return defaults[i];
    }
    return Math.round((ms / 1000) * FPS) - trimFrames - SCENE_LEAD_FRAMES;
  });
  const { starts, warning } = resolveSceneStarts(proposed, total);
  if (warning) {
    warnings.push(
      `Los cortes medidos (${proposed.map(seconds).join(" · ")} s) dejan alguna escena con menos de ${MIN_SCENE_FRAMES / FPS} s; uso los cortes por defecto.`,
    );
  }
  return { starts, warnings };
};

export const speechOverrunSeconds = (lastSpeechMs: number | null, trimFrames: number, durationSeconds: number) =>
  lastSpeechMs === null ? 0 : Math.max(0, round2(lastSpeechMs / 1000 - trimFrames / FPS - durationSeconds));

export const clipOverrunSeconds = (clipSeconds: number, trimFrames: number, durationSeconds: number) =>
  Math.max(0, round2(clipSeconds - trimFrames / FPS - durationSeconds));

export const shiftCaptions = (captions: Caption[], trimFrames: number, total: number): Caption[] => {
  const offset = (trimFrames / FPS) * 1000;
  const end = (total / FPS) * 1000;
  return captions.flatMap((c) => {
    const startMs = Math.round(c.startMs - offset);
    const endMs = Math.round(c.endMs - offset);
    if (endMs <= 0 || startMs >= end) {
      return [];
    }
    const clampedStart = Math.max(0, startMs);
    return [{ ...c, startMs: clampedStart, endMs: Math.min(end, endMs), timestampMs: clampedStart }];
  });
};
```

- [ ] **Step 4: Run tests**

Run: `cd template && npx vitest run tests/scripts/refit.test.ts && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add template/scripts/lib/refit.ts template/tests/scripts/refit.test.ts
git commit -m "feat(sync): trim leading silence, re-fit scene cuts, measure overrun"
```

---

### Task 9: Whisper wrapper and `reelkit whisper`

**Files:**
- Create: `template/scripts/lib/transcribe.ts`, `template/scripts/commands/whisper.ts`
- Modify: `template/package.json` (devDependencies `@remotion/whisper-webgpu`, `@huggingface/transformers`), `template/scripts/reelkit.ts` (add `whisper`)
- Test: `template/tests/scripts/transcribe.test.ts`

**Interfaces:**
- Consumes: `TranscriptWord` (Task 7).
- Produces:
  - `MODELS = ["tiny", "base", "small", "medium", "large-v3-turbo"]` (multilingual only), `type Model`, `isModel(v)`, `DEFAULT_MODEL = "large-v3-turbo"`, `MODEL_SIZES_MB` (120 / 206 / 586 / 1699 / 1609).
  - `whisperLanguage(locale): string` — `"es-CO"` → `"spanish"` (also en, pt, fr, it, de); throws for others.
  - `whisperCacheDir()` — `$REELKIT_WHISPER_CACHE` or `~/.cache/reelkit/whisper`. Every Whisper call first sets Transformers.js `env.cacheDir` to it, so a model is downloaded once per machine, not once per workspace (verified: `isWhisperModelCached` honours `env.cacheDir`).
  - `class TranscriptionUnavailable extends Error`.
  - `type Transcriber = (wave: Float32Array, options: { model: Model; language: string }) => Promise<TranscriptWord[]>`; `transcribeWithWhisper: Transcriber` — throws `TranscriptionUnavailable` for: Whisper failing to load, no WebGPU, download or inference errors. Words are trimmed and empty ones dropped; times in whole ms.
  - `whisperStatus(model): Promise<{ webgpu: string | null; cached: boolean; cacheDir: string }>` (`webgpu` is `null` when supported, else the reason).
  - `downloadModel(model, onProgress?: (fraction: number) => void)`.
  - CLI: `reelkit whisper check [--model=…]` (exit 1 when WebGPU is unavailable) and `reelkit whisper download [--model=…]`.

- [ ] **Step 1: Install**

Run: `cd template && npm install --save-dev --save-exact @remotion/whisper-webgpu@4.0.532 @huggingface/transformers@4.2.0`

- [ ] **Step 2: Write the failing test**

`template/tests/scripts/transcribe.test.ts`:
```ts
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const whisper = vi.hoisted(() => ({
  canUseWhisperWebGpu: vi.fn(),
  downloadWhisperModel: vi.fn(),
  isWhisperModelCached: vi.fn(),
  transcribe: vi.fn(),
}));
const transformersEnv = vi.hoisted(() => ({ cacheDir: "" }));
vi.mock("@remotion/whisper-webgpu", () => whisper);
vi.mock("@huggingface/transformers", () => ({ env: transformersEnv }));

import {
  isModel,
  MODEL_SIZES_MB,
  MODELS,
  TranscriptionUnavailable,
  transcribeWithWhisper,
  whisperCacheDir,
  whisperLanguage,
} from "../../scripts/lib/transcribe";

describe("settings", () => {
  afterEach(() => {
    delete process.env.REELKIT_WHISPER_CACHE;
  });
  it("maps locales to Whisper languages", () => {
    expect(whisperLanguage("es-CO")).toBe("spanish");
    expect(whisperLanguage("en-US")).toBe("english");
    expect(() => whisperLanguage("xx-YY")).toThrow(/No Whisper language/);
  });
  it("knows the multilingual models", () => {
    expect(isModel("small")).toBe(true);
    expect(isModel("small.en")).toBe(false);
    expect(Object.keys(MODEL_SIZES_MB)).toEqual([...MODELS]);
  });
  it("shares one model cache per machine", () => {
    expect(whisperCacheDir()).toBe(path.join(os.homedir(), ".cache", "reelkit", "whisper"));
    process.env.REELKIT_WHISPER_CACHE = "/tmp/models";
    expect(whisperCacheDir()).toBe("/tmp/models");
  });
});

describe("transcribeWithWhisper", () => {
  const wave = new Float32Array(16000);
  beforeEach(() => {
    vi.resetAllMocks();
    whisper.canUseWhisperWebGpu.mockResolvedValue({ supported: true });
    whisper.downloadWhisperModel.mockResolvedValue({ alreadyDownloaded: true });
  });

  it("returns trimmed words in ms and points Transformers.js at the shared cache", async () => {
    whisper.transcribe.mockResolvedValue({
      text: "Hola",
      model: "small",
      words: [
        { text: " Hola", startInSeconds: 0.12, endInSeconds: 0.3004 },
        { text: " ", startInSeconds: 0.3, endInSeconds: 0.31 },
      ],
    });
    const words = await transcribeWithWhisper(wave, { model: "small", language: "spanish" });
    expect(words).toEqual([{ text: "Hola", startMs: 120, endMs: 300 }]);
    expect(transformersEnv.cacheDir).toBe(whisperCacheDir());
    expect(whisper.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({ channelWaveform: wave, model: "small", language: "spanish" }),
    );
  });
  it("reports missing WebGPU as unavailable", async () => {
    whisper.canUseWhisperWebGpu.mockResolvedValue({ supported: false, reason: "webgpu-unavailable", detailedReason: "no adapter" });
    const attempt = transcribeWithWhisper(wave, { model: "small", language: "spanish" });
    await expect(attempt).rejects.toBeInstanceOf(TranscriptionUnavailable);
    await expect(attempt).rejects.toThrow(/no adapter/);
  });
  it("reports download or inference failures as unavailable", async () => {
    whisper.downloadWhisperModel.mockRejectedValue(new Error("ECONNRESET"));
    await expect(transcribeWithWhisper(wave, { model: "small", language: "spanish" })).rejects.toThrow(
      /Transcription failed: ECONNRESET/,
    );
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd template && npx vitest run tests/scripts/transcribe.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

`template/scripts/lib/transcribe.ts`:
```ts
import os from "node:os";
import path from "node:path";
import type { TranscriptWord } from "./align";

export const MODELS = ["tiny", "base", "small", "medium", "large-v3-turbo"] as const;
export type Model = (typeof MODELS)[number];
export const DEFAULT_MODEL: Model = "large-v3-turbo";
export const MODEL_SIZES_MB: Record<Model, number> = { tiny: 120, base: 206, small: 586, medium: 1699, "large-v3-turbo": 1609 };
export const isModel = (value: string): value is Model => (MODELS as readonly string[]).includes(value);

const LANGUAGES: Record<string, string> = {
  es: "spanish",
  en: "english",
  pt: "portuguese",
  fr: "french",
  it: "italian",
  de: "german",
};

export const whisperLanguage = (locale: string): string => {
  const language = LANGUAGES[locale.slice(0, 2).toLowerCase()];
  if (!language) {
    throw new Error(`No Whisper language for locale ${locale}. Known: ${Object.keys(LANGUAGES).join(", ")}`);
  }
  return language;
};

export const whisperCacheDir = () =>
  process.env.REELKIT_WHISPER_CACHE ?? path.join(os.homedir(), ".cache", "reelkit", "whisper");

export class TranscriptionUnavailable extends Error {}

/** Loads Whisper with Transformers.js pointed at the shared model cache. */
const loadWhisper = async () => {
  const { env } = await import("@huggingface/transformers");
  env.cacheDir = whisperCacheDir();
  return import("@remotion/whisper-webgpu");
};

export type Transcriber = (wave: Float32Array, options: { model: Model; language: string }) => Promise<TranscriptWord[]>;

export const transcribeWithWhisper: Transcriber = async (wave, { model, language }) => {
  let whisper: Awaited<ReturnType<typeof loadWhisper>>;
  try {
    whisper = await loadWhisper();
  } catch (err) {
    throw new TranscriptionUnavailable(`Whisper could not load: ${(err as Error).message}`);
  }
  const support = await whisper.canUseWhisperWebGpu();
  if (!support.supported) {
    throw new TranscriptionUnavailable(`WebGPU is not available: ${support.detailedReason}`);
  }
  try {
    await whisper.downloadWhisperModel({ model });
    const output = await whisper.transcribe({ channelWaveform: wave, model, language });
    return output.words
      .map((w) => ({ text: w.text.trim(), startMs: Math.round(w.startInSeconds * 1000), endMs: Math.round(w.endInSeconds * 1000) }))
      .filter((w) => w.text);
  } catch (err) {
    throw new TranscriptionUnavailable(`Transcription failed: ${(err as Error).message}`);
  }
};

export const whisperStatus = async (model: Model) => {
  const whisper = await loadWhisper();
  const support = await whisper.canUseWhisperWebGpu();
  return {
    webgpu: support.supported ? null : support.detailedReason,
    cached: await whisper.isWhisperModelCached({ model }),
    cacheDir: whisperCacheDir(),
  };
};

export const downloadModel = async (model: Model, onProgress?: (fraction: number) => void) => {
  const whisper = await loadWhisper();
  return whisper.downloadWhisperModel({
    model,
    onProgress: (p) => onProgress?.(p.totalBytes ? p.loadedBytes / p.totalBytes : 0),
  });
};
```

`template/scripts/commands/whisper.ts`:
```ts
import { flagString, type Args } from "../lib/args";
import { DEFAULT_MODEL, downloadModel, isModel, MODEL_SIZES_MB, MODELS, whisperStatus } from "../lib/transcribe";

const USAGE = "Usage: reelkit whisper check|download [--model=large-v3-turbo]";

export const run = async (args: Args): Promise<number> => {
  const [action] = args.positional;
  const model = flagString(args, "model", DEFAULT_MODEL);
  if (!isModel(model)) {
    console.error(`Unknown model "${model}". Use one of: ${MODELS.join(", ")}`);
    return 2;
  }
  if (action === "check") {
    const status = await whisperStatus(model);
    console.log(status.webgpu ? `✗ WebGPU: ${status.webgpu}` : "✓ WebGPU available");
    console.log(
      status.cached
        ? `✓ Model ${model} is downloaded (${status.cacheDir})`
        : `• Model ${model} is not downloaded yet (${MODEL_SIZES_MB[model]} MB). Run: npm run reelkit -- whisper download --model=${model}`,
    );
    return status.webgpu ? 1 : 0;
  }
  if (action === "download") {
    console.log(`Downloading ${model} (${MODEL_SIZES_MB[model]} MB)…`);
    let shown = -1;
    const result = await downloadModel(model, (fraction) => {
      const pct = Math.floor(fraction * 10) * 10;
      if (pct !== shown) {
        shown = pct;
        process.stdout.write(`\r  ${pct} %`);
      }
    });
    process.stdout.write("\n");
    console.log(result.alreadyDownloaded ? `✓ ${model} was already downloaded` : `✓ ${model} downloaded`);
    return 0;
  }
  console.error(USAGE);
  return 2;
};
```
Add `whisper: () => import("./commands/whisper"),` to `COMMANDS`.

- [ ] **Step 5: Run tests and the command**

Run:
```bash
cd template
npx vitest run tests/scripts && npm run lint
npm run reelkit -- whisper check --model=tiny
npm run reelkit -- whisper check --model=nope; echo "exit=$?"
```
Expected: tests PASS; `✓ WebGPU available` and a "not downloaded yet (120 MB)" line (or "is downloaded"); `Unknown model "nope"` with exit 2. Don't download anything in this task; Task 13 does.

- [ ] **Step 6: Commit**

```bash
git add template/package.json template/package-lock.json template/scripts template/tests/scripts
git commit -m "feat(sync): Whisper (WebGPU) wrapper with a shared model cache; reelkit whisper"
```

---

### Task 10: `reelkit sync prepare` and `sync apply`

**Files:**
- Create: `template/scripts/lib/sync-report.ts`, `template/scripts/commands/sync.ts`
- Modify: `template/scripts/reelkit.ts` (add `sync`)
- Test: `template/tests/scripts/sync.test.ts`

**Interfaces:**
- Consumes: `loadEpisodeDir`, `saveEpisodeRaw`, `readJson`, `writeJson` (Task 1); `cell`, `sceneNames` (Task 3); `probeMedia`, `ClipInfo`, `speechBounds`, `decodeMono16k` (Task 5); `alignTranscript`, `Alignment` (Task 7); `trimFromLeadingSilence`, `refitSceneStarts`, `speechOverrunSeconds`, `clipOverrunSeconds`, `shiftCaptions` (Task 8); `transcribeWithWhisper`, `Transcriber`, `TranscriptionUnavailable`, `whisperLanguage`, `isModel`, `DEFAULT_MODEL`, `Model` (Task 9).
- Produces:
  - `SyncProposal = { clip: { src: string; trimStartFrames: number }; sceneStarts: number[] | null; captionsSrc: string; transcribed: boolean; model: string; speechOverrunSeconds: number; clipOverrunSeconds: number; createdAt: string }` (in `sync-report.ts`).
  - `buildSyncReport(input: SyncReportInput): string` — Spanish Markdown.
  - `prepare(dir, clipPath, { model }, deps?: Partial<SyncDeps>): Promise<number>` and `apply(dir, { acceptOverrun }): Promise<number>`; `SyncDeps = { probe; decode; transcribe; now }` (tests pass stubs; the CLI uses the real ones).
  - Files in the episode folder: `talent.<ext>` (copied clip, lowercase extension), `captions.raw.json` (Whisper words, clip time), `captions.proposed.json` (aligned captions, video time — editable), `sync-proposal.json`, `sync-report.md`; on apply, `captions.json`.
  - CLI: `reelkit sync prepare <episodeDir> <clip> [--model=large-v3-turbo]`, `reelkit sync apply <episodeDir> [--accept-overrun]`.

Behaviour:
- `prepare` never changes `episode.json`. It needs stage `built`, `synced` or `exported`, and a clip with both video and audio.
- With a transcript, the trim comes from the first caption and the overrun from the last one. Without one (`TranscriptionUnavailable`, or no words heard), both come from `speechBounds`, `sceneStarts` stays `null` (unchanged), `captionsSrc` stays `""` (captions remain script-timed), and the report says why and how to retry. Any other error propagates.
- `apply` refuses (exit 1, nothing written) when `speechOverrunSeconds > 0` unless `--accept-overrun`; it validates `captions.proposed.json` (each entry has text, startMs, endMs ≥ startMs) before copying it to `captions.json`, then saves `clip`, `sceneStarts` (the proposal's, or the current value when the proposal has none), `captionsSrc` and `stage: "synced"` through `saveEpisodeRaw`.

- [ ] **Step 1: Write the failing test**

`template/tests/scripts/sync.test.ts`:
```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apply, prepare, type SyncDeps } from "../../scripts/commands/sync";
import { readJson } from "../../scripts/lib/episode-files";
import type { ClipInfo } from "../../scripts/lib/probe";
import { TranscriptionUnavailable } from "../../scripts/lib/transcribe";
import { TEMPLATE_ROOT } from "./paths";
import { concat, silence, tone } from "./wav";

const INFO: ClipInfo = {
  durationSeconds: 31, width: 1080, height: 1920, rotation: 0, fps: 30,
  hasVideo: true, hasAudio: true, videoCodec: "avc", audioCodec: "aac",
};

/** Says the script word by word: `per` ms per word, 400 ms between lines, starting at `start` ms. */
const fakeTranscript = (script: string[], { start = 1000, per = 300, replace = {} as Record<string, string> } = {}) => {
  let t = start;
  return script.flatMap((line, i) => {
    if (i) t += 400;
    return line.split(/\s+/).map((w) => {
      const word = { text: replace[w] ?? w, startMs: t, endMs: t + per };
      t += per;
      return word;
    });
  });
};

let dir: string;
let clip: string;
let script: string[];
const deps = (overrides: Partial<SyncDeps> = {}): Partial<SyncDeps> => ({
  probe: async () => INFO,
  decode: async () => concat(silence(1.5, 16000), tone(20, 16000), silence(1, 16000)),
  transcribe: async () => fakeTranscript(script, { replace: { doce: "12", Entre: "Entren" } }),
  now: () => new Date("2026-10-05T12:00:00Z"),
  ...overrides,
});
const file = (name: string) => path.join(dir, name);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-sync-"));
  fs.cpSync(path.join(TEMPLATE_ROOT, "examples", "dani-chocolate"), dir, { recursive: true });
  clip = path.join(dir, "..", `${path.basename(dir)}-clip.MOV`);
  fs.writeFileSync(clip, "not really a video");
  script = readJson(file("episode.json")).script;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(clip, { force: true });
});

describe("sync prepare", () => {
  it("proposes trim, scene cuts and captions without touching episode.json", async () => {
    const before = fs.readFileSync(file("episode.json"), "utf8");
    expect(await prepare(dir, clip, { model: "small" }, deps())).toBe(0);
    expect(fs.readFileSync(file("episode.json"), "utf8")).toBe(before);
    expect(fs.existsSync(file("talent.mov"))).toBe(true);

    const proposal = readJson(file("sync-proposal.json"));
    expect(proposal).toEqual({
      clip: { src: "talent.mov", trimStartFrames: 24 },
      sceneStarts: [0, 87, 234, 408, 609],
      captionsSrc: "captions.json",
      transcribed: true,
      model: "small",
      speechOverrunSeconds: 0,
      clipOverrunSeconds: 0.2,
      createdAt: "2026-10-05T12:00:00.000Z",
    });

    const captions = readJson(file("captions.proposed.json"));
    expect(captions).toHaveLength(71);
    expect(captions[0]).toMatchObject({ text: "¿Tu", startMs: 200 });
    expect(captions.map((c: { text: string }) => c.text.trim())).toContain("doce");
    expect(readJson(file("captions.raw.json"))).toHaveLength(71);

    const report = fs.readFileSync(file("sync-report.md"), "utf8");
    expect(report).toContain("# Sincronización — 2026-10-chocolate");
    expect(report).toContain("| Cuándo | 3,0 s | 2,9 s |");
    expect(report).toContain("| Cuándo | Entre | Entren | Corregida");
    expect(report).toContain("**70 de 71 palabras del guion coinciden**");
    expect(report).toContain("sync apply");
  });

  it("still attaches the clip when transcription is unavailable", async () => {
    const transcribe = async () => {
      throw new TranscriptionUnavailable("WebGPU is not available: test adapter");
    };
    expect(await prepare(dir, clip, { model: "small" }, deps({ transcribe }))).toBe(0);
    expect(readJson(file("sync-proposal.json"))).toMatchObject({
      clip: { src: "talent.mov", trimStartFrames: 39 },
      sceneStarts: null,
      captionsSrc: "",
      transcribed: false,
    });
    expect(fs.existsSync(file("captions.proposed.json"))).toBe(false);
    const report = fs.readFileSync(file("sync-report.md"), "utf8");
    expect(report).toContain("Sin transcripción");
    expect(report).toContain("test adapter");
    expect(report).toContain("provisionales");
  });

  it("propagates unexpected errors", async () => {
    const transcribe = async () => {
      throw new TypeError("bug");
    };
    await expect(prepare(dir, clip, { model: "small" }, deps({ transcribe }))).rejects.toThrow("bug");
  });

  it("refuses a clip without audio", async () => {
    expect(await prepare(dir, clip, { model: "small" }, deps({ probe: async () => ({ ...INFO, hasAudio: false }) }))).toBe(1);
    expect(fs.existsSync(file("sync-proposal.json"))).toBe(false);
  });

  it("refuses an episode that isn't built yet", async () => {
    const raw = readJson(file("episode.json"));
    fs.writeFileSync(file("episode.json"), JSON.stringify({ ...raw, stage: "scripted" }));
    expect(await prepare(dir, clip, { model: "small" }, deps())).toBe(1);
  });
});

describe("sync apply", () => {
  it("applies the proposal (including hand-edited caption text)", async () => {
    await prepare(dir, clip, { model: "small" }, deps());
    const proposed = readJson(file("captions.proposed.json"));
    proposed[0].text = "¿Su";
    fs.writeFileSync(file("captions.proposed.json"), JSON.stringify(proposed));

    expect(await apply(dir, { acceptOverrun: false })).toBe(0);
    const episode = readJson(file("episode.json"));
    expect(episode).toMatchObject({
      stage: "synced",
      clip: { src: "talent.mov", trimStartFrames: 24 },
      sceneStarts: [0, 87, 234, 408, 609],
      captionsSrc: "captions.json",
    });
    expect(readJson(file("captions.json"))[0].text).toBe("¿Su");
  });

  it("refuses a voice that runs past the end unless accepted", async () => {
    const transcribe = async () => fakeTranscript(script, { per: 450 });
    await prepare(dir, clip, { model: "small" }, deps({ transcribe }));
    expect(readJson(file("sync-proposal.json")).speechOverrunSeconds).toBeGreaterThan(0);
    expect(fs.readFileSync(file("sync-report.md"), "utf8")).toContain("⚠ La voz sigue");

    expect(await apply(dir, { acceptOverrun: false })).toBe(1);
    expect(readJson(file("episode.json")).stage).toBe("built");
    expect(await apply(dir, { acceptOverrun: true })).toBe(0);
    expect(readJson(file("episode.json")).stage).toBe("synced");
  });

  it("keeps script-timed captions when there was no transcript", async () => {
    const transcribe = async () => {
      throw new TranscriptionUnavailable("no WebGPU");
    };
    await prepare(dir, clip, { model: "small" }, deps({ transcribe }));
    expect(await apply(dir, { acceptOverrun: false })).toBe(0);
    expect(readJson(file("episode.json"))).toMatchObject({ stage: "synced", sceneStarts: null, captionsSrc: "" });
    expect(fs.existsSync(file("captions.json"))).toBe(false);
  });

  it("rejects broken caption edits", async () => {
    await prepare(dir, clip, { model: "small" }, deps());
    const proposed = readJson(file("captions.proposed.json"));
    proposed[3].endMs = proposed[3].startMs - 1;
    fs.writeFileSync(file("captions.proposed.json"), JSON.stringify(proposed));
    expect(await apply(dir, { acceptOverrun: false })).toBe(1);
    expect(readJson(file("episode.json")).stage).toBe("built");
  });

  it("explains what to do without a proposal", async () => {
    expect(await apply(dir, { acceptOverrun: false })).toBe(1);
    expect(vi.mocked(console.error).mock.calls.join("\n")).toContain("sync prepare");
  });
});
```

Numbers used above: the fake voice starts at 1.0 s, so the trim is 30 − 6 = 24 frames. Lines start at 1.0, 3.8, 8.7, 14.5 and 21.2 s (8, 15, 18 and 21 words at 0.3 s, plus 0.4 s pauses). The cuts are `round(ms × 0.03) − 24 − 3` = 87, 234, 408, 609. The clip runs 31 − 0.8 − 30 = 0.2 s past the end. One word ("Entre" heard as "Entren") is corrected, so 70 of 71 match. "Cuándo" moves from 3,0 s (default 90 frames) to 2,9 s (87 frames). Without a transcript, speech starts at 1.5 s → 45 − 6 = 39 frames.

- [ ] **Step 2: Run it to verify it fails**

Run: `cd template && npx vitest run tests/scripts/sync.test.ts`
Expected: FAIL — cannot resolve `../../scripts/commands/sync`.

- [ ] **Step 3: Implement the report**

`template/scripts/lib/sync-report.ts`:
```ts
import type { Episode } from "../../src/episode/schema";
import { FPS } from "../../src/frame/timing";
import type { Alignment, WordStatus } from "./align";
import type { ClipInfo } from "./probe";
import { cell, sceneNames } from "./script-sheet";

export type SyncProposal = {
  clip: { src: string; trimStartFrames: number };
  sceneStarts: number[] | null;
  captionsSrc: string;
  transcribed: boolean;
  model: string;
  speechOverrunSeconds: number;
  clipOverrunSeconds: number;
  createdAt: string;
};

export type SyncReportInput = {
  dir: string;
  episode: Episode;
  info: ClipInfo;
  proposal: SyncProposal;
  alignment: Alignment | null;
  unavailable: string | null;
  warnings: string[];
  previousStarts: number[];
};

const s1 = (seconds: number) => seconds.toFixed(1).replace(".", ",");
const LABELS: Record<Exclude<WordStatus, "match">, string> = {
  corrected: "Corregida (se muestra el guion)",
  check: "⚠ Revisar (se muestra lo que se escuchó)",
  missing: "⚠ No se escuchó",
};

export const buildSyncReport = (input: SyncReportInput): string => {
  const { dir, episode, info, proposal, alignment, unavailable, warnings, previousStarts } = input;
  const trimMs = (proposal.clip.trimStartFrames / FPS) * 1000;
  const at = (ms: number | null) => (ms === null ? "—" : `${s1((ms - trimMs) / 1000)} s`);
  const names = sceneNames(episode);
  const lines: string[] = [`# Sincronización — ${episode.slug}`, ""];

  lines.push(
    `**Clip:** ${proposal.clip.src} · ${s1(info.durationSeconds)} s · ${info.width}×${info.height}${info.fps ? ` · ${Math.round(info.fps)} fps` : ""}`,
    "",
    proposal.clip.trimStartFrames
      ? `**Inicio recortado:** ${s1(proposal.clip.trimStartFrames / FPS)} s de silencio (${proposal.clip.trimStartFrames} cuadros).`
      : "**Sin recorte:** la voz empieza enseguida.",
    "",
  );
  if (proposal.speechOverrunSeconds > 0) {
    lines.push(
      `> ⚠ La voz sigue ${s1(proposal.speechOverrunSeconds)} s después del final del video (${episode.durationSeconds} s): las últimas palabras se cortarían. Vuelve a grabar más corto, o aplica igual con \`--accept-overrun\`.`,
      "",
    );
  } else if (proposal.clipOverrunSeconds > 0) {
    lines.push(`El clip dura ${s1(proposal.clipOverrunSeconds)} s más que el video; ese final (sin voz) se corta.`, "");
  }

  if (!alignment) {
    lines.push(
      "## ⚠ Sin transcripción",
      "",
      unavailable ?? "No se escuchó voz.",
      "",
      "El clip se adjunta igual. Los subtítulos siguen el tiempo del guion (provisionales) y los cortes de escena no cambian.",
      "Para reintentar: `npm run reelkit -- whisper check`, y luego vuelve a correr `sync prepare`.",
      "",
    );
  } else {
    if (proposal.sceneStarts) {
      lines.push("## Cortes de escena", "", "| Escena | Antes | Ahora |", "| --- | --- | --- |");
      names.forEach((name, i) => {
        lines.push(`| ${name} | ${s1(previousStarts[i] / FPS)} s | ${s1(proposal.sceneStarts![i] / FPS)} s |`);
      });
      lines.push("");
    }
    const total = alignment.words.length;
    const matched = alignment.words.filter((w) => w.status === "match").length;
    lines.push("## Palabras", "", `**${matched} de ${total} palabras del guion coinciden** con lo que se escuchó.`, "");
    const review = alignment.words.filter((w) => w.status !== "match");
    if (review.length || alignment.adLibs.length) {
      lines.push("| Escena | Guion | Se escuchó | Estado | Tiempo |", "| --- | --- | --- | --- | --- |");
      for (const w of review) {
        lines.push(
          `| ${names[w.scene]} | ${cell(w.text)} | ${cell(w.heard) || "—"} | ${LABELS[w.status as Exclude<WordStatus, "match">]} | ${at(w.startMs)} |`,
        );
      }
      for (const w of alignment.adLibs) {
        lines.push(`| ${names[w.scene]} | — | ${cell(w.text)} | Agregada (se muestra tal cual) | ${at(w.startMs)} |`);
      }
      lines.push("");
    }
  }

  if (warnings.length) {
    lines.push("## Avisos", "", ...warnings.map((w) => `- ${w}`), "");
  }
  lines.push("## Siguiente paso", "");
  if (alignment) {
    lines.push('- Para corregir una palabra, cambia su `"text"` en `captions.proposed.json`.');
  }
  lines.push(`- Si todo se ve bien: \`npm run reelkit -- sync apply ${dir}\``);
  return `${lines.join("\n")}\n`;
};
```

- [ ] **Step 4: Implement the command**

`template/scripts/commands/sync.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import type { Caption } from "@remotion/captions";
import { resolveSceneStarts, totalFrames } from "../../src/frame/timing";
import { alignTranscript, type Alignment } from "../lib/align";
import { flagString, type Args } from "../lib/args";
import { decodeMono16k } from "../lib/audio";
import { loadEpisodeDir, readJson, saveEpisodeRaw, writeJson } from "../lib/episode-files";
import { probeMedia, speechBounds, type ClipInfo } from "../lib/probe";
import {
  clipOverrunSeconds,
  refitSceneStarts,
  shiftCaptions,
  speechOverrunSeconds,
  trimFromLeadingSilence,
} from "../lib/refit";
import { buildSyncReport, type SyncProposal } from "../lib/sync-report";
import {
  DEFAULT_MODEL,
  isModel,
  MODELS,
  TranscriptionUnavailable,
  transcribeWithWhisper,
  whisperLanguage,
  type Model,
  type Transcriber,
} from "../lib/transcribe";

export const FILES = {
  proposal: "sync-proposal.json",
  report: "sync-report.md",
  raw: "captions.raw.json",
  proposed: "captions.proposed.json",
  final: "captions.json",
} as const;

const READY_STAGES = new Set(["built", "synced", "exported"]);

export type SyncDeps = {
  probe: (file: string) => Promise<ClipInfo>;
  decode: (file: string) => Promise<Float32Array>;
  transcribe: Transcriber;
  now: () => Date;
};

const REAL_DEPS: SyncDeps = {
  probe: probeMedia,
  decode: decodeMono16k,
  transcribe: transcribeWithWhisper,
  now: () => new Date(),
};

export const prepare = async (
  dir: string,
  clipPath: string,
  options: { model: Model },
  overrides: Partial<SyncDeps> = {},
): Promise<number> => {
  const deps = { ...REAL_DEPS, ...overrides };
  const { episode, talent } = loadEpisodeDir(dir);
  if (!READY_STAGES.has(episode.stage)) {
    console.error(`✗ ${episode.slug} is at stage "${episode.stage}"; build the video before adding the talent clip.`);
    return 1;
  }
  if (!fs.existsSync(clipPath)) {
    console.error(`✗ No file at ${clipPath}`);
    return 1;
  }
  const info = await deps.probe(clipPath);
  if (!info.hasVideo || !info.hasAudio) {
    console.error(
      `✗ ${clipPath} needs both video and audio (video: ${info.hasVideo ? "yes" : "no"}, audio: ${info.hasAudio ? "yes" : "no"}).`,
    );
    return 1;
  }
  for (const stale of [FILES.raw, FILES.proposed]) {
    fs.rmSync(path.join(dir, stale), { force: true });
  }
  const clipName = `talent${path.extname(clipPath).toLowerCase() || ".mp4"}`;
  const clipDest = path.join(dir, clipName);
  if (path.resolve(clipPath) !== path.resolve(clipDest)) {
    fs.copyFileSync(clipPath, clipDest);
  }

  const wave = await deps.decode(clipDest);
  const speech = speechBounds(wave);
  const total = totalFrames(episode.durationSeconds);
  let alignment: Alignment | null = null;
  let unavailable: string | null = null;
  try {
    const transcript = await deps.transcribe(wave, { model: options.model, language: whisperLanguage(talent.locale) });
    writeJson(path.join(dir, FILES.raw), transcript);
    alignment = alignTranscript(episode.script, transcript);
    if (!alignment.captions.length) {
      unavailable = "Whisper no escuchó ninguna palabra en el clip.";
      alignment = null;
    }
  } catch (err) {
    if (!(err instanceof TranscriptionUnavailable)) {
      throw err;
    }
    unavailable = err.message;
  }

  const captions: Caption[] = alignment?.captions ?? [];
  const firstMs = captions.length ? captions[0].startMs : speech ? speech.startSeconds * 1000 : null;
  const lastMs = captions.length ? captions[captions.length - 1].endMs : speech ? speech.endSeconds * 1000 : null;
  const trimStartFrames = trimFromLeadingSilence(firstMs);
  const warnings: string[] = [];
  let sceneStarts: number[] | null = null;
  if (alignment) {
    const refit = refitSceneStarts(alignment.sceneFirstWordMs, trimStartFrames, total);
    sceneStarts = refit.starts;
    warnings.push(...alignment.warnings, ...refit.warnings);
    writeJson(path.join(dir, FILES.proposed), shiftCaptions(captions, trimStartFrames, total));
  }

  const proposal: SyncProposal = {
    clip: { src: clipName, trimStartFrames },
    sceneStarts,
    captionsSrc: alignment ? FILES.final : "",
    transcribed: alignment !== null,
    model: options.model,
    speechOverrunSeconds: speechOverrunSeconds(lastMs, trimStartFrames, episode.durationSeconds),
    clipOverrunSeconds: clipOverrunSeconds(info.durationSeconds, trimStartFrames, episode.durationSeconds),
    createdAt: deps.now().toISOString(),
  };
  writeJson(path.join(dir, FILES.proposal), proposal);
  const report = buildSyncReport({
    dir,
    episode,
    info,
    proposal,
    alignment,
    unavailable,
    warnings,
    previousStarts: resolveSceneStarts(episode.sceneStarts, total).starts,
  });
  fs.writeFileSync(path.join(dir, FILES.report), report);

  console.log(`✓ Clip copied to ${clipDest}`);
  console.log(alignment ? `✓ Transcribed with ${options.model}` : `⚠ No transcript: ${unavailable}`);
  if (proposal.speechOverrunSeconds > 0) {
    console.log(`⚠ The voice runs ${proposal.speechOverrunSeconds} s past the end of the video.`);
  }
  console.log(`Review ${path.join(dir, FILES.report)}, then: npm run reelkit -- sync apply ${dir}`);
  return 0;
};

const captionProblem = (captions: unknown): string | null => {
  if (!Array.isArray(captions)) {
    return "must be a list of captions";
  }
  const bad = captions.findIndex(
    (c) =>
      typeof c?.text !== "string" ||
      typeof c?.startMs !== "number" ||
      typeof c?.endMs !== "number" ||
      c.endMs < c.startMs,
  );
  return bad < 0 ? null : `entry ${bad} needs "text", "startMs" and "endMs" (endMs ≥ startMs)`;
};

export const apply = async (dir: string, options: { acceptOverrun: boolean }): Promise<number> => {
  const loaded = loadEpisodeDir(dir);
  const proposalFile = path.join(dir, FILES.proposal);
  if (!fs.existsSync(proposalFile)) {
    console.error(`✗ No sync proposal in ${dir}. Run: npm run reelkit -- sync prepare ${dir} <clip>`);
    return 1;
  }
  const proposal = readJson(proposalFile) as SyncProposal;
  if (proposal.speechOverrunSeconds > 0 && !options.acceptOverrun) {
    console.error(
      `✗ The voice runs ${proposal.speechOverrunSeconds} s past the ${loaded.episode.durationSeconds} s video, so its last words would be cut. ` +
        "Re-record, or apply anyway with --accept-overrun.",
    );
    return 1;
  }
  if (!fs.existsSync(path.join(dir, proposal.clip.src))) {
    console.error(`✗ The clip ${proposal.clip.src} is missing from ${dir}. Run sync prepare again.`);
    return 1;
  }
  if (proposal.captionsSrc) {
    const captions = readJson(path.join(dir, FILES.proposed));
    const problem = captionProblem(captions);
    if (problem) {
      console.error(`✗ ${FILES.proposed}: ${problem}`);
      return 1;
    }
    writeJson(path.join(dir, proposal.captionsSrc), captions);
  }
  saveEpisodeRaw(loaded, {
    clip: proposal.clip,
    sceneStarts: proposal.sceneStarts ?? loaded.raw.sceneStarts ?? null,
    captionsSrc: proposal.captionsSrc,
    stage: "synced",
  });
  console.log(`✓ ${loaded.episode.slug} is synced. Check it with: npm run studio -- ${dir}`);
  return 0;
};

const USAGE = `Usage: reelkit sync prepare <episodeDir> <clip> [--model=${DEFAULT_MODEL}]
       reelkit sync apply <episodeDir> [--accept-overrun]`;

export const run = async (args: Args): Promise<number> => {
  const [action, dir, clip] = args.positional;
  if (action === "prepare" && dir && clip) {
    const model = flagString(args, "model", DEFAULT_MODEL);
    if (!isModel(model)) {
      console.error(`Unknown model "${model}". Use one of: ${MODELS.join(", ")}`);
      return 2;
    }
    return prepare(dir, clip, { model });
  }
  if (action === "apply" && dir) {
    return apply(dir, { acceptOverrun: args.flags["accept-overrun"] === true });
  }
  console.error(USAGE);
  return 2;
};
```
Add `sync: () => import("./commands/sync"),` to `COMMANDS`.

- [ ] **Step 5: Run tests**

Run: `cd template && npx vitest run tests/scripts && npm run lint`
Expected: PASS. If the scene-cut row differs, print `proposal.sceneStarts` and recompute from the numbers above before changing code: the test's arithmetic is the spec.

- [ ] **Step 6: Commit**

```bash
git add template/scripts template/tests/scripts
git commit -m "feat(sync): sync prepare proposes trim, cuts and captions; sync apply saves them"
```

---

### Task 11: `reelkit export` — every platform, read back and checked

**Files:**
- Create: `template/scripts/lib/srt.ts`, `template/scripts/lib/bitrate.ts`, `template/scripts/lib/verify-output.ts`, `template/scripts/commands/export.ts`
- Modify: `template/scripts/reelkit.ts` (add `export`)
- Test: `template/tests/scripts/export.test.ts`

**Interfaces:**
- Consumes: `paginate`, `wordsFromCaptions`, `wordsFromScript`, `Page` (`src/frame/captions-model.ts`); `probeMedia`, `ClipInfo` (Task 5); `loadEpisodeDir`, `saveEpisodeRaw`, `readJson` (Task 1). Compositions `Episode`, `Episode45`, `Cover`, `Cover45` with input props `{ layoutName, showGuides: false, checkMode, episode: null, talent: null, sceneStarts: null }` (`checkMode: true` for covers, as their defaults).
- Produces:
  - `srtTime(ms)` → `"01:02:03,456"`; `pagesToSrt(pages, fps?)`; `buildSrt(episode, captions: Caption[] | null)` — the same pages the video shows (synced captions, or script timing when there are none).
  - `WHATSAPP_LIMIT_BYTES = 16_000_000`; `whatsappSettings(durationSeconds) → { videoBitrate: "<n>k"; audioBitrate: "96k"; scale: 1 | 2/3 }` — aims at 15.5 MB with 3 % headroom, video capped at 6000 kbps, rendered at 2/3 size (720×1280) when the video bitrate falls below 2500 kbps.
  - `checkVideo(info: ClipInfo, bytes, expectation): string[]`, `pngSize(file)`, `checkImage(size, expectation): string[]`, `verifyVideoFile(file, expectation)`, `verifyPngFile(file, expectation)` — problems as readable strings; empty means OK. A video must be within 0.1 s of the duration, exactly the expected size, H.264 (`avc`), have audio, and stay under `maxBytes` when given.
  - `EXPORT_TARGETS = ["9x16", "whatsapp", "4x5", "cover-9x16", "cover-4x5", "srt"]`; `parseTargets(only?)`; `outputName(slug, target)`.
  - CLI: `reelkit export <episodeDir> [--only=9x16,srt,…]` writes into `<episodeDir>/exports/`: `<slug>-9x16.mp4` (CRF 18, AAC 192k), `<slug>-whatsapp.mp4`, `<slug>-4x5.mp4`, `cover-9x16.png`, `cover-4x5.png`, `<slug>.srt`. Video targets need a talent clip (`clip.src`); covers and subtitles don't. Every file is read back; any problem → exit 1. A complete export (all targets) sets `stage: "exported"`.

- [ ] **Step 1: Write the failing test**

`template/tests/scripts/export.test.ts`:
```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { afterAll, describe, expect, it } from "vitest";
import { outputName, parseTargets } from "../../scripts/commands/export";
import { whatsappSettings } from "../../scripts/lib/bitrate";
import type { ClipInfo } from "../../scripts/lib/probe";
import { buildSrt, srtTime } from "../../scripts/lib/srt";
import { checkImage, checkVideo, pngSize } from "../../scripts/lib/verify-output";
import { validateEpisode } from "../../src/episode/validate";
import { TEMPLATE_ROOT } from "./paths";

const dani = validateEpisode(
  JSON.parse(fs.readFileSync(path.join(TEMPLATE_ROOT, "examples", "dani-chocolate", "episode.json"), "utf8")),
);

describe("srt", () => {
  it("formats timestamps", () => {
    expect(srtTime(3_723_456)).toBe("01:02:03,456");
    expect(srtTime(-5)).toBe("00:00:00,000");
  });
  it("uses script timing when there are no captions", () => {
    expect(buildSrt(dani, null)).toMatch(
      /^1\n00:00:00,200 --> 00:00:01,250\n¿Tu perro se\n\n2\n00:00:01,250 --> 00:00:02,300\ncomió un chocolate\?\n/,
    );
  });
  it("uses synced captions and their page breaks", () => {
    const cap = (text: string, startMs: number, endMs: number) => ({ text, startMs, endMs, timestampMs: startMs, confidence: null });
    const srt = buildSrt(dani, [cap("Hola", 0, 400), { ...cap(" a", 400, 500), pageBreakAfter: true }, cap(" todos", 2000, 2400)]);
    expect(srt).toBe("1\n00:00:00,000 --> 00:00:00,500\nHola a\n\n2\n00:00:02,000 --> 00:00:02,400\ntodos\n");
  });
});

describe("whatsappSettings", () => {
  it.each([
    [30, "3913k", 1],
    [45, "2576k", 1],
    [60, "1908k", 2 / 3],
    [15, "6000k", 1],
  ])("%d s → %s at scale %d", (seconds, bitrate, scale) => {
    expect(whatsappSettings(seconds)).toEqual({ videoBitrate: bitrate, audioBitrate: "96k", scale });
  });
});

describe("checkVideo", () => {
  const good: ClipInfo = {
    durationSeconds: 30.02, width: 1080, height: 1920, rotation: 0, fps: 30,
    hasVideo: true, hasAudio: true, videoCodec: "avc", audioCodec: "aac",
  };
  const want = { durationSeconds: 30, width: 1080, height: 1920 };
  it("accepts a good file", () => {
    expect(checkVideo(good, 9_000_000, want)).toEqual([]);
  });
  it.each<[string, Partial<ClipInfo>, number, RegExp]>([
    ["duration", { durationSeconds: 30.5 }, 1, /duration 30\.50 s, expected 30 s/],
    ["size", { width: 720, height: 1280 }, 1, /size 720×1280, expected 1080×1920/],
    ["codec", { videoCodec: "hevc" }, 1, /H\.264/],
    ["audio", { hasAudio: false }, 1, /no audio/],
  ])("reports a wrong %s", (_, change, bytes, message) => {
    expect(checkVideo({ ...good, ...change }, bytes, want).join("\n")).toMatch(message);
  });
  it("reports a WhatsApp file over the limit", () => {
    expect(checkVideo(good, 16_400_000, { ...want, maxBytes: 16_000_000 })).toEqual([
      "16.4 MB is over the 16.0 MB limit",
    ]);
  });
});

describe("images", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-png-"));
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
  it("reads PNG dimensions from the header", () => {
    const file = path.join(dir, "a.png");
    fs.writeFileSync(file, PNG.sync.write(new PNG({ width: 4, height: 2 })));
    expect(pngSize(file)).toEqual({ width: 4, height: 2 });
    expect(checkImage({ width: 4, height: 2 }, { width: 4, height: 2 })).toEqual([]);
    expect(checkImage({ width: 4, height: 2 }, { width: 1080, height: 1920 })).toEqual(["size 4×2, expected 1080×1920"]);
  });
  it("rejects a file that isn't a PNG", () => {
    const file = path.join(dir, "b.png");
    fs.writeFileSync(file, "nope");
    expect(() => pngSize(file)).toThrow(/not a PNG/);
  });
});

describe("targets", () => {
  it("parses --only", () => {
    expect(parseTargets(undefined)).toEqual(["9x16", "whatsapp", "4x5", "cover-9x16", "cover-4x5", "srt"]);
    expect(parseTargets("srt, cover-4x5")).toEqual(["srt", "cover-4x5"]);
    expect(() => parseTargets("9x16,tiktok")).toThrow(/Unknown export target.*tiktok/);
  });
  it("names the files", () => {
    expect(outputName("2026-10-chocolate", "whatsapp")).toBe("2026-10-chocolate-whatsapp.mp4");
    expect(outputName("2026-10-chocolate", "cover-4x5")).toBe("cover-4x5.png");
    expect(outputName("2026-10-chocolate", "srt")).toBe("2026-10-chocolate.srt");
  });
});
```

Numbers: Dani's hook has 8 words over frames 6–90 (10.5 frames each), so page 1 is 6–37.5 frames (200–1250 ms) and page 2 is 37.5–69 (1250–2300 ms). WhatsApp: 15.5 MB × 8 / 30 s × 0.97 − 96 = 3913 kbps; 45 s → 2576; 60 s → 1908 (below 2500, so 2/3 scale); 15 s → capped at 6000.

- [ ] **Step 2: Run it to verify it fails**

Run: `cd template && npx vitest run tests/scripts/export.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the libraries**

`template/scripts/lib/srt.ts`:
```ts
import type { Caption } from "@remotion/captions";
import type { Episode } from "../../src/episode/schema";
import { paginate, wordsFromCaptions, wordsFromScript, type Page } from "../../src/frame/captions-model";
import { FPS, resolveSceneStarts, totalFrames } from "../../src/frame/timing";

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export const srtTime = (ms: number): string => {
  const t = Math.max(0, Math.round(ms));
  return `${pad(Math.floor(t / 3_600_000))}:${pad(Math.floor(t / 60_000) % 60)}:${pad(Math.floor(t / 1000) % 60)},${pad(t % 1000, 3)}`;
};

export const pagesToSrt = (pages: Page[], fps = FPS): string =>
  pages
    .map(
      (page, i) =>
        `${i + 1}\n${srtTime((page.from / fps) * 1000)} --> ${srtTime((page.to / fps) * 1000)}\n${page.words.map((w) => w.text).join(" ")}\n`,
    )
    .join("\n");

/** The same caption pages the video shows. */
export const buildSrt = (episode: Episode, captions: Caption[] | null): string => {
  const total = totalFrames(episode.durationSeconds);
  const { starts } = resolveSceneStarts(episode.sceneStarts, total);
  const groups = captions ? wordsFromCaptions(captions, FPS) : wordsFromScript(episode.script, starts, total);
  return pagesToSrt(paginate(groups));
};
```

`template/scripts/lib/bitrate.ts`:
```ts
/** WhatsApp rejects (or re-compresses) videos above 16 MB. */
export const WHATSAPP_LIMIT_BYTES = 16_000_000;
const TARGET_BYTES = 15_500_000;
const HEADROOM = 0.97;
const AUDIO_KBPS = 96;
const MAX_VIDEO_KBPS = 6000;
const MIN_FULL_SIZE_KBPS = 2500;

export const whatsappSettings = (durationSeconds: number) => {
  const totalKbps = ((TARGET_BYTES * 8) / 1000 / durationSeconds) * HEADROOM;
  const video = Math.min(MAX_VIDEO_KBPS, Math.floor(totalKbps - AUDIO_KBPS));
  return {
    videoBitrate: `${video}k`,
    audioBitrate: `${AUDIO_KBPS}k`,
    scale: video < MIN_FULL_SIZE_KBPS ? 2 / 3 : 1,
  };
};
```

`template/scripts/lib/verify-output.ts`:
```ts
import fs from "node:fs";
import { probeMedia, type ClipInfo } from "./probe";

export type VideoExpectation = { durationSeconds: number; width: number; height: number; maxBytes?: number };
export type Size = { width: number; height: number };

const DURATION_TOLERANCE_S = 0.1;
const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);

export const checkVideo = (info: ClipInfo, bytes: number, want: VideoExpectation): string[] => {
  const problems: string[] = [];
  if (Math.abs(info.durationSeconds - want.durationSeconds) > DURATION_TOLERANCE_S) {
    problems.push(`duration ${info.durationSeconds.toFixed(2)} s, expected ${want.durationSeconds} s`);
  }
  if (info.width !== want.width || info.height !== want.height) {
    problems.push(`size ${info.width}×${info.height}, expected ${want.width}×${want.height}`);
  }
  if (info.videoCodec !== "avc") {
    problems.push(`video codec ${info.videoCodec ?? "none"}, expected H.264 (avc)`);
  }
  if (!info.hasAudio) {
    problems.push("no audio track");
  }
  if (want.maxBytes !== undefined && bytes > want.maxBytes) {
    problems.push(`${mb(bytes)} MB is over the ${mb(want.maxBytes)} MB limit`);
  }
  return problems;
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width and height from the PNG header (IHDR). */
export const pngSize = (file: string): Size => {
  const head = Buffer.alloc(24);
  const fd = fs.openSync(file, "r");
  try {
    fs.readSync(fd, head, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (!head.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${file} is not a PNG`);
  }
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
};

export const checkImage = (size: Size, want: Size): string[] =>
  size.width === want.width && size.height === want.height
    ? []
    : [`size ${size.width}×${size.height}, expected ${want.width}×${want.height}`];

export const verifyVideoFile = async (file: string, want: VideoExpectation) =>
  checkVideo(await probeMedia(file), fs.statSync(file).size, want);

export const verifyPngFile = (file: string, want: Size) => checkImage(pngSize(file), want);
```

- [ ] **Step 4: Implement the command**

`template/scripts/commands/export.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import type { Caption } from "@remotion/captions";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import type { Args } from "../lib/args";
import { WHATSAPP_LIMIT_BYTES, whatsappSettings } from "../lib/bitrate";
import { loadEpisodeDir, readJson, saveEpisodeRaw } from "../lib/episode-files";
import { buildSrt } from "../lib/srt";
import { verifyPngFile, verifyVideoFile } from "../lib/verify-output";

const TEMPLATE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const EXPORT_TARGETS = ["9x16", "whatsapp", "4x5", "cover-9x16", "cover-4x5", "srt"] as const;
export type ExportTarget = (typeof EXPORT_TARGETS)[number];
const VIDEO_TARGETS = new Set<ExportTarget>(["9x16", "whatsapp", "4x5"]);

export const parseTargets = (only: string | undefined): ExportTarget[] => {
  if (!only) {
    return [...EXPORT_TARGETS];
  }
  const list = only.split(",").map((t) => t.trim()).filter(Boolean);
  const unknown = list.filter((t) => !(EXPORT_TARGETS as readonly string[]).includes(t));
  if (unknown.length) {
    throw new Error(`Unknown export target(s): ${unknown.join(", ")}. Use: ${EXPORT_TARGETS.join(", ")}`);
  }
  return list as ExportTarget[];
};

export const outputName = (slug: string, target: ExportTarget): string =>
  ({
    "9x16": `${slug}-9x16.mp4`,
    whatsapp: `${slug}-whatsapp.mp4`,
    "4x5": `${slug}-4x5.mp4`,
    "cover-9x16": "cover-9x16.png",
    "cover-4x5": "cover-4x5.png",
    srt: `${slug}.srt`,
  })[target];

const compositionFor = (target: ExportTarget) => {
  const wide = target.endsWith("4x5");
  const cover = target.startsWith("cover");
  return {
    id: cover ? (wide ? "Cover45" : "Cover") : wide ? "Episode45" : "Episode",
    inputProps: {
      layoutName: wide ? "4x5" : "9x16",
      showGuides: false,
      checkMode: cover,
      episode: null,
      talent: null,
      sceneStarts: null,
    },
  };
};

const onBrowserLog = (log: { text: string }) => {
  if (log.text.includes("[reelkit]")) {
    console.warn(`  ${log.text}`);
  }
};

export const run = async (args: Args): Promise<number> => {
  const dir = args.positional[0];
  if (!dir) {
    console.error(`Usage: reelkit export <episodeDir> [--only=${EXPORT_TARGETS.join(",")}]`);
    return 2;
  }
  let targets: ExportTarget[];
  try {
    targets = parseTargets(typeof args.flags.only === "string" ? args.flags.only : undefined);
  } catch (err) {
    console.error((err as Error).message);
    return 2;
  }
  const loaded = loadEpisodeDir(dir);
  const { episode } = loaded;
  if (targets.some((t) => VIDEO_TARGETS.has(t)) && !episode.clip.src) {
    console.error(
      `✗ ${episode.slug} has no talent clip yet. Run: npm run reelkit -- sync prepare ${dir} <clip>, then sync apply.\n` +
        "  (Covers and subtitles can be exported now with --only=cover-9x16,cover-4x5,srt.)",
    );
    return 1;
  }
  if (!episode.captionsSrc) {
    console.warn("⚠ Captions are timed from the script (provisional): they were not synced to the voice.");
  }

  const outDir = path.join(dir, "exports");
  fs.mkdirSync(outDir, { recursive: true });
  let serveUrl: string | null = null;
  const getServeUrl = async () => {
    serveUrl ??= await bundle({ entryPoint: path.join(TEMPLATE_ROOT, "src/index.ts"), publicDir: path.resolve(dir) });
    return serveUrl;
  };

  const problems: string[] = [];
  for (const target of targets) {
    const name = outputName(episode.slug, target);
    const file = path.join(outDir, name);
    console.log(`→ ${name}`);
    if (target === "srt") {
      const captions = episode.captionsSrc ? (readJson(path.join(dir, episode.captionsSrc)) as Caption[]) : null;
      fs.writeFileSync(file, buildSrt(episode, captions));
      continue;
    }
    const { id, inputProps } = compositionFor(target);
    const url = await getServeUrl();
    const composition = await selectComposition({ serveUrl: url, id, inputProps, onBrowserLog });
    if (target.startsWith("cover")) {
      await renderStill({ serveUrl: url, composition, output: file, inputProps, imageFormat: "png", onBrowserLog });
      problems.push(...verifyPngFile(file, composition).map((p) => `${name}: ${p}`));
      continue;
    }
    const whatsapp = target === "whatsapp" ? whatsappSettings(episode.durationSeconds) : null;
    let shown = -1;
    await renderMedia({
      serveUrl: url,
      composition,
      inputProps,
      codec: "h264",
      pixelFormat: "yuv420p",
      outputLocation: file,
      onBrowserLog,
      ...(whatsapp
        ? { videoBitrate: whatsapp.videoBitrate, audioBitrate: whatsapp.audioBitrate, scale: whatsapp.scale }
        : { crf: 18, audioBitrate: "192k" }),
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 10) * 10;
        if (pct !== shown) {
          shown = pct;
          process.stdout.write(`\r  ${pct} %`);
        }
      },
    });
    process.stdout.write("\n");
    const scale = whatsapp?.scale ?? 1;
    const found = await verifyVideoFile(file, {
      durationSeconds: episode.durationSeconds,
      width: Math.round(composition.width * scale),
      height: Math.round(composition.height * scale),
      maxBytes: whatsapp ? WHATSAPP_LIMIT_BYTES : undefined,
    });
    problems.push(...found.map((p) => `${name}: ${p}`));
  }

  for (const target of targets) {
    const file = path.join(outDir, outputName(episode.slug, target));
    console.log(`  ${path.relative(process.cwd(), file)}  ${(fs.statSync(file).size / 1_000_000).toFixed(1)} MB`);
  }
  if (problems.length) {
    console.error(problems.map((p) => `✗ ${p}`).join("\n"));
    return 1;
  }
  if (targets.length === EXPORT_TARGETS.length) {
    saveEpisodeRaw(loaded, { stage: "exported" });
  }
  console.log(`✓ Exported ${targets.length} file(s) to ${outDir}`);
  return 0;
};
```
Add `export: () => import("./commands/export"),` to `COMMANDS`.

- [ ] **Step 5: Run tests, then export covers and subtitles of an example**

Run:
```bash
cd template
npx vitest run tests/scripts && npm run lint
T=$(mktemp -d)/smoke && cp -R examples/smoke "$T"
npm run reelkit -- export "$T" --only=9x16; echo "exit=$?"
npm run reelkit -- export "$T" --only=cover-9x16,cover-4x5,srt; echo "exit=$?"
ls -la "$T/exports" && head -8 "$T"/exports/*.srt
```
Expected: tests PASS; the first export stops with "has no talent clip yet" and exit 1; the second writes `cover-9x16.png` (1080×1920), `cover-4x5.png` (1080×1350) and the `.srt`, exit 0, `stage` still `built`. Open both covers with Read: the hook headline is legible, with no talent clip or captions. (Full video exports are exercised in Task 13, which has a real clip.)

- [ ] **Step 6: Commit**

```bash
git add template/scripts template/tests/scripts
git commit -m "feat(export): reelkit export renders every platform and verifies each file"
```

---

### Task 12: Plugin-root setup — `doctor` and `init-workspace`

**Files:**
- Create: `scripts/doctor.mjs`, `scripts/init-workspace.mjs`, `scripts/tests/doctor.test.mjs`, `scripts/tests/init-workspace.test.mjs` (repo root = plugin root; Node built-ins only, no install needed)

**Interfaces:**
- Produces:
  - `doctor.mjs`: `MIN_NODE_MAJOR = 20`, `MIN_FREE_BYTES = 3 GB`; `checkNode(version?)`, `checkCommand(name, fix)`, `checkDisk(dir, statfs?)`, `checkWorkspace(dir)` (null when `dir` isn't a workspace; otherwise flags a missing `node_modules`), `runDoctor(dir) → Result[]`, `formatResults(results) → string`. `Result = { ok: boolean; label: string; fix?: string }`. CLI: `node scripts/doctor.mjs [workspaceDir]` prints `✓ …` / `✗ … → fix` and exits 1 on any failure.
  - `init-workspace.mjs`: `initWorkspace({ target, update?, install?, templateDir?, runInstall?, now? }) → { target, templateVersion, updated }`. CLI: `node scripts/init-workspace.mjs <target> [--update] [--no-install]`.
    - New workspace: `target` must be missing or empty. Copies `template/` except `node_modules`, `out`, `.DS_Store`; creates `talents/` and `episodes/` (with `.gitkeep`); writes `.gitignore` (`node_modules/`, `out/`, `episodes/*/exports/`, `*.mp4`, `*.mov`, `*.m4v`, `*.webm`) and `reelkit.json` `{ templateVersion, createdAt, updatedAt }`.
    - `--update`: requires `reelkit.json`; replaces `src`, `scripts`, `tests`, `examples`, `package.json`, `package-lock.json`, `tsconfig.json`, `remotion.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `.prettierrc` from the template; keeps `talents/`, `episodes/` and anything else; updates `templateVersion`/`updatedAt`, keeps `createdAt`.
    - Runs `npm install` in `target` unless `install: false`.

- [ ] **Step 1: Write the failing tests**

`scripts/tests/doctor.test.mjs`:
```js
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkCommand, checkDisk, checkNode, checkWorkspace, formatResults } from "../doctor.mjs";

test("node version", () => {
  assert.equal(checkNode("22.1.0").ok, true);
  const old = checkNode("18.19.0");
  assert.equal(old.ok, false);
  assert.match(old.fix, /Node 20/);
});

test("missing command", () => {
  const result = checkCommand("reelkit-no-such-command", "install it");
  assert.deepEqual(result, { ok: false, label: "reelkit-no-such-command not found", fix: "install it" });
  assert.equal(checkCommand("node", "").ok, true);
});

test("disk space", () => {
  const statfs = (bavail) => () => ({ bavail, bsize: 4096 });
  assert.equal(checkDisk("/", statfs(2_000_000)).ok, true); // 7.6 GB
  const low = checkDisk("/", statfs(100_000)); // 0.4 GB
  assert.equal(low.ok, false);
  assert.match(low.label, /0\.4 GB free/);
});

test("workspace", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-doctor-"));
  assert.equal(checkWorkspace(dir), null);
  fs.writeFileSync(path.join(dir, "reelkit.json"), "{}");
  assert.equal(checkWorkspace(dir).ok, false);
  fs.mkdirSync(path.join(dir, "node_modules"));
  assert.equal(checkWorkspace(dir).ok, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("formatting", () => {
  assert.equal(
    formatResults([{ ok: true, label: "Node 22" }, { ok: false, label: "git not found", fix: "xcode-select --install" }]),
    "✓ Node 22\n✗ git not found → xcode-select --install",
  );
});
```

`scripts/tests/init-workspace.test.mjs`:
```js
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { initWorkspace } from "../init-workspace.mjs";

let root;
let templateDir;
let installs;
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const options = (target, extra = {}) => ({
  target,
  templateDir,
  runInstall: (dir) => installs.push(dir),
  now: () => new Date("2026-10-05T12:00:00Z"),
  ...extra,
});

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-init-"));
  templateDir = path.join(root, "template");
  write(path.join(templateDir, "package.json"), JSON.stringify({ version: "9.9.9" }));
  write(path.join(templateDir, "src", "a.ts"), "a");
  write(path.join(templateDir, "examples", "smoke", "episode.json"), "{}");
  write(path.join(templateDir, "node_modules", "x", "index.js"), "x");
  write(path.join(templateDir, "out", "y.png"), "y");
  write(path.join(templateDir, ".DS_Store"), "");
  installs = [];
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test("creates a workspace", () => {
  const target = path.join(root, "ws");
  const result = initWorkspace(options(target));
  assert.deepEqual(result, { target, templateVersion: "9.9.9", updated: false });
  assert.ok(fs.existsSync(path.join(target, "src", "a.ts")));
  assert.ok(fs.existsSync(path.join(target, "examples", "smoke", "episode.json")));
  for (const skipped of ["node_modules", "out", ".DS_Store"]) {
    assert.equal(fs.existsSync(path.join(target, skipped)), false, skipped);
  }
  assert.ok(fs.existsSync(path.join(target, "talents", ".gitkeep")));
  assert.ok(fs.existsSync(path.join(target, "episodes", ".gitkeep")));
  assert.match(fs.readFileSync(path.join(target, ".gitignore"), "utf8"), /episodes\/\*\/exports\//);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(target, "reelkit.json"), "utf8")), {
    templateVersion: "9.9.9",
    createdAt: "2026-10-05T12:00:00.000Z",
    updatedAt: "2026-10-05T12:00:00.000Z",
  });
  assert.deepEqual(installs, [target]);
});

test("refuses a non-empty folder without --update", () => {
  const target = path.join(root, "busy");
  write(path.join(target, "notes.txt"), "mine");
  assert.throws(() => initWorkspace(options(target)), /not empty.*--update/);
  assert.equal(fs.readFileSync(path.join(target, "notes.txt"), "utf8"), "mine");
});

test("updates the template but keeps talents and episodes", () => {
  const target = path.join(root, "ws");
  initWorkspace(options(target, { install: false }));
  write(path.join(target, "src", "old.ts"), "old");
  write(path.join(target, "episodes", "a", "episode.json"), "{\"mine\":true}");
  write(path.join(target, "talents", "dani.json"), "{}");
  write(path.join(templateDir, "package.json"), JSON.stringify({ version: "10.0.0" }));

  const result = initWorkspace(options(target, { update: true, now: () => new Date("2026-11-01T00:00:00Z") }));
  assert.equal(result.updated, true);
  assert.equal(fs.existsSync(path.join(target, "src", "old.ts")), false);
  assert.ok(fs.existsSync(path.join(target, "src", "a.ts")));
  assert.equal(fs.readFileSync(path.join(target, "episodes", "a", "episode.json"), "utf8"), "{\"mine\":true}");
  assert.ok(fs.existsSync(path.join(target, "talents", "dani.json")));
  const meta = JSON.parse(fs.readFileSync(path.join(target, "reelkit.json"), "utf8"));
  assert.deepEqual(meta, {
    templateVersion: "10.0.0",
    createdAt: "2026-10-05T12:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  });
  assert.deepEqual(installs, [target]);
});

test("--update refuses a folder that isn't a workspace", () => {
  const target = path.join(root, "plain");
  fs.mkdirSync(target);
  assert.throws(() => initWorkspace(options(target, { update: true })), /not a reelkit workspace/);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test scripts/tests/`
Expected: FAIL — cannot find `../doctor.mjs` / `../init-workspace.mjs`.

- [ ] **Step 3: Implement**

`scripts/doctor.mjs`:
```js
#!/usr/bin/env node
// Usage: node scripts/doctor.mjs [workspaceDir]
// Checks this machine (and optionally a workspace) for what reelkit needs. Node built-ins only.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MIN_NODE_MAJOR = 20;
export const MIN_FREE_BYTES = 3 * 1024 ** 3;

const ok = (label) => ({ ok: true, label });
const fail = (label, fix) => ({ ok: false, label, fix });

export const checkNode = (version = process.versions.node) =>
  Number(version.split(".")[0]) >= MIN_NODE_MAJOR
    ? ok(`Node ${version}`)
    : fail(`Node ${version} is too old`, `Install Node ${MIN_NODE_MAJOR} or newer from https://nodejs.org (or: brew install node)`);

export const checkCommand = (name, fix) => {
  try {
    const out = execFileSync(name, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return ok(`${name} ${out.trim().split("\n")[0]}`);
  } catch {
    return fail(`${name} not found`, fix);
  }
};

export const checkDisk = (dir, statfs = fs.statfsSync) => {
  const { bavail, bsize } = statfs(dir);
  const free = bavail * bsize;
  const gb = (free / 1024 ** 3).toFixed(1);
  return free >= MIN_FREE_BYTES
    ? ok(`${gb} GB free`)
    : fail(`${gb} GB free`, "Free at least 3 GB (Whisper's model and the renders need it)");
};

export const checkWorkspace = (dir) => {
  if (!fs.existsSync(path.join(dir, "reelkit.json"))) {
    return null;
  }
  return fs.existsSync(path.join(dir, "node_modules"))
    ? ok("Workspace dependencies installed")
    : fail("Workspace dependencies are missing", `Run: npm install (in ${dir})`);
};

export const runDoctor = (dir) =>
  [
    checkNode(),
    checkCommand("npm", "npm comes with Node: reinstall Node from https://nodejs.org"),
    checkCommand("git", "Install git: xcode-select --install (macOS) or https://git-scm.com"),
    checkDisk(dir),
    checkWorkspace(dir),
  ].filter(Boolean);

export const formatResults = (results) =>
  results.map((r) => (r.ok ? `✓ ${r.label}` : `✗ ${r.label} → ${r.fix}`)).join("\n");

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const results = runDoctor(path.resolve(process.argv[2] ?? "."));
  console.log(formatResults(results));
  process.exitCode = results.every((r) => r.ok) ? 0 : 1;
}
```

`scripts/init-workspace.mjs`:
```js
#!/usr/bin/env node
// Usage: node scripts/init-workspace.mjs <target> [--update] [--no-install]
// Creates a reelkit workspace from template/, or updates one in place. Node built-ins only.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", "out", ".DS_Store"]);
const REPLACED_ON_UPDATE = [
  "src",
  "scripts",
  "tests",
  "examples",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "remotion.config.ts",
  "eslint.config.mjs",
  "vitest.config.ts",
  ".prettierrc",
];
const GITIGNORE = ["node_modules/", "out/", "episodes/*/exports/", "*.mp4", "*.mov", "*.m4v", "*.webm", ".DS_Store", ""].join("\n");

const copy = (from, to) => fs.cpSync(from, to, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const npmInstall = (dir) => execFileSync("npm", ["install"], { cwd: dir, stdio: "inherit" });

export const initWorkspace = ({
  target,
  update = false,
  install = true,
  templateDir = path.join(PLUGIN_ROOT, "template"),
  runInstall = npmInstall,
  now = () => new Date(),
}) => {
  const templateVersion = JSON.parse(fs.readFileSync(path.join(templateDir, "package.json"), "utf8")).version;
  const metaFile = path.join(target, "reelkit.json");
  const stamp = now().toISOString();
  if (update) {
    if (!fs.existsSync(metaFile)) {
      throw new Error(`${target} is not a reelkit workspace (no reelkit.json)`);
    }
    for (const name of REPLACED_ON_UPDATE) {
      fs.rmSync(path.join(target, name), { recursive: true, force: true });
      if (fs.existsSync(path.join(templateDir, name))) {
        copy(path.join(templateDir, name), path.join(target, name));
      }
    }
    const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    writeJson(metaFile, { ...meta, templateVersion, updatedAt: stamp });
  } else {
    if (fs.existsSync(target) && fs.readdirSync(target).length) {
      throw new Error(`${target} is not empty. To update an existing workspace, use --update.`);
    }
    copy(templateDir, target);
    for (const dir of ["talents", "episodes"]) {
      fs.mkdirSync(path.join(target, dir), { recursive: true });
      fs.writeFileSync(path.join(target, dir, ".gitkeep"), "");
    }
    fs.writeFileSync(path.join(target, ".gitignore"), GITIGNORE);
    writeJson(metaFile, { templateVersion, createdAt: stamp, updatedAt: stamp });
  }
  if (install) {
    runInstall(target);
  }
  return { target, templateVersion, updated: update };
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith("--"));
  if (!target) {
    console.error("Usage: node scripts/init-workspace.mjs <target> [--update] [--no-install]");
    process.exit(2);
  }
  try {
    const result = initWorkspace({
      target: path.resolve(target),
      update: args.includes("--update"),
      install: !args.includes("--no-install"),
    });
    console.log(`✓ ${result.updated ? "Updated" : "Created"} ${result.target} (template ${result.templateVersion})`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run tests and the CLIs**

Run:
```bash
node --test scripts/tests/
node scripts/doctor.mjs
WS=$(mktemp -d)/ws && node scripts/init-workspace.mjs "$WS" --no-install && ls -a "$WS" && cat "$WS/reelkit.json"
node scripts/init-workspace.mjs "$WS" --no-install; echo "exit=$?"
node scripts/init-workspace.mjs "$WS" --update --no-install; echo "exit=$?"
```
Expected: all node tests pass; doctor prints ✓ for Node, npm, git and disk; the workspace has `src scripts tests examples talents episodes reelkit.json .gitignore` and no `node_modules`; the second init fails with "not empty … --update" (exit 1); the update succeeds (exit 0).

- [ ] **Step 5: Commit**

```bash
git add scripts
git commit -m "feat(setup): doctor and init-workspace scripts at the plugin root"
```

---

### Task 13: End to end with a real recording

**Files:**
- Create: `template/tests/fixtures/clip-maker/index.ts`, `template/tests/fixtures/clip-maker/Root.tsx`, `template/tests/fixtures/clip-maker/make-clip.mjs`
- Modify: whatever the run below shows is broken, each with a regression test in the owning file's test

**Interfaces:**
- Produces: `node tests/fixtures/clip-maker/make-clip.mjs <episodeDir> <out.mp4> [--lead=1.2]` (macOS) — speaks the episode's script with a Spanish `say` voice, with `--lead` seconds of silence first and 0.5 s between lines, and renders it as a 1080×1920 H.264 clip with a running timer on screen. It is a stand-in for the talent's phone recording.

- [ ] **Step 1: Write the clip maker**

`template/tests/fixtures/clip-maker/index.ts`:
```ts
import { registerRoot } from "remotion";
import { ClipMakerRoot } from "./Root";

registerRoot(ClipMakerRoot);
```

`template/tests/fixtures/clip-maker/Root.tsx`:
```tsx
import { Audio } from "@remotion/media";
import { AbsoluteFill, Composition, staticFile, useCurrentFrame } from "remotion";

const TestClip: React.FC<{ readonly seconds: number }> = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#2f7a5a", justifyContent: "center", alignItems: "center" }}>
      <div style={{ color: "white", fontSize: 180, fontFamily: "sans-serif" }}>{(frame / 30).toFixed(1)}</div>
      <Audio src={staticFile("voice.wav")} />
    </AbsoluteFill>
  );
};

export const ClipMakerRoot: React.FC = () => (
  <Composition
    id="TestClip"
    component={TestClip}
    fps={30}
    width={1080}
    height={1920}
    durationInFrames={30}
    defaultProps={{ seconds: 1 }}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(props.seconds * 30) })}
  />
);
```

`template/tests/fixtures/clip-maker/make-clip.mjs`:
```js
#!/usr/bin/env node
// Usage: node tests/fixtures/clip-maker/make-clip.mjs <episodeDir> <out.mp4> [--lead=1.2]
// macOS only. Speaks the episode's script with a Spanish `say` voice and renders a
// 1080×1920 test clip with that voice: a stand-in for the talent's phone recording.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const [episodeDir, out] = args.filter((a) => !a.startsWith("--"));
const lead = Number((args.find((a) => a.startsWith("--lead=")) ?? "--lead=1.2").split("=")[1]);
if (!episodeDir || !out) {
  console.error("Usage: node tests/fixtures/clip-maker/make-clip.mjs <episodeDir> <out.mp4> [--lead=1.2]");
  process.exit(2);
}

const voices = execFileSync("say", ["-v", "?"], { encoding: "utf8" }).split("\n");
const voice = voices.map((line) => line.match(/^(.+?)\s+es_[A-Z]{2}\s+#/)).find(Boolean)?.[1].trim();
if (!voice) {
  console.error("No Spanish voice for `say`. Add one in System Settings → Accessibility → Spoken Content.");
  process.exit(1);
}

const { script } = JSON.parse(fs.readFileSync(path.join(episodeDir, "episode.json"), "utf8"));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "clip-maker-"));
const wav = path.join(work, "voice.wav");
const text = `[[slnc ${Math.round(lead * 1000)}]] ${script.join(" [[slnc 500]] ")}`;
execFileSync("say", ["-v", voice, "-o", wav, "--data-format=LEI16@48000", text]);
const seconds = Number(execFileSync("afinfo", [wav], { encoding: "utf8" }).match(/estimated duration: ([\d.]+)/)[1]);

const serveUrl = await bundle({ entryPoint: path.join(here, "index.ts"), publicDir: work });
const inputProps = { seconds };
const composition = await selectComposition({ serveUrl, id: "TestClip", inputProps });
await renderMedia({ serveUrl, composition, inputProps, codec: "h264", outputLocation: path.resolve(out) });
console.log(`✓ ${out}: ${seconds.toFixed(1)} s, voice "${voice}", ${lead} s of silence first`);
```

- [ ] **Step 2: Run the whole flow in a fresh workspace**

Run from the repo root (the first `init` runs `npm install`, and the first `sync prepare` downloads the `small` model, ≈ 586 MB):
```bash
E2E=$(mktemp -d) && WS="$E2E/ws"
node scripts/doctor.mjs
node scripts/init-workspace.mjs "$WS"
cd "$WS"
cp -R examples/dani-chocolate episodes/2026-10-chocolate
EP=episodes/2026-10-chocolate
npm run reelkit -- validate $EP
npm run reelkit -- script $EP && cat $EP/script.md
node tests/fixtures/clip-maker/make-clip.mjs $EP "$E2E/clip.mp4"
npm run reelkit -- whisper download --model=small
npm run reelkit -- sync prepare $EP "$E2E/clip.mp4" --model=small
cat $EP/sync-report.md
npm run reelkit -- sync apply $EP
npm run check -- $EP
npm run reelkit -- export $EP
npm run reelkit -- status episodes
ls -la $EP/exports && head -12 $EP/exports/2026-10-chocolate.srt
```
Expected:
- `doctor` all ✓.
- `script.md` has 5 rows (0,0–30,0 s) and 71 words.
- The clip is ~25–29 s.
- `sync-report.md` shows a trim of ≈ 1,0 s (1.2 s of lead minus the 0.2 s kept), five scene cuts, and at least 85 % of the words matching (a synthetic voice is clear; a few corrected words are fine).
- `apply` reports synced.
- `check` passes.
- `export` writes six files with no ✗ lines, the WhatsApp file is under 16 MB, and the status shows `exported` with "Ready to publish".

Then look at the result:
```bash
npx remotion still Episode "$E2E/f400.png" --public-dir $EP --frame=400
npx remotion still Episode45 "$E2E/f45-400.png" --public-dir $EP --frame=400
```
Open both with Read: the clip (green, with its timer) fills the bottom-right talent slot, the caption shows the words being spoken at 13,3 s, and the stage block is not covered.

- [ ] **Step 3: Fix what broke**

For each failure in Step 2, use superpowers:systematic-debugging. Add a regression test to the test file of the code you change, fix it, run `npx vitest run && npm run lint` in `template/`, and commit each fix separately (`fix(sync): …`, `fix(export): …`). Make the fixes in the plugin's `template/`, not in the throwaway workspace, then rerun Step 2 from `init-workspace` until it passes end to end. Record in the commit message any number you had to change (e.g., a tolerance) and why.

- [ ] **Step 4: Full verification**

Run:
```bash
cd template && npx vitest run && npm run lint && npm run check && npm run check:gallery
cd .. && node --test scripts/tests/
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add template/tests/fixtures
git commit -m "test(e2e): clip maker for an end-to-end run with a synthetic recording"
```
