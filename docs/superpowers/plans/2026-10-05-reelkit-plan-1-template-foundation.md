# reelkit Plan 1 — Template Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `reelkit/template/`, a Remotion project that renders any `episode.json` + `talent.json` into the Dani-style explainer at 9:16 and 4:5, with the 10 core blocks, the Dani reference episode rebuilt from blocks, and `npm run check` enforcing the layout guarantees.

**Architecture:** An episode folder (`episode.json`, `talent.json`, optional clip and captions) is the Remotion public dir (`--public-dir`). `calculateMetadata` fetches and validates both files with zod, resolves scene timing, and passes typed props to `EpisodeVideo`. That component draws the fixed frame (background, tracker, captions, disclaimer, talent slot) from a layout object, and renders 5 scenes. Each scene renders 1–2 blocks looked up in a registry; blocks express their keyframes as fractions of their beat, so they stretch with any duration or re-fit.

**Tech Stack:** Remotion 4.0.532, React 19.2.3, TypeScript 5.9.3, zod 4.5.4, @remotion/google-fonts, @remotion/layout-utils, @remotion/media, @remotion/captions, mediabunny 1.56.1, Vitest 3.2.4, pngjs 7.0.0, @remotion/bundler + @remotion/renderer (check script).

**Spec:** `docs/superpowers/specs/2026-10-05-reelkit-design.md` (sections 5, 10). This is plan 1 of 4. Plan 2: explainer blocks, icons, gallery. Plan 3: pipeline scripts. Plan 4: plugin packaging and CI.

**Reference implementation:** the hand-built Dani video in `/Volumes/Developer/my-video/src/dani/` (on the author's machine). Code below is ported from it; you do not need that folder to execute this plan, but Task 16 compares against it when present.

## Global Constraints

- All `@remotion/*` packages and `remotion` pinned to exactly `4.0.532`; `zod` exactly `4.5.4`; `mediabunny` exactly `1.56.1`.
- 30 fps. Episode duration is `durationSeconds × 30` frames, `durationSeconds` an integer 15–60. Never longer.
- 9:16 canvas 1080×1920; 4:5 canvas 1080×1350. All coordinates come from `src/frame/layouts.json`; no magic layout numbers in components.
- Nothing except the slot frame and name pill ever renders inside the talent slot rect plus 16 px clearance, on any frame. The background may show behind it.
- Text meant to be read is ≥ 40 px, except: footnotes and sources 30 px, disclaimer 28 px (shrinks to fit two lines).
- Motion only via `useCurrentFrame()` with `interpolate` / `spring`. Every `interpolate` is clamped. No CSS transitions, no CSS keyframes, no emoji characters, no external images (icons are inline SVG).
- Entrance spring `damping: 200`, 12 frames, 6-frame stagger between siblings. Pops `damping: 12, stiffness: 180`.
- Copy for the Dani reference episode matches the original brief character for character, including ¿ and accents. Say "tutor", never "dueño".
- Never invent handles or phone numbers: they appear only when set in `talent.json`.
- Every commit message ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Durations other than 30 s** (15 s, 45 s, 60 s): scene starts and every block keyframe must scale; nothing should fire after its scene ends. Pinned by `defaultSceneStarts` / `splitBeats` tests (Task 2) and by the smoke episode being 20 s (Task 10).
2. **Hand-edited or re-fitted `sceneStarts` that are invalid** (decreasing, a scene under 1 s): must fall back to defaults with a readable warning, never crash. Pinned in Task 2.
3. **Longer copy than the reference** (other languages, a 12-letter tracker label, a 19-letter word in a caption): text must shrink, never overflow into the slot. Pinned by caption layout tests (Task 7), tracker label fitting (Task 8) and the slot pixel test (Task 10).
4. **A palette token typo or a block name typo in `episode.json`**: must fail with a message naming the path and the valid options. Pinned in Tasks 4 and 6.
5. **Studio or render started without `--public-dir` pointing at an episode**: must say exactly that, not a generic fetch error. Pinned in Task 9 (unit test for the message) and a manual verification step.

---

## File Structure

```
reelkit/
  .gitignore
  template/
    package.json  tsconfig.json  remotion.config.ts  eslint.config.mjs  vitest.config.ts  .prettierrc
    src/
      index.ts                     registerRoot
      Root.tsx                     Episode, Episode45, Cover, Cover45, BlockPreview
      frame/
        layouts.json               single source of layout numbers (also read by check.mjs)
        layout.ts                  Layout type, LAYOUTS, rect helpers
        timing.ts                  springs, scene starts, beat timing
        contexts.ts                LayoutContext, PaletteContext, TalentContext
        theme.ts                   fonts, text styles, useFontsReady
        fit.ts                     fitFontSize
        resolveSrc.ts              staticFile / URL resolution
        captions-model.ts          pure caption paging and layout
        AccentText.tsx             text with one accented substring
        Background.tsx  TalentSlot.tsx  StepTracker.tsx  Captions.tsx
        Disclaimer.tsx  Guides.tsx  FitStage.tsx
      episode/
        talent.ts                  talent + palette schemas, resolveColor
        schema.ts                  episode + scene schemas
        validate.ts                validateEpisode / validateTalent / validateBeat
        fetchJson.ts               public-dir JSON loader with clear errors
        load.ts                    calculateMetadata for Episode / Cover
      icons/
        names.ts                   ICON_NAMES (node-safe)
        index.tsx                  ICONS registry, <Icon>, PawShape
      blocks/
        schema-parts.ts            iconName, colorRef, accented, chipItem
        schemas.ts                 BLOCK_SCHEMAS (node-safe)
        types.ts                   BlockComponent type
        registry.tsx               BLOCKS (components)
        <Block>.schema.ts + <Block>.tsx    × 10
        parts/  BiteGrid.tsx  ScaleMeter.tsx  ClockRing.tsx  Chip.tsx  QuantityBars.tsx
      compositions/
        SceneRenderer.tsx  EpisodeVideo.tsx  Cover.tsx  BlockPreview.tsx
    scripts/
      check.mjs  check-lib.mjs
    tests/
      timing.test.ts  layout.test.ts  talent.test.ts  icons.test.ts  validate.test.ts
      captions-model.test.ts  fetchJson.test.ts  check-lib.test.ts  blocks/*.schema.test.ts  examples.test.ts
    examples/
      smoke/        episode.json  talent.json      (20 s generic fixture)
      dani-chocolate/  episode.json  talent.json   (reference rebuild)
```

---

### Task 1: Scaffold the template project

**Files:**
- Create: `reelkit/.gitignore`, `template/package.json`, `template/tsconfig.json`, `template/remotion.config.ts`, `template/eslint.config.mjs`, `template/vitest.config.ts`, `template/.prettierrc`, `template/src/index.ts`, `template/src/Root.tsx`

**Interfaces:**
- Produces: npm scripts `dev`, `typecheck`, `lint`, `test`, `check` used by every later task.

- [ ] **Step 1: Create the files**

`reelkit/.gitignore`:
```
node_modules
out
.DS_Store
.env
```

`template/package.json`:
```json
{
  "name": "reelkit-template",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "remotion studio --public-dir examples/smoke",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src && tsc --noEmit",
    "test": "vitest run",
    "check": "node scripts/check.mjs"
  },
  "dependencies": {
    "@remotion/captions": "4.0.532",
    "@remotion/cli": "4.0.532",
    "@remotion/google-fonts": "4.0.532",
    "@remotion/layout-utils": "4.0.532",
    "@remotion/media": "4.0.532",
    "@remotion/zod-types": "4.0.532",
    "mediabunny": "1.56.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "remotion": "4.0.532",
    "zod": "4.5.4"
  },
  "devDependencies": {
    "@remotion/bundler": "4.0.532",
    "@remotion/eslint-config-flat": "4.0.532",
    "@remotion/renderer": "4.0.532",
    "@types/react": "19.2.7",
    "@types/web": "0.0.166",
    "eslint": "9.39.5",
    "pngjs": "7.0.0",
    "prettier": "3.8.1",
    "typescript": "5.9.3",
    "vitest": "3.2.4"
  }
}
```

`template/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "lib": ["es2020"],
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true
  },
  "include": ["src"]
}
```

`template/remotion.config.ts`:
```ts
import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

`template/eslint.config.mjs`:
```js
import { config } from "@remotion/eslint-config-flat";

export default config;
```

`template/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
```

`template/.prettierrc`:
```json
{ "useTabs": false, "bracketSpacing": true, "tabWidth": 2 }
```

`template/src/index.ts`:
```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

`template/src/Root.tsx` (compositions are added in Task 9):
```tsx
export const RemotionRoot: React.FC = () => {
  return <></>;
};
```

- [ ] **Step 2: Install and verify the toolchain**

Run: `cd template && npm install && npm run typecheck && npx vitest run --passWithNoTests && npx eslint src`
Expected: install succeeds; typecheck, Vitest ("No test files found, exiting with code 0") and ESLint all exit 0.

- [ ] **Step 3: Commit**

```bash
git add .gitignore template
git commit -m "chore(template): scaffold Remotion template project"
```

---

### Task 2: Timing module

**Files:**
- Create: `template/src/frame/timing.ts`
- Test: `template/tests/timing.test.ts`

**Interfaces:**
- Produces:
  - `FPS = 30`, `CLAMP`, `ENTER_FRAMES = 12`, `STAGGER = 6`, `FADE_OUT_FRAMES = 8`, `MIN_SCENE_FRAMES = 30`
  - `SCENE_IDS: readonly ["hook","step1","step2","step3","close"]`, `type SceneId`
  - `enter(frame, fps, at): number`, `pop(frame, fps, at): number`, `pulse(frame, at, length, peak): number`, `fadeOut(frame, duration): number`
  - `totalFrames(durationSeconds): number`
  - `defaultSceneStarts(total): number[]`
  - `resolveSceneStarts(starts: number[] | null, total): { starts: number[]; warning: string | null }`
  - `sceneDurations(starts, total): number[]`
  - `type BeatTiming = { from: number; duration: number; at: (fraction: number) => number }`
  - `beatTiming(from, duration): BeatTiming`, `splitBeats(sceneDuration, beatCount, split): BeatTiming[]`

- [ ] **Step 1: Write the failing tests**

`template/tests/timing.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  defaultSceneStarts,
  enter,
  pulse,
  resolveSceneStarts,
  sceneDurations,
  splitBeats,
  totalFrames,
} from "../src/frame/timing";

describe("scene starts", () => {
  it("reproduces the Dani timing at 30 s", () => {
    expect(defaultSceneStarts(900)).toEqual([0, 90, 300, 510, 765]);
  });
  it("scales to 15 s and 60 s", () => {
    expect(defaultSceneStarts(450)).toEqual([0, 45, 150, 255, 383]);
    expect(defaultSceneStarts(1800)).toEqual([0, 180, 600, 1020, 1530]);
  });
  it("converts seconds to frames", () => {
    expect(totalFrames(20)).toBe(600);
  });
  it("accepts valid re-fitted starts", () => {
    expect(resolveSceneStarts([0, 80, 290, 520, 780], 900)).toEqual({
      starts: [0, 80, 290, 520, 780],
      warning: null,
    });
  });
  it("uses defaults for null", () => {
    expect(resolveSceneStarts(null, 900)).toEqual({ starts: [0, 90, 300, 510, 765], warning: null });
  });
  it("falls back with a warning when starts decrease", () => {
    const r = resolveSceneStarts([0, 90, 80, 500, 700], 900);
    expect(r.starts).toEqual([0, 90, 300, 510, 765]);
    expect(r.warning).toContain("Invalid sceneStarts");
  });
  it("falls back when the last scene is shorter than 1 s", () => {
    expect(resolveSceneStarts([0, 90, 300, 510, 880], 900).warning).not.toBeNull();
  });
  it("falls back when the first start is not 0 or values are fractional", () => {
    expect(resolveSceneStarts([5, 90, 300, 510, 765], 900).warning).not.toBeNull();
    expect(resolveSceneStarts([0, 90.5, 300, 510, 765], 900).warning).not.toBeNull();
  });
  it("computes durations", () => {
    expect(sceneDurations([0, 90, 300, 510, 765], 900)).toEqual([90, 210, 210, 255, 135]);
  });
});

describe("beats", () => {
  it("returns one beat spanning the scene", () => {
    const [b] = splitBeats(255, 1, 0.5);
    expect(b.from).toBe(0);
    expect(b.duration).toBe(255);
    expect(b.at(190 / 255)).toBeCloseTo(190);
  });
  it("splits two beats", () => {
    const [a, b] = splitBeats(210, 2, 0.5);
    expect([a.from, a.duration, b.from, b.duration]).toEqual([0, 105, 105, 105]);
    expect(b.at(12 / 105)).toBeCloseTo(117);
  });
});

describe("springs", () => {
  it("enter is 0 at its start and ~1 after 12 frames", () => {
    expect(enter(10, 30, 10)).toBe(0);
    expect(enter(22, 30, 10)).toBeGreaterThan(0.99);
  });
  it("pulse peaks halfway and returns to 1", () => {
    expect(pulse(52.5, 45, 15, 1.05)).toBeCloseTo(1.05);
    expect(pulse(70, 45, 15, 1.05)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/timing.test.ts`
Expected: FAIL — `Failed to resolve import "../src/frame/timing"`.

- [ ] **Step 3: Implement**

`template/src/frame/timing.ts`:
```ts
import { interpolate, spring, type ExtrapolateType } from "remotion";

export const FPS = 30;
export const CLAMP: { extrapolateLeft: ExtrapolateType; extrapolateRight: ExtrapolateType } = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
};
export const ENTER_FRAMES = 12;
export const STAGGER = 6;
export const FADE_OUT_FRAMES = 8;
export const MIN_SCENE_FRAMES = 30;

export const SCENE_IDS = ["hook", "step1", "step2", "step3", "close"] as const;
export type SceneId = (typeof SCENE_IDS)[number];

// Share of the duration per scene, from the Dani reference (90/210/210/255/135 of 900 frames).
const DEFAULT_SHARES = [90, 210, 210, 255, 135].map((f) => f / 900);

/** No-bounce entrance, 0 → 1 over 12 frames. */
export const enter = (frame: number, fps: number, at: number) =>
  spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: ENTER_FRAMES });

/** Stamp / pop spring with overshoot. */
export const pop = (frame: number, fps: number, at: number) =>
  spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });

/** 1 → peak → 1 over `length` frames. */
export const pulse = (frame: number, at: number, length: number, peak: number) =>
  interpolate(frame, [at, at + length / 2, at + length], [1, peak, 1], CLAMP);

export const fadeOut = (frame: number, duration: number) =>
  interpolate(frame, [duration - FADE_OUT_FRAMES, duration], [1, 0], CLAMP);

export const totalFrames = (durationSeconds: number) => Math.round(durationSeconds * FPS);

export const defaultSceneStarts = (total: number): number[] => {
  let acc = 0;
  return DEFAULT_SHARES.map((share) => {
    const start = Math.round(acc * total);
    acc += share;
    return start;
  });
};

export const resolveSceneStarts = (
  starts: number[] | null,
  total: number,
): { starts: number[]; warning: string | null } => {
  const fallback = defaultSceneStarts(total);
  if (starts === null) {
    return { starts: fallback, warning: null };
  }
  const ok =
    starts.length === SCENE_IDS.length &&
    starts[0] === 0 &&
    starts.every((s) => Number.isInteger(s)) &&
    starts.every((s, i) => i === 0 || s - starts[i - 1] >= MIN_SCENE_FRAMES) &&
    total - starts[starts.length - 1] >= MIN_SCENE_FRAMES;
  if (ok) {
    return { starts, warning: null };
  }
  return {
    starts: fallback,
    warning: `Invalid sceneStarts ${JSON.stringify(starts)} for ${total} frames; using defaults ${JSON.stringify(fallback)}.`,
  };
};

export const sceneDurations = (starts: number[], total: number) =>
  starts.map((s, i) => (i + 1 < starts.length ? starts[i + 1] : total) - s);

export type BeatTiming = {
  readonly from: number;
  readonly duration: number;
  /** Frame (scene-local) at a fraction 0–1 of this beat. */
  readonly at: (fraction: number) => number;
};

export const beatTiming = (from: number, duration: number): BeatTiming => ({
  from,
  duration,
  at: (fraction) => from + fraction * duration,
});

export const splitBeats = (sceneDuration: number, beatCount: number, split: number): BeatTiming[] => {
  if (beatCount === 1) {
    return [beatTiming(0, sceneDuration)];
  }
  const first = Math.round(sceneDuration * split);
  return [beatTiming(0, first), beatTiming(first, sceneDuration - first)];
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd template && npx vitest run tests/timing.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add template/src/frame/timing.ts template/tests/timing.test.ts
git commit -m "feat(template): duration-agnostic scene and beat timing"
```

---

### Task 3: Layouts (9:16 and 4:5) with geometry invariants

**Files:**
- Create: `template/src/frame/layouts.json`, `template/src/frame/layout.ts`
- Test: `template/tests/layout.test.ts`

**Interfaces:**
- Produces: `type Rect`, `type LayoutName = "9x16" | "4x5"`, `type Layout`, `LAYOUTS: Record<LayoutName, Layout>`, `inflate(rect, by): Rect`, `intersects(a, b): boolean`, `slotKeepOut(layout): Rect`. `layouts.json` is also read by `scripts/check.mjs` (Task 10).

- [ ] **Step 1: Write the failing tests**

`template/tests/layout.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { LAYOUTS, intersects, slotKeepOut, type Layout, type Rect } from "../src/frame/layout";

const regions = (l: Layout): [string, Rect][] => [
  ["tracker", l.tracker],
  ["stage", l.stage],
  ["captions", l.captions],
  ["disclaimer", l.disclaimer],
];
const inside = (r: Rect, l: Layout) =>
  r.x >= 0 && r.y >= 0 && r.x + r.width <= l.canvas.width && r.y + r.height <= l.canvas.height;

describe.each(Object.values(LAYOUTS))("layout $name", (layout) => {
  it("keeps every region inside the canvas", () => {
    for (const [, r] of regions(layout)) expect(inside(r, layout)).toBe(true);
    expect(inside(slotKeepOut(layout), layout)).toBe(true);
  });
  it("keeps every region out of the slot plus clearance", () => {
    for (const [name, r] of regions(layout)) {
      expect({ name, hit: intersects(r, slotKeepOut(layout)) }).toEqual({ name, hit: false });
    }
  });
  it("keeps the name pill narrower than the slot", () => {
    expect(layout.namePill.maxWidth).toBeLessThan(layout.slot.width);
  });
  it("keeps the stage clear of the name pill", () => {
    const pillTop = layout.slot.y - layout.namePill.height / 2;
    expect(layout.stage.y + layout.stage.height).toBeLessThan(pillTop);
  });
  it("respects the platform safe zones", () => {
    for (const [, r] of regions(layout)) {
      expect(r.y).toBeGreaterThanOrEqual(layout.safe.top);
      expect(r.y + r.height).toBeLessThanOrEqual(layout.canvas.height - layout.safe.bottom);
    }
    expect(layout.slot.y + layout.slot.height).toBeLessThanOrEqual(layout.canvas.height - layout.safe.bottom);
    expect(layout.canvas.width - (layout.slot.x + layout.slot.width)).toBeGreaterThanOrEqual(layout.rightGutter);
  });
});

it("matches the Dani brief at 9:16", () => {
  const l = LAYOUTS["9x16"];
  expect(l.slot).toEqual({ x: 550, y: 1000, width: 380, height: 500, radius: 40 });
  expect(l.stage).toEqual({ x: 60, y: 320, width: 960, height: 620 });
  expect(l.rightGutter).toBe(150);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/layout.test.ts`
Expected: FAIL — cannot resolve `../src/frame/layout`.

- [ ] **Step 3: Implement**

`template/src/frame/layouts.json`:
```json
{
  "9x16": {
    "canvas": { "width": 1080, "height": 1920 },
    "safe": { "top": 220, "bottom": 420, "left": 60, "right": 60 },
    "tracker": { "x": 60, "y": 220, "width": 960, "height": 76 },
    "stage": { "x": 60, "y": 320, "width": 960, "height": 620 },
    "captions": { "x": 60, "y": 1040, "width": 450, "height": 360 },
    "disclaimer": { "x": 60, "y": 1420, "width": 450, "height": 80 },
    "slot": { "x": 550, "y": 1000, "width": 380, "height": 500, "radius": 40 },
    "slotClearance": 16,
    "slotBorder": 6,
    "slotRing": 3,
    "namePill": { "height": 60, "maxWidth": 340, "fontSize": 40 },
    "captionsBaseSize": 64,
    "rightGutter": 150
  },
  "4x5": {
    "canvas": { "width": 1080, "height": 1350 },
    "safe": { "top": 60, "bottom": 60, "left": 60, "right": 60 },
    "tracker": { "x": 60, "y": 60, "width": 960, "height": 76 },
    "stage": { "x": 60, "y": 160, "width": 960, "height": 540 },
    "captions": { "x": 60, "y": 760, "width": 540, "height": 390 },
    "disclaimer": { "x": 60, "y": 1170, "width": 540, "height": 80 },
    "slot": { "x": 700, "y": 830, "width": 320, "height": 420, "radius": 36 },
    "slotClearance": 16,
    "slotBorder": 6,
    "slotRing": 3,
    "namePill": { "height": 52, "maxWidth": 290, "fontSize": 34 },
    "captionsBaseSize": 56,
    "rightGutter": 60
  }
}
```

`template/src/frame/layout.ts`:
```ts
import layouts from "./layouts.json";

export type Rect = { x: number; y: number; width: number; height: number };
export type LayoutName = "9x16" | "4x5";
export type Layout = {
  name: LayoutName;
  canvas: { width: number; height: number };
  safe: { top: number; bottom: number; left: number; right: number };
  tracker: Rect;
  stage: Rect;
  captions: Rect;
  disclaimer: Rect;
  slot: Rect & { radius: number };
  slotClearance: number;
  slotBorder: number;
  slotRing: number;
  namePill: { height: number; maxWidth: number; fontSize: number };
  captionsBaseSize: number;
  rightGutter: number;
};

export const LAYOUTS: Record<LayoutName, Layout> = {
  "9x16": { name: "9x16", ...layouts["9x16"] },
  "4x5": { name: "4x5", ...layouts["4x5"] },
};

export const inflate = (r: Rect, by: number): Rect => ({
  x: r.x - by,
  y: r.y - by,
  width: r.width + by * 2,
  height: r.height + by * 2,
});

export const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The slot plus its clearance: nothing but the slot frame may render here. */
export const slotKeepOut = (l: Layout): Rect => inflate(l.slot, l.slotClearance);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd template && npx vitest run tests/layout.test.ts && npm run typecheck`
Expected: PASS (11 tests), typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add template/src/frame/layouts.json template/src/frame/layout.ts template/tests/layout.test.ts
git commit -m "feat(template): 9:16 and 4:5 layouts with keep-out invariants"
```

---

### Task 4: Talent profile and palette

**Files:**
- Create: `template/src/episode/talent.ts`
- Test: `template/tests/talent.test.ts`

**Interfaces:**
- Produces: `paletteSchema`, `type Palette` (`bg, bg2, accent, text, danger, safe, extra: Record<string,string>`), `talentSchema`, `type Talent`, `resolveColor(ref: string, palette: Palette): string`.

- [ ] **Step 1: Write the failing tests**

`template/tests/talent.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { resolveColor, talentSchema } from "../src/episode/talent";

export const DANI_TALENT = {
  id: "dani",
  displayName: "Dogtora Dani",
  pillName: "Dogtora Dani",
  profession: "Médica veterinaria",
  city: "Manizales",
  country: "CO",
  locale: "es-CO",
  colors: {
    bg: "#1A1023",
    bg2: "#2A1838",
    accent: "#FF7A1A",
    text: "#FFF3E0",
    danger: "#FF4D4D",
    safe: "#3DDC97",
    extra: { chocoWhite: "#F3E3C7", chocoMilk: "#A8693D", chocoSemi: "#6B3F23", chocoDark: "#3B2114" },
  },
  disclaimer: ["Contenido educativo.", "No reemplaza la consulta veterinaria."],
};

describe("talentSchema", () => {
  it("accepts the Dani profile and fills defaults", () => {
    const t = talentSchema.parse(DANI_TALENT);
    expect(t.handles).toEqual({ instagram: "", tiktok: "", whatsapp: "", facebook: "" });
    expect(t.voiceNotes).toBe("");
  });
  it("rejects a 3-digit hex color", () => {
    const bad = { ...DANI_TALENT, colors: { ...DANI_TALENT.colors, bg: "#123" } };
    expect(talentSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects a pill name longer than 18 characters", () => {
    expect(talentSchema.safeParse({ ...DANI_TALENT, pillName: "Doctora Daniela Gómez" }).success).toBe(false);
  });
});

describe("resolveColor", () => {
  const palette = talentSchema.parse(DANI_TALENT).colors;
  it("passes hex through", () => expect(resolveColor("#123456", palette)).toBe("#123456"));
  it("resolves base and extra tokens", () => {
    expect(resolveColor("accent", palette)).toBe("#FF7A1A");
    expect(resolveColor("chocoMilk", palette)).toBe("#A8693D");
  });
  it("names the valid tokens when a token is unknown", () => {
    expect(() => resolveColor("chocoMilks", palette)).toThrow(/Unknown color "chocoMilks".*chocoMilk/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/talent.test.ts`
Expected: FAIL — cannot resolve `../src/episode/talent`.

- [ ] **Step 3: Implement**

`template/src/episode/talent.ts`:
```ts
import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #RRGGBB color");

export const paletteSchema = z.object({
  bg: hex,
  bg2: hex,
  accent: hex,
  text: hex,
  danger: hex,
  safe: hex,
  extra: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/), hex).default({}),
});
export type Palette = z.infer<typeof paletteSchema>;

const EMPTY_HANDLES = { instagram: "", tiktok: "", whatsapp: "", facebook: "" };

export const talentSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  pillName: z.string().min(1).max(18),
  profession: z.string().min(1),
  city: z.string().min(1),
  country: z.string().length(2),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
  voiceNotes: z.string().default(""),
  handles: z
    .object({
      instagram: z.string().default(""),
      tiktok: z.string().default(""),
      whatsapp: z.string().default(""),
      facebook: z.string().default(""),
    })
    .default(EMPTY_HANDLES),
  colors: paletteSchema,
  disclaimer: z.tuple([z.string(), z.string()]),
  recordingNotes: z.string().default(""),
});
export type Talent = z.infer<typeof talentSchema>;

const BASE_KEYS = ["bg", "bg2", "accent", "text", "danger", "safe"] as const;
type BaseKey = (typeof BASE_KEYS)[number];
const isBaseKey = (ref: string): ref is BaseKey => (BASE_KEYS as readonly string[]).includes(ref);

/** A block color prop is either #RRGGBB or a palette token (base key or an `extra` name). */
export const resolveColor = (ref: string, palette: Palette): string => {
  if (/^#[0-9a-fA-F]{6}$/.test(ref)) {
    return ref;
  }
  if (isBaseKey(ref)) {
    return palette[ref];
  }
  const extra = palette.extra[ref];
  if (extra) {
    return extra;
  }
  throw new Error(
    `Unknown color "${ref}". Use #RRGGBB or one of: ${[...BASE_KEYS, ...Object.keys(palette.extra)].join(", ")}`,
  );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd template && npx vitest run tests/talent.test.ts && npm run typecheck`
Expected: PASS (6 tests), typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add template/src/episode/talent.ts template/tests/talent.test.ts
git commit -m "feat(template): talent profile schema and palette color resolution"
```

---

### Task 5: Icon registry

**Files:**
- Create: `template/src/icons/names.ts`, `template/src/icons/index.tsx`
- Test: `template/tests/icons.test.ts`

**Interfaces:**
- Produces: `ICON_NAMES` (readonly tuple), `type IconName`, `type IconProps = { size: number; color: string; accent?: string; style?: React.CSSProperties }`, `ICONS: Record<IconName, React.FC<IconProps>>`, `<Icon name size color accent? style? />`, `<PawShape fill />` (for the background pattern). Plan 2 extends `ICON_NAMES` and `ICONS` to ~100.

- [ ] **Step 1: Write the failing test**

`template/tests/icons.test.ts`:
```ts
import { expect, it } from "vitest";
import { ICONS } from "../src/icons";
import { ICON_NAMES } from "../src/icons/names";

it("registers a component for exactly the declared icon names", () => {
  expect(Object.keys(ICONS).sort()).toEqual([...ICON_NAMES].sort());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run tests/icons.test.ts`
Expected: FAIL — cannot resolve `../src/icons`.

- [ ] **Step 3: Implement**

`template/src/icons/names.ts`:
```ts
export const ICON_NAMES = [
  "paw",
  "check",
  "x",
  "milk",
  "spoonDrop",
  "vomit",
  "panting",
  "tremor",
  "dog",
  "pumpkin",
  "bookmark",
  "share",
  "clock",
  "warning",
  "info",
] as const;
export type IconName = (typeof ICON_NAMES)[number];
```

`template/src/icons/index.tsx`:
```tsx
import type React from "react";
import type { IconName } from "./names";

// Inline SVG icons on a 100×100 grid. No emoji, no external images.
// `color` is the main fill/stroke; `accent` is an optional second color.
export type IconProps = {
  readonly size: number;
  readonly color: string;
  readonly accent?: string;
  readonly style?: React.CSSProperties;
};

export const PawShape: React.FC<{ readonly fill: string }> = ({ fill }) => (
  <g fill={fill}>
    <ellipse cx="50" cy="66" rx="24" ry="20" />
    <ellipse cx="22" cy="42" rx="10" ry="13" transform="rotate(-20 22 42)" />
    <ellipse cx="40" cy="24" rx="10" ry="14" transform="rotate(-6 40 24)" />
    <ellipse cx="60" cy="24" rx="10" ry="14" transform="rotate(6 60 24)" />
    <ellipse cx="78" cy="42" rx="10" ry="13" transform="rotate(20 78 42)" />
  </g>
);

const Svg: React.FC<{ readonly size: number; readonly style?: React.CSSProperties; readonly children: React.ReactNode }> = ({
  size,
  style,
  children,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style} overflow="visible">
    {children}
  </svg>
);

export const ICONS: Record<IconName, React.FC<IconProps>> = {
  paw: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <PawShape fill={color} />
    </Svg>
  ),
  check: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path d="M22 52 L42 72 L80 30" fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  x: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path
        d="M15 15 L85 85 M85 15 L15 85"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  ),
  milk: ({ size, color, accent = "#000000", style }) => (
    <Svg size={size} style={style}>
      <path d="M28 14 H72 L66 90 H34 Z" fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" />
      <path d="M31.5 40 Q40 34 50 40 T68.5 40 L66 90 H34 Z" fill={color} opacity="0.95" />
      <path d="M38 50 V78" stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.35" />
    </Svg>
  ),
  spoonDrop: ({ size, color, accent = color, style }) => (
    <Svg size={size} style={style}>
      <ellipse cx="38" cy="62" rx="22" ry="15" transform="rotate(-30 38 62)" fill="none" stroke={color} strokeWidth="6" />
      <path d="M56 50 L88 22" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <path d="M70 58 C70 58 60 72 60 78 A10 10 0 0 0 80 78 C80 72 70 58 70 58 Z" fill={accent} />
    </Svg>
  ),
  vomit: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path d="M50 12 C50 12 24 46 24 62 A26 26 0 0 0 76 62 C76 46 50 12 50 12 Z" fill={color} />
      <circle cx="40" cy="62" r="6" fill="#00000033" />
    </Svg>
  ),
  panting: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <g fill="none" stroke={color} strokeWidth="8" strokeLinecap="round">
        <path d="M14 30 Q30 18 46 30 T78 30" />
        <path d="M22 52 Q38 40 54 52 T86 52" />
        <path d="M14 74 Q30 62 46 74 T78 74" />
      </g>
    </Svg>
  ),
  tremor: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path
        d="M8 50 L22 50 L30 22 L42 78 L54 22 L66 78 L74 50 L92 50"
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  dog: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path
        fill={color}
        d="M18 40 L26 24 L32 34 L40 34 L46 24 L50 40 C50 46 46 50 42 52 L74 52 C80 52 84 48 88 40 L92 42 C90 50 86 56 82 58 L82 84 L74 84 L72 66 L50 66 L46 84 L38 84 L36 56 C26 56 18 50 18 40 Z"
      />
    </Svg>
  ),
  pumpkin: ({ size, color, accent = color, style }) => (
    <Svg size={size} style={style}>
      <path d="M50 26 C52 16 58 10 64 8" stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none" />
      <ellipse cx="32" cy="60" rx="22" ry="30" fill={color} />
      <ellipse cx="68" cy="60" rx="22" ry="30" fill={color} />
      <ellipse cx="50" cy="60" rx="20" ry="32" fill={color} />
      <path d="M50 30 V90 M34 34 Q26 60 34 88 M66 34 Q74 60 66 88" stroke="#00000030" strokeWidth="3" fill="none" />
    </Svg>
  ),
  bookmark: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path d="M26 10 H74 V90 L50 70 L26 90 Z" fill={color} strokeLinejoin="round" />
    </Svg>
  ),
  share: ({ size, color, style }) => (
    <Svg size={size} style={style}>
      <path d="M8 46 L92 10 L66 90 L48 60 Z" fill={color} strokeLinejoin="round" />
      <path d="M48 60 L92 10" stroke="#00000040" strokeWidth="5" />
    </Svg>
  ),
  clock: ({ size, color, accent = color, style }) => (
    <Svg size={size} style={style}>
      <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="8" />
      <path d="M50 28 V50 L66 60" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  warning: ({ size, color, accent = "#00000080", style }) => (
    <Svg size={size} style={style}>
      <path d="M50 10 L92 86 H8 Z" fill={color} strokeLinejoin="round" />
      <path d="M50 38 V60" stroke={accent} strokeWidth="9" strokeLinecap="round" />
      <circle cx="50" cy="73" r="5" fill={accent} />
    </Svg>
  ),
  info: ({ size, color, accent = "#00000080", style }) => (
    <Svg size={size} style={style}>
      <circle cx="50" cy="50" r="40" fill={color} />
      <path d="M50 46 V72" stroke={accent} strokeWidth="9" strokeLinecap="round" />
      <circle cx="50" cy="31" r="5.5" fill={accent} />
    </Svg>
  ),
};

export const Icon: React.FC<IconProps & { readonly name: IconName }> = ({ name, ...rest }) => {
  const Component = ICONS[name];
  if (!Component) {
    throw new Error(`Unknown icon "${name}"`);
  }
  return <Component {...rest} />;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd template && npx vitest run tests/icons.test.ts && npm run lint`
Expected: PASS; lint exit 0.

- [ ] **Step 5: Commit**

```bash
git add template/src/icons template/tests/icons.test.ts
git commit -m "feat(template): inline SVG icon registry"
```

---

### Task 6: Episode schema, block schema registry, validation

**Files:**
- Create: `template/src/blocks/schema-parts.ts`, `template/src/blocks/BigStat.schema.ts`, `template/src/blocks/schemas.ts`, `template/src/episode/schema.ts`, `template/src/episode/validate.ts`
- Test: `template/tests/validate.test.ts`, `template/tests/fixtures.ts`

**Interfaces:**
- Consumes: `ICON_NAMES` (Task 5), `talentSchema` (Task 4), `SCENE_IDS`, `totalFrames` (Task 2).
- Produces:
  - `schema-parts.ts`: `iconName`, `colorRef`, `accented`, `type Accented = { text: string; accent?: string; tone: "accent" | "danger" | "safe" }`, `chipItem`
  - `schemas.ts`: `BLOCK_SCHEMAS` (object of zod schemas keyed by block name), `type BlockName`, `isBlockName(name): name is BlockName`. Each block task adds one entry.
  - `episode/schema.ts`: `beatSchema`, `sceneSchema`, `episodeSchema`, `STAGES`, `type Episode`, `type Scene`, `type Beat`
  - `episode/validate.ts`: `class EpisodeError extends Error`, `validateEpisode(raw: unknown): Episode`, `validateTalent(raw: unknown): Talent`, `validateBeat(beat: Beat, path: string): Beat` (returns the beat with parsed props).

- [ ] **Step 1: Write the failing tests**

`template/tests/fixtures.ts`:
```ts
// A minimal valid episode where every scene is one BigStat. Tests clone and break it.
export const minimalEpisode = () => {
  const stat = (label: string) => ({ block: "BigStat", props: { value: 42, label } });
  return {
    schemaVersion: 1,
    talent: "dani",
    slug: "test-episode",
    durationSeconds: 20,
    stage: "built",
    frame: { steps: ["UNO", "DOS", "TRES"] },
    script: ["Hola.", "Uno.", "Dos.", "Tres.", "Chao."],
    sceneStarts: null,
    scenes: {
      hook: { beats: [stat("Gancho")] },
      step1: { title: { text: "¿UNO?", accent: "UNO" }, beats: [stat("Uno")] },
      step2: { beats: [stat("Dos A"), stat("Dos B")] },
      step3: { beats: [stat("Tres")] },
      close: { beats: [stat("Cierre")] },
    },
  };
};
```

`template/tests/validate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { validateEpisode } from "../src/episode/validate";
import { minimalEpisode } from "./fixtures";

describe("validateEpisode", () => {
  it("accepts a minimal episode and fills defaults", () => {
    const e = validateEpisode(minimalEpisode());
    expect(e.clip).toEqual({ src: "", trimStartFrames: 0 });
    expect(e.coverFrame).toBe(60);
    expect(e.scenes.step2.split).toBe(0.5);
    expect(e.scenes.hook.beats[0].props).toMatchObject({ value: 42, decimals: 0, unit: "" });
  });
  it("names the path and the known blocks for an unknown block", () => {
    const raw = minimalEpisode();
    raw.scenes.step1.beats[0].block = "BigStats";
    expect(() => validateEpisode(raw)).toThrow(/scenes\.step1\.beats\[0\]: unknown block "BigStats"\. Known blocks: .*BigStat/);
  });
  it("names the path of invalid block props", () => {
    const raw = minimalEpisode();
    raw.scenes.step3.beats[0].props.label = "";
    expect(() => validateEpisode(raw)).toThrow(/scenes\.step3\.beats\[0\]\.props\.label/);
  });
  it("rejects durations outside 15–60 s", () => {
    expect(() => validateEpisode({ ...minimalEpisode(), durationSeconds: 90 })).toThrow(/durationSeconds/);
  });
  it("rejects an accent that is not part of the title", () => {
    const raw = minimalEpisode();
    raw.scenes.step1.title = { text: "¿UNO?", accent: "DOS" };
    expect(() => validateEpisode(raw)).toThrow(/accent must appear in text/);
  });
  it("rejects a cover frame past the end", () => {
    expect(() => validateEpisode({ ...minimalEpisode(), coverFrame: 600 })).toThrow(/coverFrame/);
  });
  it("rejects more than two beats per scene", () => {
    const raw = minimalEpisode();
    raw.scenes.step2.beats.push(raw.scenes.step2.beats[0]);
    expect(() => validateEpisode(raw)).toThrow(/scenes\.step2\.beats/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/validate.test.ts`
Expected: FAIL — cannot resolve `../src/episode/validate`.

- [ ] **Step 3: Implement**

`template/src/blocks/schema-parts.ts`:
```ts
import { z } from "zod";
import { ICON_NAMES } from "../icons/names";

export const iconName = z.enum(ICON_NAMES);

/** #RRGGBB or a palette token such as "accent" or "chocoMilk". */
export const colorRef = z
  .string()
  .regex(/^(#[0-9a-fA-F]{6}|[a-zA-Z][a-zA-Z0-9]*)$/, "use #RRGGBB or a palette color name");

export const accented = z
  .object({
    text: z.string().min(1).max(40),
    accent: z.string().optional(),
    tone: z.enum(["accent", "danger", "safe"]).default("accent"),
  })
  .refine((v) => v.accent === undefined || v.text.includes(v.accent), {
    message: "accent must appear in text",
  });
export type Accented = z.infer<typeof accented>;

export const chipItem = z.object({ icon: iconName, label: z.string().min(1).max(22) });
```

`template/src/blocks/BigStat.schema.ts`:
```ts
import { z } from "zod";

export const bigStatSchema = z.object({
  value: z.number(),
  decimals: z.number().int().min(0).max(2).default(0),
  prefix: z.string().max(3).default(""),
  unit: z.string().max(6).default(""),
  label: z.string().min(1).max(60),
  source: z.string().max(80).default(""),
});
```

`template/src/blocks/schemas.ts`:
```ts
import { bigStatSchema } from "./BigStat.schema";

// Node-safe: schemas only, no components. Each block task adds its entry here.
export const BLOCK_SCHEMAS = {
  BigStat: bigStatSchema,
} as const;

export type BlockName = keyof typeof BLOCK_SCHEMAS;

export const isBlockName = (name: string): name is BlockName =>
  Object.prototype.hasOwnProperty.call(BLOCK_SCHEMAS, name);
```

`template/src/episode/schema.ts`:
```ts
import { z } from "zod";
import { accented } from "../blocks/schema-parts";

export const beatSchema = z.object({
  block: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
});
export type Beat = z.infer<typeof beatSchema>;

export const sceneSchema = z.object({
  title: accented.optional(),
  beats: z.array(beatSchema).min(1).max(2),
  split: z.number().min(0.3).max(0.7).default(0.5),
});
export type Scene = z.infer<typeof sceneSchema>;

export const STAGES = ["researched", "scripted", "built", "synced", "exported"] as const;

const stepLabel = z.string().min(1).max(12);

export const episodeSchema = z.object({
  schemaVersion: z.literal(1),
  talent: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  durationSeconds: z.number().int().min(15).max(60),
  stage: z.enum(STAGES),
  frame: z.object({ steps: z.tuple([stepLabel, stepLabel, stepLabel]) }),
  script: z.array(z.string().min(1)).length(5),
  sceneStarts: z.array(z.number().int()).length(5).nullable(),
  scenes: z.object({
    hook: sceneSchema,
    step1: sceneSchema,
    step2: sceneSchema,
    step3: sceneSchema,
    close: sceneSchema,
  }),
  facts: z.array(z.object({ claim: z.string(), source: z.string() })).default([]),
  clip: z
    .object({ src: z.string(), trimStartFrames: z.number().int().min(0) })
    .default({ src: "", trimStartFrames: 0 }),
  captionsSrc: z.string().default(""),
  coverFrame: z.number().int().min(0).default(60),
  musicSrc: z.string().default(""),
});
export type Episode = z.infer<typeof episodeSchema>;
```

`template/src/episode/validate.ts`:
```ts
import type { z } from "zod";
import { BLOCK_SCHEMAS, isBlockName } from "../blocks/schemas";
import { SCENE_IDS, totalFrames } from "../frame/timing";
import { episodeSchema, type Beat, type Episode } from "./schema";
import { talentSchema, type Talent } from "./talent";

export class EpisodeError extends Error {}

const formatIssues = (path: string, error: z.ZodError) =>
  error.issues
    .map((issue) => `${path}${issue.path.length ? `.${issue.path.join(".")}` : ""}: ${issue.message}`)
    .join("\n");

export const validateBeat = (beat: Beat, path: string): Beat => {
  if (!isBlockName(beat.block)) {
    throw new EpisodeError(
      `${path}: unknown block "${beat.block}". Known blocks: ${Object.keys(BLOCK_SCHEMAS).join(", ")}`,
    );
  }
  const result = BLOCK_SCHEMAS[beat.block].safeParse(beat.props);
  if (!result.success) {
    throw new EpisodeError(formatIssues(`${path}.props`, result.error));
  }
  return { block: beat.block, props: result.data as Record<string, unknown> };
};

export const validateEpisode = (raw: unknown): Episode => {
  const parsed = episodeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new EpisodeError(formatIssues("episode", parsed.error));
  }
  const episode = parsed.data;
  const problems: string[] = [];
  for (const id of SCENE_IDS) {
    const scene = episode.scenes[id];
    scene.beats = scene.beats.map((beat, i) => {
      try {
        return validateBeat(beat, `scenes.${id}.beats[${i}]`);
      } catch (err) {
        problems.push((err as Error).message);
        return beat;
      }
    });
  }
  if (episode.coverFrame >= totalFrames(episode.durationSeconds)) {
    problems.push(`episode.coverFrame: ${episode.coverFrame} is past the last frame`);
  }
  if (problems.length) {
    throw new EpisodeError(problems.join("\n"));
  }
  return episode;
};

export const validateTalent = (raw: unknown): Talent => {
  const parsed = talentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new EpisodeError(formatIssues("talent", parsed.error));
  }
  return parsed.data;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd template && npx vitest run && npm run typecheck`
Expected: all tests PASS (validate: 7), typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add template/src/blocks template/src/episode template/tests/validate.test.ts template/tests/fixtures.ts
git commit -m "feat(template): episode schema and block-aware validation"
```

---

### Task 7: Caption model (pure)

**Files:**
- Create: `template/src/frame/captions-model.ts`
- Test: `template/tests/captions-model.test.ts`

**Interfaces:**
- Produces: `type Word = { text: string; from: number; to: number }`, `type Page = { words: Word[]; from: number; to: number }`, `type PageLayout = { fontSize: number; lines: Word[][] }`, `type Measure = (text: string, fontSize: number) => number`, constants `ACTIVE_SCALE = 1.08`, `LINE_HEIGHT = 1.1`, `WORD_GAP = 0.3`, and functions `wordsFromScript(script, starts, total): Word[][]`, `wordsFromCaptions(captions: Caption[], fps): Word[][]`, `paginate(groups): Page[]`, `layoutPage(page, measure, box: { width: number; height: number }, baseSize): PageLayout`.

- [ ] **Step 1: Write the failing tests**

`template/tests/captions-model.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { layoutPage, paginate, wordsFromCaptions, wordsFromScript, type Page } from "../src/frame/captions-model";

const STARTS = [0, 90, 300, 510, 765];

describe("wordsFromScript", () => {
  it("spreads each scene's words after a 6-frame lead-in", () => {
    const groups = wordsFromScript(["uno dos", "tres", "cuatro", "cinco", "seis"], STARTS, 900);
    expect(groups[0]).toEqual([
      { text: "uno", from: 6, to: 48 },
      { text: "dos", from: 48, to: 90 },
    ]);
    expect(groups[1]).toEqual([{ text: "tres", from: 96, to: 300 }]);
    expect(groups[4][0].to).toBe(900);
  });
});

describe("wordsFromCaptions", () => {
  const cap = (text: string, startMs: number, endMs: number, pageBreakAfter = false) => ({
    text,
    startMs,
    endMs,
    timestampMs: null,
    confidence: null,
    pageBreakAfter,
  });
  it("converts ms to frames and starts a new group after a 0.5 s pause", () => {
    const groups = wordsFromCaptions([cap(" Hola", 0, 400), cap(" mundo", 400, 800), cap(" otra", 1500, 1900)], 30);
    expect(groups).toEqual([
      [
        { text: "Hola", from: 0, to: 12 },
        { text: "mundo", from: 12, to: 24 },
      ],
      [{ text: "otra", from: 45, to: 57 }],
    ]);
  });
  it("breaks on pageBreakAfter and skips empty tokens", () => {
    const groups = wordsFromCaptions([cap(" a", 0, 100, true), cap(" ", 100, 150), cap(" b", 150, 200)], 30);
    expect(groups.map((g) => g.map((w) => w.text))).toEqual([["a"], ["b"]]);
  });
});

describe("paginate", () => {
  it("splits groups into pages of at most 3 words without crossing groups", () => {
    const w = (text: string, from: number) => ({ text, from, to: from + 10 });
    const pages = paginate([[w("a", 0), w("b", 10), w("c", 20), w("d", 30)], [w("e", 50)]]);
    expect(pages.map((p) => p.words.map((x) => x.text))).toEqual([["a", "b", "c"], ["d"], ["e"]]);
    expect(pages[0]).toMatchObject({ from: 0, to: 30 });
  });
});

describe("layoutPage", () => {
  const measure = (text: string, size: number) => text.length * size * 0.5;
  const page = (...texts: string[]): Page => ({
    words: texts.map((text, i) => ({ text, from: i, to: i + 1 })),
    from: 0,
    to: texts.length,
  });
  it("keeps short pages on one line at the base size", () => {
    const l = layoutPage(page("uno", "dos", "tres"), measure, { width: 450, height: 360 }, 64);
    expect(l.fontSize).toBe(64);
    expect(l.lines.map((line) => line.map((w) => w.text))).toEqual([["uno", "dos", "tres"]]);
  });
  it("wraps to two lines when needed", () => {
    const l = layoutPage(page("preocuparte", "entre", "mucho"), measure, { width: 450, height: 360 }, 64);
    expect(l.lines.length).toBe(2);
    expect(l.fontSize).toBe(64);
  });
  it("shrinks the font for a very long word so it never overflows", () => {
    const l = layoutPage(page("otorrinolaringólogo"), measure, { width: 450, height: 360 }, 64);
    expect(l.fontSize).toBe(42);
    expect(measure("otorrinolaringólogo", l.fontSize) * 1.08).toBeLessThanOrEqual(450);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/captions-model.test.ts`
Expected: FAIL — cannot resolve `../src/frame/captions-model`.

- [ ] **Step 3: Implement**

`template/src/frame/captions-model.ts`:
```ts
import type { Caption } from "@remotion/captions";

export type Word = { text: string; from: number; to: number };
export type Page = { words: Word[]; from: number; to: number };
export type PageLayout = { fontSize: number; lines: Word[][] };
export type Measure = (text: string, fontSize: number) => number;

const MAX_WORDS = 3;
const MAX_LINES = 2;
const MIN_SIZE = 32;
const LEAD_IN = 6;
// Gap between transcribed words (seconds) that forces a new page.
const PAGE_GAP_SECONDS = 0.5;
export const ACTIVE_SCALE = 1.08;
export const LINE_HEIGHT = 1.1;
export const WORD_GAP = 0.3; // em

/** Phase 1: spread each scene's words evenly across the scene, after a lead-in. */
export const wordsFromScript = (script: string[], starts: number[], total: number): Word[][] =>
  script.map((line, i) => {
    const tokens = line.split(/\s+/).filter(Boolean);
    const end = i + 1 < starts.length ? starts[i + 1] : total;
    const from = starts[i] + LEAD_IN;
    const per = (end - from) / Math.max(1, tokens.length);
    return tokens.map((text, j) => ({ text, from: from + j * per, to: from + (j + 1) * per }));
  });

/** Phase 2: word-level captions from a transcription. Groups break on pauses and page breaks. */
export const wordsFromCaptions = (captions: Caption[], fps: number): Word[][] => {
  const groups: Word[][] = [];
  let current: Word[] = [];
  const flush = () => {
    if (current.length) {
      groups.push(current);
      current = [];
    }
  };
  for (const cap of captions) {
    const word = { text: cap.text.trim(), from: (cap.startMs / 1000) * fps, to: (cap.endMs / 1000) * fps };
    if (word.text) {
      const prev = current[current.length - 1];
      if (prev && word.from - prev.to > PAGE_GAP_SECONDS * fps) {
        flush();
      }
      current.push(word);
    }
    if (cap.pageBreakAfter) {
      flush();
    }
  }
  flush();
  return groups;
};

export const paginate = (groups: Word[][]): Page[] =>
  groups.flatMap((words) => {
    const pages: Page[] = [];
    for (let i = 0; i < words.length; i += MAX_WORDS) {
      const chunk = words.slice(i, i + MAX_WORDS);
      pages.push({ words: chunk, from: chunk[0].from, to: chunk[chunk.length - 1].to });
    }
    return pages;
  });

/** Greedy wrap; shrinks the font until the page fits MAX_LINES lines of the box. */
export const layoutPage = (
  page: Page,
  measure: Measure,
  box: { width: number; height: number },
  baseSize: number,
): PageLayout => {
  // Leave room for the active word's scale.
  const maxWidth = box.width / ACTIVE_SCALE;
  for (let fontSize = baseSize; fontSize >= MIN_SIZE; fontSize -= 2) {
    const space = WORD_GAP * fontSize;
    const lines: Word[][] = [];
    let lineWidth = 0;
    let fits = true;
    for (const word of page.words) {
      const w = measure(word.text, fontSize);
      if (w > maxWidth) {
        fits = false;
        break;
      }
      const last = lines[lines.length - 1];
      if (last && lineWidth + space + w <= maxWidth) {
        last.push(word);
        lineWidth += space + w;
      } else {
        lines.push([word]);
        lineWidth = w;
      }
    }
    if (fits && lines.length <= MAX_LINES && lines.length * fontSize * LINE_HEIGHT <= box.height) {
      return { fontSize, lines };
    }
  }
  return { fontSize: MIN_SIZE, lines: page.words.map((w) => [w]) };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd template && npx vitest run tests/captions-model.test.ts && npm run typecheck`
Expected: PASS (7 tests), typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add template/src/frame/captions-model.ts template/tests/captions-model.test.ts
git commit -m "feat(template): pure caption paging and fit model"
```

---

### Task 8: Frame components

**Files:**
- Create: `template/src/frame/contexts.ts`, `theme.ts`, `fit.ts`, `resolveSrc.ts`, `AccentText.tsx`, `Background.tsx`, `TalentSlot.tsx`, `StepTracker.tsx`, `Captions.tsx`, `Disclaimer.tsx`, `Guides.tsx`, `FitStage.tsx` (all under `template/src/frame/`)

**Interfaces:**
- Consumes: `Layout`, `LAYOUTS`, `slotKeepOut` (Task 3); `Palette`, `Talent` (Task 4); timing (Task 2); captions model (Task 7); `PawShape`, `Icon` (Task 5); `Accented` (Task 6).
- Produces:
  - `contexts.ts`: `LayoutContext`, `useLayout()`, `PaletteContext`, `usePalette()`, `TalentContext`, `useTalent()`
  - `theme.ts`: `FONT_HEAD`, `FONT_BODY`, `WEIGHT_HEAD = 800`, `WEIGHT_BODY = 600`, `headStyle(size)`, `bodyStyle(size)`, `useFontsReady(): boolean`
  - `fit.ts`: `fitFontSize(text, maxWidth, base, fontFamily, fontWeight): number`
  - `resolveSrc.ts`: `resolveSrc(src): string`
  - Components: `<AccentText value accentStyle? />`, `<Background total />`, `<TalentSlot pillName clipSrc trimStartFrames />`, `<StepTracker labels sceneStarts total />`, `<Captions script sceneStarts total captionsSrc />`, `<Disclaimer lines />`, `<Guides />`, `<FitStage name style? children />`. `FitStage` logs `[reelkit:fit] <name> <scale>` once per mount (parsed by the check script).

- [ ] **Step 1: Write the context, theme and helper modules**

`template/src/frame/contexts.ts`:
```ts
import { createContext, useContext } from "react";
import type { Palette, Talent } from "../episode/talent";
import { LAYOUTS, type Layout } from "./layout";

export const LayoutContext = createContext<Layout>(LAYOUTS["9x16"]);
export const useLayout = () => useContext(LayoutContext);

export const PaletteContext = createContext<Palette | null>(null);
export const usePalette = (): Palette => {
  const palette = useContext(PaletteContext);
  if (!palette) {
    throw new Error("usePalette() needs a PaletteContext.Provider");
  }
  return palette;
};

export const TalentContext = createContext<Talent | null>(null);
export const useTalent = (): Talent => {
  const talent = useContext(TalentContext);
  if (!talent) {
    throw new Error("useTalent() needs a TalentContext.Provider");
  }
  return talent;
};
```

`template/src/frame/theme.ts`:
```ts
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { loadFont as loadBaloo } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const baloo = loadBaloo("normal", { weights: ["800"], subsets: ["latin", "latin-ext"] });
const inter = loadInter("normal", { weights: ["600"], subsets: ["latin", "latin-ext"] });

export const FONT_HEAD = baloo.fontFamily;
export const FONT_BODY = inter.fontFamily;
export const WEIGHT_HEAD = 800;
export const WEIGHT_BODY = 600;

export const headStyle = (fontSize: number): React.CSSProperties => ({
  fontFamily: FONT_HEAD,
  fontWeight: WEIGHT_HEAD,
  fontSize,
  lineHeight: 1.05,
});

export const bodyStyle = (fontSize: number): React.CSSProperties => ({
  fontFamily: FONT_BODY,
  fontWeight: WEIGHT_BODY,
  fontSize,
  lineHeight: 1.2,
});

/** Blocks rendering until both fonts are loaded, so text measurement is exact. */
export const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    Promise.all([baloo.waitUntilDone(), inter.waitUntilDone()]).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  return ready;
};
```

`template/src/frame/fit.ts`:
```ts
import { measureText } from "@remotion/layout-utils";

/** Largest size ≤ base at which `text` fits on one line within maxWidth. Call only after fonts load. */
export const fitFontSize = (
  text: string,
  maxWidth: number,
  base: number,
  fontFamily: string,
  fontWeight: number,
): number => {
  const width = measureText({ text, fontFamily, fontWeight, fontSize: base }).width;
  return width <= maxWidth ? base : Math.floor((base * maxWidth) / width);
};
```

`template/src/frame/resolveSrc.ts`:
```ts
import { staticFile } from "remotion";

/** URLs pass through; anything else is a file in the episode folder (the public dir). */
export const resolveSrc = (src: string) => {
  if (/^(https?:|blob:|data:)/.test(src)) {
    return src;
  }
  return staticFile(src.replace(/^\.?\//, ""));
};
```

`template/src/frame/AccentText.tsx`:
```tsx
import type { Accented } from "../blocks/schema-parts";
import { usePalette } from "./contexts";

/** Renders `value.text`, coloring the first occurrence of `value.accent` by its tone. */
export const AccentText: React.FC<{ readonly value: Accented; readonly accentStyle?: React.CSSProperties }> = ({
  value,
  accentStyle,
}) => {
  const c = usePalette();
  if (!value.accent) {
    return <>{value.text}</>;
  }
  const color = value.tone === "danger" ? c.danger : value.tone === "safe" ? c.safe : c.accent;
  const i = value.text.indexOf(value.accent);
  return (
    <>
      {value.text.slice(0, i)}
      <span style={{ color, ...accentStyle }}>{value.accent}</span>
      {value.text.slice(i + value.accent.length)}
    </>
  );
};
```

- [ ] **Step 2: Write the persistent frame components**

`template/src/frame/Background.tsx`:
```tsx
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PawShape } from "../icons";
import { useLayout, usePalette } from "./contexts";
import { slotKeepOut } from "./layout";
import { CLAMP } from "./timing";

const TILE = 200;
const DRIFT = 24;

export const Background: React.FC<{ readonly total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  const c = usePalette();
  const layout = useLayout();
  const { width, height } = layout.canvas;
  const keepOut = slotKeepOut(layout);
  const drift = interpolate(frame, [0, Math.max(1, total - 1)], [0, -DRIFT], CLAMP);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: c.bg,
        backgroundImage: `radial-gradient(ellipse 80% 55% at 50% 38%, ${c.bg2} 0%, ${c.bg} 100%)`,
      }}
    >
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern
            id="paws"
            width={TILE}
            height={TILE}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(0 ${drift})`}
          >
            <g transform="translate(30 30) scale(0.5) rotate(-18 50 50)">
              <PawShape fill={c.text} />
            </g>
            <g transform="translate(125 120) scale(0.4) rotate(22 50 50)">
              <PawShape fill={c.text} />
            </g>
          </pattern>
          <mask id="slot-mask">
            <rect width={width} height={height} fill="white" />
            <rect
              x={keepOut.x}
              y={keepOut.y}
              width={keepOut.width}
              height={keepOut.height}
              rx={layout.slot.radius + layout.slotClearance}
              fill="black"
            />
          </mask>
        </defs>
        <rect width={width} height={height} fill="url(#paws)" opacity={0.05} mask="url(#slot-mask)" />
      </svg>
    </AbsoluteFill>
  );
};
```

`template/src/frame/TalentSlot.tsx`:
```tsx
import { Video } from "@remotion/media";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout, usePalette } from "./contexts";
import { resolveSrc } from "./resolveSrc";
import { FONT_HEAD, WEIGHT_HEAD } from "./theme";
import { CLAMP, enter } from "./timing";

const SLOT_FILL = "#120A18";
const OBJECT_POSITION = "50% 22%";

export const TalentSlot: React.FC<{
  readonly pillName: string;
  readonly clipSrc: string;
  readonly trimStartFrames: number;
}> = ({ pillName, clipSrc, trimStartFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { slot, slotBorder, slotRing, namePill } = useLayout();
  const scale = interpolate(enter(frame, fps, 0), [0, 1], [0.96, 1], CLAMP);

  return (
    <div style={{ position: "absolute", left: slot.x, top: slot.y, width: slot.width, height: slot.height, scale }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: slot.radius,
          overflow: "hidden",
          backgroundColor: SLOT_FILL,
          boxShadow: `0 0 0 ${slotRing}px ${c.accent}, 0 18px 40px rgba(0,0,0,0.45)`,
        }}
      >
        {clipSrc ? (
          <Video
            name="Talent"
            src={resolveSrc(clipSrc)}
            trimBefore={trimStartFrames}
            objectFit="cover"
            premountFor={fps}
            style={{ width: "100%", height: "100%", objectPosition: OBJECT_POSITION }}
          />
        ) : null}
      </div>
      <div
        style={{ position: "absolute", inset: 0, borderRadius: slot.radius, border: `${slotBorder}px solid ${c.text}` }}
      />
      <div
        style={{
          position: "absolute",
          top: -namePill.height / 2,
          left: "50%",
          translate: "-50% 0",
          height: namePill.height,
          maxWidth: namePill.maxWidth,
          padding: "0 30px",
          boxSizing: "border-box",
          borderRadius: namePill.height / 2,
          backgroundColor: c.text,
          color: c.bg,
          fontFamily: FONT_HEAD,
          fontWeight: WEIGHT_HEAD,
          fontSize: namePill.fontSize,
          lineHeight: `${namePill.height + 4}px`,
          whiteSpace: "nowrap",
          overflow: "hidden",
          boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        }}
      >
        {pillName}
      </div>
    </div>
  );
};
```

`template/src/frame/StepTracker.tsx`:
```tsx
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon } from "../icons";
import { useLayout, usePalette } from "./contexts";
import { fitFontSize } from "./fit";
import { FONT_HEAD, WEIGHT_HEAD } from "./theme";
import { CLAMP, STAGGER, enter, pop, pulse } from "./timing";

const GAP = 24;
const PILL_H = 60;
const LINE_H = 6;
const LABEL_SIZE = 40;
// The tracker slides in two thirds into the hook (frame 60 of 90 in the reference).
const TRACKER_IN = 2 / 3;

export const StepTracker: React.FC<{
  readonly labels: readonly [string, string, string];
  readonly sceneStarts: number[];
  readonly total: number;
}> = ({ labels, sceneStarts, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { tracker } = useLayout();
  const pillW = (tracker.width - GAP * 2) / 3;
  const appear = enter(frame, fps, sceneStarts[1] * TRACKER_IN);
  const closeStart = sceneStarts[4];
  const progress = interpolate(frame, [sceneStarts[1], sceneStarts[4]], [0, 1], {
    ...CLAMP,
    easing: Easing.inOut(Easing.quad),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: tracker.x,
        top: tracker.y,
        width: tracker.width,
        height: tracker.height,
        opacity: appear,
        translate: `0px ${interpolate(appear, [0, 1], [-40, 0])}px`,
      }}
    >
      {labels.map((label, i) => {
        const activeFrom = sceneStarts[i + 1];
        const doneFrom = i + 2 < sceneStarts.length ? sceneStarts[i + 2] : total;
        const active = frame >= activeFrom && frame < doneFrom;
        const done = frame >= doneFrom;
        // Checks pop when completed, and once more at the start of the close (6 frames apart).
        const inClose = frame >= closeStart;
        const checkAt = inClose ? closeStart + i * STAGGER : doneFrom;
        const checkScale = done ? interpolate(pop(frame, fps, checkAt), [0, 1], [inClose ? 0.5 : 0, 1]) : 0;
        const fontSize = fitFontSize(label, pillW - 100, LABEL_SIZE, FONT_HEAD, WEIGHT_HEAD);

        return (
          <div
            key={label}
            style={{
              position: "absolute",
              left: i * (pillW + GAP),
              top: 0,
              width: pillW,
              height: PILL_H,
              borderRadius: PILL_H / 2,
              boxSizing: "border-box",
              border: `3px solid ${active || done ? c.accent : c.text}`,
              backgroundColor: active ? c.accent : "transparent",
              opacity: active || done ? 1 : 0.4,
              color: active ? c.bg : done ? c.accent : c.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: FONT_HEAD,
              fontWeight: WEIGHT_HEAD,
              fontSize,
              lineHeight: 1,
              paddingTop: 4,
              whiteSpace: "nowrap",
              scale: active ? pulse(frame, activeFrom, 10, 1.06) : 1,
            }}
          >
            {done ? <Icon name="check" size={34} color={c.accent} style={{ scale: checkScale, marginTop: -4 }} /> : null}
            {label}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: tracker.height - LINE_H,
          width: tracker.width,
          height: LINE_H,
          borderRadius: LINE_H / 2,
          backgroundColor: `${c.text}26`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: tracker.height - LINE_H,
          width: tracker.width * progress,
          height: LINE_H,
          borderRadius: LINE_H / 2,
          backgroundColor: c.accent,
        }}
      />
    </div>
  );
};
```

`template/src/frame/Captions.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react";
import type { Caption } from "@remotion/captions";
import { measureText } from "@remotion/layout-utils";
import { continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  ACTIVE_SCALE,
  LINE_HEIGHT,
  WORD_GAP,
  layoutPage,
  paginate,
  wordsFromCaptions,
  wordsFromScript,
} from "./captions-model";
import { useLayout, usePalette } from "./contexts";
import { resolveSrc } from "./resolveSrc";
import { FONT_HEAD, WEIGHT_HEAD } from "./theme";
import { CLAMP, enter } from "./timing";

const useCaptionFile = (captionsSrc: string) => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [handle] = useState(() => (captionsSrc ? delayRender("Loading captions") : null));
  useEffect(() => {
    if (!captionsSrc || handle === null) {
      return;
    }
    fetch(resolveSrc(captionsSrc))
      .then((res) => res.json())
      .then((data: Caption[]) => {
        setCaptions(data);
        continueRender(handle);
      })
      .catch((err) => {
        console.warn(`[reelkit] Could not load captions ${captionsSrc}; using script timing.`, err);
        continueRender(handle);
      });
  }, [captionsSrc, handle]);
  return captions;
};

const measure = (text: string, fontSize: number) =>
  measureText({ text, fontFamily: FONT_HEAD, fontWeight: WEIGHT_HEAD, fontSize }).width;

export const Captions: React.FC<{
  readonly script: string[];
  readonly sceneStarts: number[];
  readonly total: number;
  readonly captionsSrc: string;
}> = ({ script, sceneStarts, total, captionsSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { captions: box, captionsBaseSize } = useLayout();
  const fileCaptions = useCaptionFile(captionsSrc);

  const pages = useMemo(
    () => paginate(fileCaptions ? wordsFromCaptions(fileCaptions, fps) : wordsFromScript(script, sceneStarts, total)),
    [fileCaptions, fps, script, sceneStarts, total],
  );
  const page = pages.find((p) => frame >= p.from && frame < p.to);
  const layout = useMemo(
    () => (page ? layoutPage(page, measure, box, captionsBaseSize) : null),
    [page, box, captionsBaseSize],
  );
  if (!page || !layout) {
    return null;
  }
  const appear = enter(frame, fps, page.from);

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: FONT_HEAD,
        fontWeight: WEIGHT_HEAD,
        fontSize: layout.fontSize,
        lineHeight: LINE_HEIGHT,
        color: c.text,
        textShadow: "0 4px 14px rgba(0,0,0,0.5)",
        opacity: appear,
        translate: `0px ${interpolate(appear, [0, 1], [16, 0], CLAMP)}px`,
      }}
    >
      {layout.lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {line.map((word, wi) => {
            const active = frame >= word.from && frame < word.to;
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  marginRight: wi < line.length - 1 ? `${WORD_GAP}em` : 0,
                  color: active ? c.accent : c.text,
                  scale: active ? ACTIVE_SCALE : 1,
                  transformOrigin: "left center",
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
```

`template/src/frame/Disclaimer.tsx`:
```tsx
import { measureText } from "@remotion/layout-utils";
import { useLayout, usePalette } from "./contexts";
import { FONT_BODY, WEIGHT_BODY, bodyStyle } from "./theme";

const TARGET_SIZE = 28;

/** Two fixed lines; shrinks only if a line would not fit the column. */
export const Disclaimer: React.FC<{ readonly lines: readonly [string, string] }> = ({ lines }) => {
  const c = usePalette();
  const { disclaimer: box } = useLayout();
  const widest = Math.max(
    ...lines.map(
      (text) => measureText({ text, fontFamily: FONT_BODY, fontWeight: WEIGHT_BODY, fontSize: TARGET_SIZE }).width,
    ),
  );
  const fontSize = widest <= box.width ? TARGET_SIZE : Math.floor((TARGET_SIZE * box.width) / widest);

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        ...bodyStyle(fontSize),
        color: c.text,
        opacity: 0.6,
        whiteSpace: "nowrap",
      }}
    >
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
};
```

`template/src/frame/Guides.tsx`:
```tsx
import { AbsoluteFill } from "remotion";
import { useLayout } from "./contexts";
import { slotKeepOut, type Rect } from "./layout";

export const Guides: React.FC = () => {
  const l = useLayout();
  const guides: { name: string; rect: Rect; color: string }[] = [
    { name: "TOP SAFE", rect: { x: 0, y: 0, width: l.canvas.width, height: l.safe.top }, color: "255,0,0" },
    {
      name: "BOTTOM SAFE",
      rect: { x: 0, y: l.canvas.height - l.safe.bottom, width: l.canvas.width, height: l.safe.bottom },
      color: "255,0,0",
    },
    {
      name: "GUTTER",
      rect: {
        x: l.slot.x + l.slot.width,
        y: l.slot.y,
        width: l.canvas.width - l.slot.x - l.slot.width,
        height: l.slot.height,
      },
      color: "255,0,0",
    },
    { name: "TRACKER", rect: l.tracker, color: "0,200,255" },
    { name: "STAGE", rect: l.stage, color: "0,255,120" },
    { name: "CAPTIONS", rect: l.captions, color: "255,220,0" },
    { name: "DISCLAIMER", rect: l.disclaimer, color: "255,160,0" },
    { name: "SLOT + CLEARANCE", rect: slotKeepOut(l), color: "255,0,255" },
  ];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {guides.map((g) => (
        <div
          key={g.name}
          style={{
            position: "absolute",
            left: g.rect.x,
            top: g.rect.y,
            width: g.rect.width,
            height: g.rect.height,
            backgroundColor: `rgba(${g.color},0.15)`,
            outline: `2px dashed rgba(${g.color},0.8)`,
            outlineOffset: -2,
            color: `rgb(${g.color})`,
            fontFamily: "monospace",
            fontSize: 24,
            padding: 6,
          }}
        >
          {g.name}
        </div>
      ))}
    </AbsoluteFill>
  );
};
```

`template/src/frame/FitStage.tsx`:
```tsx
import { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { useLayout } from "./contexts";

/**
 * Confines a scene to the stage. Content is laid out at the stage width; if it is
 * taller or wider than the stage, the whole group scales down uniformly to fit,
 * and anything outside the stage is clipped. Logs the scale for `npm run check`.
 */
export const FitStage: React.FC<{
  readonly name: string;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({ name, children, style }) => {
  const { stage } = useLayout();
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; offsetY: number } | null>(null);
  const [handle] = useState(() => delayRender(`Fitting ${name} to the stage`));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const w = Math.max(el.scrollWidth, el.offsetWidth);
    const h = el.offsetHeight;
    const scale = Math.min(1, stage.width / w, stage.height / h);
    console.log(`[reelkit:fit] ${name} ${scale.toFixed(3)}`);
    setFit({ scale, offsetY: (stage.height - h * scale) / 2 });
    continueRender(handle);
  }, [handle, name, stage]);

  return (
    <div
      style={{
        position: "absolute",
        left: stage.x,
        top: stage.y,
        width: stage.width,
        height: stage.height,
        overflow: "hidden",
      }}
    >
      <div
        ref={ref}
        style={{
          position: "absolute",
          left: 0,
          top: fit?.offsetY ?? 0,
          width: stage.width,
          scale: fit?.scale ?? 1,
          transformOrigin: "top center",
          visibility: fit ? "visible" : "hidden",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify**

Run: `cd template && npm run lint && npx vitest run`
Expected: lint and typecheck exit 0; all existing tests still PASS. (These components are rendered for the first time in Task 9.)

- [ ] **Step 4: Commit**

```bash
git add template/src/frame
git commit -m "feat(template): layout-driven frame components"
```

---

### Task 9: Episode composition, BigStat block, preview, smoke example

**Files:**
- Create: `template/src/blocks/types.ts`, `template/src/blocks/BigStat.tsx`, `template/src/blocks/registry.tsx`, `template/src/episode/fetchJson.ts`, `template/src/episode/load.ts`, `template/src/compositions/SceneRenderer.tsx`, `template/src/compositions/EpisodeVideo.tsx`, `template/src/compositions/Cover.tsx`, `template/src/compositions/BlockPreview.tsx`, `template/examples/smoke/episode.json`, `template/examples/smoke/talent.json`
- Modify: `template/src/Root.tsx`
- Test: `template/tests/fetchJson.test.ts`, `template/tests/examples.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–8.
- Produces:
  - `types.ts`: `type BlockComponent<K extends BlockName> = React.FC<{ readonly props: z.output<(typeof BLOCK_SCHEMAS)[K]>; readonly timing: BeatTiming }>`
  - `registry.tsx`: `BLOCKS: { [K in BlockName]: BlockComponent<K> }` — each block task adds its component.
  - `fetchJson.ts`: `missingFileMessage(file, status): string`, `fetchJson(file): Promise<unknown>`
  - `load.ts`: `type EpisodeProps = { layoutName: LayoutName; showGuides: boolean; checkMode: boolean; episode: Episode | null; talent: Talent | null; sceneStarts: number[] | null }`, `calculateEpisodeMetadata`, `calculateCoverMetadata`
  - `SceneRenderer`: `<SceneRenderer name scene duration fadeOutAtEnd />`
  - `EpisodeVideo: React.FC<EpisodeProps & { hideCaptions?: boolean }>`, `CoverFrame: React.FC<EpisodeProps>`
  - `BlockPreview` + `type BlockPreviewProps = { layoutName: LayoutName; block: string; props: Record<string, unknown>; title: Accented | null; durationInFrames: number; talent: Talent | null }` and `calculateBlockPreviewMetadata`
  - Compositions: `Episode` (9:16), `Episode45` (4:5), stills `Cover`, `Cover45`, and `BlockPreview`.
  - In `checkMode` the talent clip and music are not rendered (the check script relies on this).

- [ ] **Step 1: Write the failing tests**

`template/tests/fetchJson.test.ts`:
```ts
import { expect, it } from "vitest";
import { missingFileMessage } from "../src/episode/fetchJson";

it("tells the user to point --public-dir at an episode folder", () => {
  expect(missingFileMessage("episode.json", 404)).toBe(
    "Could not load episode.json (HTTP 404). Start Studio or render with --public-dir pointing at an episode folder, e.g. --public-dir examples/smoke.",
  );
});
```

`template/tests/examples.test.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateEpisode, validateTalent } from "../src/episode/validate";

const examples = fs.readdirSync(path.join(__dirname, "../examples"));

describe.each(examples)("example %s", (name) => {
  const dir = path.join(__dirname, "../examples", name);
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  it("has a valid episode and talent", () => {
    expect(() => validateEpisode(read("episode.json"))).not.toThrow();
    expect(() => validateTalent(read("talent.json"))).not.toThrow();
  });
  it("uses only palette colors that exist", () => {
    const talent = validateTalent(read("talent.json"));
    const tokens = new Set(["bg", "bg2", "accent", "text", "danger", "safe", ...Object.keys(talent.colors.extra)]);
    const refs = JSON.stringify(read("episode.json")).match(/"(color|outline)":"([^"#]+)"/g) ?? [];
    for (const ref of refs) expect(tokens.has(ref.split(":")[1].replace(/"/g, ""))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/fetchJson.test.ts tests/examples.test.ts`
Expected: FAIL — cannot resolve `../src/episode/fetchJson`; `examples` directory missing (ENOENT).

- [ ] **Step 3: Implement the loader and block plumbing**

`template/src/episode/fetchJson.ts`:
```ts
import { staticFile } from "remotion";

export const missingFileMessage = (file: string, status: number) =>
  `Could not load ${file} (HTTP ${status}). Start Studio or render with --public-dir pointing at an episode folder, e.g. --public-dir examples/smoke.`;

/** Loads a JSON file from the public dir, which is the episode folder. */
export const fetchJson = async (file: string): Promise<unknown> => {
  const res = await fetch(staticFile(file));
  if (!res.ok) {
    throw new Error(missingFileMessage(file, res.status));
  }
  return res.json();
};
```

`template/src/blocks/types.ts`:
```ts
import type { z } from "zod";
import type { BeatTiming } from "../frame/timing";
import type { BLOCK_SCHEMAS, BlockName } from "./schemas";

export type BlockProps<K extends BlockName> = z.output<(typeof BLOCK_SCHEMAS)[K]>;

/** A block renders one beat. Keyframes are fractions of the beat via `timing.at(fraction)`. */
export type BlockComponent<K extends BlockName> = React.FC<{
  readonly props: BlockProps<K>;
  readonly timing: BeatTiming;
}>;
```

`template/src/blocks/BigStat.tsx`:
```tsx
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette, useTalent } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import type { BlockComponent } from "./types";

const NUMBER_AT = 0.1;
const COUNT_END = 0.45;
const LABEL_AT = 0.3;
const SOURCE_AT = 0.45;

export const BigStat: BlockComponent<"BigStat"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { locale } = useTalent();
  const { at } = timing;
  const count = interpolate(frame, [at(NUMBER_AT), at(COUNT_END)], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const numberIn = pop(frame, fps, at(NUMBER_AT));
  const labelIn = enter(frame, fps, at(LABEL_AT));
  const sourceIn = enter(frame, fps, at(SOURCE_AT));
  const format = new Intl.NumberFormat(locale, {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div
        style={{
          ...headStyle(200),
          color: c.accent,
          lineHeight: 1,
          whiteSpace: "nowrap",
          opacity: interpolate(numberIn, [0, 0.2], [0, 1], CLAMP),
          scale: interpolate(numberIn, [0, 1], [0.6, 1]),
        }}
      >
        {props.prefix ? <span style={{ fontSize: 100 }}>{props.prefix}</span> : null}
        {format.format(props.value * count)}
        {props.unit ? <span style={{ fontSize: 100, marginLeft: 12 }}>{props.unit}</span> : null}
      </div>
      <div
        style={{
          ...bodyStyle(52),
          color: c.text,
          marginTop: 10,
          opacity: labelIn,
          translate: `0px ${interpolate(labelIn, [0, 1], [24, 0])}px`,
        }}
      >
        {props.label}
      </div>
      {props.source ? (
        <div style={{ ...bodyStyle(30), color: c.text, opacity: 0.7 * sourceIn, marginTop: 14 }}>{props.source}</div>
      ) : null}
    </div>
  );
};
```

`template/src/blocks/registry.tsx`:
```tsx
import { BigStat } from "./BigStat";
import type { BlockName } from "./schemas";
import type { BlockComponent } from "./types";

// Each block task adds its component here, matching BLOCK_SCHEMAS.
export const BLOCKS: { [K in BlockName]: BlockComponent<K> } = {
  BigStat,
};
```

`template/src/episode/load.ts`:
```ts
import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import type { CalculateMetadataFunction } from "remotion";
import { LAYOUTS, type LayoutName } from "../frame/layout";
import { resolveSrc } from "../frame/resolveSrc";
import { FPS, resolveSceneStarts, totalFrames } from "../frame/timing";
import { fetchJson } from "./fetchJson";
import type { Episode } from "./schema";
import type { Talent } from "./talent";
import { validateEpisode, validateTalent } from "./validate";

export type EpisodeProps = {
  layoutName: LayoutName;
  showGuides: boolean;
  /** Renders without the talent clip and music (used by `npm run check` and covers). */
  checkMode: boolean;
  episode: Episode | null;
  talent: Talent | null;
  sceneStarts: number[] | null;
};

const warnIfClipOverruns = async (episode: Episode, total: number) => {
  try {
    const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(resolveSrc(episode.clip.src)) });
    const used = (await input.computeDuration()) - episode.clip.trimStartFrames / FPS;
    const max = total / FPS;
    if (used > max) {
      console.warn(
        `[reelkit] The talent clip runs ${(used - max).toFixed(2)} s past the ${max} s video. ` +
          `The video stays at ${total} frames; trim or re-record the clip.`,
      );
    }
  } catch (err) {
    console.warn(`[reelkit] Could not read the duration of ${episode.clip.src}`, err);
  }
};

const loadEpisode = async (props: EpisodeProps) => {
  const episode = validateEpisode(props.episode ?? (await fetchJson("episode.json")));
  const talent = validateTalent(props.talent ?? (await fetchJson("talent.json")));
  const total = totalFrames(episode.durationSeconds);
  const { starts, warning } = resolveSceneStarts(episode.sceneStarts, total);
  if (warning) {
    console.warn(`[reelkit] ${warning}`);
  }
  if (episode.clip.src && !props.checkMode) {
    await warnIfClipOverruns(episode, total);
  }
  const { width, height } = LAYOUTS[props.layoutName].canvas;
  return { total, width, height, props: { ...props, episode, talent, sceneStarts: starts } };
};

export const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const { total, width, height, props: resolved } = await loadEpisode(props);
  return { durationInFrames: total, fps: FPS, width, height, props: resolved };
};

export const calculateCoverMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const { width, height, props: resolved } = await loadEpisode(props);
  return { width, height, props: resolved };
};
```

- [ ] **Step 4: Implement the compositions**

`template/src/compositions/SceneRenderer.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BLOCKS } from "../blocks/registry";
import { isBlockName } from "../blocks/schemas";
import type { Beat, Scene } from "../episode/schema";
import { AccentText } from "../frame/AccentText";
import { usePalette } from "../frame/contexts";
import { FitStage } from "../frame/FitStage";
import { headStyle } from "../frame/theme";
import { ENTER_FRAMES, enter, fadeOut, splitBeats, type BeatTiming } from "../frame/timing";

const BlockView: React.FC<{ readonly beat: Beat; readonly timing: BeatTiming }> = ({ beat, timing }) => {
  if (!isBlockName(beat.block)) {
    throw new Error(`Unknown block "${beat.block}"`);
  }
  const Component = BLOCKS[beat.block] as React.FC<{ props: unknown; timing: BeatTiming }>;
  return <Component props={beat.props} timing={timing} />;
};

/**
 * One scene: optional title (persists across beats), then 1–2 beats stacked in the
 * same grid cell. Beat A slides up and out as beat B starts; beat B enters 12 frames later.
 */
export const SceneRenderer: React.FC<{
  readonly name: string;
  readonly scene: Scene;
  readonly duration: number;
  readonly fadeOutAtEnd: boolean;
}> = ({ name, scene, duration, fadeOutAtEnd }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const beats = splitBeats(duration, scene.beats.length, scene.split);
  const second = beats[1];
  const title = enter(frame, fps, 0);
  const aOut = second ? enter(frame, fps, second.from) : 0;
  const bIn = second ? enter(frame, fps, second.from + ENTER_FRAMES) : 0;

  const beatStyle = (i: number): React.CSSProperties => {
    if (!second) {
      return {};
    }
    return i === 0
      ? { opacity: 1 - aOut, translate: `0px ${interpolate(aOut, [0, 1], [0, -80])}px` }
      : { opacity: bIn, translate: `0px ${interpolate(bIn, [0, 1], [60, 0])}px` };
  };

  return (
    <FitStage name={name} style={{ opacity: fadeOutAtEnd ? fadeOut(frame, duration) : 1 }}>
      {scene.title ? (
        <div
          style={{
            ...headStyle(88),
            color: c.text,
            textAlign: "center",
            whiteSpace: "nowrap",
            opacity: title,
            translate: `0px ${interpolate(title, [0, 1], [30, 0])}px`,
          }}
        >
          <AccentText value={scene.title} />
        </div>
      ) : null}
      <div style={{ display: "grid", marginTop: scene.title ? 30 : 0 }}>
        {scene.beats.map((beat, i) => (
          <div key={i} style={{ gridArea: "1 / 1", ...beatStyle(i) }}>
            <BlockView beat={beat} timing={beats[i]} />
          </div>
        ))}
      </div>
    </FitStage>
  );
};
```

`template/src/compositions/EpisodeVideo.tsx`:
```tsx
import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, interpolate, useVideoConfig } from "remotion";
import type { EpisodeProps } from "../episode/load";
import { Background } from "../frame/Background";
import { Captions } from "../frame/Captions";
import { LayoutContext, PaletteContext, TalentContext } from "../frame/contexts";
import { Disclaimer } from "../frame/Disclaimer";
import { Guides } from "../frame/Guides";
import { LAYOUTS } from "../frame/layout";
import { resolveSrc } from "../frame/resolveSrc";
import { StepTracker } from "../frame/StepTracker";
import { TalentSlot } from "../frame/TalentSlot";
import { useFontsReady } from "../frame/theme";
import { CLAMP, sceneDurations, totalFrames } from "../frame/timing";
import { SceneRenderer } from "./SceneRenderer";

const MUSIC_VOLUME = 0.08;
const MUSIC_FADE_FRAMES = 20;

export const EpisodeVideo: React.FC<EpisodeProps & { readonly hideCaptions?: boolean }> = ({
  layoutName,
  showGuides,
  checkMode,
  episode,
  talent,
  sceneStarts,
  hideCaptions,
}) => {
  const { fps } = useVideoConfig();
  const fontsReady = useFontsReady();
  if (!episode || !talent || !sceneStarts) {
    throw new Error("Episode props were not loaded; calculateMetadata must run first.");
  }
  const total = totalFrames(episode.durationSeconds);
  const d = sceneDurations(sceneStarts, total);
  const s = episode.scenes;

  return (
    <LayoutContext.Provider value={LAYOUTS[layoutName]}>
      <PaletteContext.Provider value={talent.colors}>
        <TalentContext.Provider value={talent}>
          <AbsoluteFill>
            <Background total={total} />
            {fontsReady ? (
              <>
                <Series>
                  <Series.Sequence name="1 · Hook" durationInFrames={d[0]} premountFor={fps}>
                    <SceneRenderer name="hook" scene={s.hook} duration={d[0]} fadeOutAtEnd />
                  </Series.Sequence>
                  <Series.Sequence name="2 · Step 1" durationInFrames={d[1]} premountFor={fps}>
                    <SceneRenderer name="step1" scene={s.step1} duration={d[1]} fadeOutAtEnd />
                  </Series.Sequence>
                  <Series.Sequence name="3 · Step 2" durationInFrames={d[2]} premountFor={fps}>
                    <SceneRenderer name="step2" scene={s.step2} duration={d[2]} fadeOutAtEnd />
                  </Series.Sequence>
                  <Series.Sequence name="4 · Step 3" durationInFrames={d[3]} premountFor={fps}>
                    <SceneRenderer name="step3" scene={s.step3} duration={d[3]} fadeOutAtEnd />
                  </Series.Sequence>
                  <Series.Sequence name="5 · Close" durationInFrames={d[4]} premountFor={fps}>
                    {/* No fade: the last frames hold still so the loop is clean. */}
                    <SceneRenderer name="close" scene={s.close} duration={d[4]} fadeOutAtEnd={false} />
                  </Series.Sequence>
                </Series>
                <StepTracker labels={episode.frame.steps} sceneStarts={sceneStarts} total={total} />
                {hideCaptions ? null : (
                  <Captions
                    script={episode.script}
                    sceneStarts={sceneStarts}
                    total={total}
                    captionsSrc={episode.captionsSrc}
                  />
                )}
                <Disclaimer lines={talent.disclaimer} />
              </>
            ) : null}
            <TalentSlot
              pillName={talent.pillName}
              clipSrc={checkMode ? "" : episode.clip.src}
              trimStartFrames={episode.clip.trimStartFrames}
            />
            {episode.musicSrc && !checkMode ? (
              <Audio
                name="Music"
                src={resolveSrc(episode.musicSrc)}
                premountFor={fps}
                volume={(f) => interpolate(f, [total - MUSIC_FADE_FRAMES, total], [MUSIC_VOLUME, 0], CLAMP)}
              />
            ) : null}
            {showGuides ? <Guides /> : null}
          </AbsoluteFill>
        </TalentContext.Provider>
      </PaletteContext.Provider>
    </LayoutContext.Provider>
  );
};
```

`template/src/compositions/Cover.tsx`:
```tsx
import { Sequence } from "remotion";
import type { EpisodeProps } from "../episode/load";
import { EpisodeVideo } from "./EpisodeVideo";

/** The episode frozen at `coverFrame`. A Still has one frame, so shift the timeline instead of <Freeze>. */
export const CoverFrame: React.FC<EpisodeProps> = (props) => (
  <Sequence from={-(props.episode?.coverFrame ?? 0)} layout="none">
    <EpisodeVideo {...props} checkMode hideCaptions />
  </Sequence>
);
```

`template/src/compositions/BlockPreview.tsx`:
```tsx
import { AbsoluteFill, type CalculateMetadataFunction } from "remotion";
import type { Accented } from "../blocks/schema-parts";
import { fetchJson } from "../episode/fetchJson";
import type { Talent } from "../episode/talent";
import { validateBeat, validateTalent } from "../episode/validate";
import { Background } from "../frame/Background";
import { LayoutContext, PaletteContext, TalentContext } from "../frame/contexts";
import { LAYOUTS, type LayoutName } from "../frame/layout";
import { TalentSlot } from "../frame/TalentSlot";
import { useFontsReady } from "../frame/theme";
import { SceneRenderer } from "./SceneRenderer";

export type BlockPreviewProps = {
  layoutName: LayoutName;
  block: string;
  props: Record<string, unknown>;
  title: Accented | null;
  durationInFrames: number;
  talent: Talent | null;
};

export const calculateBlockPreviewMetadata: CalculateMetadataFunction<BlockPreviewProps> = async ({ props }) => {
  const talent = validateTalent(props.talent ?? (await fetchJson("talent.json")));
  const beat = validateBeat({ block: props.block, props: props.props }, "preview");
  const { width, height } = LAYOUTS[props.layoutName].canvas;
  return {
    durationInFrames: props.durationInFrames,
    width,
    height,
    props: { ...props, talent, props: beat.props },
  };
};

/** One block on the real frame, for developing and reviewing blocks. */
export const BlockPreview: React.FC<BlockPreviewProps> = ({ layoutName, block, props, title, durationInFrames, talent }) => {
  const ready = useFontsReady();
  if (!talent) {
    throw new Error("Talent was not loaded; calculateMetadata must run first.");
  }
  return (
    <LayoutContext.Provider value={LAYOUTS[layoutName]}>
      <PaletteContext.Provider value={talent.colors}>
        <TalentContext.Provider value={talent}>
          <AbsoluteFill>
            <Background total={durationInFrames} />
            {ready ? (
              <SceneRenderer
                name={`preview-${block}`}
                scene={{ title: title ?? undefined, beats: [{ block, props }], split: 0.5 }}
                duration={durationInFrames}
                fadeOutAtEnd={false}
              />
            ) : null}
            <TalentSlot pillName={talent.pillName} clipSrc="" trimStartFrames={0} />
          </AbsoluteFill>
        </TalentContext.Provider>
      </PaletteContext.Provider>
    </LayoutContext.Provider>
  );
};
```

`template/src/Root.tsx`:
```tsx
import { Composition, Folder, Still } from "remotion";
import { BlockPreview, calculateBlockPreviewMetadata } from "./compositions/BlockPreview";
import { CoverFrame } from "./compositions/Cover";
import { EpisodeVideo } from "./compositions/EpisodeVideo";
import { calculateCoverMetadata, calculateEpisodeMetadata } from "./episode/load";

// Every composition loads episode.json + talent.json from the public dir
// (start Studio / render with --public-dir pointing at an episode folder).
export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="reelkit">
      <Composition
        id="Episode"
        component={EpisodeVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ layoutName: "9x16", showGuides: false, checkMode: false, episode: null, talent: null, sceneStarts: null }}
        calculateMetadata={calculateEpisodeMetadata}
      />
      <Composition
        id="Episode45"
        component={EpisodeVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ layoutName: "4x5", showGuides: false, checkMode: false, episode: null, talent: null, sceneStarts: null }}
        calculateMetadata={calculateEpisodeMetadata}
      />
      <Still
        id="Cover"
        component={CoverFrame}
        width={1080}
        height={1920}
        defaultProps={{ layoutName: "9x16", showGuides: false, checkMode: true, episode: null, talent: null, sceneStarts: null }}
        calculateMetadata={calculateCoverMetadata}
      />
      <Still
        id="Cover45"
        component={CoverFrame}
        width={1080}
        height={1350}
        defaultProps={{ layoutName: "4x5", showGuides: false, checkMode: true, episode: null, talent: null, sceneStarts: null }}
        calculateMetadata={calculateCoverMetadata}
      />
      <Composition
        id="BlockPreview"
        component={BlockPreview}
        durationInFrames={105}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          layoutName: "9x16",
          block: "BigStat",
          props: { value: 42, label: "Vista previa de bloque" },
          title: null,
          durationInFrames: 105,
          talent: null,
        }}
        calculateMetadata={calculateBlockPreviewMetadata}
      />
    </Folder>
  );
};
```

- [ ] **Step 5: Add the smoke example**

`template/examples/smoke/talent.json` (the Dani palette; generic copy):
```json
{
  "id": "smoke",
  "displayName": "Equipo reelkit",
  "pillName": "reelkit",
  "profession": "Plantilla de prueba",
  "city": "Manizales",
  "country": "CO",
  "locale": "es-CO",
  "colors": {
    "bg": "#1A1023",
    "bg2": "#2A1838",
    "accent": "#FF7A1A",
    "text": "#FFF3E0",
    "danger": "#FF4D4D",
    "safe": "#3DDC97",
    "extra": {}
  },
  "disclaimer": ["Contenido de prueba.", "Datos de ejemplo, no reales."]
}
```

`template/examples/smoke/episode.json` (20 s on purpose, to exercise non-default timing):
```json
{
  "schemaVersion": 1,
  "talent": "smoke",
  "slug": "smoke",
  "durationSeconds": 20,
  "stage": "built",
  "frame": { "steps": ["MITO", "CUÁNTO", "QUÉ HACER"] },
  "script": [
    "¿Cargas el celular toda la noche? Mira esto.",
    "¿Mito o realidad? Dejarlo enchufado no lo explota.",
    "¿Cuánto dura? Unos quinientos ciclos completos.",
    "¿Qué hacer? Carga entre veinte y ochenta.",
    "Guárdalo y compártelo antes de dormir."
  ],
  "sceneStarts": null,
  "scenes": {
    "hook": { "beats": [{ "block": "BigStat", "props": { "value": 100, "unit": "%", "label": "toda la noche enchufado" } }] },
    "step1": {
      "title": { "text": "¿MITO o realidad?", "accent": "MITO" },
      "beats": [{ "block": "BigStat", "props": { "value": 1, "label": "dato de ejemplo" } }]
    },
    "step2": {
      "title": { "text": "¿CUÁNTO dura?", "accent": "CUÁNTO" },
      "beats": [
        { "block": "BigStat", "props": { "value": 500, "unit": "ciclos", "label": "de carga completos", "source": "Dato de ejemplo" } },
        { "block": "BigStat", "props": { "value": 2.5, "decimals": 1, "unit": "años", "label": "de uso típico" } }
      ]
    },
    "step3": {
      "title": { "text": "¿QUÉ hacer?", "accent": "QUÉ" },
      "beats": [{ "block": "BigStat", "props": { "value": 80, "unit": "%", "label": "límite de carga recomendado" } }]
    },
    "close": { "beats": [{ "block": "BigStat", "props": { "value": 31, "label": "Guárdalo y compártelo" } }] }
  },
  "coverFrame": 40
}
```

- [ ] **Step 6: Run the tests**

Run: `cd template && npx vitest run && npm run lint`
Expected: all tests PASS (including `examples.test.ts` for `smoke`); lint exit 0.

- [ ] **Step 7: Render and look at frames**

Run:
```bash
cd template
mkdir -p out
npx remotion still Episode out/smoke-9x16-f300.png --public-dir examples/smoke --frame=300
npx remotion still Episode45 out/smoke-4x5-f300.png --public-dir examples/smoke --frame=300
npx remotion still Cover out/smoke-cover.png --public-dir examples/smoke
npx remotion still BlockPreview out/preview-bigstat.png --public-dir examples/smoke --frame=60
```
Expected: four PNGs. Open them: 9:16 and 4:5 show the tracker (CUÁNDO-style pills with MITO / CUÁNTO / QUÉ HACER, QUÉ HACER fitting its pill), the "¿CUÁNTO dura?" title, a big number, captions in the left column, the disclaimer, and the empty slot with the "reelkit" pill. Nothing overlaps the slot.

- [ ] **Step 8: Verify the missing-public-dir message (Review Focus 5)**

Run: `cd template && npx remotion still Episode out/x.png --frame=0 2>&1 | grep -o "Could not load episode.json.*"`
Expected: prints `Could not load episode.json (HTTP 404). Start Studio or render with --public-dir pointing at an episode folder, e.g. --public-dir examples/smoke.`

- [ ] **Step 9: Commit**

```bash
git add template/src template/examples/smoke template/tests/fetchJson.test.ts template/tests/examples.test.ts
git commit -m "feat(template): episode composition, scene renderer, covers, block preview, BigStat"
```

---

### Task 10: `npm run check` — slot pixel test, duration, fit report

**Files:**
- Create: `template/scripts/check-lib.mjs`, `template/scripts/check.mjs`
- Test: `template/tests/check-lib.test.ts`

**Interfaces:**
- Consumes: `src/frame/layouts.json` (Task 3); compositions `Episode` / `Episode45` and the `checkMode` prop; the `[reelkit:fit] <name> <scale>` log line (Task 8); resolved `sceneStarts` in composition props (Task 9).
- Produces: `npm run check [episodeDir] [--layouts=9x16,4x5]`. Exit code 1 on validation failure, duration mismatch, or any changed pixel inside the slot keep-out; warnings for scenes scaled below 0.85. `check-lib.mjs` exports `keyFrames(starts, total, scenes)`, `slotRegion(layout)`, `insideRoundedRect(px, py, rect)`, `compareRegion(a, b, region, tolerance?, edge?)`, `parseFitLog(text)`.

- [ ] **Step 1: Write the failing tests**

`template/tests/check-lib.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { compareRegion, insideRoundedRect, keyFrames, parseFitLog, slotRegion } from "../scripts/check-lib.mjs";
import layouts from "../src/frame/layouts.json";

const scenes = {
  hook: { beats: [{}] },
  step1: { beats: [{}, {}], split: 0.5 },
  step2: { beats: [{}, {}], split: 0.5 },
  step3: { beats: [{}] },
  close: { beats: [{}] },
};

describe("keyFrames", () => {
  it("covers the first and last frame, sorted and unique, inside the video", () => {
    const frames: number[] = keyFrames([0, 90, 300, 510, 765], 900, scenes);
    expect(frames[0]).toBe(0);
    expect(frames[frames.length - 1]).toBe(899);
    expect([...frames].sort((a, b) => a - b)).toEqual(frames);
    expect(new Set(frames).size).toBe(frames.length);
    expect(frames.every((f) => f >= 0 && f < 900)).toBe(true);
    expect(frames).toContain(195 - 9); // just before beat B of step1
  });
});

describe("slot region", () => {
  const region = slotRegion(layouts["9x16"]);
  it("is the slot inflated by the clearance", () => {
    expect(region).toEqual({ x: 534, y: 984, width: 412, height: 532, radius: 56 });
  });
  it("excludes the rounded corners", () => {
    expect(insideRoundedRect(region.x + 1, region.y + 1, region)).toBe(false);
    expect(insideRoundedRect(region.x + 200, region.y + 200, region)).toBe(true);
  });
});

describe("compareRegion", () => {
  const image = (w: number, h: number) => ({ width: w, height: h, data: new Uint8Array(w * h * 4) });
  const region = { x: 0, y: 0, width: 40, height: 40, radius: 10 };
  it("counts changed pixels inside the region only", () => {
    const a = image(50, 50);
    const b = image(50, 50);
    expect(compareRegion(a, b, region)).toBe(0);
    b.data[(20 * 50 + 20) * 4] = 255; // centre: inside
    expect(compareRegion(a, b, region)).toBe(1);
    b.data[(0 * 50 + 0) * 4] = 255; // corner: outside the rounding
    expect(compareRegion(a, b, region)).toBe(1);
    b.data[(45 * 50 + 45) * 4] = 255; // outside the region
    expect(compareRegion(a, b, region)).toBe(1);
  });
  it("ignores differences within tolerance", () => {
    const a = image(50, 50);
    const b = image(50, 50);
    b.data[(20 * 50 + 20) * 4] = 2;
    expect(compareRegion(a, b, region)).toBe(0);
  });
});

it("parses FitStage logs", () => {
  expect(parseFitLog("[reelkit:fit] step3 0.912")).toEqual({ name: "step3", scale: 0.912 });
  expect(parseFitLog("something else")).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/check-lib.test.ts`
Expected: FAIL — cannot resolve `../scripts/check-lib.mjs`.

- [ ] **Step 3: Implement the library**

`template/scripts/check-lib.mjs`:
```js
const SCENE_IDS = ["hook", "step1", "step2", "step3", "close"];

/** Frames worth checking: start, entrances settled, beat changes, before each fade, last frame. */
export const keyFrames = (starts, total, scenes) => {
  const set = new Set([0, total - 1]);
  starts.forEach((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : total;
    const duration = end - start;
    set.add(start + Math.min(20, duration - 1));
    const scene = scenes[SCENE_IDS[i]];
    if (scene.beats.length === 2) {
      const split = start + Math.round(duration * (scene.split ?? 0.5));
      set.add(split - 9);
      set.add(Math.min(end - 9, split + 30));
    } else {
      set.add(start + Math.round(duration * 0.6));
    }
    set.add(end - 9);
  });
  return [...set].filter((f) => f >= 0 && f < total).sort((a, b) => a - b);
};

export const slotRegion = (layout) => ({
  x: layout.slot.x - layout.slotClearance,
  y: layout.slot.y - layout.slotClearance,
  width: layout.slot.width + layout.slotClearance * 2,
  height: layout.slot.height + layout.slotClearance * 2,
  radius: layout.slot.radius + layout.slotClearance,
});

/** Is the centre of pixel (px, py) inside the rounded rect? */
export const insideRoundedRect = (px, py, r) => {
  const x = px + 0.5;
  const y = py + 0.5;
  if (x < r.x || y < r.y || x > r.x + r.width || y > r.y + r.height) {
    return false;
  }
  const cx = Math.min(Math.max(x, r.x + r.radius), r.x + r.width - r.radius);
  const cy = Math.min(Math.max(y, r.y + r.radius), r.y + r.height - r.radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r.radius ** 2;
};

/**
 * Counts pixels inside `region` (shrunk by `edge` px to skip the anti-aliased mask edge,
 * where the drifting background may show) whose RGB differs by more than `tolerance`.
 */
export const compareRegion = (a, b, region, tolerance = 2, edge = 1.5) => {
  const inner = {
    x: region.x + edge,
    y: region.y + edge,
    width: region.width - edge * 2,
    height: region.height - edge * 2,
    radius: Math.max(0, region.radius - edge),
  };
  let changed = 0;
  for (let py = Math.floor(inner.y); py < Math.ceil(inner.y + inner.height); py++) {
    for (let px = Math.floor(inner.x); px < Math.ceil(inner.x + inner.width); px++) {
      if (!insideRoundedRect(px, py, inner)) {
        continue;
      }
      const i = (py * a.width + px) * 4;
      if (
        Math.abs(a.data[i] - b.data[i]) > tolerance ||
        Math.abs(a.data[i + 1] - b.data[i + 1]) > tolerance ||
        Math.abs(a.data[i + 2] - b.data[i + 2]) > tolerance
      ) {
        changed++;
      }
    }
  }
  return changed;
};

export const parseFitLog = (text) => {
  const match = /^\[reelkit:fit\] (\S+) ([0-9.]+)$/.exec(text);
  return match ? { name: match[1], scale: Number(match[2]) } : null;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd template && npx vitest run tests/check-lib.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Implement the CLI**

`template/scripts/check.mjs`:
```js
#!/usr/bin/env node
// Usage: npm run check -- [episodeDir] [--layouts=9x16,4x5]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { compareRegion, keyFrames, parseFitLog, slotRegion } from "./check-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const episodeDir = path.resolve(args.find((a) => !a.startsWith("--")) ?? "examples/smoke");
const layoutNames = (args.find((a) => a.startsWith("--layouts=")) ?? "--layouts=9x16,4x5").split("=")[1].split(",");
const layouts = JSON.parse(fs.readFileSync(path.join(root, "src/frame/layouts.json"), "utf8"));
const COMPOSITIONS = { "9x16": "Episode", "4x5": "Episode45" };
const FIT_WARN = 0.85;
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`✗ ${msg}`);
};

const checkLayout = async (serveUrl, raw, layoutName, outDir) => {
  const id = COMPOSITIONS[layoutName];
  if (!id) {
    fail(`Unknown layout "${layoutName}". Use 9x16 or 4x5.`);
    return;
  }
  const inputProps = { layoutName, showGuides: false, checkMode: true, episode: null, talent: null, sceneStarts: null };
  let composition;
  try {
    composition = await selectComposition({ serveUrl, id, inputProps });
  } catch (err) {
    fail(`${layoutName}: the episode did not load:\n${err.message}`);
    return;
  }
  const before = failures;
  const expected = Math.round(raw.durationSeconds * 30);
  if (composition.durationInFrames !== expected) {
    fail(`${layoutName}: ${composition.durationInFrames} frames, expected ${expected}`);
  }
  const frames = keyFrames(composition.props.sceneStarts, composition.durationInFrames, raw.scenes);
  const images = {};
  const fits = new Map();
  for (const frame of frames) {
    const output = path.join(outDir, `${layoutName}-${frame}.png`);
    await renderStill({
      serveUrl,
      composition,
      frame,
      output,
      imageFormat: "png",
      inputProps,
      onBrowserLog: (log) => {
        const fit = parseFitLog(log.text);
        if (fit) fits.set(fit.name, Math.min(fits.get(fit.name) ?? 1, fit.scale));
      },
    });
    images[frame] = PNG.sync.read(fs.readFileSync(output));
  }
  const region = slotRegion(layouts[layoutName]);
  const reference = images[frames[frames.length - 1]];
  // Skip the slot's own 12-frame entrance.
  for (const frame of frames.filter((f) => f >= 12)) {
    const changed = compareRegion(reference, images[frame], region);
    if (changed > 0) {
      fail(`${layoutName}: ${changed} pixels changed inside the talent slot at frame ${frame} (${path.join(outDir, `${layoutName}-${frame}.png`)})`);
    }
  }
  for (const [name, scale] of fits) {
    if (scale < FIT_WARN) console.warn(`⚠ ${layoutName}: scene "${name}" is scaled to ${scale.toFixed(2)} to fit the stage`);
  }
  if (failures === before) {
    console.log(`✓ ${layoutName}: ${frames.length} frames checked, slot clear, ${composition.durationInFrames} frames`);
  }
};

const main = async () => {
  const episodeFile = path.join(episodeDir, "episode.json");
  if (!fs.existsSync(episodeFile)) {
    fail(`No episode.json in ${episodeDir}`);
    return;
  }
  const raw = JSON.parse(fs.readFileSync(episodeFile, "utf8"));
  console.log(`Bundling with public dir ${episodeDir}…`);
  const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: episodeDir });
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-check-"));
  for (const layoutName of layoutNames) {
    await checkLayout(serveUrl, raw, layoutName, outDir);
  }
  console.log(`Frames: ${outDir}`);
};

main()
  .catch((err) => fail(err.stack ?? String(err)))
  .finally(() => {
    process.exitCode = failures ? 1 : 0;
  });
```

- [ ] **Step 6: Run the check on the smoke example**

Run: `cd template && npm run check -- examples/smoke`
Expected: `✓ 9x16: … slot clear, 600 frames` and `✓ 4x5: … slot clear, 600 frames`, exit code 0. Fit warnings, if any, are printed but do not fail.

- [ ] **Step 7: Prove the slot test catches a violation**

Temporarily add this component to `template/src/compositions/EpisodeVideo.tsx` (add `useCurrentFrame` to its `remotion` import):
```tsx
const Intruder: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 600,
      top: 1100,
      width: 40,
      height: 40,
      background: "red",
      translate: `${useCurrentFrame() % 200}px 0px`,
    }}
  />
);
```
and render `<Intruder />` right after `<TalentSlot … />`. Run: `cd template && npm run check -- examples/smoke --layouts=9x16`
Expected: `✗ 9x16: … pixels changed inside the talent slot at frame …`, exit code 1.

Then remove `Intruder`, its usage and the added import, and run the same command again.
Expected: `✓ 9x16 …`, exit code 0, and `git diff template/src` shows no changes.

- [ ] **Step 8: Commit**

```bash
git add template/scripts template/tests/check-lib.test.ts
git commit -m "feat(template): npm run check with slot pixel test, duration and fit report"
```

---

### Task 11: `Hook` block and `BiteGrid`

**Files:**
- Create: `template/src/blocks/Hook.schema.ts`, `template/src/blocks/Hook.tsx`, `template/src/blocks/parts/BiteGrid.tsx`
- Modify: `template/src/blocks/schemas.ts` (add `Hook: hookSchema`), `template/src/blocks/registry.tsx` (add `Hook`), `template/examples/smoke/episode.json` (hook scene)
- Test: `template/tests/blocks/Hook.schema.test.ts`

**Interfaces:**
- Consumes: `BlockComponent` (Task 9), `iconName`, `colorRef` (Task 6), `resolveColor` (Task 4), `Icon` (Task 5).
- Produces: block `Hook` with props `{ line1 ≤28, line2 ≤18, chip ≤40 (default ""), hero: { animation: "bites"|"pop"|"shake", icon?: IconName (required unless bites), color: colorRef = "accent" }, stamp?: IconName }`. `<BiteGrid width cellHeight color bites: { col; row; at }[] />`. Keyframes as fractions of the hook beat (reference 90 frames): bites 10/90, 22/90, 34/90; stamp 40/90; line2 pulse 45/90→60/90. Headline and chip are fully visible at frame 0 (thumbnail).

- [ ] **Step 1: Write the failing test**

`template/tests/blocks/Hook.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { hookSchema } from "../../src/blocks/Hook.schema";

const DANI = {
  line1: "¿Tu perro se comió",
  line2: "UN CHOCOLATE?",
  chip: "Halloween · guía de 30 segundos",
  hero: { animation: "bites", color: "chocoMilk" },
  stamp: "paw",
};

it("accepts the Dani hook", () => {
  expect(hookSchema.parse(DANI).hero.color).toBe("chocoMilk");
});
it("requires an icon for pop and shake heroes", () => {
  expect(hookSchema.safeParse({ ...DANI, hero: { animation: "pop" } }).success).toBe(false);
  expect(hookSchema.safeParse({ ...DANI, hero: { animation: "shake", icon: "warning" } }).success).toBe(true);
});
it("limits line2 to 18 characters", () => {
  expect(hookSchema.safeParse({ ...DANI, line2: "UN CHOCOLATE AMARGO?" }).success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run tests/blocks/Hook.schema.test.ts`
Expected: FAIL — cannot resolve `../../src/blocks/Hook.schema`.

- [ ] **Step 3: Implement**

`template/src/blocks/Hook.schema.ts`:
```ts
import { z } from "zod";
import { colorRef, iconName } from "./schema-parts";

export const hookSchema = z.object({
  line1: z.string().min(1).max(28),
  line2: z.string().min(1).max(18),
  chip: z.string().max(40).default(""),
  hero: z
    .object({
      animation: z.enum(["bites", "pop", "shake"]),
      icon: iconName.optional(),
      color: colorRef.default("accent"),
    })
    .refine((h) => h.animation === "bites" || h.icon !== undefined, {
      message: 'hero.icon is required unless animation is "bites"',
    }),
  stamp: iconName.optional(),
});
```

`template/src/blocks/parts/BiteGrid.tsx`:
```tsx
import { interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, pop } from "../../frame/timing";

const COLS = 4;
const ROWS = 3;
const GAP = 12;
const CRUMBS = 5;
const GRAVITY = 1.1; // px / frame²
const CRUMB_LIFE = 24;

export type Bite = { col: number; row: number; at: number };

/** A 4×3 bar of rounded squares; each bite pops a square away and throws crumbs. */
export const BiteGrid: React.FC<{
  readonly width: number;
  readonly cellHeight: number;
  readonly color: string;
  readonly bites: Bite[];
}> = ({ width, cellHeight, color, bites }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cellW = (width - GAP * (COLS - 1)) / COLS;
  const height = ROWS * cellHeight + (ROWS - 1) * GAP;
  const crumbShade = `color-mix(in srgb, ${color} 65%, black)`;

  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const bite = bites.find((b) => b.col === col && b.row === row);
      const s = bite ? interpolate(pop(frame, fps, bite.at), [0, 1], [1, 0], CLAMP) : 1;
      cells.push(
        <rect
          key={`${col}-${row}`}
          x={col * (cellW + GAP)}
          y={row * (cellHeight + GAP)}
          width={cellW}
          height={cellHeight}
          rx={14}
          fill={color}
          stroke="rgba(0,0,0,0.28)"
          strokeWidth={5}
          style={{ scale: s, transformBox: "fill-box", transformOrigin: "center" }}
        />,
      );
    }
  }

  const crumbs = bites.flatMap((bite, bi) => {
    const t = frame - bite.at;
    if (t < 0 || t > CRUMB_LIFE) {
      return [];
    }
    const cx = bite.col * (cellW + GAP) + cellW / 2;
    const cy = bite.row * (cellHeight + GAP) + cellHeight / 2;
    return new Array(CRUMBS).fill(0).map((_, i) => {
      const vx = (random(`vx-${bi}-${i}`) - 0.5) * 14;
      const vy = -4 - random(`vy-${bi}-${i}`) * 8;
      const r = 5 + random(`r-${bi}-${i}`) * 6;
      return (
        <circle
          key={`${bi}-${i}`}
          cx={cx + vx * t}
          cy={cy + vy * t + 0.5 * GRAVITY * t * t}
          r={r}
          fill={i % 2 ? color : crumbShade}
          opacity={interpolate(t, [CRUMB_LIFE - 10, CRUMB_LIFE], [1, 0], CLAMP)}
        />
      );
    });
  });

  return (
    <svg width={width} height={height} overflow="visible" style={{ display: "block" }}>
      {cells}
      {crumbs}
    </svg>
  );
};
```

`template/src/blocks/Hook.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, pop, pulse } from "../frame/timing";
import { resolveColor } from "../episode/talent";
import { Icon } from "../icons";
import { BiteGrid } from "./parts/BiteGrid";
import type { BlockComponent, BlockProps } from "./types";

// Fractions of the hook beat (reference: frames of a 90-frame hook).
const BITES = [10 / 90, 22 / 90, 34 / 90];
const HERO_AT = 10 / 90;
const SHAKE_END = 40 / 90;
const STAMP_AT = 40 / 90;
const PULSE_FROM = 45 / 90;
const PULSE_TO = 60 / 90;
const HERO_WIDTH = 420;
const ICON_SIZE = 260;

const Hero: React.FC<{
  readonly hero: BlockProps<"Hook">["hero"];
  readonly color: string;
  readonly at: (f: number) => number;
}> = ({ hero, color, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (hero.animation === "bites") {
    return (
      <BiteGrid
        width={HERO_WIDTH}
        cellHeight={72}
        color={color}
        bites={[
          { col: 3, row: 0, at: at(BITES[0]) },
          { col: 3, row: 1, at: at(BITES[1]) },
          { col: 2, row: 0, at: at(BITES[2]) },
        ]}
      />
    );
  }
  const icon = hero.icon ?? "info";
  if (hero.animation === "pop") {
    const p = pop(frame, fps, at(HERO_AT));
    return (
      <Icon
        name={icon}
        size={ICON_SIZE}
        color={color}
        style={{ opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP), scale: interpolate(p, [0, 1], [0.4, 1]) }}
      />
    );
  }
  const decay = interpolate(frame, [at(HERO_AT), at(SHAKE_END)], [1, 0], CLAMP);
  const wobble = frame >= at(HERO_AT) ? Math.sin((frame - at(HERO_AT)) * 0.9) * 10 * decay : 0;
  return <Icon name={icon} size={ICON_SIZE} color={color} style={{ rotate: `${wobble}deg` }} />;
};

export const Hook: BlockComponent<"Hook"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const stamp = pop(frame, fps, at(STAMP_AT));

  // Frame 0 is the thumbnail: headline and chip are fully visible, no entrance.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ ...headStyle(88), color: c.text, lineHeight: 1 }}>{props.line1}</div>
      <div
        style={{
          ...headStyle(120),
          color: c.accent,
          lineHeight: 1,
          whiteSpace: "nowrap",
          scale: pulse(frame, at(PULSE_FROM), at(PULSE_TO) - at(PULSE_FROM), 1.05),
        }}
      >
        {props.line2}
      </div>
      {props.chip ? (
        <div
          style={{
            ...bodyStyle(40),
            color: c.text,
            marginTop: 18,
            padding: "8px 30px",
            borderRadius: 999,
            border: `3px solid ${c.text}`,
            whiteSpace: "nowrap",
          }}
        >
          {props.chip}
        </div>
      ) : null}
      <div style={{ position: "relative", marginTop: 40 }}>
        <Hero hero={props.hero} color={resolveColor(props.hero.color, c)} at={at} />
        {props.stamp ? (
          <Icon
            name={props.stamp}
            size={150}
            color={c.accent}
            style={{
              position: "absolute",
              left: "100%",
              marginLeft: 40,
              top: 50,
              opacity: interpolate(stamp, [0, 0.2], [0, 1], CLAMP),
              scale: interpolate(stamp, [0, 1], [1.8, 1]),
              rotate: "8deg",
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
```

Register it. In `template/src/blocks/schemas.ts` add the import and entry:
```ts
import { bigStatSchema } from "./BigStat.schema";
import { hookSchema } from "./Hook.schema";

export const BLOCK_SCHEMAS = {
  BigStat: bigStatSchema,
  Hook: hookSchema,
} as const;
```
In `template/src/blocks/registry.tsx`:
```tsx
import { BigStat } from "./BigStat";
import { Hook } from "./Hook";
import type { BlockName } from "./schemas";
import type { BlockComponent } from "./types";

export const BLOCKS: { [K in BlockName]: BlockComponent<K> } = {
  BigStat,
  Hook,
};
```

In `template/examples/smoke/episode.json`, replace the `hook` scene with:
```json
"hook": {
  "beats": [
    {
      "block": "Hook",
      "props": {
        "line1": "¿Cargas el celular",
        "line2": "TODA LA NOCHE?",
        "chip": "Mitos y verdades · prueba",
        "hero": { "animation": "shake", "icon": "warning", "color": "accent" }
      }
    }
  ]
},
```

- [ ] **Step 4: Run tests and render**

Run:
```bash
cd template
npx vitest run && npm run lint
npx remotion still Episode out/smoke-hook-f0.png --public-dir examples/smoke --frame=0
npx remotion still BlockPreview out/preview-hook.png --public-dir examples/smoke --frame=40 \
  --props='{"layoutName":"9x16","block":"Hook","props":{"line1":"¿Tu perro se comió","line2":"UN CHOCOLATE?","chip":"Halloween · guía de 30 segundos","hero":{"animation":"bites","color":"#A8693D"},"stamp":"paw"},"title":null,"durationInFrames":90,"talent":null}'
npm run check -- examples/smoke
```
Expected: tests and lint pass. `smoke-hook-f0.png` shows the full headline, the chip and the warning icon at frame 0. `preview-hook.png` shows the bar with three squares bitten and the paw stamp. The check passes both layouts.

- [ ] **Step 5: Commit**

```bash
git add template/src/blocks template/tests/blocks/Hook.schema.test.ts template/examples/smoke/episode.json
git commit -m "feat(blocks): Hook with bites, pop and shake heroes"
```

---

### Task 12: `Compare`, `Timer` and `Chips` blocks

**Files:**
- Create: `template/src/blocks/Compare.schema.ts`, `Compare.tsx`, `Timer.schema.ts`, `Timer.tsx`, `Chips.schema.ts`, `Chips.tsx`, `template/src/blocks/parts/ScaleMeter.tsx`, `parts/ClockRing.tsx`, `parts/Chip.tsx`
- Modify: `template/src/blocks/schemas.ts`, `template/src/blocks/registry.tsx`, `template/examples/smoke/episode.json` (step2 beat B → Chips)
- Test: `template/tests/blocks/Compare.schema.test.ts`, `Timer.schema.test.ts`, `Chips.schema.test.ts`

**Interfaces:**
- Consumes: `chipItem`, `colorRef`, `iconName`, `accented` (Task 6); `fitFontSize` (Task 8); `AccentText` (Task 8).
- Produces:
  - `Compare` props `{ items: { label ≤12, color?: colorRef, icon?: IconName }[2–4] (each needs color or icon), meter: boolean = true, conclusion?: Accented }`. Keyframes over a 105-frame reference beat: items 18/105 (+6-frame stagger), meter 36/105→90/105, conclusion 60/105.
  - `Timer` props `{ low ≥0, high >0, unit ≤4, caption ≤40 ("\n" breaks lines), chips: ChipItem[0–3] = [] }`, low ≤ high. Keyframes: ring 12/105→60/105, chips (45 + 9i)/105.
  - `Chips` props `{ items: ChipItem[2–6], columns: 1 | 2 = 2 }`. Keyframes: items at 0.1 + 9-frame stagger.
  - Parts: `<ScaleMeter width from to />`, `<ClockRing size from to low high unit fontSize />`, `<Chip icon label progress />`.

- [ ] **Step 1: Write the failing tests**

`template/tests/blocks/Compare.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { compareSchema } from "../../src/blocks/Compare.schema";

const DANI = {
  items: [
    { label: "Blanco", color: "chocoWhite" },
    { label: "De leche", color: "chocoMilk" },
    { label: "Semiamargo", color: "chocoSemi" },
    { label: "Amargo", color: "chocoDark" },
  ],
  conclusion: { text: "Más oscuro = más tóxico", accent: "más tóxico", tone: "danger" },
};

it("accepts the Dani comparison", () => {
  expect(compareSchema.parse(DANI).meter).toBe(true);
});
it("requires a color or an icon per item", () => {
  expect(compareSchema.safeParse({ items: [{ label: "A" }, { label: "B", color: "accent" }] }).success).toBe(false);
});
it("accepts 2–4 items only", () => {
  expect(compareSchema.safeParse({ items: [DANI.items[0]] }).success).toBe(false);
  expect(compareSchema.safeParse({ items: [...DANI.items, DANI.items[0]] }).success).toBe(false);
});
```

`template/tests/blocks/Timer.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { timerSchema } from "../../src/blocks/Timer.schema";

const DANI = {
  low: 6,
  high: 12,
  unit: "h",
  caption: "Los síntomas\npueden tardar",
  chips: [
    { icon: "vomit", label: "Vómito" },
    { icon: "panting", label: "Inquietud y jadeo" },
    { icon: "tremor", label: "Temblores" },
  ],
};

it("accepts the Dani timer", () => {
  expect(timerSchema.parse(DANI).chips).toHaveLength(3);
});
it("rejects low > high", () => {
  expect(timerSchema.safeParse({ ...DANI, low: 13 }).success).toBe(false);
});
it("allows at most 3 chips", () => {
  expect(timerSchema.safeParse({ ...DANI, chips: [...DANI.chips, DANI.chips[0]] }).success).toBe(false);
});
```

`template/tests/blocks/Chips.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { chipsSchema } from "../../src/blocks/Chips.schema";

const item = (label: string) => ({ icon: "info", label });

it("defaults to two columns", () => {
  expect(chipsSchema.parse({ items: [item("a"), item("b")] }).columns).toBe(2);
});
it("accepts 2–6 items", () => {
  expect(chipsSchema.safeParse({ items: [item("a")] }).success).toBe(false);
  expect(chipsSchema.safeParse({ items: "abcdefg".split("").map(item) }).success).toBe(false);
});
it("limits chip labels to 22 characters", () => {
  expect(chipsSchema.safeParse({ items: [item("a"), item("Una etiqueta demasiado larga")] }).success).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks`
Expected: FAIL for the three new files (modules not found); `Hook.schema.test.ts` still PASS.

- [ ] **Step 3: Implement the schemas**

`template/src/blocks/Compare.schema.ts`:
```ts
import { z } from "zod";
import { accented, colorRef, iconName } from "./schema-parts";

export const compareSchema = z.object({
  items: z
    .array(
      z
        .object({ label: z.string().min(1).max(12), color: colorRef.optional(), icon: iconName.optional() })
        .refine((i) => i.color !== undefined || i.icon !== undefined, { message: "each item needs a color or an icon" }),
    )
    .min(2)
    .max(4),
  meter: z.boolean().default(true),
  conclusion: accented.optional(),
});
```

`template/src/blocks/Timer.schema.ts`:
```ts
import { z } from "zod";
import { chipItem } from "./schema-parts";

export const timerSchema = z
  .object({
    low: z.number().min(0),
    high: z.number().positive(),
    unit: z.string().min(1).max(4),
    caption: z.string().min(1).max(40),
    chips: z.array(chipItem).max(3).default([]),
  })
  .refine((t) => t.low <= t.high, { message: "low must be ≤ high" });
```

`template/src/blocks/Chips.schema.ts`:
```ts
import { z } from "zod";
import { chipItem } from "./schema-parts";

export const chipsSchema = z.object({
  items: z.array(chipItem).min(2).max(6),
  columns: z.union([z.literal(1), z.literal(2)]).default(2),
});
```

- [ ] **Step 4: Implement the parts**

`template/src/blocks/parts/ScaleMeter.tsx`:
```tsx
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { usePalette } from "../../frame/contexts";
import { CLAMP } from "../../frame/timing";

const BAR_H = 36;
const ARROW = 30;

/** A safe → accent → danger bar that wipes left to right, with an arrow riding the edge. */
export const ScaleMeter: React.FC<{ readonly width: number; readonly from: number; readonly to: number }> = ({
  width,
  from,
  to,
}) => {
  const frame = useCurrentFrame();
  const c = usePalette();
  const progress = interpolate(frame, [from, to], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
  const edge = width * progress;

  return (
    <div style={{ position: "relative", width, height: BAR_H + ARROW + 6 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: ARROW + 6,
          width,
          height: BAR_H,
          borderRadius: BAR_H / 2,
          backgroundColor: `${c.text}1F`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: ARROW + 6,
          width,
          height: BAR_H,
          borderRadius: BAR_H / 2,
          backgroundImage: `linear-gradient(90deg, ${c.safe}, ${c.accent}, ${c.danger})`,
          clipPath: `inset(0 ${width - edge}px 0 0 round ${BAR_H / 2}px)`,
        }}
      />
      <svg
        width={ARROW}
        height={ARROW}
        viewBox="0 0 30 30"
        style={{
          position: "absolute",
          top: 0,
          left: Math.min(Math.max(edge, ARROW / 2), width - ARROW / 2) - ARROW / 2,
          opacity: interpolate(frame, [from, from + 4], [0, 1], CLAMP),
        }}
      >
        <path d="M2 4 H28 L15 28 Z" fill={c.text} strokeLinejoin="round" />
      </svg>
    </div>
  );
};
```

`template/src/blocks/parts/ClockRing.tsx`:
```tsx
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { usePalette } from "../../frame/contexts";
import { FONT_HEAD, WEIGHT_HEAD } from "../../frame/theme";
import { CLAMP } from "../../frame/timing";

const STROKE = 20;

/** A ring drawing clockwise from 12 o'clock while the centre counts up to low–high. */
export const ClockRing: React.FC<{
  readonly size: number;
  readonly from: number;
  readonly to: number;
  readonly low: number;
  readonly high: number;
  readonly unit: string;
  readonly fontSize: number;
}> = ({ size, from, to, low, high, unit, fontSize }) => {
  const frame = useCurrentFrame();
  const c = usePalette();
  const progress = interpolate(frame, [from, to], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const lo = Math.round(low * progress);
  const hi = Math.round(high * progress);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${c.text}26`} strokeWidth={STROKE} />
        {[0, 90, 180, 270].map((deg) => (
          <line
            key={deg}
            x1={size / 2}
            y1={STROKE + 10}
            x2={size / 2}
            y2={STROKE + 24}
            stroke={`${c.text}80`}
            strokeWidth={6}
            strokeLinecap="round"
            transform={`rotate(${deg} ${size / 2} ${size / 2})`}
          />
        ))}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c.accent}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={progress > 0 ? 1 : 0}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_HEAD,
          fontWeight: WEIGHT_HEAD,
          fontSize,
          lineHeight: 1,
          paddingTop: fontSize * 0.08,
          color: c.accent,
          whiteSpace: "nowrap",
        }}
      >
        {low === high ? hi : `${lo}–${hi}`}
        <span style={{ fontSize: fontSize * 0.6, marginLeft: fontSize * 0.08 }}>{unit}</span>
      </div>
    </div>
  );
};
```

`template/src/blocks/parts/Chip.tsx`:
```tsx
import { interpolate } from "remotion";
import { usePalette } from "../../frame/contexts";
import { bodyStyle } from "../../frame/theme";
import { CLAMP } from "../../frame/timing";
import { Icon } from "../../icons";
import type { IconName } from "../../icons/names";

export const Chip: React.FC<{ readonly icon: IconName; readonly label: string; readonly progress: number }> = ({
  icon,
  label,
  progress,
}) => {
  const c = usePalette();
  return (
    <div
      style={{
        ...bodyStyle(44),
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 26px 10px 18px",
        borderRadius: 999,
        backgroundColor: c.bg2,
        border: `2px solid ${c.text}22`,
        color: c.text,
        whiteSpace: "nowrap",
        opacity: progress,
        translate: `${interpolate(progress, [0, 1], [40, 0], CLAMP)}px 0px`,
      }}
    >
      <Icon name={icon} size={46} color={c.accent} accent={c.text} />
      {label}
    </div>
  );
};
```

- [ ] **Step 5: Implement the blocks**

`template/src/blocks/Compare.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveColor } from "../episode/talent";
import { AccentText } from "../frame/AccentText";
import { usePalette } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, STAGGER, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { ScaleMeter } from "./parts/ScaleMeter";
import type { BlockComponent } from "./types";

// Fractions of a 105-frame reference beat.
const ITEMS_AT = 18 / 105;
const METER_FROM = 36 / 105;
const METER_TO = 90 / 105;
const CONCLUSION_AT = 60 / 105;
const SWATCH = 180;
const ROW_WIDTH = 960;
const LABEL_SIZE = 40;

export const Compare: BlockComponent<"Compare"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const colWidth = ROW_WIDTH / props.items.length;
  const conclusion = pop(frame, fps, at(CONCLUSION_AT));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", width: "100%" }}>
        {props.items.map((item, i) => {
          const p = enter(frame, fps, at(ITEMS_AT) + i * STAGGER);
          return (
            <div
              key={item.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: p,
                translate: `0px ${interpolate(p, [0, 1], [40, 0])}px`,
              }}
            >
              <div
                style={{
                  width: SWATCH,
                  height: SWATCH,
                  borderRadius: 32,
                  backgroundColor: item.color ? resolveColor(item.color, c) : c.bg2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "inset 0 -10px 0 rgba(0,0,0,0.25), 0 10px 24px rgba(0,0,0,0.35)",
                }}
              >
                {item.icon ? <Icon name={item.icon} size={110} color={c.text} accent={c.accent} /> : null}
              </div>
              <div
                style={{
                  ...headStyle(fitFontSize(item.label, colWidth - 16, LABEL_SIZE, FONT_HEAD, WEIGHT_HEAD)),
                  color: c.text,
                  marginTop: 14,
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
      {props.meter ? (
        <div style={{ marginTop: 26 }}>
          <ScaleMeter width={900} from={at(METER_FROM)} to={at(METER_TO)} />
        </div>
      ) : null}
      {props.conclusion ? (
        <div
          style={{
            ...bodyStyle(56),
            color: c.text,
            marginTop: 22,
            whiteSpace: "nowrap",
            opacity: interpolate(conclusion, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(conclusion, [0, 1], [0.6, 1]),
          }}
        >
          <AccentText value={props.conclusion} />
        </div>
      ) : null}
    </div>
  );
};
```

`template/src/blocks/Timer.tsx`:
```tsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle } from "../frame/theme";
import { enter } from "../frame/timing";
import { Chip } from "./parts/Chip";
import { ClockRing } from "./parts/ClockRing";
import type { BlockComponent } from "./types";

// Fractions of a 105-frame reference beat.
const RING_FROM = 12 / 105;
const RING_TO = 60 / 105;
const chipAt = (i: number) => (45 + 9 * i) / 105;

export const Timer: BlockComponent<"Timer"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
      <ClockRing
        size={280}
        from={at(RING_FROM)}
        to={at(RING_TO)}
        low={props.low}
        high={props.high}
        unit={props.unit}
        fontSize={72}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
        <div style={{ ...bodyStyle(52), color: c.text, marginBottom: 6 }}>
          {props.caption.split("\n").map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        {props.chips.map((chip, i) => (
          <Chip key={chip.label} icon={chip.icon} label={chip.label} progress={enter(frame, fps, at(chipAt(i)))} />
        ))}
      </div>
    </div>
  );
};
```

`template/src/blocks/Chips.tsx`:
```tsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../frame/timing";
import { Chip } from "./parts/Chip";
import type { BlockComponent } from "./types";

const FIRST_AT = 0.1;
const CHIP_STAGGER = 9;

export const Chips: BlockComponent<"Chips"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${props.columns}, max-content)`,
        justifyContent: "center",
        gap: "20px 28px",
      }}
    >
      {props.items.map((item, i) => (
        <Chip
          key={item.label}
          icon={item.icon}
          label={item.label}
          progress={enter(frame, fps, timing.at(FIRST_AT) + i * CHIP_STAGGER)}
        />
      ))}
    </div>
  );
};
```

`template/src/blocks/schemas.ts` becomes:
```ts
import { bigStatSchema } from "./BigStat.schema";
import { chipsSchema } from "./Chips.schema";
import { compareSchema } from "./Compare.schema";
import { hookSchema } from "./Hook.schema";
import { timerSchema } from "./Timer.schema";

// Node-safe: schemas only, no components. Each block task adds its entry here.
export const BLOCK_SCHEMAS = {
  BigStat: bigStatSchema,
  Chips: chipsSchema,
  Compare: compareSchema,
  Hook: hookSchema,
  Timer: timerSchema,
} as const;

export type BlockName = keyof typeof BLOCK_SCHEMAS;

export const isBlockName = (name: string): name is BlockName =>
  Object.prototype.hasOwnProperty.call(BLOCK_SCHEMAS, name);
```

`template/src/blocks/registry.tsx` becomes:
```tsx
import { BigStat } from "./BigStat";
import { Chips } from "./Chips";
import { Compare } from "./Compare";
import { Hook } from "./Hook";
import { Timer } from "./Timer";
import type { BlockName } from "./schemas";
import type { BlockComponent } from "./types";

// Each block task adds its component here, matching BLOCK_SCHEMAS.
export const BLOCKS: { [K in BlockName]: BlockComponent<K> } = {
  BigStat,
  Chips,
  Compare,
  Hook,
  Timer,
};
```

In `template/examples/smoke/episode.json`, replace step2's second beat with:
```json
{
  "block": "Chips",
  "props": {
    "items": [
      { "icon": "warning", "label": "Calor" },
      { "icon": "clock", "label": "Carga al 100 %" },
      { "icon": "info", "label": "Cargadores genéricos" },
      { "icon": "x", "label": "Descarga total" }
    ]
  }
}
```

- [ ] **Step 6: Run tests and render**

Run:
```bash
cd template
npx vitest run && npm run lint
npx remotion still BlockPreview out/preview-compare.png --public-dir examples/smoke --frame=104 \
  --props='{"layoutName":"9x16","block":"Compare","props":{"items":[{"label":"Blanco","color":"#F3E3C7"},{"label":"De leche","color":"#A8693D"},{"label":"Semiamargo","color":"#6B3F23"},{"label":"Amargo","color":"#3B2114"}],"conclusion":{"text":"Más oscuro = más tóxico","accent":"más tóxico","tone":"danger"}},"title":{"text":"¿CUÁNDO preocuparte?","accent":"CUÁNDO"},"durationInFrames":105,"talent":null}'
npx remotion still BlockPreview out/preview-timer.png --public-dir examples/smoke --frame=104 \
  --props='{"layoutName":"9x16","block":"Timer","props":{"low":6,"high":12,"unit":"h","caption":"Los síntomas\npueden tardar","chips":[{"icon":"vomit","label":"Vómito"},{"icon":"panting","label":"Inquietud y jadeo"},{"icon":"tremor","label":"Temblores"}]},"title":{"text":"¿CUÁNDO preocuparte?","accent":"CUÁNDO"},"durationInFrames":105,"talent":null}'
npm run check -- examples/smoke
```
Expected: tests and lint pass. The Compare preview shows four swatches with labels, the full meter and "Más oscuro = más tóxico" with "más tóxico" in red. The Timer preview shows the full ring with "6–12 h" inside it (not touching the ring) and three chips. The check passes; open the step2 frames it lists and confirm the chips grid.

- [ ] **Step 7: Commit**

```bash
git add template/src/blocks template/tests/blocks template/examples/smoke/episode.json
git commit -m "feat(blocks): Compare, Timer and Chips"
```

---

### Task 13: `DoDont` and `Checklist` blocks

**Files:**
- Create: `template/src/blocks/DoDont.schema.ts`, `DoDont.tsx`, `Checklist.schema.ts`, `Checklist.tsx`
- Modify: `template/src/blocks/schemas.ts`, `template/src/blocks/registry.tsx`, `template/examples/smoke/episode.json` (step3 → Checklist)
- Test: `template/tests/blocks/DoDont.schema.test.ts`, `Checklist.schema.test.ts`

**Interfaces:**
- Produces:
  - `DoDont` props `{ cards: { icon: IconName; label ≤32; verdict: "no" | "yes" }[2] }`. Keyframes over 105: slide (18 + 12i)/105, stamp (42 + 18i)/105. "no" → red X (8 px stroke, −12°), content dims to 55 %; "yes" → green check, no dim.
  - `Checklist` props `{ rows: string ≤40 [2–4], pill?: string ≤32 }`. Keyframes: row i at (12 + 21i)/105, check draws over 10 frames starting 4 frames after its row; pill 15/105 after the last row.

- [ ] **Step 1: Write the failing tests**

`template/tests/blocks/DoDont.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { doDontSchema } from "../../src/blocks/DoDont.schema";

const DANI = {
  cards: [
    { icon: "milk", label: "Leche", verdict: "no" },
    { icon: "spoonDrop", label: "Hacerlo vomitar por tu cuenta", verdict: "no" },
  ],
};

it("accepts the Dani cards", () => {
  expect(doDontSchema.parse(DANI).cards).toHaveLength(2);
});
it("needs exactly two cards", () => {
  expect(doDontSchema.safeParse({ cards: [DANI.cards[0]] }).success).toBe(false);
});
it("only accepts no / yes verdicts", () => {
  expect(doDontSchema.safeParse({ cards: [DANI.cards[0], { ...DANI.cards[1], verdict: "maybe" }] }).success).toBe(false);
});
```

`template/tests/blocks/Checklist.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { checklistSchema } from "../../src/blocks/Checklist.schema";

const DANI = {
  rows: ["Guarda el empaque", "Calcula cuánto comió y a qué hora", "Llama a tu veterinaria"],
  pill: "Las primeras 2 horas cuentan",
};

it("accepts the Dani checklist", () => {
  expect(checklistSchema.parse(DANI).rows).toHaveLength(3);
});
it("accepts 2–4 rows", () => {
  expect(checklistSchema.safeParse({ rows: ["a"] }).success).toBe(false);
  expect(checklistSchema.safeParse({ rows: ["a", "b", "c", "d", "e"] }).success).toBe(false);
});
it("limits rows to 40 characters", () => {
  expect(checklistSchema.safeParse({ rows: ["a", "x".repeat(41)] }).success).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks/DoDont.schema.test.ts tests/blocks/Checklist.schema.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`template/src/blocks/DoDont.schema.ts`:
```ts
import { z } from "zod";
import { iconName } from "./schema-parts";

export const doDontSchema = z.object({
  cards: z
    .array(z.object({ icon: iconName, label: z.string().min(1).max(32), verdict: z.enum(["no", "yes"]) }))
    .length(2),
});
```

`template/src/blocks/Checklist.schema.ts`:
```ts
import { z } from "zod";

export const checklistSchema = z.object({
  rows: z.array(z.string().min(1).max(40)).min(2).max(4),
  pill: z.string().min(1).max(32).optional(),
});
```

`template/src/blocks/DoDont.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const CARD = { width: 450, height: 300, radius: 32 };
const STAMP_SIZE = 210;
// Fractions of a 105-frame reference beat.
const slideAt = (i: number) => (18 + 12 * i) / 105;
const stampAt = (i: number) => (42 + 18 * i) / 105;

export const DoDont: BlockComponent<"DoDont"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignSelf: "start" }}>
      {props.cards.map((card, i) => {
        const slide = enter(frame, fps, at(slideAt(i)));
        const stampFrame = at(stampAt(i));
        const stamp = pop(frame, fps, stampFrame);
        const isNo = card.verdict === "no";
        return (
          <div
            key={card.label}
            style={{
              position: "relative",
              width: CARD.width,
              height: CARD.height,
              borderRadius: CARD.radius,
              backgroundColor: c.bg2,
              border: `2px solid ${c.text}22`,
              boxSizing: "border-box",
              opacity: slide,
              translate: `${interpolate(slide, [0, 1], [-160, 0])}px 0px`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                padding: "0 30px",
                textAlign: "center",
                opacity: isNo ? interpolate(frame, [stampFrame, stampFrame + 6], [1, 0.55], CLAMP) : 1,
              }}
            >
              <Icon name={card.icon} size={120} color={c.text} accent={c.accent} />
              <div style={{ ...bodyStyle(48), color: c.text, lineHeight: 1.1 }}>{card.label}</div>
            </div>
            {frame >= stampFrame ? (
              <Icon
                name={isNo ? "x" : "check"}
                size={isNo ? STAMP_SIZE : 170}
                color={isNo ? c.danger : c.safe}
                style={{
                  position: "absolute",
                  left: (CARD.width - (isNo ? STAMP_SIZE : 170)) / 2,
                  top: (CARD.height - (isNo ? STAMP_SIZE : 170)) / 2,
                  rotate: "-12deg",
                  scale: interpolate(stamp, [0, 1], [2, 1]),
                  opacity: interpolate(stamp, [0, 0.3], [0, 1], CLAMP),
                  filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.4))",
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
```

`template/src/blocks/Checklist.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import type { BlockComponent } from "./types";

const CHECK_CIRCLE = 72;
const CHECK_DRAW_FRAMES = 10;
const CHECK_PATH_LENGTH = 90;
// Fractions of a 105-frame reference beat.
const rowAt = (i: number) => (12 + 21 * i) / 105;
const PILL_AFTER = 15 / 105;

export const Checklist: BlockComponent<"Checklist"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const pill = pop(frame, fps, at(rowAt(props.rows.length - 1) + PILL_AFTER));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingLeft: 20 }}>
      {props.rows.map((row, i) => {
        const start = at(rowAt(i));
        const p = enter(frame, fps, start);
        const draw = interpolate(frame, [start + 4, start + 4 + CHECK_DRAW_FRAMES], [0, 1], CLAMP);
        return (
          <div
            key={row}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              opacity: p,
              translate: `${interpolate(p, [0, 1], [40, 0])}px 0px`,
            }}
          >
            <div
              style={{
                width: CHECK_CIRCLE,
                height: CHECK_CIRCLE,
                flexShrink: 0,
                borderRadius: "50%",
                border: `5px solid ${c.safe}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={48} height={48} viewBox="0 0 100 100">
                <path
                  d="M22 52 L42 72 L80 30"
                  fill="none"
                  stroke={c.safe}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={CHECK_PATH_LENGTH}
                  strokeDashoffset={CHECK_PATH_LENGTH * (1 - draw)}
                />
              </svg>
            </div>
            <div style={{ ...bodyStyle(52), color: c.text, lineHeight: 1.15 }}>{row}</div>
          </div>
        );
      })}
      {props.pill ? (
        <div
          style={{
            ...headStyle(44),
            alignSelf: "flex-start",
            marginLeft: CHECK_CIRCLE + 26,
            marginTop: 4,
            padding: "10px 30px 6px",
            borderRadius: 999,
            backgroundColor: c.accent,
            color: c.bg,
            whiteSpace: "nowrap",
            opacity: interpolate(pill, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(pill, [0, 1], [0.5, 1]),
          }}
        >
          {props.pill}
        </div>
      ) : null}
    </div>
  );
};
```

`template/src/blocks/schemas.ts` becomes:
```ts
import { bigStatSchema } from "./BigStat.schema";
import { checklistSchema } from "./Checklist.schema";
import { chipsSchema } from "./Chips.schema";
import { compareSchema } from "./Compare.schema";
import { doDontSchema } from "./DoDont.schema";
import { hookSchema } from "./Hook.schema";
import { timerSchema } from "./Timer.schema";

// Node-safe: schemas only, no components. Each block task adds its entry here.
export const BLOCK_SCHEMAS = {
  BigStat: bigStatSchema,
  Checklist: checklistSchema,
  Chips: chipsSchema,
  Compare: compareSchema,
  DoDont: doDontSchema,
  Hook: hookSchema,
  Timer: timerSchema,
} as const;

export type BlockName = keyof typeof BLOCK_SCHEMAS;

export const isBlockName = (name: string): name is BlockName =>
  Object.prototype.hasOwnProperty.call(BLOCK_SCHEMAS, name);
```

`template/src/blocks/registry.tsx` becomes:
```tsx
import { BigStat } from "./BigStat";
import { Checklist } from "./Checklist";
import { Chips } from "./Chips";
import { Compare } from "./Compare";
import { DoDont } from "./DoDont";
import { Hook } from "./Hook";
import { Timer } from "./Timer";
import type { BlockName } from "./schemas";
import type { BlockComponent } from "./types";

// Each block task adds its component here, matching BLOCK_SCHEMAS.
export const BLOCKS: { [K in BlockName]: BlockComponent<K> } = {
  BigStat,
  Checklist,
  Chips,
  Compare,
  DoDont,
  Hook,
  Timer,
};
```

In `template/examples/smoke/episode.json`, replace the `step3` beats with:
```json
"beats": [
  {
    "block": "Checklist",
    "props": {
      "rows": ["Carga entre 20 y 80 %", "Evita el calor", "Usa cargadores certificados"],
      "pill": "Datos de ejemplo"
    }
  }
]
```

- [ ] **Step 4: Run tests and render**

Run:
```bash
cd template
npx vitest run && npm run lint
npx remotion still BlockPreview out/preview-dodont.png --public-dir examples/smoke --frame=104 \
  --props='{"layoutName":"9x16","block":"DoDont","props":{"cards":[{"icon":"milk","label":"Leche","verdict":"no"},{"icon":"spoonDrop","label":"Hacerlo vomitar por tu cuenta","verdict":"no"}]},"title":{"text":"¿CÓMO actuar?","accent":"CÓMO"},"durationInFrames":105,"talent":null}'
npm run check -- examples/smoke
```
Expected: tests and lint pass. The preview shows two cards, each with a red X stamped at −12° and dimmed content. The check passes; the step3 frames show three checked rows and the pill.

- [ ] **Step 5: Commit**

```bash
git add template/src/blocks template/tests/blocks template/examples/smoke/episode.json
git commit -m "feat(blocks): DoDont and Checklist"
```

---

### Task 14: `Quantity` block

**Files:**
- Create: `template/src/blocks/Quantity.schema.ts`, `Quantity.tsx`, `template/src/blocks/parts/QuantityBars.tsx`
- Modify: `template/src/blocks/schemas.ts`, `template/src/blocks/registry.tsx`
- Test: `template/tests/blocks/Quantity.schema.test.ts`

**Interfaces:**
- Produces: `Quantity` props `{ chip?: ChipItem, unit ≤4 = "", approx = false, rows: { label ≤28; value > 0; color: colorRef; outline?: colorRef }[2–4], highlight: "none"|"last"|"max"|"min" = "last", conclusion?: ≤36, footnote?: ≤80 }`. Bars are proportional (largest value = 620 px), drawn as strips of squares. Keyframes over a 255-frame reference beat: chip 18/255; row i grows from (36 + i·150/n)/255 for (0.4 + 0.6·value/max)·(150/n) frames-of-reference; highlight 190/255 (pulse 1.15 + danger color, others dim to 60 %); conclusion 202/255; footnote 208/255. `highlightIndex(rows, highlight): number` exported for tests.

- [ ] **Step 1: Write the failing tests**

`template/tests/blocks/Quantity.schema.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { highlightIndex, quantitySchema } from "../../src/blocks/Quantity.schema";

const DANI = {
  chip: { icon: "dog", label: "Ejemplo: perro de 5 kg" },
  unit: "g",
  approx: true,
  rows: [
    { label: "De leche", value: 45, color: "chocoMilk" },
    { label: "Semiamargo", value: 20, color: "chocoSemi" },
    { label: "Amargo (100 % cacao)", value: 7, color: "chocoDark", outline: "danger" },
  ],
  highlight: "last",
  conclusion: "Con esto ya hay síntomas",
  footnote: "Dosis orientativa. Cada perro es distinto: ante la duda, llama.",
};

describe("quantitySchema", () => {
  it("accepts the Dani chart", () => {
    expect(quantitySchema.parse(DANI).rows).toHaveLength(3);
  });
  it("rejects zero or negative values", () => {
    expect(quantitySchema.safeParse({ ...DANI, rows: [DANI.rows[0], { ...DANI.rows[1], value: 0 }] }).success).toBe(false);
  });
});

describe("highlightIndex", () => {
  const rows = quantitySchema.parse(DANI).rows;
  it("finds last, max and min, or -1 for none", () => {
    expect(highlightIndex(rows, "last")).toBe(2);
    expect(highlightIndex(rows, "max")).toBe(0);
    expect(highlightIndex(rows, "min")).toBe(2);
    expect(highlightIndex(rows, "none")).toBe(-1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks/Quantity.schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`template/src/blocks/Quantity.schema.ts`:
```ts
import { z } from "zod";
import { chipItem, colorRef } from "./schema-parts";

const row = z.object({
  label: z.string().min(1).max(28),
  value: z.number().positive(),
  color: colorRef,
  outline: colorRef.optional(),
});

export const quantitySchema = z.object({
  chip: chipItem.optional(),
  unit: z.string().max(4).default(""),
  approx: z.boolean().default(false),
  rows: z.array(row).min(2).max(4),
  highlight: z.enum(["none", "last", "max", "min"]).default("last"),
  conclusion: z.string().min(1).max(36).optional(),
  footnote: z.string().min(1).max(80).optional(),
});

export const highlightIndex = (
  rows: { value: number }[],
  highlight: "none" | "last" | "max" | "min",
): number => {
  if (highlight === "none") return -1;
  if (highlight === "last") return rows.length - 1;
  const values = rows.map((r) => r.value);
  const target = highlight === "max" ? Math.max(...values) : Math.min(...values);
  return values.indexOf(target);
};
```

`template/src/blocks/parts/QuantityBars.tsx`:
```tsx
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette, useTalent } from "../../frame/contexts";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle } from "../../frame/theme";
import { CLAMP, enter, pulse } from "../../frame/timing";

export type BarRow = { label: string; value: number; color: string; outline?: string; from: number; to: number };

const MAX_BAR = 620;
const BAR_H = 46;
const SQUARE = 38;
const SQUARE_GAP = 6;
const NUMBER_SIZE = 80;

export const QuantityBars: React.FC<{
  readonly rows: BarRow[];
  readonly unit: string;
  readonly approx: boolean;
  readonly highlight: number; // row index, -1 for none
  readonly highlightAt: number;
}> = ({ rows, unit, approx, highlight, highlightAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { locale } = useTalent();
  const max = Math.max(...rows.map((r) => r.value));
  const dim = highlight >= 0 ? interpolate(frame, [highlightAt, highlightAt + 12], [1, 0.6], CLAMP) : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row, i) => {
        const isHighlight = i === highlight;
        const grow = interpolate(frame, [row.from, row.to], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
        const appear = enter(frame, fps, row.from - 12);
        const fullWidth = (row.value / max) * MAX_BAR;
        const squares = Math.max(1, Math.round((fullWidth + SQUARE_GAP) / (SQUARE + SQUARE_GAP)));
        const squareW = (fullWidth - SQUARE_GAP * (squares - 1)) / squares;
        const format = new Intl.NumberFormat(locale, { maximumFractionDigits: Number.isInteger(row.value) ? 0 : 1 });
        const shown = Number.isInteger(row.value) ? Math.round(row.value * grow) : row.value * grow;

        return (
          <div
            key={row.label}
            style={{
              opacity: appear * (isHighlight || highlight < 0 ? 1 : dim),
              translate: `${interpolate(appear, [0, 1], [-40, 0])}px 0px`,
            }}
          >
            <div style={{ ...bodyStyle(48), color: c.text, lineHeight: 1.05, marginBottom: 2 }}>{row.label}</div>
            <div style={{ display: "flex", alignItems: "center", height: BAR_H }}>
              <div
                style={{
                  width: fullWidth * grow,
                  height: BAR_H,
                  overflow: "hidden",
                  flexShrink: 0,
                  borderRadius: 10,
                  outline: row.outline ? `4px solid ${row.outline}` : undefined,
                  outlineOffset: 3,
                }}
              >
                <div style={{ display: "flex", gap: SQUARE_GAP, width: fullWidth, height: BAR_H }}>
                  {new Array(squares).fill(0).map((_, s) => (
                    <div
                      key={s}
                      style={{
                        width: squareW,
                        height: BAR_H,
                        flexShrink: 0,
                        borderRadius: 8,
                        backgroundColor: row.color,
                        boxShadow: "inset 0 -5px 0 rgba(0,0,0,0.25), inset 0 3px 0 rgba(255,255,255,0.12)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div
                style={{
                  marginLeft: 22,
                  fontFamily: FONT_HEAD,
                  fontWeight: WEIGHT_HEAD,
                  fontSize: NUMBER_SIZE,
                  lineHeight: 1,
                  paddingTop: 8,
                  whiteSpace: "nowrap",
                  color: isHighlight && frame >= highlightAt ? c.danger : c.accent,
                  scale: isHighlight ? pulse(frame, highlightAt, 14, 1.15) : 1,
                  transformOrigin: "left center",
                }}
              >
                {approx ? "≈ " : ""}
                {format.format(shown)}
                {unit ? ` ${unit}` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

`template/src/blocks/Quantity.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveColor } from "../episode/talent";
import { usePalette } from "../frame/contexts";
import { bodyStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { QuantityBars } from "./parts/QuantityBars";
import { highlightIndex } from "./Quantity.schema";
import type { BlockComponent } from "./types";

// Fractions of a 255-frame reference beat.
const CHIP_AT = 18 / 255;
const ROWS_FROM = 36;
const ROWS_SPAN = 150;
const HIGHLIGHT_AT = 190 / 255;
const CONCLUSION_AT = 202 / 255;
const FOOTNOTE_AT = 208 / 255;

export const Quantity: BlockComponent<"Quantity"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const chip = enter(frame, fps, at(CHIP_AT));
  const conclusion = pop(frame, fps, at(CONCLUSION_AT));
  const footnote = enter(frame, fps, at(FOOTNOTE_AT));
  const max = Math.max(...props.rows.map((r) => r.value));
  const step = ROWS_SPAN / props.rows.length;
  const rows = props.rows.map((row, i) => {
    const from = ROWS_FROM + step * i;
    const length = step * (0.4 + 0.6 * (row.value / max));
    return {
      label: row.label,
      value: row.value,
      color: resolveColor(row.color, c),
      outline: row.outline ? resolveColor(row.outline, c) : undefined,
      from: at(from / 255),
      to: at((from + length) / 255),
    };
  });

  return (
    <div>
      {props.chip ? (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div
            style={{
              ...bodyStyle(44),
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "8px 30px 8px 20px",
              borderRadius: 999,
              backgroundColor: c.bg2,
              border: `2px solid ${c.text}33`,
              color: c.text,
              whiteSpace: "nowrap",
              opacity: chip,
              scale: interpolate(chip, [0, 1], [0.8, 1]),
            }}
          >
            <Icon name={props.chip.icon} size={52} color={c.accent} accent={c.text} />
            {props.chip.label}
          </div>
        </div>
      ) : null}
      <QuantityBars
        rows={rows}
        unit={props.unit}
        approx={props.approx}
        highlight={highlightIndex(props.rows, props.highlight)}
        highlightAt={at(HIGHLIGHT_AT)}
      />
      {props.conclusion ? (
        <div
          style={{
            ...bodyStyle(52),
            color: c.accent,
            marginTop: 14,
            whiteSpace: "nowrap",
            opacity: interpolate(conclusion, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(conclusion, [0, 1], [0.6, 1]),
            transformOrigin: "left center",
          }}
        >
          {props.conclusion}
        </div>
      ) : null}
      {props.footnote ? (
        <div style={{ ...bodyStyle(30), color: c.text, opacity: 0.7 * footnote, marginTop: 6 }}>{props.footnote}</div>
      ) : null}
    </div>
  );
};
```

`template/src/blocks/schemas.ts` becomes:
```ts
import { bigStatSchema } from "./BigStat.schema";
import { checklistSchema } from "./Checklist.schema";
import { chipsSchema } from "./Chips.schema";
import { compareSchema } from "./Compare.schema";
import { doDontSchema } from "./DoDont.schema";
import { hookSchema } from "./Hook.schema";
import { quantitySchema } from "./Quantity.schema";
import { timerSchema } from "./Timer.schema";

// Node-safe: schemas only, no components. Each block task adds its entry here.
export const BLOCK_SCHEMAS = {
  BigStat: bigStatSchema,
  Checklist: checklistSchema,
  Chips: chipsSchema,
  Compare: compareSchema,
  DoDont: doDontSchema,
  Hook: hookSchema,
  Quantity: quantitySchema,
  Timer: timerSchema,
} as const;

export type BlockName = keyof typeof BLOCK_SCHEMAS;

export const isBlockName = (name: string): name is BlockName =>
  Object.prototype.hasOwnProperty.call(BLOCK_SCHEMAS, name);
```

`template/src/blocks/registry.tsx` becomes:
```tsx
import { BigStat } from "./BigStat";
import { Checklist } from "./Checklist";
import { Chips } from "./Chips";
import { Compare } from "./Compare";
import { DoDont } from "./DoDont";
import { Hook } from "./Hook";
import { Quantity } from "./Quantity";
import { Timer } from "./Timer";
import type { BlockName } from "./schemas";
import type { BlockComponent } from "./types";

// Each block task adds its component here, matching BLOCK_SCHEMAS.
export const BLOCKS: { [K in BlockName]: BlockComponent<K> } = {
  BigStat,
  Checklist,
  Chips,
  Compare,
  DoDont,
  Hook,
  Quantity,
  Timer,
};
```

- [ ] **Step 4: Run tests and render**

Run:
```bash
cd template
npx vitest run && npm run lint
npx remotion still BlockPreview out/preview-quantity.png --public-dir examples/smoke --frame=240 \
  --props='{"layoutName":"9x16","block":"Quantity","props":{"chip":{"icon":"dog","label":"Ejemplo: perro de 5 kg"},"unit":"g","approx":true,"rows":[{"label":"De leche","value":45,"color":"#A8693D"},{"label":"Semiamargo","value":20,"color":"#6B3F23"},{"label":"Amargo (100 % cacao)","value":7,"color":"#3B2114","outline":"danger"}],"highlight":"last","conclusion":"Con esto ya hay síntomas","footnote":"Dosis orientativa. Cada perro es distinto: ante la duda, llama."},"title":{"text":"¿CUÁNTO es peligroso?","accent":"CUÁNTO"},"durationInFrames":255,"talent":null}'
```
Expected: tests and lint pass. The preview shows the chip, three square-strip bars ending in "≈ 45 g", "≈ 20 g" and a red "≈ 7 g" with its red outline, rows 1–2 dimmed, the conclusion and the footnote, all inside the stage.

- [ ] **Step 5: Commit**

```bash
git add template/src/blocks template/tests/blocks/Quantity.schema.test.ts
git commit -m "feat(blocks): Quantity bars"
```

---

### Task 15: `MythFact` and `Close` blocks; finish the smoke example

**Files:**
- Create: `template/src/blocks/MythFact.schema.ts`, `MythFact.tsx`, `Close.schema.ts`, `Close.tsx`
- Modify: `template/src/blocks/schemas.ts`, `template/src/blocks/registry.tsx`, `template/examples/smoke/episode.json` (step1 → MythFact, close → Close)
- Test: `template/tests/blocks/MythFact.schema.test.ts`, `Close.schema.test.ts`, `template/tests/registry.test.ts`

**Interfaces:**
- Consumes: `useTalent()` (Task 8) for the brand lockup and contacts.
- Produces:
  - `MythFact` props `{ mythTag ≤12 = "MITO", myth ≤70, factTag ≤12 = "REALIDAD", fact ≤90 }`. Keyframes: myth card 0.05, strike 0.35→0.45, X stamp 0.45 (myth dims to 55 %), fact card 0.55.
  - `Close` props `{ line1 ≤26, line2: Accented (accent drawn at 140 px), accentIcon?: IconName, actions: IconName[0–3] = ["bookmark","share"], teaser ≤40 = "" }`. Brand lockup = `talent.displayName` over `talent.profession · talent.city`; contacts = non-empty `talent.handles` (instagram, tiktok, `WhatsApp <n>`, facebook) joined by " · ". Keyframes over 135: actions 30/135 (+6 frames each, one bounce), brand 45/135, contacts 60/135, teaser 75/135; static from 105/135.
  - After this task `BLOCK_SCHEMAS` and `BLOCKS` hold all 10 core blocks: BigStat, Checklist, Chips, Close, Compare, DoDont, Hook, MythFact, Quantity, Timer.

- [ ] **Step 1: Write the failing tests**

`template/tests/blocks/MythFact.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { mythFactSchema } from "../../src/blocks/MythFact.schema";

it("fills the default tags", () => {
  const p = mythFactSchema.parse({ myth: "Dejarlo enchufado lo explota", fact: "El cargador corta al llegar al 100 %" });
  expect([p.mythTag, p.factTag]).toEqual(["MITO", "REALIDAD"]);
});
it("limits the myth to 70 and the fact to 90 characters", () => {
  expect(mythFactSchema.safeParse({ myth: "x".repeat(71), fact: "y" }).success).toBe(false);
  expect(mythFactSchema.safeParse({ myth: "x", fact: "y".repeat(91) }).success).toBe(false);
});
```

`template/tests/blocks/Close.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { closeSchema } from "../../src/blocks/Close.schema";

const DANI = {
  line1: "Guárdalo y compártelo",
  line2: { text: "antes del 31", accent: "31" },
  accentIcon: "pumpkin",
};

it("accepts the Dani close with default actions", () => {
  const p = closeSchema.parse(DANI);
  expect(p.actions).toEqual(["bookmark", "share"]);
  expect(p.teaser).toBe("");
});
it("allows at most 3 actions", () => {
  expect(closeSchema.safeParse({ ...DANI, actions: ["bookmark", "share", "info", "check"] }).success).toBe(false);
});
```

`template/tests/registry.test.ts`:
```ts
import { expect, it } from "vitest";
import { BLOCK_SCHEMAS } from "../src/blocks/schemas";

it("registers the 10 core blocks", () => {
  expect(Object.keys(BLOCK_SCHEMAS).sort()).toEqual([
    "BigStat",
    "Checklist",
    "Chips",
    "Close",
    "Compare",
    "DoDont",
    "Hook",
    "MythFact",
    "Quantity",
    "Timer",
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks/MythFact.schema.test.ts tests/blocks/Close.schema.test.ts tests/registry.test.ts`
Expected: FAIL — modules not found; registry test lists 8 blocks.

- [ ] **Step 3: Implement**

`template/src/blocks/MythFact.schema.ts`:
```ts
import { z } from "zod";

export const mythFactSchema = z.object({
  mythTag: z.string().min(1).max(12).default("MITO"),
  myth: z.string().min(1).max(70),
  factTag: z.string().min(1).max(12).default("REALIDAD"),
  fact: z.string().min(1).max(90),
});
```

`template/src/blocks/Close.schema.ts`:
```ts
import { z } from "zod";
import { accented, iconName } from "./schema-parts";

export const closeSchema = z.object({
  line1: z.string().min(1).max(26),
  line2: accented,
  accentIcon: iconName.optional(),
  actions: z.array(iconName).max(3).default(["bookmark", "share"]),
  teaser: z.string().max(40).default(""),
});
```

`template/src/blocks/MythFact.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const MYTH_AT = 0.05;
const STRIKE_FROM = 0.35;
const STRIKE_TO = 0.45;
const STAMP_AT = 0.45;
const FACT_AT = 0.55;

const Tag: React.FC<{ readonly label: string; readonly color: string; readonly filled: boolean; readonly ink: string }> = ({
  label,
  color,
  filled,
  ink,
}) => (
  <div
    style={{
      ...headStyle(40),
      alignSelf: "flex-start",
      padding: "6px 22px 2px",
      borderRadius: 999,
      border: `3px solid ${color}`,
      backgroundColor: filled ? color : "transparent",
      color: filled ? ink : color,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </div>
);

export const MythFact: BlockComponent<"MythFact"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const myth = enter(frame, fps, at(MYTH_AT));
  const strike = interpolate(frame, [at(STRIKE_FROM), at(STRIKE_TO)], [0, 1], CLAMP);
  const stamp = pop(frame, fps, at(STAMP_AT));
  const fact = enter(frame, fps, at(FACT_AT));
  const card: React.CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: "26px 36px",
    borderRadius: 32,
    backgroundColor: c.bg2,
    border: `2px solid ${c.text}22`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div
        style={{
          ...card,
          opacity: myth * interpolate(frame, [at(STAMP_AT), at(STAMP_AT) + 6], [1, 0.55], CLAMP),
          translate: `0px ${interpolate(myth, [0, 1], [30, 0])}px`,
        }}
      >
        <Tag label={props.mythTag} color={c.danger} filled={false} ink={c.bg} />
        <div style={{ position: "relative", ...bodyStyle(48), color: c.text }}>
          {props.myth}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              height: 6,
              width: "100%",
              borderRadius: 3,
              backgroundColor: c.danger,
              scale: `${strike} 1`,
              transformOrigin: "left center",
            }}
          />
        </div>
        {frame >= at(STAMP_AT) ? (
          <Icon
            name="x"
            size={120}
            color={c.danger}
            style={{
              position: "absolute",
              right: 30,
              top: 20,
              rotate: "-12deg",
              scale: interpolate(stamp, [0, 1], [2, 1]),
              opacity: interpolate(stamp, [0, 0.3], [0, 1], CLAMP),
            }}
          />
        ) : null}
      </div>
      <div style={{ ...card, opacity: fact, translate: `0px ${interpolate(fact, [0, 1], [60, 0])}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Tag label={props.factTag} color={c.safe} filled ink={c.bg} />
          <Icon name="check" size={56} color={c.safe} />
        </div>
        <div style={{ ...bodyStyle(52), color: c.text }}>{props.fact}</div>
      </div>
    </div>
  );
};
```

`template/src/blocks/Close.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AccentText } from "../frame/AccentText";
import { usePalette, useTalent } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, STAGGER, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

// Fractions of a 135-frame reference beat.
const ACTIONS_AT = 30 / 135;
const BRAND_AT = 45 / 135;
const CONTACT_AT = 60 / 135;
const TEASER_AT = 75 / 135;
const BOUNCE_FRAMES = 16;

export const Close: BlockComponent<"Close"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const talent = useTalent();
  const { at } = timing;
  const head = enter(frame, fps, 0);
  const brand = enter(frame, fps, at(BRAND_AT));
  const contact = enter(frame, fps, at(CONTACT_AT));
  const teaser = enter(frame, fps, at(TEASER_AT));
  const { instagram, tiktok, whatsapp, facebook } = talent.handles;
  const contacts = [instagram, tiktok, whatsapp ? `WhatsApp ${whatsapp}` : "", facebook].filter(Boolean);

  // No fade-out: the end of the close holds a static frame so the loop is clean.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ opacity: head, translate: `0px ${interpolate(head, [0, 1], [30, 0])}px` }}>
        <div style={{ ...headStyle(80), color: c.text, whiteSpace: "nowrap" }}>{props.line1}</div>
        <div
          style={{
            ...headStyle(80),
            color: c.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            whiteSpace: "nowrap",
          }}
        >
          <span>
            <AccentText value={props.line2} accentStyle={{ fontSize: 140, lineHeight: 1 }} />
          </span>
          {props.accentIcon ? <Icon name={props.accentIcon} size={92} color={c.accent} accent={c.safe} /> : null}
        </div>
      </div>
      {props.actions.length ? (
        <div style={{ display: "flex", gap: 60, marginTop: 6 }}>
          {props.actions.map((name, i) => {
            const start = at(ACTIONS_AT) + i * STAGGER;
            const p = pop(frame, fps, start);
            const bounce = interpolate(frame, [start + 6, start + 6 + BOUNCE_FRAMES], [0, Math.PI], CLAMP);
            return (
              <Icon
                key={name}
                name={name}
                size={92}
                color={c.text}
                style={{
                  opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                  scale: interpolate(p, [0, 1], [0.3, 1]),
                  translate: `0px ${-24 * Math.sin(bounce)}px`,
                }}
              />
            );
          })}
        </div>
      ) : null}
      <div style={{ marginTop: 26, opacity: brand, translate: `0px ${interpolate(brand, [0, 1], [24, 0])}px` }}>
        <div style={{ ...headStyle(72), color: c.text }}>{talent.displayName}</div>
        <div style={{ ...bodyStyle(44), color: c.text, opacity: 0.85, whiteSpace: "nowrap" }}>
          {talent.profession} · {talent.city}
        </div>
      </div>
      {contacts.length ? (
        <div
          style={{
            ...bodyStyle(44),
            color: c.accent,
            marginTop: 16,
            whiteSpace: "nowrap",
            opacity: contact,
            translate: `0px ${interpolate(contact, [0, 1], [24, 0])}px`,
          }}
        >
          {contacts.join(" · ")}
        </div>
      ) : null}
      {props.teaser ? (
        <div
          style={{
            ...bodyStyle(40),
            color: c.text,
            marginTop: 18,
            padding: "6px 26px",
            borderRadius: 999,
            border: `3px solid ${c.text}`,
            whiteSpace: "nowrap",
            opacity: teaser,
            scale: interpolate(teaser, [0, 1], [0.85, 1]),
          }}
        >
          {props.teaser}
        </div>
      ) : null}
    </div>
  );
};
```

`template/src/blocks/schemas.ts` becomes:
```ts
import { bigStatSchema } from "./BigStat.schema";
import { checklistSchema } from "./Checklist.schema";
import { chipsSchema } from "./Chips.schema";
import { closeSchema } from "./Close.schema";
import { compareSchema } from "./Compare.schema";
import { doDontSchema } from "./DoDont.schema";
import { hookSchema } from "./Hook.schema";
import { mythFactSchema } from "./MythFact.schema";
import { quantitySchema } from "./Quantity.schema";
import { timerSchema } from "./Timer.schema";

// Node-safe: schemas only, no components. Each block task adds its entry here.
export const BLOCK_SCHEMAS = {
  BigStat: bigStatSchema,
  Checklist: checklistSchema,
  Chips: chipsSchema,
  Close: closeSchema,
  Compare: compareSchema,
  DoDont: doDontSchema,
  Hook: hookSchema,
  MythFact: mythFactSchema,
  Quantity: quantitySchema,
  Timer: timerSchema,
} as const;

export type BlockName = keyof typeof BLOCK_SCHEMAS;

export const isBlockName = (name: string): name is BlockName =>
  Object.prototype.hasOwnProperty.call(BLOCK_SCHEMAS, name);
```

`template/src/blocks/registry.tsx` becomes:
```tsx
import { BigStat } from "./BigStat";
import { Checklist } from "./Checklist";
import { Chips } from "./Chips";
import { Close } from "./Close";
import { Compare } from "./Compare";
import { DoDont } from "./DoDont";
import { Hook } from "./Hook";
import { MythFact } from "./MythFact";
import { Quantity } from "./Quantity";
import { Timer } from "./Timer";
import type { BlockName } from "./schemas";
import type { BlockComponent } from "./types";

// Each block task adds its component here, matching BLOCK_SCHEMAS.
export const BLOCKS: { [K in BlockName]: BlockComponent<K> } = {
  BigStat,
  Checklist,
  Chips,
  Close,
  Compare,
  DoDont,
  Hook,
  MythFact,
  Quantity,
  Timer,
};
```

Finish the smoke example. In `template/examples/smoke/episode.json`, replace `step1` beats and `close`:
```json
"step1": {
  "title": { "text": "¿MITO o realidad?", "accent": "MITO" },
  "beats": [
    {
      "block": "MythFact",
      "props": {
        "myth": "Dejarlo enchufado toda la noche lo explota",
        "fact": "El cargador corta la corriente al llegar al 100 % (dato de ejemplo)"
      }
    }
  ]
},
```
```json
"close": {
  "beats": [
    {
      "block": "Close",
      "props": {
        "line1": "Guárdalo y compártelo",
        "line2": { "text": "antes de dormir", "accent": "dormir" },
        "accentIcon": "clock",
        "teaser": "Próximo: cables baratos"
      }
    }
  ]
}
```
Also set `"handles": { "instagram": "@reelkit.prueba" }` in `template/examples/smoke/talent.json` so the contact row is exercised.

- [ ] **Step 4: Run tests and the check**

Run:
```bash
cd template
npx vitest run && npm run lint
npm run check -- examples/smoke
```
Expected: all tests PASS (registry lists 10 blocks); lint exit 0; the check passes both layouts. Open the step1 and close frames it lists: the myth card struck through with a red X above the fact card; the close with "dormir" large in accent color, the clock icon, two action icons, "Equipo reelkit", "Plantilla de prueba · Manizales", "@reelkit.prueba" and the teaser chip.

- [ ] **Step 5: Commit**

```bash
git add template/src/blocks template/tests template/examples/smoke
git commit -m "feat(blocks): MythFact and Close; complete the smoke example"
```

---

### Task 16: Dani reference episode and parity check

**Files:**
- Create: `template/examples/dani-chocolate/episode.json`, `template/examples/dani-chocolate/talent.json`, `template/scripts/parity-sheet.mjs`
- Modify: `template/package.json` (`dev` script → `examples/dani-chocolate`)

**Interfaces:**
- Consumes: all 10 core blocks.
- Produces: the reference episode used by Plan 2–4 tests and by `npm run dev`; `node scripts/parity-sheet.mjs <dirA> <dirB> <out.png>` builds a side-by-side contact sheet of same-named PNGs.

- [ ] **Step 1: Write the reference episode**

`template/examples/dani-chocolate/talent.json`:
```json
{
  "id": "dani",
  "displayName": "Dogtora Dani",
  "pillName": "Dogtora Dani",
  "profession": "Médica veterinaria",
  "city": "Manizales",
  "country": "CO",
  "locale": "es-CO",
  "colors": {
    "bg": "#1A1023",
    "bg2": "#2A1838",
    "accent": "#FF7A1A",
    "text": "#FFF3E0",
    "danger": "#FF4D4D",
    "safe": "#3DDC97",
    "extra": { "chocoWhite": "#F3E3C7", "chocoMilk": "#A8693D", "chocoSemi": "#6B3F23", "chocoDark": "#3B2114" }
  },
  "disclaimer": ["Contenido educativo.", "No reemplaza la consulta veterinaria."]
}
```

`template/examples/dani-chocolate/episode.json`:
```json
{
  "schemaVersion": 1,
  "talent": "dani",
  "slug": "2026-10-chocolate",
  "durationSeconds": 30,
  "stage": "built",
  "frame": { "steps": ["CUÁNDO", "CÓMO", "CUÁNTO"] },
  "script": [
    "¿Tu perro se comió un chocolate? Mira esto.",
    "¿Cuándo preocuparte? Entre más oscuro, más tóxico. Y los síntomas pueden tardar hasta doce horas.",
    "¿Cómo actuar? Ni leche ni hacerlo vomitar por tu cuenta. Guarda el empaque y llama a tu veterinaria.",
    "¿Cuánto? Perro de cinco kilos: cuarenta y cinco gramos de chocolate de leche, o apenas siete del amargo, ya dan síntomas.",
    "Soy Dogtora Dani. Compártelo antes del treinta y uno."
  ],
  "sceneStarts": null,
  "scenes": {
    "hook": {
      "beats": [
        {
          "block": "Hook",
          "props": {
            "line1": "¿Tu perro se comió",
            "line2": "UN CHOCOLATE?",
            "chip": "Halloween · guía de 30 segundos",
            "hero": { "animation": "bites", "color": "chocoMilk" },
            "stamp": "paw"
          }
        }
      ]
    },
    "step1": {
      "title": { "text": "¿CUÁNDO preocuparte?", "accent": "CUÁNDO" },
      "beats": [
        {
          "block": "Compare",
          "props": {
            "items": [
              { "label": "Blanco", "color": "chocoWhite" },
              { "label": "De leche", "color": "chocoMilk" },
              { "label": "Semiamargo", "color": "chocoSemi" },
              { "label": "Amargo", "color": "chocoDark" }
            ],
            "conclusion": { "text": "Más oscuro = más tóxico", "accent": "más tóxico", "tone": "danger" }
          }
        },
        {
          "block": "Timer",
          "props": {
            "low": 6,
            "high": 12,
            "unit": "h",
            "caption": "Los síntomas\npueden tardar",
            "chips": [
              { "icon": "vomit", "label": "Vómito" },
              { "icon": "panting", "label": "Inquietud y jadeo" },
              { "icon": "tremor", "label": "Temblores" }
            ]
          }
        }
      ]
    },
    "step2": {
      "title": { "text": "¿CÓMO actuar?", "accent": "CÓMO" },
      "beats": [
        {
          "block": "DoDont",
          "props": {
            "cards": [
              { "icon": "milk", "label": "Leche", "verdict": "no" },
              { "icon": "spoonDrop", "label": "Hacerlo vomitar por tu cuenta", "verdict": "no" }
            ]
          }
        },
        {
          "block": "Checklist",
          "props": {
            "rows": ["Guarda el empaque", "Calcula cuánto comió y a qué hora", "Llama a tu veterinaria"],
            "pill": "Las primeras 2 horas cuentan"
          }
        }
      ]
    },
    "step3": {
      "title": { "text": "¿CUÁNTO es peligroso?", "accent": "CUÁNTO" },
      "beats": [
        {
          "block": "Quantity",
          "props": {
            "chip": { "icon": "dog", "label": "Ejemplo: perro de 5 kg" },
            "unit": "g",
            "approx": true,
            "rows": [
              { "label": "De leche", "value": 45, "color": "chocoMilk" },
              { "label": "Semiamargo", "value": 20, "color": "chocoSemi" },
              { "label": "Amargo (100 % cacao)", "value": 7, "color": "chocoDark", "outline": "danger" }
            ],
            "highlight": "last",
            "conclusion": "Con esto ya hay síntomas",
            "footnote": "Dosis orientativa. Cada perro es distinto: ante la duda, llama."
          }
        }
      ]
    },
    "close": {
      "beats": [
        {
          "block": "Close",
          "props": {
            "line1": "Guárdalo y compártelo",
            "line2": { "text": "antes del 31", "accent": "31" },
            "accentIcon": "pumpkin"
          }
        }
      ]
    }
  },
  "facts": [
    { "claim": "Signos leves desde ≈ 20 mg/kg de metilxantinas", "source": "Merck Veterinary Manual, Chocolate Toxicosis in Animals, Feb 2026" },
    { "claim": "≈ 45 g leche · ≈ 20 g semiamargo · ≈ 7 g amargo para un perro de 5 kg", "source": "Merck Veterinary Manual, Feb 2026 (2,3 / 5,3–5,6 / 15,5 mg/g)" },
    { "claim": "Síntomas a las 6–12 h", "source": "Merck Veterinary Manual, Feb 2026" }
  ],
  "coverFrame": 60
}
```

In `template/package.json` change the `dev` script to:
```json
"dev": "remotion studio --public-dir examples/dani-chocolate",
```

- [ ] **Step 2: Run tests and the check**

Run: `cd template && npx vitest run && npm run check -- examples/dani-chocolate`
Expected: `examples.test.ts` PASS for both examples; check `✓ 9x16 … 900 frames` and `✓ 4x5 … 900 frames`, exit 0. Note any fit warnings (expected at 4:5 for step3, which is the tallest scene; it must stay ≥ 0.80 and readable).

- [ ] **Step 3: Write the parity sheet script**

`template/scripts/parity-sheet.mjs`:
```js
#!/usr/bin/env node
// Usage: node scripts/parity-sheet.mjs <dirA> <dirB> <out.png>
// Places same-named PNGs from dirA (left) and dirB (right) side by side, one pair per row, at 1/4 scale.
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const [dirA, dirB, out] = process.argv.slice(2);
if (!dirA || !dirB || !out) {
  console.error("Usage: node scripts/parity-sheet.mjs <dirA> <dirB> <out.png>");
  process.exit(1);
}
const SCALE = 4;
const names = fs.readdirSync(dirA).filter((f) => f.endsWith(".png") && fs.existsSync(path.join(dirB, f))).sort();
const read = (file) => PNG.sync.read(fs.readFileSync(file));
const pairs = names.map((n) => [read(path.join(dirA, n)), read(path.join(dirB, n))]);
const cellW = Math.ceil(pairs[0][0].width / SCALE);
const cellH = Math.ceil(pairs[0][0].height / SCALE);
const sheet = new PNG({ width: cellW * 2, height: cellH * pairs.length });
pairs.forEach((pair, row) => {
  pair.forEach((img, col) => {
    for (let y = 0; y < cellH; y++) {
      for (let x = 0; x < cellW; x++) {
        const src = ((y * SCALE) * img.width + x * SCALE) * 4;
        const dst = ((row * cellH + y) * sheet.width + col * cellW + x) * 4;
        img.data.copy(sheet.data, dst, src, src + 4);
      }
    }
  });
});
fs.writeFileSync(out, PNG.sync.write(sheet));
console.log(`Wrote ${out} (${names.join(", ")})`);
```

- [ ] **Step 4: Compare with the hand-built original (when available)**

Run:
```bash
cd template
mkdir -p out/parity/new out/parity/old
for f in 0 170 280 400 500 740 899; do
  npx remotion still Episode out/parity/new/f$f.png --public-dir examples/dani-chocolate --frame=$f --log=error
done
if [ -d /Volumes/Developer/my-video/src/dani ]; then
  for f in 0 170 280 400 500 740 899; do
    (cd /Volumes/Developer/my-video && npx remotion still DaniChocolateHalloween "$OLDPWD/out/parity/old/f$f.png" --frame=$f --log=error)
  done
  node scripts/parity-sheet.mjs out/parity/old out/parity/new out/parity/sheet.png
fi
```
Expected: `out/parity/sheet.png` with the original on the left and the rebuild on the right. Judge by eye: same layout, copy, colors and animation state on every row. Known acceptable differences: Beat B of CÓMO enters with the shared slide instead of a scale-down; Quantity bar timing is evenly spaced. If `/Volumes/Developer/my-video` is absent, open `out/parity/new/*.png` and check them against the brief's scene descriptions instead.

- [ ] **Step 5: Render the reference video once**

Run: `cd template && npx remotion render Episode out/dani-chocolate-9x16.mp4 --public-dir examples/dani-chocolate --codec=h264 --log=error && npx remotion render Episode45 out/dani-chocolate-4x5.mp4 --public-dir examples/dani-chocolate --codec=h264 --log=error`
Expected: both files render without errors; watch them once end to end.

- [ ] **Step 6: Commit**

```bash
git add template/examples/dani-chocolate template/scripts/parity-sheet.mjs template/package.json
git commit -m "feat(template): Dani chocolate reference episode rebuilt from blocks"
```

---

## Self-review notes (resolved)

- **Spec refinement:** the spec lists `title` among several block props; here the title lives on the scene (`scene.title`) so it persists across a scene's two beats, as in the reference video. The spec's `hook: { block, props }` shorthand is normalized to `hook: { beats: [...] }` so every scene has one shape.
- **Spec correction:** the close's default share is 15 % (135/900), matching the reference, not 16 %.
- **Deferred to later plans by design:** the explainer blocks, ~100 icons, diagrams, `BlockGallery` and `check --gallery` (Plan 2); `captionsProvisional`, `stage` transitions, transcription, alignment and exports (Plan 3); plugin commands, skills, agent, CI and README (Plan 4).
