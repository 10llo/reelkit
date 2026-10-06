# reelkit Plan 4 — Plugin Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the repo into an installable Claude Code plugin — manifest and single-plugin marketplace, the five `/reelkit:*` commands, the six skills and the `trend-researcher` agent — so a team member can install it from GitHub and go from `/reelkit:setup` to exported videos, with CI guarding it.

**Architecture:** The plugin is mostly Markdown that instructs Claude; the deterministic work stays in code that already exists (template `reelkit` CLI, plugin-root `doctor.mjs` / `init-workspace.mjs`) plus three small additions: a workspace resolver at the plugin root, and `catalog`, `episode create` and `talent validate` CLI commands so Claude reads exact block schemas from code instead of from prose that drifts. A Node `node:test` content-lint suite checks every command/skill/agent file against the code it references (CLI command names, npm scripts, plugin paths, block names, versions), and `claude plugin validate` checks the manifests.

**Tech Stack:** Claude Code plugin format (`.claude-plugin/plugin.json`, `marketplace.json`, `commands/*.md`, `skills/*/SKILL.md`, `agents/*.md`, `${CLAUDE_PLUGIN_ROOT}`), Node ≥ 20 built-ins (`node:test`), the Plan 1–3 template (Remotion 4.0.532, zod 4.5.4 with `z.toJSONSchema`, tsx 4.23.15, Vitest 3.2.4), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-05-reelkit-design.md` — §1 (success criteria), §3 (packaging, workspace, talent profile), §4 (commands and the timeline script), §5 (block choice, block contract), §6 (research), §7–§8 (clip sync and export, implemented in Plan 3), §9 (error handling), §10 (CI). Plans 1–3 are merged on `main`.

**Decisions carried into this plan (rulings against the spec, made here):**
- Transcription is `@remotion/whisper-webgpu` (Plan 3), so `/reelkit:setup` downloads the Whisper model with `npm run reelkit -- whisper download` instead of installing whisper.cpp; the pipeline scripts live in `template/scripts/` (Plan 3) rather than at the plugin root. Node ≥ 20 (not 18): the template's toolchain needs it.
- The workspace path is remembered in `~/.config/reelkit/config.json` (`{ "workspace": "<abs path>" }`), overridable with `$REELKIT_STUDIO`; default `~/reelkit-studio`. Commands resolve it with `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"`.
- The Chrome-extension check of spec §4 is done by the `/reelkit:setup` command itself (are the `mcp__claude-in-chrome__*` tools available?), not by `doctor.mjs`, which cannot see Claude's tools. It only warns.
- `examples/engineering-sample` (spec §10) stays out: the user asked to focus on veterinary content; `dani-chocolate` and `dani-fiebre` are the reference episodes.
- Plugin version = template version, starting at `0.4.0` (this plan bumps `template/package.json` from 0.1.0). The repo is `github.com/10llo/reelkit` (the logged-in GitHub account); creating or pushing it is not part of this plan.

## Global Constraints

- Plugin-root scripts (`scripts/*.mjs`) use only Node built-ins and run on Node ≥ 20; their tests run with `node --test scripts/tests/*.test.mjs`.
- No machine-specific paths anywhere in the plugin: commands, skills and agents reference plugin files only through `${CLAUDE_PLUGIN_ROOT}` and the workspace only through the path `workspace.mjs` prints.
- Exact pins stay as in Plans 1–3 (`remotion`/`@remotion/*` 4.0.532, `zod` 4.5.4, `tsx` 4.23.15, `mediabunny` 1.56.1); this plan adds no runtime dependency.
- Every command pauses for user approval at its decision points: angle, script, caption corrections, overrun handling (spec §4). Nothing is applied to an episode without that approval (`sync prepare` → review → `sync apply`).
- Generated files the talent or the team reads (`research.md`, `script-draft.md`, `script.md`, `sync-report.md`) are in the talent's language (Spanish for the examples); the plugin's own instructions are in English.
- Facts shown on screen cite a source page that was actually opened; veterinary and medical figures are flagged for the talent to confirm (spec §6). Talent handles are never invented (spec §3).
- `plugin.json` version, the marketplace entry version and `template/package.json` version are always equal.
- The `examples/dani-chocolate` copy is the user's exact text and never changes.
- Every commit message ends with a blank line, `Co-Authored-By: Claude <model> <noreply@anthropic.com>` naming the model that wrote it, and `Claude-Session: https://claude.ai/code/session_01UdnkJidy4X8k78jUVALBZ3`.

## Review Focus

1. **No workspace yet, or a stale one** (a teammate runs `/reelkit:new` before `/reelkit:setup`, or after updating the plugin without `--update`): every command must stop with "run /reelkit:setup" or "run /reelkit:setup --update" instead of failing deep inside npm. Pinned in Task 3 (`resolveWorkspace` / `versionNotice` tests) and Task 6 (each command's first step, checked by the content lint).
2. **Prose that drifts from code** (a skill names a CLI command, npm script, block or file that doesn't exist, or a version that no longer matches): the content-lint suite fails. Pinned in Tasks 4–6 (`plugin-content.test.mjs`).
3. **An episode abandoned mid-way** (research done, no `episode.json` yet): `/reelkit:status` must still list it with the right next step instead of hiding it. Pinned in Task 1 (`listEpisodes` in-progress tests).
4. **Claude writing props that look right but don't fit** (wrong block props, words too long, a palette color that doesn't exist): authoring always goes through `catalog` → write → `validate` → `npm run check`, and the skill tells Claude to fix and re-run until both pass. Pinned in Task 2 (`catalog` tests prove the schemas are exported) and Task 5 (the lint requires the validate/check loop text in `episode-authoring`).
5. **Talent profile mistakes at setup** (bad colour, missing disclaimer, invented handles): the profile is validated by `reelkit talent validate` before it is saved for use, and the setup command asks for handles instead of inventing them. Pinned in Task 2 (`talent validate` tests) and Task 6 (setup command text, checked by the lint).

---

## File Structure

```
reelkit/                                 (repo = plugin root = marketplace)
  .claude-plugin/
    plugin.json                          manifest (name reelkit, version = template version)
    marketplace.json                     single-plugin marketplace, source "./"
  commands/
    setup.md  new.md  clip.md  export.md  status.md
  skills/
    trend-research/SKILL.md              sources, queries, scoring, research.md format
    script-writing/SKILL.md              word budget, 3-step frames, voice, script-draft.md
    episode-authoring/SKILL.md           catalog → write → validate → check loop, block choice
    block-authoring/SKILL.md             contract for adding a new block
    caption-sync/SKILL.md                sync prepare → review → apply
    social-export/SKILL.md               export targets, verification, delivery
  agents/
    trend-researcher.md                  background research → research.md
  scripts/
    doctor.mjs  init-workspace.mjs       (Plan 3)
    workspace.mjs                        resolve / remember the workspace; template version notice
    tests/
      doctor.test.mjs  init-workspace.test.mjs   (Plan 3)
      workspace.test.mjs
      plugin-content.test.mjs            content lint + `claude plugin validate`
  .github/workflows/ci.yml               template + plugin jobs
  README.md
  template/
    package.json                         version 0.4.0
    scripts/reelkit.ts                   + catalog, episode, talent; own-key lookup
    scripts/commands/catalog.ts  episode.ts  talent.ts
    scripts/lib/catalog.ts               block / episode JSON schemas, compact summary
    scripts/lib/episode-scaffold.ts      create an episode folder with a talent snapshot
    scripts/lib/status.ts                + in-progress folders (no episode.json yet)
    scripts/lib/sync-report.ts           header names the staged clip
    src/blocks/parts/CountUpText.tsx     + widestText; Gauge reserves the widest of min/value
    tests/scripts/catalog.test.ts  episode-scaffold.test.ts  talent.test.ts  (+ status, sync-report, count-up)
```

---

### Task 1: Plan 3 follow-ups — own-key commands, in-progress episodes, staged clip name, Gauge width

**Files:**
- Modify: `template/scripts/reelkit.ts`, `template/scripts/lib/status.ts`, `template/scripts/lib/sync-report.ts`, `template/src/blocks/parts/CountUpText.tsx`, `template/src/blocks/Gauge.tsx`
- Test: `template/tests/scripts/status.test.ts`, `template/tests/scripts/sync.test.ts`, `template/tests/scripts/cli.test.ts` (new), `template/tests/count-up.test.ts` (new)

**Interfaces:**
- Produces:
  - `reelkit.ts` looks commands up with `Object.prototype.hasOwnProperty.call(COMMANDS, name)` (the template's `lib` is ES2020, so no `Object.hasOwn`), so `reelkit toString` prints usage (exit 2) instead of crashing.
  - `listEpisodes(root)` also lists folders under `root` that have no `episode.json` but have `script-draft.md` (stage `scripted`) or `research.md` (stage `researched`); `EpisodeStatus` gains nothing new (they have `hasClip: false`, `captions: "provisional"`, `next: NEXT_STEP[stage]`, no `slug`/`durationSeconds`). `formatStatus` prints them as `• <folder> — <stage> (no video yet)\n  next: <next>`.
  - The sync report header reads `**Clip:** <stagedClip> (se guarda como <clip.src>) · …`.
  - `widestText(texts: string[]): string` exported from `src/blocks/parts/CountUpText.tsx` (the longest string; the first on ties). Gauge reserves `widestText([format(min), format(value)])`, so a counter that starts at a wide `min` (e.g. −1000) never grows past the reserved width.

- [ ] **Step 1: Write the failing tests**

Append to `template/tests/scripts/status.test.ts`:
```ts
it("lists episodes that don't have a video yet", () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-status-"));
  fs.mkdirSync(path.join(tmp, "2026-10-pulgas"));
  fs.writeFileSync(path.join(tmp, "2026-10-pulgas", "research.md"), "# Investigación\n");
  fs.mkdirSync(path.join(tmp, "2026-10-vacunas"));
  fs.writeFileSync(path.join(tmp, "2026-10-vacunas", "research.md"), "# Investigación\n");
  fs.writeFileSync(path.join(tmp, "2026-10-vacunas", "script-draft.md"), "# Guion\n");
  fs.mkdirSync(path.join(tmp, "empty-folder"));
  const list = listEpisodes(tmp);
  expect(list.map((e) => [e.folder, e.stage])).toEqual([
    ["2026-10-pulgas", "researched"],
    ["2026-10-vacunas", "scripted"],
  ]);
  expect(list[0].next).toContain("/reelkit:new");
  expect(formatStatus(list)).toContain("• 2026-10-pulgas — researched (no video yet)");
});
```

`template/tests/scripts/cli.test.ts`:
```ts
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
import { TEMPLATE_ROOT } from "./paths";

const reelkit = (...args: string[]) => {
  try {
    execFileSync("npx", ["tsx", "scripts/reelkit.ts", ...args], { cwd: TEMPLATE_ROOT, stdio: "pipe", encoding: "utf8" });
    return { code: 0, stderr: "" };
  } catch (err) {
    const e = err as { status: number; stderr: string };
    return { code: e.status, stderr: e.stderr };
  }
};

it("treats inherited object keys as unknown commands", () => {
  for (const name of ["toString", "constructor", "__proto__"]) {
    const result = reelkit(name);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Usage: npm run reelkit");
  }
}, 30_000);
```

`template/tests/count-up.test.ts`:
```ts
import { expect, it } from "vitest";
import { widestText } from "../src/blocks/parts/CountUpText";

it("picks the longest text, the first on ties", () => {
  expect(widestText(["5", "-1.000"])).toBe("-1.000");
  expect(widestText(["38,5", "42,0"])).toBe("38,5");
  expect(widestText(["100"])).toBe("100");
});
```

In `template/tests/scripts/sync.test.ts`, in the first test ("proposes trim, scene cuts and captions without touching episode.json"), add after the existing `expect(report).toContain("# Sincronización — 2026-10-chocolate");` line:
```ts
    expect(report).toContain("**Clip:** talent.proposed.mov (se guarda como talent.mov)");
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd template && npx vitest run tests/scripts/status.test.ts tests/scripts/cli.test.ts tests/count-up.test.ts tests/scripts/sync.test.ts`
Expected: FAIL — in-progress folders aren't listed; `reelkit toString` exits 1 with a TypeError; `widestText` is not exported; the report header says `talent.mov`.

- [ ] **Step 3: Implement**

`template/scripts/reelkit.ts` — replace the lookup line:
```ts
  const load = name && Object.prototype.hasOwnProperty.call(COMMANDS, name) ? COMMANDS[name] : undefined;
```

`template/scripts/lib/status.ts` — replace `listEpisodes` and `formatStatus` with:
```ts
const draftStage = (dir: string): Stage | null =>
  fs.existsSync(path.join(dir, "script-draft.md")) ? "scripted" : fs.existsSync(path.join(dir, "research.md")) ? "researched" : null;

export const listEpisodes = (root: string): EpisodeStatus[] => {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs
    .readdirSync(root)
    .filter((name) => fs.statSync(path.join(root, name)).isDirectory())
    .sort()
    .flatMap((folder): EpisodeStatus[] => {
      const dir = path.join(root, folder);
      if (!fs.existsSync(path.join(dir, "episode.json"))) {
        const stage = draftStage(dir);
        return stage ? [{ folder, stage, hasClip: false, captions: "provisional", next: NEXT_STEP[stage] }] : [];
      }
      try {
        const { episode } = loadEpisodeDir(dir);
        return [
          {
            folder,
            slug: episode.slug,
            stage: episode.stage,
            durationSeconds: episode.durationSeconds,
            hasClip: episode.clip.src !== "",
            captions: episode.captionsSrc ? "synced" : "provisional",
            next: NEXT_STEP[episode.stage],
          },
        ];
      } catch (err) {
        return [{ folder, hasClip: false, captions: "provisional", next: "Fix the episode files", error: (err as Error).message }];
      }
    });
};

export const formatStatus = (list: EpisodeStatus[]): string => {
  if (!list.length) {
    return "No episodes yet.";
  }
  return list
    .map((e) => {
      if (e.error) {
        return `✗ ${e.folder}: ${e.error.split("\n")[0]}`;
      }
      if (e.durationSeconds === undefined) {
        return `• ${e.folder} — ${e.stage} (no video yet)\n  next: ${e.next}`;
      }
      return `• ${e.folder} — ${e.stage}, ${e.durationSeconds} s, clip: ${e.hasClip ? "yes" : "no"}, captions: ${e.captions}\n  next: ${e.next}`;
    })
    .join("\n");
};
```
Also change `NEXT_STEP.researched` to `"Pick an angle and write the script: continue /reelkit:new"` and `NEXT_STEP.scripted` to `"Build the video from script-draft.md: continue /reelkit:new"`.

`template/scripts/lib/sync-report.ts` — the clip header line becomes:
```ts
    `**Clip:** ${proposal.stagedClip} (se guarda como ${proposal.clip.src}) · ${s1(info.durationSeconds)} s · ${info.width}×${info.height}${info.fps ? ` · ${Math.round(info.fps)} fps` : ""}`,
```

`template/src/blocks/parts/CountUpText.tsx` — add above the component:
```tsx
/** The longest of `texts` (the first on ties): what a counter must reserve room for. */
export const widestText = (texts: string[]): string => texts.reduce((wide, t) => (t.length > wide.length ? t : wide));
```

`template/src/blocks/Gauge.tsx` — import `widestText` alongside `CountUpText` and change the value line to:
```tsx
        <CountUpText current={format.format(shown)} final={widestText([format.format(props.min), format.format(props.value)])} />
```

- [ ] **Step 4: Run tests, lint and the checks**

Run: `cd template && npx vitest run && npm run lint && npm run check && npm run check:gallery`
Expected: all PASS (the Gauge change is invisible for min=0 gauges, which is every example).

- [ ] **Step 5: Commit**

```bash
git add template/scripts template/src/blocks template/tests
git commit -m "fix: list in-progress episodes, own-key CLI lookup, staged clip name, Gauge width"
```

---

### Task 2: `reelkit catalog`, `reelkit episode create`, `reelkit talent validate`

**Files:**
- Create: `template/scripts/lib/catalog.ts`, `template/scripts/lib/episode-scaffold.ts`, `template/scripts/commands/catalog.ts`, `template/scripts/commands/episode.ts`, `template/scripts/commands/talent.ts`
- Modify: `template/scripts/reelkit.ts` (add `catalog`, `episode`, `talent`)
- Test: `template/tests/scripts/catalog.test.ts`, `template/tests/scripts/episode-scaffold.test.ts`, `template/tests/scripts/talent.test.ts`

**Interfaces:**
- Consumes: `BLOCK_SCHEMAS`, `BlockName` (`src/blocks/schemas.ts`); `episodeSchema` (`src/episode/schema.ts`); `talentSchema` (`src/episode/talent.ts`); `ICON_NAMES`, `DIAGRAM_NAMES` (`src/icons/names.ts`); `validateTalent` (`src/episode/validate.ts`); `readJson`, `writeJson` (`scripts/lib/episode-files.ts`); `Args` (`scripts/lib/args.ts`).
- Produces:
  - `blockNames(): BlockName[]` (sorted), `blockSchema(name): JsonSchema` (throws `Unknown block "<name>". Blocks: …`), `episodeJsonSchema()`, `talentJsonSchema()`, `summarizeBlock(name): string` (`"Process: steps[3–5], connector?, highlightStep?"` — required props first, `?` optional, `[min–max]` list lengths).
  - `episodeFolderName(slug, now): string` → `"2026-10-<slug>"`; `createEpisode(root, { slug, talentId, now? }): string` (absolute folder path) — validates the slug and `talents/<id>.json` (id must match), refuses an existing folder, writes `talent.json` (the raw profile snapshot) into the new folder and nothing else.
  - CLI (run from the workspace root):
    - `reelkit catalog` — every block's summary + how to get details; `--block=<Name>` full JSON Schema of its props; `--episode`, `--talent` the file schemas; `--icons` `{ icons, diagrams }`.
    - `reelkit episode create <slug> --talent=<id>` → `✓ Created episodes/<yyyy-mm>-<slug>` (exit 1 with the reason otherwise).
    - `reelkit talent validate <file>` → `✓ <id>: <displayName>` or `✗ <issues>` (exit 1); the file name must be `<id>.json`.

The JSON Schemas come from `z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })` (verified on `Process`: `steps` has `minItems: 3`, `maxItems: 5`). Refinements (per-word limits, "accent must appear in text") are not representable, so authors still run `validate`.

- [ ] **Step 1: Write the failing tests**

`template/tests/scripts/catalog.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { blockNames, blockSchema, episodeJsonSchema, summarizeBlock, talentJsonSchema } from "../../scripts/lib/catalog";

describe("catalog", () => {
  it("knows all 20 blocks", () => {
    const names = blockNames();
    expect(names).toHaveLength(20);
    expect(names).toContain("Process");
    expect([...names].sort()).toEqual(names);
  });
  it("exports a block's props as JSON Schema", () => {
    const schema = blockSchema("Process") as { properties: { steps: { minItems: number; maxItems: number } } };
    expect(schema.properties.steps.minItems).toBe(3);
    expect(schema.properties.steps.maxItems).toBe(5);
  });
  it("rejects unknown and inherited names", () => {
    expect(() => blockSchema("Nope")).toThrow(/Unknown block "Nope"\. Blocks: Anatomy, BigStat/);
    expect(() => blockSchema("toString")).toThrow(/Unknown block/);
  });
  it("summarizes every block in one line", () => {
    expect(summarizeBlock("Process")).toMatch(/^Process: steps\[3–5\]/);
    for (const name of blockNames()) {
      expect(summarizeBlock(name)).toMatch(new RegExp(`^${name}: .+`));
    }
  });
  it("exports the episode and talent schemas", () => {
    const episode = episodeJsonSchema() as { properties: { durationSeconds: { maximum: number } } };
    expect(episode.properties.durationSeconds.maximum).toBe(60);
    const talent = talentJsonSchema() as { required: string[] };
    expect(talent.required).toContain("disclaimer");
  });
});
```

`template/tests/scripts/episode-scaffold.test.ts`:
```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEpisode, episodeFolderName } from "../../scripts/lib/episode-scaffold";
import { TEMPLATE_ROOT } from "./paths";

const NOW = new Date(2026, 9, 6);
let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-ws-"));
  fs.mkdirSync(path.join(root, "talents"));
  fs.copyFileSync(path.join(TEMPLATE_ROOT, "examples", "dani-chocolate", "talent.json"), path.join(root, "talents", "dani.json"));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("createEpisode", () => {
  it("names folders by month and slug", () => {
    expect(episodeFolderName("pulgas", NOW)).toBe("2026-10-pulgas");
  });
  it("creates the folder with a talent snapshot", () => {
    const dir = createEpisode(root, { slug: "pulgas", talentId: "dani", now: NOW });
    expect(dir).toBe(path.join(root, "episodes", "2026-10-pulgas"));
    expect(fs.readdirSync(dir)).toEqual(["talent.json"]);
    expect(JSON.parse(fs.readFileSync(path.join(dir, "talent.json"), "utf8")).id).toBe("dani");
  });
  it("refuses an existing folder", () => {
    createEpisode(root, { slug: "pulgas", talentId: "dani", now: NOW });
    expect(() => createEpisode(root, { slug: "pulgas", talentId: "dani", now: NOW })).toThrow(/already exists/);
  });
  it("explains a missing or mismatched talent", () => {
    expect(() => createEpisode(root, { slug: "pulgas", talentId: "ana", now: NOW })).toThrow(/No talent profile .*ana\.json.*\/reelkit:setup/);
    fs.copyFileSync(path.join(root, "talents", "dani.json"), path.join(root, "talents", "ana.json"));
    expect(() => createEpisode(root, { slug: "pulgas", talentId: "ana", now: NOW })).toThrow(/id "dani" does not match/);
  });
  it("rejects a bad slug", () => {
    expect(() => createEpisode(root, { slug: "Pulgas en Otoño", talentId: "dani", now: NOW })).toThrow(/a-z, 0-9/);
  });
});
```

`template/tests/scripts/talent.test.ts`:
```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { run } from "../../scripts/commands/talent";
import { TEMPLATE_ROOT } from "./paths";

let dir: string;
const talent = () => JSON.parse(fs.readFileSync(path.join(TEMPLATE_ROOT, "examples", "dani-chocolate", "talent.json"), "utf8"));
const write = (name: string, value: unknown) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
};
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-talent-"));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

it("accepts a valid profile", async () => {
  expect(await run({ positional: ["validate", write("dani.json", talent())], flags: {} })).toBe(0);
  expect(vi.mocked(console.log).mock.calls.join("\n")).toContain("✓ dani: Dogtora Dani");
});
it("reports a bad colour with its path", async () => {
  const bad = { ...talent(), colors: { ...talent().colors, accent: "orange" } };
  expect(await run({ positional: ["validate", write("dani.json", bad)], flags: {} })).toBe(1);
  expect(vi.mocked(console.error).mock.calls.join("\n")).toMatch(/talent\.colors\.accent/);
});
it("requires the file name to match the id", async () => {
  expect(await run({ positional: ["validate", write("ana.json", talent())], flags: {} })).toBe(1);
  expect(vi.mocked(console.error).mock.calls.join("\n")).toContain('id "dani" does not match the file name ana.json');
});
it("prints usage without a file", async () => {
  expect(await run({ positional: [], flags: {} })).toBe(2);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd template && npx vitest run tests/scripts/catalog.test.ts tests/scripts/episode-scaffold.test.ts tests/scripts/talent.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`template/scripts/lib/catalog.ts`:
```ts
import { z } from "zod";
import { BLOCK_SCHEMAS, type BlockName } from "../../src/blocks/schemas";
import { episodeSchema } from "../../src/episode/schema";
import { talentSchema } from "../../src/episode/talent";

export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  [key: string]: unknown;
};

const toJsonSchema = (schema: z.ZodType): JsonSchema =>
  z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as JsonSchema;

export const blockNames = (): BlockName[] => (Object.keys(BLOCK_SCHEMAS) as BlockName[]).sort();

export const blockSchema = (name: string): JsonSchema => {
  if (!Object.prototype.hasOwnProperty.call(BLOCK_SCHEMAS, name)) {
    throw new Error(`Unknown block "${name}". Blocks: ${blockNames().join(", ")}`);
  }
  return toJsonSchema(BLOCK_SCHEMAS[name as BlockName]);
};

export const episodeJsonSchema = (): JsonSchema => toJsonSchema(episodeSchema);
export const talentJsonSchema = (): JsonSchema => toJsonSchema(talentSchema);

/** One line per block: required props first, `?` optional, `[min–max]` list lengths. */
export const summarizeBlock = (name: string): string => {
  const schema = blockSchema(name);
  const required = new Set(schema.required ?? []);
  const props = Object.entries(schema.properties ?? {}).map(([key, prop]) => {
    const range = prop.type === "array" ? `[${prop.minItems ?? 0}–${prop.maxItems ?? "∞"}]` : "";
    return { text: `${key}${range}${required.has(key) ? "" : "?"}`, required: required.has(key) };
  });
  const ordered = [...props.filter((p) => p.required), ...props.filter((p) => !p.required)];
  return `${name}: ${ordered.length ? ordered.map((p) => p.text).join(", ") : `(see --block=${name})`}`;
};
```

`template/scripts/lib/episode-scaffold.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import { validateTalent } from "../../src/episode/validate";
import { readJson, writeJson } from "./episode-files";

const SLUG = /^[a-z0-9-]+$/;

export const episodeFolderName = (slug: string, now: Date): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${slug}`;

export const createEpisode = (
  root: string,
  { slug, talentId, now = new Date() }: { slug: string; talentId: string; now?: Date },
): string => {
  if (!SLUG.test(slug)) {
    throw new Error(`Slug "${slug}" must use only a-z, 0-9 and "-"`);
  }
  const talentFile = path.join(root, "talents", `${talentId}.json`);
  if (!fs.existsSync(talentFile)) {
    throw new Error(`No talent profile at ${talentFile}. Create one with /reelkit:setup.`);
  }
  const raw = readJson(talentFile);
  const talent = validateTalent(raw);
  if (talent.id !== talentId) {
    throw new Error(`${talentFile}: id "${talent.id}" does not match "${talentId}"`);
  }
  const dir = path.join(root, "episodes", episodeFolderName(slug, now));
  if (fs.existsSync(dir)) {
    throw new Error(`${dir} already exists`);
  }
  fs.mkdirSync(dir, { recursive: true });
  writeJson(path.join(dir, "talent.json"), raw);
  return dir;
};
```

`template/scripts/commands/catalog.ts`:
```ts
import { DIAGRAM_NAMES, ICON_NAMES } from "../../src/icons/names";
import type { Args } from "../lib/args";
import { blockNames, blockSchema, episodeJsonSchema, summarizeBlock, talentJsonSchema } from "../lib/catalog";

const print = (value: unknown) => console.log(JSON.stringify(value, null, 2));

export const run = async (args: Args): Promise<number> => {
  const { block, episode, talent, icons } = args.flags;
  if (block === true) {
    console.error("Usage: reelkit catalog --block=<Name>");
    return 2;
  }
  if (typeof block === "string") {
    print(blockSchema(block));
  } else if (episode) {
    print(episodeJsonSchema());
  } else if (talent) {
    print(talentJsonSchema());
  } else if (icons) {
    print({ icons: ICON_NAMES, diagrams: DIAGRAM_NAMES });
  } else {
    console.log("Blocks (props; ? = optional, [min–max] = list length):");
    for (const name of blockNames()) {
      console.log(`  ${summarizeBlock(name)}`);
    }
    console.log("Details: npm run reelkit -- catalog --block=<Name> | --episode | --talent | --icons");
  }
  return 0;
};
```

`template/scripts/commands/episode.ts`:
```ts
import path from "node:path";
import { flagString, type Args } from "../lib/args";
import { createEpisode } from "../lib/episode-scaffold";

export const run = async (args: Args): Promise<number> => {
  const [action, slug] = args.positional;
  const talentId = flagString(args, "talent", "");
  if (action !== "create" || !slug || !talentId) {
    console.error("Usage: reelkit episode create <slug> --talent=<id>   (run from the workspace root)");
    return 2;
  }
  try {
    const dir = createEpisode(process.cwd(), { slug, talentId });
    console.log(`✓ Created ${path.relative(process.cwd(), dir)}`);
    return 0;
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    return 1;
  }
};
```

`template/scripts/commands/talent.ts`:
```ts
import path from "node:path";
import { validateTalent } from "../../src/episode/validate";
import type { Args } from "../lib/args";
import { readJson } from "../lib/episode-files";

export const run = async (args: Args): Promise<number> => {
  const [action, file] = args.positional;
  if (action !== "validate" || !file) {
    console.error("Usage: reelkit talent validate <talents/id.json>");
    return 2;
  }
  try {
    const talent = validateTalent(readJson(file));
    const expected = `${talent.id}.json`;
    if (path.basename(file) !== expected) {
      console.error(`✗ id "${talent.id}" does not match the file name ${path.basename(file)} (expected ${expected})`);
      return 1;
    }
    console.log(`✓ ${talent.id}: ${talent.displayName}`);
    return 0;
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    return 1;
  }
};
```

Add to `COMMANDS` in `template/scripts/reelkit.ts`:
```ts
  catalog: () => import("./commands/catalog"),
  episode: () => import("./commands/episode"),
  talent: () => import("./commands/talent"),
```

- [ ] **Step 4: Run tests and the commands**

Run:
```bash
cd template
npx vitest run && npm run lint
npm run reelkit -- catalog | head -5
npm run reelkit -- catalog --block=Gauge | head -20
npm run reelkit -- catalog --block=Nope; echo "exit=$?"
npm run reelkit -- talent validate examples/dani-chocolate/talent.json; echo "exit=$?"
```
Expected: tests PASS; the catalog lists `Anatomy: …` first; Gauge's JSON Schema prints; `Nope` → `✗ Unknown block "Nope". Blocks: …` exit 1; the talent check fails with `id "dani" does not match the file name talent.json` (exit 1) — expected, episode snapshots are named talent.json; profiles in `talents/` are named `<id>.json`.

- [ ] **Step 5: Commit**

```bash
git add template/scripts template/tests/scripts
git commit -m "feat(cli): catalog, episode create and talent validate for plugin authoring"
```

---

### Task 3: Workspace resolver at the plugin root

**Files:**
- Create: `scripts/workspace.mjs`, `scripts/tests/workspace.test.mjs`

**Interfaces:**
- Produces (all exported, Node built-ins only):
  - `defaultWorkspace(home = os.homedir())` → `<home>/reelkit-studio`.
  - `configFile({ env = process.env, home = os.homedir() } = {})` → `$XDG_CONFIG_HOME/reelkit/config.json`, or `<home>/.config/reelkit/config.json`.
  - `rememberWorkspace(dir, { env, home } = {})` → writes `{ ...existing, workspace: <abs dir> }` to the config file (creating folders) and returns the file path.
  - `resolveWorkspace({ env, home } = {})` → `{ ok: true, dir, templateVersion }` or `{ ok: false, dir, message }`. Order: `$REELKIT_STUDIO`, then the config file's `workspace`, then the default. Not ok when: no `reelkit.json` (→ "Run /reelkit:setup first."), invalid `reelkit.json` (→ "Run /reelkit:setup --update."), no `node_modules` (→ "Dependencies are missing … Run /reelkit:setup.").
  - `pluginTemplateVersion(root = PLUGIN_ROOT)` → `template/package.json` version.
  - `versionNotice(workspaceVersion, pluginVersion)` → `null` when equal, else a sentence ending in "Run /reelkit:setup --update to get the new blocks and fixes (talents and episodes are kept)."
  - CLI: `node scripts/workspace.mjs` prints the workspace path on line 1 (and `⚠ <notice>` on line 2 when versions differ), exit 0; prints `✗ <message>` to stderr and exits 1 when not ok. `--set=<path>` remembers a path (`✓ Workspace set to <abs>`). `--json` prints `{ ok, dir, templateVersion, pluginVersion, notice, message }`.

- [ ] **Step 1: Write the failing test**

`scripts/tests/workspace.test.mjs`:
```js
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { configFile, defaultWorkspace, rememberWorkspace, resolveWorkspace, versionNotice } from "../workspace.mjs";

let home;
const makeWorkspace = (dir, meta = { templateVersion: "0.4.0" }, withModules = true) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "reelkit.json"), typeof meta === "string" ? meta : JSON.stringify(meta));
  if (withModules) fs.mkdirSync(path.join(dir, "node_modules"));
  return dir;
};
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-home-"));
});
afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

test("defaults to ~/reelkit-studio and asks for setup when it's missing", () => {
  const result = resolveWorkspace({ env: {}, home });
  assert.equal(result.ok, false);
  assert.equal(result.dir, defaultWorkspace(home));
  assert.match(result.message, /Run \/reelkit:setup first/);
});

test("uses the remembered workspace", () => {
  const dir = makeWorkspace(path.join(home, "Studio"));
  const file = rememberWorkspace(dir, { env: {}, home });
  assert.equal(file, path.join(home, ".config", "reelkit", "config.json"));
  assert.deepEqual(resolveWorkspace({ env: {}, home }), { ok: true, dir, templateVersion: "0.4.0" });
});

test("REELKIT_STUDIO wins over the config file", () => {
  rememberWorkspace(makeWorkspace(path.join(home, "A")), { env: {}, home });
  const b = makeWorkspace(path.join(home, "B"), { templateVersion: "0.3.0" });
  assert.equal(resolveWorkspace({ env: { REELKIT_STUDIO: b }, home }).dir, b);
});

test("respects XDG_CONFIG_HOME and keeps other config keys", () => {
  const env = { XDG_CONFIG_HOME: path.join(home, "xdg") };
  const file = configFile({ env, home });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ other: 1 }));
  rememberWorkspace(path.join(home, "W"), { env, home });
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { other: 1, workspace: path.join(home, "W") });
});

test("explains a broken workspace", () => {
  const broken = makeWorkspace(path.join(home, "Broken"), "{oops");
  assert.match(resolveWorkspace({ env: { REELKIT_STUDIO: broken }, home }).message, /--update/);
  const noModules = makeWorkspace(path.join(home, "NoModules"), { templateVersion: "0.4.0" }, false);
  assert.match(resolveWorkspace({ env: { REELKIT_STUDIO: noModules }, home }).message, /Dependencies are missing.*\/reelkit:setup/);
});

test("version notice", () => {
  assert.equal(versionNotice("0.4.0", "0.4.0"), null);
  assert.match(versionNotice("0.3.0", "0.4.0"), /template 0\.3\.0; the plugin has 0\.4\.0\. Run \/reelkit:setup --update/);
  assert.match(versionNotice(null, "0.4.0"), /template unknown/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/tests/workspace.test.mjs`
Expected: FAIL — cannot find `../workspace.mjs`.

- [ ] **Step 3: Implement**

`scripts/workspace.mjs`:
```js
#!/usr/bin/env node
// Usage: node scripts/workspace.mjs [--set=<path>] [--json]
// Finds the user's reelkit workspace ($REELKIT_STUDIO, then ~/.config/reelkit/config.json, then ~/reelkit-studio).
// Node built-ins only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const defaultWorkspace = (home = os.homedir()) => path.join(home, "reelkit-studio");

export const configFile = ({ env = process.env, home = os.homedir() } = {}) =>
  path.join(env.XDG_CONFIG_HOME ?? path.join(home, ".config"), "reelkit", "config.json");

const readConfig = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
};

export const rememberWorkspace = (dir, { env = process.env, home = os.homedir() } = {}) => {
  const file = configFile({ env, home });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ ...readConfig(file), workspace: path.resolve(dir) }, null, 2)}\n`);
  return file;
};

export const resolveWorkspace = ({ env = process.env, home = os.homedir() } = {}) => {
  const dir = path.resolve(env.REELKIT_STUDIO ?? readConfig(configFile({ env, home })).workspace ?? defaultWorkspace(home));
  const metaFile = path.join(dir, "reelkit.json");
  if (!fs.existsSync(metaFile)) {
    return { ok: false, dir, message: `No reelkit workspace at ${dir}. Run /reelkit:setup first.` };
  }
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
  } catch {
    return { ok: false, dir, message: `${metaFile} is not valid JSON. Run /reelkit:setup --update.` };
  }
  if (!fs.existsSync(path.join(dir, "node_modules"))) {
    return { ok: false, dir, message: `Dependencies are missing in ${dir}. Run /reelkit:setup.` };
  }
  return { ok: true, dir, templateVersion: meta.templateVersion ?? null };
};

export const pluginTemplateVersion = (root = PLUGIN_ROOT) =>
  JSON.parse(fs.readFileSync(path.join(root, "template", "package.json"), "utf8")).version;

export const versionNotice = (workspaceVersion, pluginVersion) =>
  workspaceVersion === pluginVersion
    ? null
    : `This workspace uses template ${workspaceVersion ?? "unknown"}; the plugin has ${pluginVersion}. ` +
      "Run /reelkit:setup --update to get the new blocks and fixes (talents and episodes are kept).";

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const set = args.find((a) => a.startsWith("--set="));
  if (set) {
    const dir = path.resolve(set.slice("--set=".length));
    rememberWorkspace(dir);
    console.log(`✓ Workspace set to ${dir}`);
  } else {
    const result = resolveWorkspace();
    const pluginVersion = pluginTemplateVersion();
    const notice = result.ok ? versionNotice(result.templateVersion, pluginVersion) : null;
    if (args.includes("--json")) {
      console.log(JSON.stringify({ ...result, pluginVersion, notice }));
    } else if (result.ok) {
      console.log(result.dir);
      if (notice) console.log(`⚠ ${notice}`);
    } else {
      console.error(`✗ ${result.message}`);
    }
    process.exitCode = result.ok ? 0 : 1;
  }
}
```

- [ ] **Step 4: Run tests and the CLI**

Run:
```bash
node --test scripts/tests/*.test.mjs
REELKIT_STUDIO=/nonexistent node scripts/workspace.mjs; echo "exit=$?"
REELKIT_STUDIO=/nonexistent node scripts/workspace.mjs --json
```
Expected: all node tests pass; `✗ No reelkit workspace at /nonexistent. Run /reelkit:setup first.` exit 1; JSON with `"ok":false` and `"pluginVersion":"0.1.0"` (Task 4 bumps it).

- [ ] **Step 5: Commit**

```bash
git add scripts/workspace.mjs scripts/tests/workspace.test.mjs
git commit -m "feat(setup): workspace resolver remembers the studio and flags stale templates"
```

---

### Task 4: Manifest, marketplace, versions, README, and the content-lint suite

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `README.md`, `scripts/tests/plugin-content.test.mjs`
- Modify: `template/package.json` (`"version": "0.4.0"`), `template/package-lock.json` (its top-level `version` fields follow)

**Interfaces:**
- Produces: `scripts/tests/plugin-content.test.mjs` exporting nothing; later tasks append tests to it. It defines these helpers at the top, which later tasks reuse (they are in the same file):
  - `ROOT` (plugin root), `read(rel)`, `json(rel)`, `listMarkdown(dir)` (relative paths of `*.md` in a folder, or `[]`), `frontmatter(text)` (object of `key: value` lines between the leading `---` fences, or `null`), `cliCommands()` (keys of `COMMANDS` in `template/scripts/reelkit.ts`), `npmScripts()` (keys of `template/package.json` scripts), `blockNames()` (keys of `BLOCK_SCHEMAS` in `template/src/blocks/schemas.ts`), `pluginFiles()` (all command, skill and agent Markdown files, relative).

- [ ] **Step 1: Write the failing test**

`scripts/tests/plugin-content.test.mjs`:
```js
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));
const listMarkdown = (dir) =>
  fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".md")).map((f) => `${dir}/${f}`) : [];
const frontmatter = (text) => {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  return Object.fromEntries(
    match[1]
      .split("\n")
      .filter((line) => /^[\w-]+:/.test(line))
      .map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1).trim()]),
  );
};
const cliCommands = () => [...read("template/scripts/reelkit.ts").matchAll(/^\s+(\w+): \(\) => import\(/gm)].map((m) => m[1]);
const npmScripts = () => Object.keys(json("template/package.json").scripts);
const blockNames = () => {
  const source = read("template/src/blocks/schemas.ts");
  const body = source.slice(source.indexOf("export const BLOCK_SCHEMAS = {"), source.indexOf("};", source.indexOf("export const BLOCK_SCHEMAS")));
  return [...body.matchAll(/^\s+(\w+): \w+Schema,/gm)].map((m) => m[1]);
};
const skillFiles = () =>
  fs.existsSync(path.join(ROOT, "skills"))
    ? fs.readdirSync(path.join(ROOT, "skills")).map((d) => `skills/${d}/SKILL.md`).filter((f) => fs.existsSync(path.join(ROOT, f)))
    : [];
const pluginFiles = () => [...listMarkdown("commands"), ...skillFiles(), ...listMarkdown("agents")];

test("helpers read the code they lint against", () => {
  assert.ok(cliCommands().includes("sync"));
  assert.ok(npmScripts().includes("check"));
  assert.equal(blockNames().length, 20);
});

test("plugin, marketplace and template versions agree", () => {
  const plugin = json(".claude-plugin/plugin.json");
  const market = json(".claude-plugin/marketplace.json");
  const template = json("template/package.json");
  assert.equal(plugin.name, "reelkit");
  assert.equal(market.plugins.length, 1);
  assert.equal(market.plugins[0].name, "reelkit");
  assert.equal(market.plugins[0].source, "./");
  assert.equal(plugin.version, template.version);
  assert.equal(market.plugins[0].version, template.version);
});

test("claude plugin validate accepts the plugin and the marketplace", (t) => {
  if (spawnSync("claude", ["--version"]).status !== 0) {
    t.skip("claude CLI not installed");
    return;
  }
  const out = execFileSync("claude", ["plugin", "validate", ROOT], { encoding: "utf8" });
  assert.doesNotMatch(out, /✘/);
});

test("README covers install, setup and the five commands", () => {
  const readme = read("README.md");
  for (const text of [
    "/plugin marketplace add 10llo/reelkit",
    "/plugin install reelkit@reelkit",
    "/reelkit:setup",
    "/reelkit:new",
    "/reelkit:clip",
    "/reelkit:export",
    "/reelkit:status",
  ]) {
    assert.ok(readme.includes(text), `README is missing ${text}`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/tests/plugin-content.test.mjs`
Expected: FAIL — `.claude-plugin/plugin.json` and `README.md` don't exist.

- [ ] **Step 3: Implement**

`template/package.json`: `"version": "0.4.0"`; then run `cd template && npm install --package-lock-only` so the lockfile's version follows.

`.claude-plugin/plugin.json`:
```json
{
  "name": "reelkit",
  "description": "Short vertical explainer videos for professionals: trend research, a timed script for the talent, a Remotion video from a block library, talent-clip caption sync with local Whisper, and exports for TikTok, Reels, WhatsApp and Facebook.",
  "version": "0.4.0",
  "author": { "name": "pablocastanogarcia" },
  "homepage": "https://github.com/10llo/reelkit",
  "repository": "https://github.com/10llo/reelkit",
  "keywords": ["video", "remotion", "tiktok", "reels", "explainer", "captions", "whisper"]
}
```

`.claude-plugin/marketplace.json`:
```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "reelkit",
  "description": "reelkit — explainer videos for professionals, from trend to export",
  "owner": { "name": "pablocastanogarcia" },
  "plugins": [
    {
      "name": "reelkit",
      "description": "Short vertical explainer videos for professionals: research, script, video, clip sync, exports.",
      "version": "0.4.0",
      "source": "./",
      "category": "productivity"
    }
  ]
}
```

`README.md`:
````markdown
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

## The flow

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

Update the template (new blocks and fixes) without touching talents or episodes: `/reelkit:setup --update`. Replaced files are backed up in `.reelkit-backup/`.

## Developing the plugin

- `template/` is the Remotion project copied into each workspace: `npm test`, `npm run lint`, `npm run check`, `npm run check:gallery`, `npm run reelkit -- <command>`.
- Plugin-root tests: `node --test scripts/tests/*.test.mjs` (includes a lint that checks commands and skills against the code).
- Releases: bump `template/package.json`, `.claude-plugin/plugin.json` and the marketplace entry to the same version.
````

- [ ] **Step 4: Run tests**

Run: `node --test scripts/tests/*.test.mjs && claude plugin validate .`
Expected: all pass (the `claude plugin validate` test runs because Claude Code is installed here); `claude plugin validate .` prints no `✘` lines.

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin README.md scripts/tests/plugin-content.test.mjs template/package.json template/package-lock.json
git commit -m "feat(plugin): manifest, single-plugin marketplace, README, content lint"
```

---

### Task 5: Skills and the `trend-researcher` agent

**Files:**
- Create: `skills/trend-research/SKILL.md`, `skills/script-writing/SKILL.md`, `skills/episode-authoring/SKILL.md`, `skills/block-authoring/SKILL.md`, `skills/caption-sync/SKILL.md`, `skills/social-export/SKILL.md`, `agents/trend-researcher.md`
- Modify: `scripts/tests/plugin-content.test.mjs` (append the skill/agent lint tests)

**Interfaces:**
- Consumes: CLI commands `validate`, `script`, `status`, `whisper`, `sync`, `export`, `catalog`, `episode`, `talent` (Tasks 1–2 and Plan 3); npm scripts `check`, `check:gallery`, `studio`, `test`, `lint`, `reelkit`; helpers in `plugin-content.test.mjs` (Task 4).
- Produces: skills invoked by name as `reelkit:<folder>` (e.g. `reelkit:episode-authoring`) and the agent `reelkit:trend-researcher`, which Task 6's commands load. Every skill assumes the shell is in the workspace root (the commands `cd` there first).

- [ ] **Step 1: Write the failing lint tests**

Append to `scripts/tests/plugin-content.test.mjs`:
```js
const SKILLS = ["trend-research", "script-writing", "episode-authoring", "block-authoring", "caption-sync", "social-export"];

test("every skill and agent exists with a name and a description", () => {
  for (const skill of SKILLS) {
    const meta = frontmatter(read(`skills/${skill}/SKILL.md`));
    assert.ok(meta, `${skill}: missing frontmatter`);
    assert.equal(meta.name, skill);
    assert.ok(meta.description?.length > 40, `${skill}: description too short`);
  }
  const agent = frontmatter(read("agents/trend-researcher.md"));
  assert.equal(agent.name, "trend-researcher");
  assert.ok(agent.description?.length > 40);
});

test("plugin files only name CLI commands, npm scripts and plugin paths that exist", () => {
  const commands = new Set(cliCommands());
  const scripts = new Set(npmScripts());
  for (const file of pluginFiles()) {
    const text = read(file);
    for (const [, name] of text.matchAll(/npm run reelkit -- (\w+)/g)) {
      assert.ok(commands.has(name), `${file}: unknown reelkit command "${name}"`);
    }
    for (const [, name] of text.matchAll(/npm run ([\w:]+)/g)) {
      assert.ok(scripts.has(name), `${file}: unknown npm script "${name}"`);
    }
    for (const [, rel] of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+[\w])/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), `${file}: missing plugin file ${rel}`);
    }
  }
});

test("episode-authoring covers every block and the validate → check loop", () => {
  const text = read("skills/episode-authoring/SKILL.md");
  for (const block of blockNames()) {
    assert.ok(text.includes(`\`${block}\``), `episode-authoring does not mention \`${block}\``);
  }
  for (const phrase of ["npm run reelkit -- catalog", "npm run reelkit -- validate", "npm run check --", "npm run reelkit -- episode create"]) {
    assert.ok(text.includes(phrase), `episode-authoring is missing "${phrase}"`);
  }
});

test("research and sync skills keep their safety rules", () => {
  const research = read("skills/trend-research/SKILL.md");
  assert.match(research, /actually opened/);
  assert.match(research, /confirm/i);
  const sync = read("skills/caption-sync/SKILL.md");
  assert.match(sync, /sync prepare/);
  assert.match(sync, /sync apply/);
  assert.match(sync, /--accept-overrun/);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test scripts/tests/plugin-content.test.mjs`
Expected: FAIL — `skills/trend-research/SKILL.md` not found.

- [ ] **Step 3: Write the skills and the agent**

`skills/trend-research/SKILL.md`:
````markdown
---
name: trend-research
description: Use when finding timely angles for a reelkit episode — what is trending in a field for a talent's country and language (news, seasonal dates, TikTok and Reels hashtags, rising searches) — and writing research.md with sourced facts.
---

# Trend research

Find 3–5 video angles a professional talent can explain in 15–60 seconds, that people in the talent's country are looking for right now, and write them to `research.md` in the talent's language.

## Inputs

- Field (veterinary, medical, engineering, …) and an optional seed topic.
- The talent profile (`talents/<id>.json`): `profession`, `city`, `country` (ISO code), `locale` (e.g. `es-CO`), `voiceNotes`.
- Today's date.

## Sources, in order

1. **Calendar (always).** Holidays, seasons and awareness days in the talent's country within the next 30 days (Halloween → chocolate and pets; fireworks season → anxious dogs; school start → vaccines). Web search: `fechas especiales <mes> <país>`, `día mundial <tema> <mes>`.
2. **News and searches (always).** Web search in the talent's language for the field in the last two weeks: `<campo> <país> noticias`, `<tema> síntomas`, `<tema> qué hacer`. Look for questions people ask, not press releases.
3. **TikTok Creative Center (Chrome, when the `mcp__claude-in-chrome__*` tools are available).** Open `https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en`, set the country to the talent's, filter by the closest industry, and note rising hashtags related to the field.
4. **Google Trends (Chrome, when available).** Open `https://trends.google.com/trends/explore?geo=<COUNTRY>&q=<topic>&hl=<lang>` for 2–3 candidate topics and note "rising" related queries.
5. **Check the angle.** For each candidate, open the top 2–3 search results for its hashtag or query to see what already exists and what's missing or wrong.

Without Chrome, use sources 1, 2 and 5 only, and say so in `research.md`.

## Scoring an angle (1–5 each, keep the best 3–5)

- **Timely:** tied to a date or something people search this month.
- **Fits the talent:** inside their profession; something they can say with authority.
- **Useful in 3 steps:** splits naturally into a 3-step frame (see the `reelkit:script-writing` skill).
- **Visual:** the facts map to reelkit blocks (a number → `BigStat`, amounts → `Quantity`, a yes/no path → `Decision`, …).
- **Safe and accurate:** facts can be sourced from authoritative pages; no fear-mongering, no advice that replaces a consultation.

## Facts

- Every fact you propose must come from a page you **actually opened** in this session; cite its title, publisher, date and URL.
- Prefer primary and professional sources (veterinary and medical manuals, universities, health ministries, professional associations) over blogs.
- Mark every veterinary or medical figure with `⚠ confirmar con <talent displayName>`; the talent confirms it before publishing.
- Never invent a statistic, and never round a figure into something the source doesn't say.

## Output: `research.md` (talent's language)

```markdown
# Investigación — <campo> · <fecha>

Fuentes: búsqueda web<, TikTok Creative Center, Google Trends> · País: <CO>

## Ángulo 1 — <título corto>
- **Gancho:** <una línea que abre el video, idealmente una pregunta>
- **Por qué ahora:** <fecha o tendencia, con fuente>
- **Marco sugerido:** <PASO1 / PASO2 / PASO3>
- **Datos:**
  - <dato> — <fuente, fecha> ⚠ confirmar con <talent>
- **Enlaces abiertos:** <url>, <url>

## Ángulo 2 — …

## Descartados
- <tema> — <por qué no>
```

Return a short summary to the caller: one line per angle (title + hook) and the path of `research.md`.
````

`skills/script-writing/SKILL.md`:
````markdown
---
name: script-writing
description: Use when drafting or editing the spoken script of a reelkit episode — word budget for 15/30/45/60 s, picking the 3-step frame, the talent's voice, and writing script-draft.md for approval.
---

# Script writing

A reelkit episode is always 5 spoken lines: **hook**, **step 1**, **step 2**, **step 3**, **close**. Each line is one scene of the video, and the talent reads them in one take.

## Word budget

The talent speaks about 2.4 words per second, minus pauses before each question. Stay inside the range; `reelkit script` warns when the text is too long.

| Duration | Words (total) | Hook | Each step | Close |
|---|---|---|---|---|
| 15 s | 30–34 | 5–7 | 6–8 | 5–7 |
| 30 s | 62–72 | 7–10 | 13–20 | 8–10 |
| 45 s | 95–105 | 10–12 | 20–28 | 9–12 |
| 60 s | 125–140 | 12–15 | 28–36 | 10–14 |

(The Dani chocolate episode: 30 s, 71 words.)

## Picking the 3-step frame

The frame is the three labels on the step tracker (`frame.steps`): upper case, 12 characters at most, one word if possible. Pick the one that matches how the angle is explained:

| Frame | Use for |
|---|---|
| `CUÁNDO · CÓMO · CUÁNTO` | an emergency or exposure (when to worry, how to act, how much is dangerous) |
| `QUÉ ES · CÓMO MEDIR · QUÉ HACER` | a sign or measurement (fever, pressure, weight) |
| `MITO · REALIDAD · QUÉ HACER` | a common belief that's wrong |
| `PROBLEMA · CAUSA · SOLUCIÓN` | something that breaks or fails |
| `SÍNTOMAS · CAUSAS · PREVENCIÓN` | a condition or disease |
| `ANTES · DURANTE · DESPUÉS` | a procedure, a trip, a season |

Translate the labels for other languages; keep them short.

## Writing the lines

- **Hook:** a question the viewer recognises, then a promise ("¿Tu perro se comió un chocolate? Mira esto.").
- **Steps:** each starts with a short question naming its step ("¿Cuándo preocuparte?", "¿Cómo actuar?"). The talent pauses before each question; that pause is where the scene changes.
- **Close:** the talent's name and one action tied to the angle's date ("Soy Dogtora Dani. Compártelo antes del treinta y uno.").
- Speak to one person (`tú` in Spanish unless the talent's `voiceNotes` say otherwise) and follow `voiceNotes`.
- Write numbers the way the talent will **say** them ("doce horas", "treinta y nueve con dos"): captions show the script's spelling.
- Every number on screen must also be said, and must appear in the episode's `facts` with its source.
- No advice that replaces a consultation; when in doubt, the action is "llama a tu veterinaria / médico".

## Output: `script-draft.md` (talent's language)

```markdown
# Borrador de guion — <título del ángulo>

**<total> palabras · <duración> s** · Marco: <PASO1 · PASO2 · PASO3>

| # | Escena | Texto | Palabras |
| --- | --- | --- | --- |
| 1 | Gancho | … | 9 |
| 2 | <Paso 1> | … | 16 |
| 3 | <Paso 2> | … | 19 |
| 4 | <Paso 3> | … | 18 |
| 5 | Cierre | … | 9 |

## Datos que se dicen
- <dato> — <fuente> ⚠ confirmar con <talent>
```

Show the draft to the user and wait for approval or edits before building the video. The approved 5 lines go verbatim into `episode.json` → `script`.
````

`skills/episode-authoring/SKILL.md`:
````markdown
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
| `clip`, `captionsSrc`, `coverFrame`, `musicSrc` | leave the defaults (`coverFrame` 60) |

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

- Colours are `#RRGGBB` or a palette token: `bg`, `bg2`, `accent`, `text`, `danger`, `safe`, or a name in the talent's `colors.extra`.
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
- `npm run check --` renders key frames at 9:16 and 4:5 and fails on a talent-slot collision or wrong duration; it warns on `[reelkit:fit]` scale below 0.85, `[reelkit:minfont]` text under 40 px and `[reelkit:overflow]`. Treat warnings as failures: shorten text, move content to a second beat, or pick a roomier block.

## 8. Look at it

Render stills of each scene and view them:

```bash
npx remotion still Episode /tmp/<folder>-f<N>.png --public-dir episodes/<folder> --frame=<N>
```

Use frames around the middle of each beat (30 frames per second). Offer the user Studio: `npm run studio -- episodes/<folder>`.

## 9. The talent's script

```bash
npm run reelkit -- script episodes/<folder>
```

writes `script.md`, the timed script the talent records from.
````

`skills/block-authoring/SKILL.md`:
````markdown
---
name: block-authoring
description: Use when no existing reelkit block fits a line and a new block (or icon or diagram) must be added to the template — the block contract, files to touch, and the checks it must pass.
---

# Block authoring

Adding a block is the exception: first try every block in `npm run reelkit -- catalog`, two beats, or a different split. If a new block is really needed, it goes into the **plugin's** `template/` (so every workspace gets it with `/reelkit:setup --update`). A block added only inside a workspace works there but is replaced on the next update (a copy stays in `.reelkit-backup/`).

## Files

| File | What |
|---|---|
| `src/blocks/<Name>.schema.ts` | `z.strictObject` props with hard limits (list lengths, characters, words per field); per-word refinements for narrow columns |
| `src/blocks/<Name>.tsx` | the component |
| `src/blocks/schemas.ts` | register the schema in `BLOCK_SCHEMAS` |
| `src/blocks/registry.tsx` | register the component |
| `src/gallery/samples.json` | a sample at **maximum** content |
| `tests/blocks/<name>.test.ts` | schema tests: valid sample passes, every over-limit case fails |
| `src/icons/` | new icons: same style (100×100 grid, solid fills, at most two colours); add the name to `names.ts` |

## Contract

- Renders inside `FitStage`; content must fit the stage at its maximum content without scaling below 0.85.
- Animates with `enter` / `pop` / `pulse` and the beat timing (`timing.at(fraction)`); every keyframe is a fraction of the beat.
- Every frame-driven `interpolate` is clamped (`CLAMP`); only a spring's own overshoot may be unclamped.
- Counting numbers use `CountUpText` so the layout doesn't change after measuring.
- Text ≥ 40 px, except footnotes marked with `SMALL_TEXT_ATTR`.
- Colours come from the palette (`usePalette`, `resolveColor`); fonts from the theme.
- No scene titles inside the block (titles live on the scene), no emoji, no external images, no CSS animation.

## Checks

```bash
npm test
npm run lint
npm run check:gallery -- --block=<Name>
npm run check
```

All must pass. Then release: bump the version in `template/package.json`, `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` together, and teammates run `/reelkit:setup --update`.
````

`skills/caption-sync/SKILL.md`:
````markdown
---
name: caption-sync
description: Use when the talent's recording arrives for a reelkit episode — transcribing it locally with Whisper, correcting captions to the script, re-timing scenes, reviewing the changes with the user and applying them.
---

# Caption sync

The talent's clip goes into the bottom-right slot; its voice drives the captions and the scene cuts. Nothing changes in the episode until the user approves the review.

All commands run from the workspace root.

## 1. Whisper ready?

```bash
npm run reelkit -- whisper check
```

If the model isn't downloaded, `sync prepare` downloads it (1.6 GB for `large-v3-turbo`) — tell the user first, or offer `--model=small` (586 MB, less accurate). If WebGPU is unavailable, sync still attaches the clip but captions stay timed from the script ("provisional").

## 2. Prepare (writes proposals only)

```bash
npm run reelkit -- sync prepare episodes/<folder> <path/to/clip> [--model=large-v3-turbo]
```

It copies the clip in as `talent.proposed.<ext>`, transcribes it, aligns the words to the script and writes:

- `sync-report.md` — the review (Spanish): clip details, silence trimmed at the start, scene cuts before → after, every word that differs (corrected to the script's spelling, `⚠ Revisar` far substitutions that show what was heard, `⚠ No se escuchó` skipped words, ad-libs kept as heard), warnings, and whether the voice runs past the end.
- `captions.proposed.json` — the captions the video will use (editable: change a word's `"text"` to fix it).
- `sync-proposal.json` — trim, scene starts, files.

How alignment decides: the script's spelling with Whisper's timing for words that match or nearly match (numbers match their spoken form: "12" ↔ "doce"); a far substitution shows what was heard and is flagged; words Whisper didn't hear are left out of the captions; extra words the talent said are kept.

## 3. Review with the user

Read `sync-report.md` and show the user a short table: scene cuts (before → after), every flagged word (scene, script, heard, status, time), and the overrun line if any. Ask them to approve, or to say which words to change (edit `captions.proposed.json`, then show the change).

- **Voice runs past the end** (`⚠ La voz sigue … s`): the last words would be cut. Recommend re-recording shorter. Only with the user's explicit agreement, apply with `--accept-overrun`.
- **A whole scene not heard**: the visuals may not match what's said — ask whether to re-record or continue.
- **Low match ("¿Es el clip correcto?")**: confirm it's the right clip and episode.

## 4. Apply (after approval)

```bash
npm run reelkit -- sync apply episodes/<folder> [--accept-overrun]
```

It renames the staged clip to `talent.<ext>`, writes `captions.json`, saves `clip`, `sceneStarts`, `captionsSrc` and `stage: "synced"` into `episode.json`, and removes the old clip it replaced.

## 5. Check it

```bash
npm run check -- episodes/<folder>
npx remotion still Episode /tmp/<folder>-sync.png --public-dir episodes/<folder> --frame=<N>
```

View a still in the middle of a sentence: the clip fills the slot and the caption shows the word being spoken. Offer Studio: `npm run studio -- episodes/<folder>`. Next: `/reelkit:export`.
````

`skills/social-export/SKILL.md`:
````markdown
---
name: social-export
description: Use when exporting a reelkit episode for TikTok, Instagram Reels, WhatsApp and Facebook — the render targets, the checks every file must pass, and how to deliver each file.
---

# Social export

All commands run from the workspace root.

## Before exporting

- `npm run check -- episodes/<folder>` must pass.
- If `/reelkit:status` says captions are `provisional` (no synced transcript), tell the user the captions follow the script timing, not the voice, and ask whether to export anyway.
- The episode needs a talent clip (`/reelkit:clip`); covers and subtitles can be exported without one: `--only=cover-9x16,cover-4x5,srt`.

## Export

```bash
npm run reelkit -- export episodes/<folder> [--only=9x16,whatsapp,4x5,cover-9x16,cover-4x5,srt]
```

| File (in `exports/`) | For | Settings |
|---|---|---|
| `<slug>-9x16.mp4` | TikTok, Instagram Reels, Facebook Reels, YouTube Shorts | 1080×1920, H.264 CRF 18, AAC 192 kbps |
| `<slug>-whatsapp.mp4` | WhatsApp (chats and status) | 1080×1920, CRF 18 capped to stay under 16 MB |
| `<slug>-4x5.mp4` | Instagram and Facebook feed posts | 1080×1350, same quality as the master |
| `cover-9x16.png` | Reels / TikTok cover | the hook frame |
| `cover-4x5.png` | feed cover | the hook frame |
| `<slug>.srt` | platforms that accept a subtitle file (Facebook, YouTube) | the captions as shown on screen |

Every file is read back: duration within 0.1 s, exact size, H.264 with audio, WhatsApp under 16 MB. Any miss is a `✗` line and exit 1 — report it, don't hand over the file. A complete export sets the episode's stage to `exported`.

## Report to the user

A table with each file's size, duration and resolution, the folder path, and where each goes. Writing the post copy, hashtags and posting are not part of reelkit.
````

`agents/trend-researcher.md`:
````markdown
---
name: trend-researcher
description: Researches timely angles for one reelkit episode from a field, a talent profile and today's date, and writes research.md with 3–5 sourced angles. Used by /reelkit:new.
model: sonnet
---

You research angles for a short explainer video. Follow the reelkit trend-research skill exactly: read `${CLAUDE_PLUGIN_ROOT}/skills/trend-research/SKILL.md` first.

Your prompt gives you: the field, an optional seed topic, the path of the talent profile (read it for country, locale, profession and voice), today's date, and the output path for `research.md`.

- Use web search and page fetches. If the `mcp__claude-in-chrome__*` tools are available, also use TikTok Creative Center and Google Trends as the skill describes; if a page needs a login or blocks you, skip it and say so.
- Cite only pages you actually opened. Never invent figures. Flag every veterinary or medical figure for the talent to confirm.
- Write `research.md` in the talent's language at the output path.
- Reply with one line per angle (title + hook) and the file path. Nothing else.
````

- [ ] **Step 4: Run the lint**

Run: `node --test scripts/tests/*.test.mjs && claude plugin validate .`
Expected: all pass; `claude plugin validate .` reports the 6 skills and the agent with no `✘`.

- [ ] **Step 5: Commit**

```bash
git add skills agents scripts/tests/plugin-content.test.mjs
git commit -m "feat(plugin): skills for research, script, authoring, blocks, sync, export; trend-researcher agent"
```

---

### Task 6: The five commands

**Files:**
- Create: `commands/setup.md`, `commands/new.md`, `commands/clip.md`, `commands/export.md`, `commands/status.md`
- Modify: `scripts/tests/plugin-content.test.mjs` (append the command lint tests)

**Interfaces:**
- Consumes: `scripts/doctor.mjs`, `scripts/init-workspace.mjs` (Plan 3), `scripts/workspace.mjs` (Task 3), the CLI commands (Tasks 1–2, Plan 3), the skills and agent (Task 5) by their names `reelkit:<skill>` and `reelkit:trend-researcher`.
- Produces: `/reelkit:setup [--update]`, `/reelkit:new [field or topic]`, `/reelkit:clip <video> [episode]`, `/reelkit:export [episode]`, `/reelkit:status [episode]`.

Every command starts by resolving the workspace and stops with its message when that fails (Review Focus 1). Shell steps run as `cd "<workspace>" && …`.

- [ ] **Step 1: Write the failing lint tests**

Append to `scripts/tests/plugin-content.test.mjs`:
```js
const COMMANDS = ["setup", "new", "clip", "export", "status"];

test("every command exists with a description and resolves the workspace first", () => {
  for (const name of COMMANDS) {
    const text = read(`commands/${name}.md`);
    const meta = frontmatter(text);
    assert.ok(meta?.description, `${name}: missing description`);
    assert.ok("argument-hint" in meta, `${name}: missing argument-hint`);
    assert.ok(text.includes("${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"), `${name}: does not resolve the workspace`);
  }
});

test("commands keep their approval and safety steps", () => {
  const setup = read("commands/setup.md");
  for (const phrase of ["scripts/doctor.mjs", "scripts/init-workspace.mjs", "--set=", "npm run reelkit -- whisper", "npm run reelkit -- talent validate", "never invent"]) {
    assert.ok(setup.includes(phrase), `setup is missing "${phrase}"`);
  }
  const create = read("commands/new.md");
  for (const phrase of ["reelkit:trend-researcher", "reelkit:script-writing", "reelkit:episode-authoring", "npm run reelkit -- episode create", "npm run reelkit -- script", "approve"]) {
    assert.ok(create.includes(phrase), `new is missing "${phrase}"`);
  }
  const clip = read("commands/clip.md");
  for (const phrase of ["reelkit:caption-sync", "npm run reelkit -- sync prepare", "npm run reelkit -- sync apply", "approve"]) {
    assert.ok(clip.includes(phrase), `clip is missing "${phrase}"`);
  }
  const exp = read("commands/export.md");
  for (const phrase of ["reelkit:social-export", "npm run check --", "npm run reelkit -- export", "provisional"]) {
    assert.ok(exp.includes(phrase), `export is missing "${phrase}"`);
  }
  assert.ok(read("commands/status.md").includes("npm run reelkit -- status"));
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test scripts/tests/plugin-content.test.mjs`
Expected: FAIL — `commands/setup.md` not found.

- [ ] **Step 3: Write the commands**

`commands/setup.md`:
````markdown
---
description: Set up reelkit on this machine — check tools, create or update the studio workspace, download the Whisper model, and create a talent profile
argument-hint: "[--update]"
---

Set up reelkit. Arguments: `$ARGUMENTS`. This command is safe to run again: it only does what's missing.

## 1. Check the machine

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"` and show its lines. A ✗ on Node, npm or disk space blocks setup: show the fix and stop. A ✗ on git is a warning only.

Check whether the `mcp__claude-in-chrome__*` tools are available in this session. If not, tell the user trend research will use web search only, and that connecting the Claude in Chrome extension adds TikTok Creative Center and Google Trends.

## 2. Workspace

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs" --json`.

- **`--update` in the arguments:** if the JSON's `dir` contains a `reelkit.json`, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/init-workspace.mjs" "<dir>" --update` (it runs `npm install`; a few minutes) and tell the user where the previous files were backed up. If there is no workspace, say so and continue as a new setup.
- **`ok: true`:** the workspace exists. Say where it is; if `notice` is set, show it and offer to run `/reelkit:setup --update`.
- **`ok: false`:** ask the user where to create the studio (AskUserQuestion; default `~/reelkit-studio`, expanded to an absolute path). If that folder already holds a reelkit workspace, use `--update` on it instead. Otherwise run `node "${CLAUDE_PLUGIN_ROOT}/scripts/init-workspace.mjs" "<dir>"` (copies the template and runs `npm install`; a few minutes). Then remember it: `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs" --set="<dir>"`.

## 3. Whisper model

Run `cd "<dir>" && npm run reelkit -- whisper check --model=large-v3-turbo`.

- WebGPU unavailable: warn that clip sync will attach the clip but keep captions timed from the script.
- Model not downloaded: ask whether to download it now (about 1.6 GB, once per machine). If yes: `cd "<dir>" && npm run reelkit -- whisper download --model=large-v3-turbo`.

## 4. Talent profile

List `<dir>/talents/*.json`. If there are none, or the user wants another talent, create one by asking (AskUserQuestion where there are choices, otherwise plain questions, a few at a time):

- `displayName` (e.g. "Dogtora Dani"), `pillName` (≤ 18 characters, shown on the slot), `profession`, `city`, `country` (ISO code, e.g. CO), `locale` (e.g. es-CO).
- `voiceNotes`: how they speak (formal/informal, `tú`/`usted`, words they avoid).
- `handles`: ask for Instagram, TikTok, WhatsApp and Facebook one by one; leave a handle empty when they have none — never invent a handle or a phone number.
- `colors`: `bg`, `bg2`, `accent`, `text`, `danger`, `safe` as `#RRGGBB`; propose a palette from their brand colours and let them change it; optional named `extra` colours.
- `disclaimer`: two short lines; propose one that fits the profession ("Contenido educativo." / "No reemplaza la consulta veterinaria.") and let them edit it.
- `recordingNotes`: anything about where and how they record (optional).

Pick an `id` (lowercase, a-z 0-9 and "-", e.g. `dani`), write `<dir>/talents/<id>.json`, then run `cd "<dir>" && npm run reelkit -- talent validate talents/<id>.json`. Fix and re-run until it prints ✓.

## 5. Done

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" "<dir>"` and show the summary: workspace path, Whisper status, talents. Next step: `/reelkit:new`.
````

`commands/new.md`:
````markdown
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
````

`commands/clip.md`:
````markdown
---
description: Add the talent's recording to a reelkit episode — transcribe locally, correct captions to the script, re-time scenes, review, and apply
argument-hint: "<video> [episode]"
---

Add the talent's clip. Arguments: `$ARGUMENTS` (the video path, then optionally the episode folder).

## 1. Workspace and episode

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"`. If it fails, show its message and stop. Line 1 is `<ws>`.

- The video path must exist (it can be anywhere, e.g. `~/Downloads`). If it's missing from the arguments, ask for it.
- The episode: from the arguments, or run `cd "<ws>" && npm run reelkit -- status episodes` and pick the episode at stage `built` (or `synced`, to replace a clip); if several fit, ask.

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
````

`commands/export.md`:
````markdown
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
````

`commands/status.md`:
````markdown
---
description: Show reelkit episodes, the stage each one is at, and the next command to run
argument-hint: "[episode]"
---

Show the status. Arguments: `$ARGUMENTS` (optional episode folder).

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.mjs"`. If it fails, show its message and stop. Line 1 is `<ws>`; show a `⚠` line (template update available) if present.
2. Run `cd "<ws>" && npm run reelkit -- status episodes` and show the list.
3. If an episode was given, also list the files in its folder (research, script, clip, captions, exports) and explain its next step in one sentence.
````

- [ ] **Step 4: Run the lint and validate**

Run: `node --test scripts/tests/*.test.mjs && claude plugin validate .`
Expected: all pass; the validator lists 5 commands, 6 skills, 1 agent with no `✘`.

- [ ] **Step 5: Commit**

```bash
git add commands scripts/tests/plugin-content.test.mjs
git commit -m "feat(plugin): /reelkit:setup, new, clip, export and status commands"
```

---

### Task 7: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `scripts/tests/plugin-content.test.mjs` (append the CI lint test)

**Interfaces:**
- Produces: two jobs on every push and pull request — `plugin` (plugin-root tests + `claude plugin validate`) and `template` (lint, unit tests, `npm run check`, `npm run check:gallery` with headless Chrome) — as spec §10 requires.

- [ ] **Step 1: Write the failing lint test**

Append to `scripts/tests/plugin-content.test.mjs`:
```js
test("CI runs every check the plugin relies on", () => {
  const ci = read(".github/workflows/ci.yml");
  for (const step of [
    "node --test scripts/tests/*.test.mjs",
    "claude plugin validate .",
    "npm ci",
    "npm run lint",
    "npm test",
    "npx remotion browser ensure",
    "npm run check",
    "npm run check:gallery",
  ]) {
    assert.ok(ci.includes(step), `ci.yml is missing "${step}"`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/tests/plugin-content.test.mjs`
Expected: FAIL — `.github/workflows/ci.yml` not found.

- [ ] **Step 3: Write the workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  plugin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install Claude Code (for plugin validation)
        run: npm install -g @anthropic-ai/claude-code
      - name: Plugin-root tests (setup scripts and content lint)
        run: node --test scripts/tests/*.test.mjs
      - name: Validate plugin and marketplace manifests
        run: claude plugin validate .

  template:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: template
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: template/package-lock.json
      - name: Headless Chrome system libraries
        run: |
          sudo apt-get update
          sudo apt-get install -y libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2t64 libxrandr2 \
            libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npx remotion browser ensure
      - name: Layout check on the example episodes
        run: npm run check
      - name: Block gallery check
        run: npm run check:gallery
```

- [ ] **Step 4: Verify locally**

GitHub Actions can't run here, so check the YAML parses and run the same commands on this machine (skip the apt step; Chrome is already installed by Remotion):
```bash
npx --yes js-yaml@4.1.0 .github/workflows/ci.yml > /dev/null && echo "yaml ok"
node --test scripts/tests/*.test.mjs && claude plugin validate .
cd template && npm ci && npm run lint && npm test && npx remotion browser ensure && npm run check && npm run check:gallery
```
Expected: `yaml ok`; everything passes. (`npm ci` reinstalls `template/node_modules`; that's expected.)

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml scripts/tests/plugin-content.test.mjs
git commit -m "ci: plugin and template jobs (tests, manifest validation, layout and gallery checks)"
```

---

### Task 8: Headless smoke test of the installed plugin

**Files:**
- Modify: whatever the run below shows is broken (each fix with a test in the owning test file and its own commit)

**Interfaces:**
- Consumes: everything above. This task loads the plugin into real Claude Code sessions (`claude -p --plugin-dir <repo>`) — two short headless runs on the user's Claude account.

- [ ] **Step 1: A studio with one episode**

Run from the repo root (the system disk is low on space, so the studio goes on `/Volumes/Developer`; `init-workspace` runs `npm install`, a few minutes):
```bash
STUDIO=/Volumes/Developer/reelkit-smoke-studio
rm -rf "$STUDIO"
node scripts/init-workspace.mjs "$STUDIO"
cp -R "$STUDIO/examples/dani-chocolate" "$STUDIO/episodes/2026-10-chocolate"
mkdir -p "$STUDIO/talents" && cp "$STUDIO/examples/dani-chocolate/talent.json" "$STUDIO/talents/dani.json"
mkdir -p "$STUDIO/episodes/2026-10-pulgas" && printf '# Investigación\n' > "$STUDIO/episodes/2026-10-pulgas/research.md"
(cd "$STUDIO" && npm run reelkit -- talent validate talents/dani.json && npm run reelkit -- status episodes)
```
Expected: `✓ dani: Dogtora Dani`; status lists `2026-10-chocolate — built …` and `2026-10-pulgas — researched (no video yet)`.

- [ ] **Step 2: `/reelkit:status` through Claude Code**

Run:
```bash
REELKIT_STUDIO="$STUDIO" claude -p --plugin-dir "$PWD" \
  --allowedTools "Bash(node:*)" "Bash(cd:*)" "Bash(npm run reelkit:*)" \
  "/reelkit:status" | tee /tmp/reelkit-status-run.txt
REELKIT_STUDIO=/nonexistent-reelkit claude -p --plugin-dir "$PWD" \
  --allowedTools "Bash(node:*)" \
  "/reelkit:status" | tee /tmp/reelkit-status-missing.txt
```
Expected: the first output names both episodes, `built` and `researched`, and their next steps (`/reelkit:clip`, `/reelkit:new`); the second tells the user to run `/reelkit:setup`. If a command isn't found, check `claude plugin validate .` and the command file names; if Claude doesn't resolve the workspace first, tighten that command's step 1 wording and re-run.

- [ ] **Step 3: Skills and agent are visible**

Run:
```bash
claude -p --plugin-dir "$PWD" "List the skills and agents whose names start with reelkit: (names only, one per line). Don't run any tools." | tee /tmp/reelkit-components.txt
```
Expected: the six `reelkit:<skill>` names and `reelkit:trend-researcher`. If the agent's name differs (e.g. no `reelkit:` prefix), update the agent name used in `commands/new.md` and in the Task 6 lint test to what Claude Code shows, and commit that fix.

- [ ] **Step 4: Full verification and cleanup**

Run:
```bash
rm -rf "$STUDIO"
node --test scripts/tests/*.test.mjs && claude plugin validate .
cd template && npx vitest run && npm run lint && npm run check && npm run check:gallery
```
Expected: all pass. Paste the three `/tmp/reelkit-*.txt` outputs into the task report.

- [ ] **Step 5: Commit any fixes**

Each fix found in Steps 2–3 is its own commit (e.g. `fix(plugin): status resolves the workspace before listing`). If nothing broke, there's nothing to commit — say so in the report.
