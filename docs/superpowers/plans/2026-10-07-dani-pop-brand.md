# Consultorio Pop brand (Dogtora Dani) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every reelkit video in the "Consultorio Pop" brand: stickers, squash-and-stretch motion, a giant-paw flood between scenes, subtle synthesized sound effects, and a close with social-network icons.

**Architecture:** A new `template/src/brand/` layer holds tokens, sticker styles, motion presets, the scene flood and the SFX runtime. All of it is node-safe except the `.tsx` components. Each block keeps its component, and a new node-safe `<Block>.cues.ts` file owns both the keyframe constants and the pure `cues()` function, so picture and sound share one source of truth. `SceneRenderer` plays the cues; blocks never render audio themselves. SFX WAVs are generated deterministically by a script, committed, and imported as bundled assets.

**Tech Stack:** Remotion 4.0.532 (`remotion`, `@remotion/media`), React 19, zod 4, vitest 3, tsx, `@fontsource/fredoka` + `@fontsource/nunito` 5.3.0.

**Spec:** `docs/superpowers/specs/2026-10-07-dani-pop-brand-design.md`

All paths below are relative to `template/` unless they start with `docs/`, `skills/`, `commands/` or `README.md` (plugin root). Run every command from `template/`.

## Global Constraints

- Node ≥ 20. Dependencies are pinned to exact versions (no `^`). New fonts: `@fontsource/fredoka@5.3.0` and `@fontsource/nunito@5.3.0`. Remove `@fontsource/baloo-2` and `@fontsource/inter`.
- Renders never touch the network: fonts and SFX are bundled imports.
- Sizes are at 1080 px canvas width.
- Colors:
  - ink `#2B1B3D`; sticker fill `#FFFFFF`; highlight `#FFC93C`; text on colored stickers `#FFFFFF`.
  - Scene backgrounds: hook `#FFF4E6`, step 1 `#FFE0D6`, step 2 `#D3F2EE`, step 3 `#FFF0C2`, close `#FF6B57`.
- Sticker: 6 px ink border, 10 px hard ink shadow (no blur), 36 px radius, −3° tilt.
- Flood: starts 6 frames before each scene cut and grows for 14 frames (ease-out cubic) from a top corner (alternating left/right). It is a `PawShape` rotated from ±15° off toward its rest angle and plays `whoosh`.
- SFX: 7 sounds `whoosh pop boing ding chime bonk tick`.
  - Mono, 48 kHz, peak −3 dBFS.
  - Durations 0.4 / 0.06 / 0.3 / 0.5 / 0.45 / 0.2 / 0.025 s.
  - Master gain 0.18; `tick` at half gain.
  - Same-name cues closer than 4 frames merge into one.
  - Off in `checkMode` and when `episode.sfx === false` (schema default `true`).
- Close socials: order Instagram, TikTok, WhatsApp, Facebook. Only non-empty handles are shown. Official colors `#D62976`, `#111111`, `#25D366`, `#1877F2`.
- Must stay green: `npm test`, `npm run lint`, `npm run check` (9x16 + 4x5, three examples), `npm run check:gallery`, and plugin root `node --test scripts/tests/*.test.mjs`.
- User-facing text in the video stays Spanish. Code, comments and commits are English, matching the repo.

### Decisions this plan adds to the spec (flag them in review)

1. **The brand owns `bg`, `bg2` and `text`.** `applyBrand(palette)` replaces them with cream / white / ink before any `PaletteContext.Provider`. The talent keeps `accent`, `danger`, `safe` and `extra`. Without this, existing dark talents (`examples/smoke`, users' studios) would render cream text on white stickers.
2. **The talent slot gets a white sticker "mat" that fills its keep-out ring** (`slotClearance`, 16 px). `npm run check` fails when any pixel inside the keep-out changes after frame 12, and the flood changes the background color behind it. The mat keeps that ring constant and reads as the sticker's white margin.
3. **Cues live in `<Block>.cues.ts` and are played centrally by `SceneRenderer`.** The spec said each block renders `<SfxCues>`. Centralizing it is equivalent and keeps blocks free of audio code.

## Review Focus

1. **A talent with the old dark palette** (smoke example, any user's existing `talents/*.json`) must still render readable ink-on-white. *Test:* Task 1 `applyBrand` overrides `bg/bg2/text` and keeps `accent/danger/safe/extra`.
2. **A talent with no social handles** must get a close without the contacts group and without `boing` cues. *Test:* Task 8, empty handles → no contacts and no `boing`.
3. **A 15 s episode with 30-frame scenes:** flood windows never overlap, and every `whoosh` lands inside the video. *Test:* Task 5, minimum-gap starts.
4. **A long list in a short beat** (8 chips where the stagger drops under 4 frames) must not machine-gun ticks. *Test:* Task 12, Chips cues pass through `mergeCues` and stay ≥ 4 frames apart.
5. **The 4x5 layout:** the flood must fully cover the 1080×1350 canvas, and the slot mat must cover the 4x5 keep-out. *Test:* Task 5 coverage for both canvases. Task 6 runs `npm run check` for both layouts.

---

## File structure

**Create**
- `src/brand/tokens.ts`: brand constants, `applyBrand`, `inkShadow`.
- `src/brand/sticker.ts`: `StickerTone`, `stickerColors`, `stickerStyle` (pure).
- `src/brand/Sticker.tsx`: `<Sticker>` component.
- `src/brand/motion.ts`: `slap`, `drop`, `wiggleDeg`, `wiggle`, `popIn`, `jelly`.
- `src/brand/sfx.ts`: SFX names, durations, `Cue`, `mergeCues`, `activeCues`, gains (node-safe).
- `src/brand/sfx-files.ts`: WAV imports (bundler only).
- `src/brand/Sfx.tsx`: `SfxContext`, `<SfxCues>`.
- `src/brand/flood.ts`: `floodAt`, `floodScale`, `floodCues`, constants (pure).
- `src/brand/sfx/*.wav`: 7 generated files (committed).
- `scripts/lib/sfx-synth.ts`: deterministic synthesizer and WAV encoder.
- `scripts/sfx-build.ts`: writes the WAVs.
- `src/blocks/cue-types.ts`: `CueFn<K>`.
- `src/blocks/cues.ts`: `BLOCK_CUES` registry and `cuesFor`.
- `src/blocks/<Block>.cues.ts` ×20: keyframe constants and cue function per block.
- `src/icons/sets/social.tsx`: 4 social icons and `SOCIAL_COLORS`.
- Tests: `tests/brand/{tokens,motion,sfx,flood,samples}.ts(x)`, `tests/brand/cues/*.test.ts`, `tests/scripts/sfx-synth.test.ts`.

**Modify**
- `package.json`: fonts, `sfx:build` script, version.
- `src/assets.d.ts`: `*.wav`.
- `src/frame/theme.ts`: Fredoka/Nunito and `WEIGHT_CAPTION`.
- `src/frame/{Background,TalentSlot,StepTracker,Captions}.tsx`.
- `src/compositions/{EpisodeVideo,BlockPreview,BlockGallery,SceneRenderer,IconSheet}.tsx`.
- `src/episode/schema.ts`: `sfx`.
- `src/icons/{names.ts,index.tsx}`.
- `src/blocks/parts/{Chip,QuantityBars}.tsx`.
- All 20 `src/blocks/<Block>.tsx`.
- `examples/*/talent.json`.
- `tests/icons.test.ts`.
- Docs: `skills/episode-authoring/SKILL.md`, `commands/setup.md`, `README.md`.

---

### Task 1: Brand tokens, fonts, and brand-owned surfaces

**Files:**
- Create: `src/brand/tokens.ts`, `src/brand/sticker.ts`, `tests/brand/tokens.test.ts`
- Modify: `package.json`, `src/frame/theme.ts`, `src/compositions/EpisodeVideo.tsx`, `src/compositions/BlockPreview.tsx`, `src/compositions/BlockGallery.tsx`, `src/compositions/IconSheet.tsx`, `examples/dani-chocolate/talent.json`, `examples/dani-fiebre/talent.json`

**Interfaces:**
- Produces:
  - `INK`, `STICKER_FILL`, `HIGHLIGHT`, `ON_COLOR` (strings);
  - `SCENE_BG: readonly [string, string, string, string, string]`;
  - `BORDER = 6`, `SHADOW = 10`, `RADIUS = 36`, `TILT = -3`;
  - `applyBrand(p: Palette): Palette`;
  - `inkShadow(px: number, c: Palette): string`;
  - `type StickerTone = "white" | "accent" | "danger" | "safe" | "ink"`;
  - `stickerColors(tone, c): { background: string; color: string }`;
  - `stickerStyle(c, opts?: { tone?; radius?; border?; shadow?; fill?; borderColor? }): React.CSSProperties`;
  - `WEIGHT_HEAD = 700`, `WEIGHT_BODY = 800`, `WEIGHT_CAPTION = 900`.

- [ ] **Step 1: Write the failing test**

`tests/brand/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { INK, SCENE_BG, STICKER_FILL, applyBrand, inkShadow } from "../../src/brand/tokens";
import { stickerColors, stickerStyle } from "../../src/brand/sticker";
import { DANI_TALENT } from "../fixtures";
import type { Palette } from "../../src/episode/talent";

const dark = DANI_TALENT.colors as Palette;

describe("applyBrand", () => {
  it("replaces the surfaces with the brand's cream, white and ink", () => {
    const p = applyBrand(dark);
    expect([p.bg, p.bg2, p.text]).toEqual([SCENE_BG[0], STICKER_FILL, INK]);
  });
  it("keeps the talent's accent, danger, safe and extra colors", () => {
    const p = applyBrand(dark);
    expect([p.accent, p.danger, p.safe]).toEqual([dark.accent, dark.danger, dark.safe]);
    expect(p.extra).toEqual(dark.extra);
  });
});

describe("stickers", () => {
  const c = applyBrand(dark);
  it("white stickers carry ink text, colored ones white text", () => {
    expect(stickerColors("white", c)).toEqual({ background: STICKER_FILL, color: INK });
    expect(stickerColors("accent", c)).toEqual({ background: c.accent, color: "#FFFFFF" });
    expect(stickerColors("ink", c)).toEqual({ background: INK, color: "#FFFFFF" });
  });
  it("has the 6 px ink border and the 10 px hard shadow by default", () => {
    const s = stickerStyle(c);
    expect(s.border).toBe(`6px solid ${INK}`);
    expect(s.boxShadow).toBe(`10px 10px 0 ${INK}`);
    expect(s.borderRadius).toBe(36);
  });
  it("lets a block override fill, border color and sizes", () => {
    const s = stickerStyle(c, { fill: "#123456", borderColor: "#ABCDEF", border: 4, shadow: 5, radius: 999 });
    expect(s.backgroundColor).toBe("#123456");
    expect(s.border).toBe("4px solid #ABCDEF");
    expect(s.boxShadow).toBe(`5px 5px 0 ${INK}`);
  });
  it("draws hard ink text shadows", () => {
    expect(inkShadow(4, c)).toBe(`4px 4px 0 ${INK}`);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/brand/tokens.test.ts`
Expected: FAIL, `Cannot find module '../../src/brand/tokens'`.

- [ ] **Step 3: Implement tokens and sticker styles**

`src/brand/tokens.ts`:

```ts
import type { Palette } from "../episode/talent";

// "Consultorio Pop": the brand owns the surfaces; talents bring accent, danger, safe and extras.
export const INK = "#2B1B3D";
export const STICKER_FILL = "#FFFFFF";
export const HIGHLIGHT = "#FFC93C";
/** Text on accent, danger, safe and ink stickers. */
export const ON_COLOR = "#FFFFFF";
/** Background per scene: hook, step 1, step 2, step 3, close. */
export const SCENE_BG = ["#FFF4E6", "#FFE0D6", "#D3F2EE", "#FFF0C2", "#FF6B57"] as const;

export const BORDER = 6;
export const SHADOW = 10;
export const RADIUS = 36;
export const TILT = -3;

/** The palette every frame and block sees: brand surfaces, talent colors for meaning. */
export const applyBrand = (palette: Palette): Palette => ({
  ...palette,
  bg: SCENE_BG[0],
  bg2: STICKER_FILL,
  text: INK,
});

export const inkShadow = (px: number, c: Palette) => `${px}px ${px}px 0 ${c.text}`;
```

`src/brand/sticker.ts`:

```ts
import type { Palette } from "../episode/talent";
import { BORDER, ON_COLOR, RADIUS, SHADOW, STICKER_FILL } from "./tokens";

export type StickerTone = "white" | "accent" | "danger" | "safe" | "ink";

export const stickerColors = (tone: StickerTone, c: Palette): { background: string; color: string } => {
  switch (tone) {
    case "white":
      return { background: STICKER_FILL, color: c.text };
    case "accent":
      return { background: c.accent, color: ON_COLOR };
    case "danger":
      return { background: c.danger, color: ON_COLOR };
    case "safe":
      return { background: c.safe, color: ON_COLOR };
    case "ink":
      return { background: c.text, color: ON_COLOR };
  }
};

export type StickerOptions = {
  readonly tone?: StickerTone;
  readonly radius?: number;
  readonly border?: number;
  readonly shadow?: number;
  /** Overrides the tone's fill (e.g. a Compare swatch color). */
  readonly fill?: string;
  /** Overrides the ink border (e.g. a Decision outcome's tone). */
  readonly borderColor?: string;
};

/** Surface of a sticker: fill, ink border, hard ink shadow. Spread into a block's style. */
export const stickerStyle = (c: Palette, opts: StickerOptions = {}): React.CSSProperties => {
  const { tone = "white", radius = RADIUS, border = BORDER, shadow = SHADOW, fill, borderColor } = opts;
  const colors = stickerColors(tone, c);
  return {
    backgroundColor: fill ?? colors.background,
    color: colors.color,
    border: `${border}px solid ${borderColor ?? c.text}`,
    borderRadius: radius,
    boxShadow: `${shadow}px ${shadow}px 0 ${c.text}`,
    boxSizing: "border-box",
  };
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/brand/tokens.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Swap the fonts**

1. Install the fonts and remove the old ones:

   ```bash
   npm install --save-exact @fontsource/fredoka@5.3.0 @fontsource/nunito@5.3.0
   npm uninstall @fontsource/baloo-2 @fontsource/inter
   ls node_modules/@fontsource/fredoka/files | grep -E "latin(-ext)?-700-normal.woff2"
   ls node_modules/@fontsource/nunito/files | grep -E "latin(-ext)?-(800|900)-normal.woff2"
   grep -rn "baloo\|fontsource/inter" src scripts
   ```

   Expected: two Fredoka files, four Nunito files, and no remaining Baloo/Inter imports outside `theme.ts`.
2. Compare the `unicode-range` of the `latin` and `latin-ext` blocks in `node_modules/@fontsource/fredoka/700.css` and `node_modules/@fontsource/nunito/800.css` with `RANGE_LATIN` / `RANGE_LATIN_EXT` in `src/frame/theme.ts`. If they differ, copy the ranges from the Nunito CSS (it is the body and caption face).
3. In `src/frame/theme.ts`, replace the font imports, names, weights and `fontsLoaded`:

   ```ts
   import fredokaLatin from "@fontsource/fredoka/files/fredoka-latin-700-normal.woff2";
   import fredokaLatinExt from "@fontsource/fredoka/files/fredoka-latin-ext-700-normal.woff2";
   import nunitoLatin800 from "@fontsource/nunito/files/nunito-latin-800-normal.woff2";
   import nunitoLatinExt800 from "@fontsource/nunito/files/nunito-latin-ext-800-normal.woff2";
   import nunitoLatin900 from "@fontsource/nunito/files/nunito-latin-900-normal.woff2";
   import nunitoLatinExt900 from "@fontsource/nunito/files/nunito-latin-ext-900-normal.woff2";

   const HEAD_NAME = "Fredoka";
   const BODY_NAME = "Nunito";
   // Quoted so a family name with a digit or space stays valid CSS.
   export const FONT_HEAD = `"${HEAD_NAME}"`;
   export const FONT_BODY = `"${BODY_NAME}"`;
   ```

   ```ts
   const fontsLoaded: Promise<void> = Promise.all([
     face(HEAD_NAME, fredokaLatin, "700", RANGE_LATIN),
     face(HEAD_NAME, fredokaLatinExt, "700", RANGE_LATIN_EXT),
     face(BODY_NAME, nunitoLatin800, "800", RANGE_LATIN),
     face(BODY_NAME, nunitoLatinExt800, "800", RANGE_LATIN_EXT),
     face(BODY_NAME, nunitoLatin900, "900", RANGE_LATIN),
     face(BODY_NAME, nunitoLatinExt900, "900", RANGE_LATIN_EXT),
   ]).then(() => undefined);
   ```

   ```ts
   export const WEIGHT_HEAD = 700;
   export const WEIGHT_BODY = 800;
   /** Captions: the heaviest Nunito, so a word reads at a glance. */
   export const WEIGHT_CAPTION = 900;
   ```

   Update the comment above the ranges to say "from the matching @fontsource CSS".

- [ ] **Step 6: Apply the brand palette where the palette is provided**

1. `src/compositions/EpisodeVideo.tsx`: import `useMemo` from `react` and `applyBrand` from `../brand/tokens`.
   - After the props guard, add `const palette = useMemo(() => applyBrand(talent.colors), [talent.colors]);`.
   - Because hooks cannot follow the early `throw`, write it as `const palette = useMemo(() => (talent ? applyBrand(talent.colors) : null), [talent]);` **above** the guard.
   - Use `palette!` in the provider: `<PaletteContext.Provider value={palette!}>` (the guard guarantees it).
2. `src/compositions/BlockPreview.tsx` and `src/compositions/BlockGallery.tsx`: same change. `BlockGallery` already uses `useMemo`.
3. In `BlockGallery`, the sample label uses `talent.colors.text`. Change it to `INK` (import from `../brand/tokens`).
4. `src/compositions/IconSheet.tsx`: change `BG` to `"#FFF4E6"`, `FG` to `"#2B1B3D"` and `ACCENT` to `"#FF6B57"`, so the sheet previews icons on the brand's surface.

- [ ] **Step 7: Give Dani's example profiles the brand colors**

In `examples/dani-chocolate/talent.json` and `examples/dani-fiebre/talent.json`, set `colors` to the following. Keep any other `extra` keys the file already has; `dani-chocolate` has the `choco*` ones.

```json
"colors": {
  "bg": "#FFF4E6",
  "bg2": "#FFFFFF",
  "accent": "#FF6B57",
  "text": "#2B1B3D",
  "danger": "#E5484D",
  "safe": "#2FBF71",
  "extra": { "teal": "#2EC4B6", "sun": "#FFC93C", "chocoWhite": "#F3E3C7", "chocoMilk": "#A8693D", "chocoSemi": "#6B3F23", "chocoDark": "#3B2114" }
}
```

Leave `examples/smoke/talent.json` dark on purpose. It is the regression case for Review Focus 1.

- [ ] **Step 8: Verify and commit**

Run: `npm test && npm run lint`
Expected: all tests pass, and the linter and `tsc` are clean.

Run `npm run check -- examples/dani-chocolate --layouts=9x16`. Expected: `✓ 9x16 … slot clear`. Fit or text-size warnings are fine; Task 6 and the block tasks handle them.

```bash
git add package.json package-lock.json src/brand src/frame/theme.ts src/compositions examples tests/brand
git commit -m "feat(brand): Consultorio Pop tokens, sticker styles and Fredoka/Nunito; brand owns bg, bg2 and text"
```

---

### Task 2: Motion presets and the `<Sticker>` component

**Files:**
- Create: `src/brand/motion.ts`, `src/brand/Sticker.tsx`, `tests/brand/motion.test.ts`

**Interfaces:**
- Consumes: `TILT`, `stickerStyle`, `StickerTone` (Task 1).
- Produces:
  - `type Motion = Pick<React.CSSProperties, "opacity" | "scale" | "rotate" | "translate" | "transformOrigin">`;
  - `slap(frame, fps, at, tilt?) → Motion`;
  - `drop(frame, fps, at, distance?) → Motion`;
  - `wiggleDeg(frame, at, amp?) → number`;
  - `wiggle(frame, at, amp?) → Motion`;
  - `popIn(frame, fps, at) → Motion`;
  - `jelly(frame, at) → Motion`;
  - `WIGGLE_FRAMES = 18`, `JELLY_FRAMES = 16`;
  - `<Sticker tone? tilt? padding? radius? border? shadow? fill? style?>`.

- [ ] **Step 1: Write the failing test**

`tests/brand/motion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { JELLY_FRAMES, WIGGLE_FRAMES, drop, jelly, popIn, slap, wiggle, wiggleDeg } from "../../src/brand/motion";

const scaleOf = (s: unknown): [number, number] => {
  const [x, y = x] = String(s).split(" ").map(Number);
  return [x, y];
};
const deg = (r: unknown) => Number(String(r).replace("deg", ""));
const FPS = 30;

describe("slap", () => {
  it("is hidden before it starts", () => {
    expect(slap(9, FPS, 10).opacity).toBe(0);
  });
  it("squashes on the way in (wider than tall)", () => {
    const [x, y] = scaleOf(slap(13, FPS, 10).scale);
    expect(x).toBeGreaterThan(y);
  });
  it("settles at full size on its tilt", () => {
    const m = slap(70, FPS, 10, -3);
    const [x, y] = scaleOf(m.scale);
    expect(x).toBeCloseTo(1, 2);
    expect(y).toBeCloseTo(1, 2);
    expect(deg(m.rotate)).toBeCloseTo(-3, 1);
  });
});

describe("drop", () => {
  it("starts above and lands at 0", () => {
    expect(drop(0, FPS, 0, 260).translate).toBe("0px -260px");
    expect(drop(80, FPS, 0, 260).translate).toBe("0px 0px");
  });
  it("never goes below the ground; the overshoot becomes squash", () => {
    for (let f = 0; f < 60; f++) {
      const m = drop(f, FPS, 0, 260);
      const y = Number(String(m.translate).split(" ")[1].replace("px", ""));
      expect(y).toBeLessThanOrEqual(0);
      const [x, sy] = scaleOf(m.scale ?? "1 1");
      expect(x).toBeGreaterThanOrEqual(1);
      expect(sy).toBeLessThanOrEqual(1);
    }
  });
});

describe("wiggle", () => {
  it("is still outside its window", () => {
    expect(wiggleDeg(9, 10)).toBe(0);
    expect(wiggleDeg(10 + WIGGLE_FRAMES + 1, 10)).toBe(0);
    expect(wiggle(5, 10).rotate).toBe("0deg");
  });
  it("shakes and decays", () => {
    const early = Math.max(...[11, 12, 13].map((f) => Math.abs(wiggleDeg(f, 10, 9))));
    const late = Math.max(...[24, 25, 26].map((f) => Math.abs(wiggleDeg(f, 10, 9))));
    expect(early).toBeGreaterThan(late);
    expect(early).toBeLessThanOrEqual(9);
  });
});

describe("popIn", () => {
  it("grows from 0 and settles at 1", () => {
    expect(popIn(4, FPS, 5).opacity).toBe(0);
    expect(Number(popIn(70, FPS, 5).scale)).toBeCloseTo(1, 2);
  });
});

describe("jelly", () => {
  it("is neutral outside its window and wobbles inside", () => {
    expect(jelly(9, 10).scale).toBe("1 1");
    expect(jelly(10 + JELLY_FRAMES, 10).scale).toBe("1 1");
    const [x, y] = scaleOf(jelly(12, 10).scale);
    expect(x).not.toBeCloseTo(1, 3);
    expect(x + y).toBeCloseTo(2, 6);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/brand/motion.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the presets**

`src/brand/motion.ts`:

```ts
import { interpolate, spring } from "remotion";
import { CLAMP } from "../frame/timing";
import { TILT } from "./tokens";

/** Style fragment a preset returns; spread it into the element it moves. */
export type Motion = Pick<React.CSSProperties, "opacity" | "scale" | "rotate" | "translate" | "transformOrigin">;

const SLAP = { damping: 10, stiffness: 200 };
const DROP = { damping: 9, stiffness: 170 };
const POP_IN = { damping: 12, stiffness: 180 };
const SQUASH = 0.18;
const DROP_SQUASH = 1.5;
export const WIGGLE_FRAMES = 18;
export const JELLY_FRAMES = 16;

/** Slapped on like a sticker: grows squashed, overshoots, settles on its tilt. Pair with `pop`. */
export const slap = (frame: number, fps: number, at: number, tilt = TILT): Motion => {
  if (frame < at) {
    return { opacity: 0, scale: "0 0" };
  }
  const p = spring({ frame: frame - at, fps, config: SLAP });
  const squash = Math.sin(Math.min(1, p) * Math.PI) * SQUASH;
  return {
    opacity: 1,
    scale: `${p * (1 + squash)} ${p * (1 - squash)}`,
    rotate: `${interpolate(p, [0, 1], [-12, tilt])}deg`,
  };
};

/** Falls from `distance` px above; the spring's overshoot squashes it on the ground. Pair with `boing`. */
export const drop = (frame: number, fps: number, at: number, distance = 260): Motion => {
  if (frame < at) {
    return { opacity: 0, translate: `0px ${-distance}px` };
  }
  const p = spring({ frame: frame - at, fps, config: DROP });
  const over = Math.max(0, p - 1);
  // Snap the spring's sub-pixel tail to the ground (also avoids "-0px").
  const raw = Math.min(0, -(1 - p) * distance);
  const y = raw > -0.5 ? 0 : raw;
  return {
    opacity: 1,
    translate: `0px ${y}px`,
    scale: `${1 + over * DROP_SQUASH} ${1 - over * DROP_SQUASH}`,
    transformOrigin: "50% 100%",
  };
};

/** Degrees of a decaying shake; add it to an element's own tilt. Pair with `bonk`. */
export const wiggleDeg = (frame: number, at: number, amp = 9): number => {
  const t = frame - at;
  if (t <= 0 || t > WIGGLE_FRAMES) {
    return 0;
  }
  return amp * Math.sin(t * 1.2) * (1 - t / WIGGLE_FRAMES);
};

export const wiggle = (frame: number, at: number, amp = 9): Motion => ({ rotate: `${wiggleDeg(frame, at, amp)}deg` });

/** Scales in with a little overshoot. Pair with `chime`. */
export const popIn = (frame: number, fps: number, at: number): Motion => {
  if (frame < at) {
    return { opacity: 0, scale: "0" };
  }
  const p = spring({ frame: frame - at, fps, config: POP_IN });
  return { opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP), scale: `${p}` };
};

/** Elastic wobble when a number lands. Pair with `ding`. */
export const jelly = (frame: number, at: number): Motion => {
  const t = (frame - at) / JELLY_FRAMES;
  if (t <= 0 || t >= 1) {
    return { scale: "1 1" };
  }
  const k = Math.sin(t * Math.PI * 3) * (1 - t) * 0.22;
  return { scale: `${1 + k} ${1 - k}` };
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/brand/motion.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the `<Sticker>` component**

`src/brand/Sticker.tsx`:

```tsx
import { usePalette } from "../frame/contexts";
import { stickerStyle, type StickerOptions } from "./sticker";
import { TILT } from "./tokens";

/** A sticker surface with its content. `style` comes last, so motion presets can override `rotate`/`scale`. */
export const Sticker: React.FC<
  StickerOptions & {
    readonly tilt?: number;
    readonly padding?: React.CSSProperties["padding"];
    readonly style?: React.CSSProperties;
    readonly children: React.ReactNode;
  }
> = ({ tilt = TILT, padding = "14px 30px", style, children, ...opts }) => {
  const c = usePalette();
  return <div style={{ ...stickerStyle(c, opts), padding, rotate: `${tilt}deg`, ...style }}>{children}</div>;
};
```

- [ ] **Step 6: Verify and commit**

Run: `npm test && npm run lint`
Expected: PASS, clean.

```bash
git add src/brand/motion.ts src/brand/Sticker.tsx tests/brand/motion.test.ts
git commit -m "feat(brand): slap, drop, wiggle, popIn and jelly presets and the Sticker component"
```

---

### Task 3: SFX names, cue merging, gains and the deterministic synthesizer

**Files:**
- Create: `src/brand/sfx.ts`, `scripts/lib/sfx-synth.ts`, `scripts/sfx-build.ts`, `src/brand/sfx/{whoosh,pop,boing,ding,chime,bonk,tick}.wav` (generated), `tests/brand/sfx.test.ts`, `tests/scripts/sfx-synth.test.ts`
- Modify: `package.json` (script `sfx:build`)

**Interfaces:**
- Produces from `src/brand/sfx.ts` (node-safe):
  - `SFX_NAMES` and `type SfxName`;
  - `SFX_DURATION: Record<SfxName, number>`;
  - `type Cue = { readonly name: SfxName; readonly at: number }` (frames, relative to the enclosing Sequence);
  - `MERGE_FRAMES = 4`, `mergeCues(cues) → Cue[]`, `activeCues(cues, enabled) → Cue[]`;
  - `SFX_MASTER = 0.18`, `SFX_GAIN`, `sfxVolume(name) → number`.
- Produces from `scripts/lib/sfx-synth.ts`:
  - `SFX_RATE = 48000`, `PEAK`;
  - `prng(seed) → () => number`;
  - `synthesize(name, rate?) → Float32Array`;
  - `encodeWav16(samples, rate) → Buffer`.

- [ ] **Step 1: Write the failing tests**

`tests/brand/sfx.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MERGE_FRAMES, SFX_GAIN, SFX_MASTER, activeCues, mergeCues, sfxVolume } from "../../src/brand/sfx";

describe("mergeCues", () => {
  it("sorts cues by frame", () => {
    expect(mergeCues([{ name: "pop", at: 20 }, { name: "ding", at: 5 }])).toEqual([
      { name: "ding", at: 5 },
      { name: "pop", at: 20 },
    ]);
  });
  it("drops a same-name cue closer than 4 frames to the last kept one", () => {
    const ticks = [0, 2, 3.9, 4, 6, 8.5].map((at) => ({ name: "tick" as const, at }));
    expect(mergeCues(ticks).map((c) => c.at)).toEqual([0, 4, 8.5]);
  });
  it("keeps different sounds on the same frame", () => {
    expect(mergeCues([{ name: "pop", at: 10 }, { name: "ding", at: 10 }])).toHaveLength(2);
  });
  it("uses a 4-frame window", () => {
    expect(MERGE_FRAMES).toBe(4);
  });
});

describe("activeCues", () => {
  it("is silent when disabled (checkMode or sfx: false)", () => {
    expect(activeCues([{ name: "pop", at: 0 }], false)).toEqual([]);
  });
  it("merges when enabled", () => {
    expect(activeCues([{ name: "pop", at: 0 }, { name: "pop", at: 1 }], true)).toHaveLength(1);
  });
});

describe("gains", () => {
  it("keeps every sound under the master and tick at half", () => {
    expect(sfxVolume("pop")).toBeCloseTo(SFX_MASTER);
    expect(sfxVolume("tick")).toBeCloseTo(SFX_MASTER * 0.5);
    for (const g of Object.values(SFX_GAIN)) expect(g).toBeLessThanOrEqual(1);
  });
});
```

`tests/scripts/sfx-synth.test.ts`:

```ts
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SFX_DURATION, SFX_NAMES } from "../../src/brand/sfx";
import { PEAK, SFX_RATE, encodeWav16, prng, synthesize } from "../../scripts/lib/sfx-synth";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

describe("prng", () => {
  it("repeats for the same seed", () => {
    const a = prng(7);
    const b = prng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe.each([...SFX_NAMES])("%s", (name) => {
  const samples = synthesize(name);
  it("has the declared duration", () => {
    expect(samples.length).toBe(Math.round(SFX_DURATION[name] * SFX_RATE));
  });
  it("peaks at -3 dBFS without clipping", () => {
    const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeCloseTo(PEAK, 4);
    expect(peak).toBeLessThan(1);
  });
  it("ends at silence (no click)", () => {
    expect(samples[samples.length - 1]).toBe(0);
  });
  it("is deterministic", () => {
    expect(sha(encodeWav16(synthesize(name), SFX_RATE))).toBe(sha(encodeWav16(samples, SFX_RATE)));
  });
  it("matches the committed WAV (run `npm run sfx:build` after changing the synth)", () => {
    const file = path.resolve(__dirname, `../../src/brand/sfx/${name}.wav`);
    expect(sha(fs.readFileSync(file))).toBe(sha(encodeWav16(samples, SFX_RATE)));
  });
});

describe("encodeWav16", () => {
  it("writes a mono 16-bit PCM header", () => {
    const buf = encodeWav16(new Float32Array([0, 1, -1]), 48_000);
    expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
    expect(buf.toString("ascii", 8, 12)).toBe("WAVE");
    expect(buf.readUInt16LE(22)).toBe(1);
    expect(buf.readUInt32LE(24)).toBe(48_000);
    expect(buf.readUInt16LE(34)).toBe(16);
    expect(buf.readUInt32LE(40)).toBe(6);
    expect(buf.readInt16LE(46)).toBe(32767);
    expect(buf.readInt16LE(48)).toBe(-32767);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run tests/brand/sfx.test.ts tests/scripts/sfx-synth.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/brand/sfx.ts`**

```ts
// Node-safe: the synthesizer, the cue registry and tests import this; only Sfx.tsx touches audio.
export const SFX_NAMES = ["whoosh", "pop", "boing", "ding", "chime", "bonk", "tick"] as const;
export type SfxName = (typeof SFX_NAMES)[number];

/** Seconds; the synthesizer renders exactly this long. */
export const SFX_DURATION: Record<SfxName, number> = {
  whoosh: 0.4,
  pop: 0.06,
  boing: 0.3,
  ding: 0.5,
  chime: 0.45,
  bonk: 0.2,
  tick: 0.025,
};

/** A sound at a frame of the enclosing Sequence (scene-local inside a scene). */
export type Cue = { readonly name: SfxName; readonly at: number };

export const MERGE_FRAMES = 4;

/** Sorted cues, without a same-name cue closer than MERGE_FRAMES to the last one kept. */
export const mergeCues = (cues: readonly Cue[]): Cue[] => {
  const last = new Map<SfxName, number>();
  return [...cues]
    .sort((a, b) => a.at - b.at)
    .filter((cue) => {
      const prev = last.get(cue.name);
      if (prev !== undefined && cue.at - prev < MERGE_FRAMES) {
        return false;
      }
      last.set(cue.name, cue.at);
      return true;
    });
};

export const activeCues = (cues: readonly Cue[], enabled: boolean): Cue[] => (enabled ? mergeCues(cues) : []);

// Subtle: files peak at -3 dBFS; the master keeps SFX ~15 dB under the voice. One knob to tune presence.
export const SFX_MASTER = 0.18;
export const SFX_GAIN: Record<SfxName, number> = {
  whoosh: 0.8,
  pop: 1,
  boing: 0.9,
  ding: 0.8,
  chime: 0.8,
  bonk: 1,
  tick: 0.5,
};

export const sfxVolume = (name: SfxName) => SFX_MASTER * SFX_GAIN[name];
```

- [ ] **Step 4: Implement the synthesizer**

`scripts/lib/sfx-synth.ts`:

```ts
import { SFX_DURATION, type SfxName } from "../../src/brand/sfx";

export const SFX_RATE = 48_000;
export const PEAK = 10 ** (-3 / 20);
const TAU = 2 * Math.PI;
const FADE_OUT = 0.005;

/** mulberry32: a seeded PRNG, so the noise (and the WAV bytes) never change between runs. */
export const prng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Linear attack, exponential decay with time constant `tau`. */
const env = (t: number, attack: number, tau: number) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));

const sweep = (n: number, rate: number, freq: (t: number) => number, amp: (t: number) => number) => {
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    phase += (TAU * freq(t)) / rate;
    out[i] = Math.sin(phase) * amp(t);
  }
  return out;
};

// Inharmonic bell partials: [ratio, amplitude, decay factor].
const PARTIALS = [
  [1, 1, 1],
  [2.76, 0.4, 0.5],
  [5.4, 0.2, 0.25],
] as const;

const bell = (out: Float32Array, rate: number, f0: number, start: number, tau: number) => {
  for (let i = Math.round(start * rate); i < out.length; i++) {
    const t = i / rate - start;
    let v = 0;
    for (const [ratio, amp, k] of PARTIALS) {
      v += amp * Math.sin(TAU * f0 * ratio * t) * env(t, 0.002, tau * k);
    }
    out[i] += v;
  }
  return out;
};

const VOICES: Record<SfxName, (n: number, rate: number) => Float32Array> = {
  // Filtered noise sweeping 300 Hz → 4 kHz under a sin² swell.
  whoosh: (n, rate) => {
    const rand = prng(7);
    const out = new Float32Array(n);
    const total = n / rate;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      const cutoff = 300 * (4000 / 300) ** (t / total);
      y += (1 - Math.exp((-TAU * cutoff) / rate)) * (rand() * 2 - 1 - y);
      out[i] = y * Math.sin((Math.PI * t) / total) ** 2;
    }
    return out;
  },
  // A bubble: pitch drops 900 → 300 Hz in a few ms.
  pop: (n, rate) =>
    sweep(n, rate, (t) => 300 + 600 * Math.exp(-t / 0.012), (t) => env(t, 0.002, 0.015)),
  // A spring: falling pitch with an 18 Hz vibrato.
  boing: (n, rate) =>
    sweep(n, rate, (t) => 420 * (1 - 1.5 * t) * (1 + 0.06 * Math.sin(TAU * 18 * t)), (t) => env(t, 0.003, 0.09)),
  ding: (n, rate) => bell(new Float32Array(n), rate, 1320, 0, 0.25),
  // Two rising bell notes (C6, G6).
  chime: (n, rate) => bell(bell(new Float32Array(n), rate, 1046.5, 0, 0.18), rate, 1568, 0.12, 0.18),
  // A dull low knock: 140 → 90 Hz body plus a short muffled thump.
  bonk: (n, rate) => {
    const rand = prng(11);
    const out = sweep(n, rate, (t) => 90 + 50 * Math.exp(-t / 0.03), (t) => env(t, 0.002, 0.05));
    let y = 0;
    for (let i = 0; i < n; i++) {
      y += 0.08 * (rand() * 2 - 1 - y);
      out[i] += 3 * y * env(i / rate, 0.001, 0.008);
    }
    return out;
  },
  // A dry click: a 3 kHz blip plus a noise transient.
  tick: (n, rate) => {
    const rand = prng(3);
    const out = sweep(n, rate, () => 3000, (t) => 0.5 * env(t, 0.0005, 0.004));
    for (let i = 0; i < n; i++) {
      out[i] += (rand() * 2 - 1) * env(i / rate, 0.0002, 0.002);
    }
    return out;
  },
};

export const synthesize = (name: SfxName, rate = SFX_RATE): Float32Array => {
  const n = Math.round(SFX_DURATION[name] * rate);
  const out = VOICES[name](n, rate);
  const fade = Math.min(n, Math.round(FADE_OUT * rate));
  for (let i = 0; i < fade; i++) {
    out[n - 1 - i] *= i / fade;
  }
  const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (peak > 0) {
    for (let i = 0; i < n; i++) {
      out[i] *= PEAK / peak;
    }
  }
  return out;
};

/** Mono 16-bit PCM WAV. */
export const encodeWav16 = (samples: Float32Array, rate: number): Buffer => {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
  return buf;
};
```

`scripts/sfx-build.ts`:

```ts
// Usage: npm run sfx:build. Regenerates src/brand/sfx/*.wav (committed; the render imports them).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SFX_NAMES } from "../src/brand/sfx";
import { SFX_RATE, encodeWav16, synthesize } from "./lib/sfx-synth";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/brand/sfx");
fs.mkdirSync(outDir, { recursive: true });
for (const name of SFX_NAMES) {
  const file = path.join(outDir, `${name}.wav`);
  fs.writeFileSync(file, encodeWav16(synthesize(name), SFX_RATE));
  console.log(`✓ ${path.relative(process.cwd(), file)}`);
}
```

In `package.json` `scripts`, add `"sfx:build": "tsx scripts/sfx-build.ts"`.

- [ ] **Step 5: Generate the WAVs and run the tests**

Run: `npm run sfx:build && npx vitest run tests/brand/sfx.test.ts tests/scripts/sfx-synth.test.ts`
Expected: 7 `✓ src/brand/sfx/<name>.wav` lines, then PASS.

- [ ] **Step 6: Listen once**

Run: `afplay src/brand/sfx/pop.wav` (macOS; elsewhere open the file in any player) for each of the 7 files.

Expected: short, soft, cartoon-clean sounds with no clicks. If one sounds harsh, adjust only its voice in `VOICES`, re-run `npm run sfx:build` and the tests, and mention the change in the commit.

- [ ] **Step 7: Commit**

```bash
git add src/brand/sfx.ts src/brand/sfx scripts/lib/sfx-synth.ts scripts/sfx-build.ts package.json tests/brand/sfx.test.ts tests/scripts/sfx-synth.test.ts
git commit -m "feat(brand): seven synthesized SFX (deterministic WAVs), cue merging and gains"
```

---

### Task 4: SFX runtime, the `sfx` episode flag and the cue registry

**Files:**
- Create: `src/brand/sfx-files.ts`, `src/brand/Sfx.tsx`, `src/blocks/cue-types.ts`, `src/blocks/cues.ts`, `tests/brand/samples.ts`
- Modify: `src/assets.d.ts`, `src/episode/schema.ts`, `src/compositions/SceneRenderer.tsx`, `src/compositions/EpisodeVideo.tsx`, `src/compositions/BlockPreview.tsx`, `src/compositions/BlockGallery.tsx`, `tests/validate.test.ts`, `skills/episode-authoring/SKILL.md`

**Interfaces:**
- Consumes: `Cue`, `SfxName`, `activeCues`, `sfxVolume`, `SFX_DURATION` (Task 3).
- Produces:
  - `SfxContext: React.Context<{ readonly enabled: boolean }>` (default `{ enabled: false }`);
  - `<SfxCues cues={readonly Cue[]} />`;
  - `type CueFn<K extends BlockName> = (props: BlockProps<K>, timing: BeatTiming, talent: Talent) => Cue[]`;
  - `BLOCK_CUES: { [K in BlockName]?: CueFn<K> }`;
  - `cuesFor(block: BlockName, props: unknown, timing: BeatTiming, talent: Talent) → Cue[]`;
  - `Episode.sfx: boolean`;
  - test helpers `sampleProps<K>(block: K): BlockProps<K>` and `BRAND_TALENT: Talent`.

- [ ] **Step 1: Write the failing test for the episode flag**

Append to `tests/validate.test.ts`. It already imports `validateEpisode` and `minimalEpisode`; add any missing imports.

```ts
describe("sfx flag", () => {
  it("defaults to true", () => {
    expect(validateEpisode(minimalEpisode()).sfx).toBe(true);
  });
  it("accepts false", () => {
    expect(validateEpisode({ ...minimalEpisode(), sfx: false }).sfx).toBe(false);
  });
  it("rejects a non-boolean", () => {
    expect(() => validateEpisode({ ...minimalEpisode(), sfx: "no" })).toThrow(/sfx/);
  });
});
```

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL; `sfx` is `undefined`.

- [ ] **Step 2: Add the flag**

In `src/episode/schema.ts`, after `musicSrc`:

```ts
  /** Brand sound effects; false silences every cue (music and the talent clip are unaffected). */
  sfx: z.boolean().default(true),
```

Run: `npx vitest run tests/validate.test.ts`
Expected: PASS.

In `skills/episode-authoring/SKILL.md`, change the table row that reads ``| `clip`, `captionsSrc`, `coverFrame`, `musicSrc` | leave the defaults (`coverFrame` 60) |`` to:

```
| `clip`, `captionsSrc`, `coverFrame`, `musicSrc`, `sfx` | leave the defaults (`coverFrame` 60; `sfx` true, set `false` only if the user asks for no sound effects) |
```

- [ ] **Step 3: Add the audio runtime**

`src/assets.d.ts`, append:

```ts
declare module "*.wav" {
  const src: string;
  export default src;
}
```

`src/brand/sfx-files.ts`:

```ts
// Bundled with the template, so renders never need public/ or the network.
import bonk from "./sfx/bonk.wav";
import boing from "./sfx/boing.wav";
import chime from "./sfx/chime.wav";
import ding from "./sfx/ding.wav";
import pop from "./sfx/pop.wav";
import tick from "./sfx/tick.wav";
import whoosh from "./sfx/whoosh.wav";
import type { SfxName } from "./sfx";

export const SFX_FILES: Record<SfxName, string> = { whoosh, pop, boing, ding, chime, bonk, tick };
```

`src/brand/Sfx.tsx`:

```tsx
import { Audio } from "@remotion/media";
import { createContext, useContext } from "react";
import { Sequence, useVideoConfig } from "remotion";
import { SFX_FILES } from "./sfx-files";
import { SFX_DURATION, activeCues, sfxVolume, type Cue } from "./sfx";

/** Off by default; EpisodeVideo turns it on unless checkMode or `episode.sfx === false`. */
export const SfxContext = createContext<{ readonly enabled: boolean }>({ enabled: false });

/** Plays each cue at its frame of the enclosing Sequence. */
export const SfxCues: React.FC<{ readonly cues: readonly Cue[] }> = ({ cues }) => {
  const { enabled } = useContext(SfxContext);
  const { fps } = useVideoConfig();
  return (
    <>
      {activeCues(cues, enabled).map((cue, i) => (
        <Sequence
          key={`${i}-${cue.name}-${cue.at}`}
          name={`sfx · ${cue.name}`}
          from={Math.round(cue.at)}
          durationInFrames={Math.ceil(SFX_DURATION[cue.name] * fps) + 1}
          premountFor={fps}
          layout="none"
        >
          <Audio src={SFX_FILES[cue.name]} volume={sfxVolume(cue.name)} />
        </Sequence>
      ))}
    </>
  );
};
```

- [ ] **Step 4: Add the cue types and the registry**

`src/blocks/cue-types.ts`:

```ts
import type { Cue } from "../brand/sfx";
import type { Talent } from "../episode/talent";
import type { BeatTiming } from "../frame/timing";
import type { BlockName } from "./schemas";
import type { BlockProps } from "./types";

/** Sounds of one beat, at scene-local frames (use `timing.at`). Pure: shares keyframes with the component. */
export type CueFn<K extends BlockName> = (props: BlockProps<K>, timing: BeatTiming, talent: Talent) => Cue[];
```

`src/blocks/cues.ts`:

```ts
import type { Cue } from "../brand/sfx";
import type { Talent } from "../episode/talent";
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";
import type { BlockName } from "./schemas";

// Node-safe. Each block task adds its cue function here; Task 13 makes this total.
export const BLOCK_CUES: { [K in BlockName]?: CueFn<K> } = {};

export const cuesFor = (block: BlockName, props: unknown, timing: BeatTiming, talent: Talent): Cue[] => {
  const fn = BLOCK_CUES[block] as CueFn<BlockName> | undefined;
  return fn ? fn(props as never, timing, talent) : [];
};
```

`tests/brand/samples.ts`:

```ts
import samples from "../../src/gallery/samples.json";
import talentJson from "../../examples/dani-chocolate/talent.json";
import { BLOCK_SCHEMAS, type BlockName } from "../../src/blocks/schemas";
import type { BlockProps } from "../../src/blocks/types";
import { talentSchema } from "../../src/episode/talent";

/** The gallery's maximum-content sample for `block`, parsed (defaults applied). */
export const sampleProps = <K extends BlockName>(block: K): BlockProps<K> => {
  const sample = (samples as { block: string; props: unknown }[]).find((s) => s.block === block);
  if (!sample) {
    throw new Error(`No gallery sample for ${block}`);
  }
  return BLOCK_SCHEMAS[block].parse(sample.props) as BlockProps<K>;
};

export const BRAND_TALENT = talentSchema.parse(talentJson);
```

- [ ] **Step 5: Play cues from the scene renderer and turn SFX on per composition**

1. `src/compositions/SceneRenderer.tsx`:
   - Import `SfxCues` from `../brand/Sfx`, `cuesFor` from `../blocks/cues` and `useTalent` from `../frame/contexts`.
   - In `BlockView`, after the guard, add `const talent = useTalent();` and return the component plus its cues:

     ```tsx
     return (
       <>
         <Component props={beat.props} timing={timing} />
         <SfxCues cues={cuesFor(beat.block, beat.props, timing, talent)} />
       </>
     );
     ```

   - Right after the `{scene.title ? (…) : null}` expression, add `{scene.title ? <SfxCues cues={[{ name: "pop", at: 0 }]} /> : null}`. Task 6 turns the title into a slapped sticker.
2. `src/compositions/EpisodeVideo.tsx`: import `SfxContext` from `../brand/Sfx`. Wrap the `<AbsoluteFill>` in `<SfxContext.Provider value={{ enabled: !checkMode && episode.sfx }}>`.
3. `src/compositions/BlockPreview.tsx` and `src/compositions/BlockGallery.tsx`: wrap their `<AbsoluteFill>` in `<SfxContext.Provider value={{ enabled: true }}>`, so Studio previews play the sounds. `renderStill` in `check:gallery` ignores audio.

- [ ] **Step 6: Verify and commit**

Run: `npm test && npm run lint`
Expected: PASS, clean. The bundler accepts `.wav` (`@remotion/bundler`'s asset rule includes `wav`); confirm with `npm run check -- examples/smoke --layouts=9x16` (`✓ … slot clear`).

```bash
git add src/assets.d.ts src/brand/sfx-files.ts src/brand/Sfx.tsx src/blocks/cue-types.ts src/blocks/cues.ts src/episode/schema.ts src/compositions tests/validate.test.ts tests/brand/samples.ts ../skills/episode-authoring/SKILL.md
git commit -m "feat(brand): SFX runtime, episode.sfx flag and per-block cue registry"
```

---

### Task 5: Giant-paw scene flood and the `whoosh` cues

**Files:**
- Create: `src/brand/flood.ts`, `tests/brand/flood.test.ts`
- Modify: `src/frame/Background.tsx`, `src/compositions/EpisodeVideo.tsx`

**Interfaces:**
- Consumes: `SCENE_BG` (Task 1), `Cue` (Task 3), `SfxCues` (Task 4), `PawShape` (`src/icons/paw.tsx`, a 100×100 grid with the main pad an ellipse at (50, 66) with rx 24 and ry 20).
- Produces:
  - `FLOOD_LEAD = 6`, `FLOOD_FRAMES = 14`, `PAD_CENTER = { x: 50, y: 66 }`;
  - `type Flood = { color; progress; x; y; scale; rotate }`;
  - `floodAt(frame, sceneStarts | null, canvas) → { base: string; flood: Flood | null }`;
  - `floodScale(canvas) → number`;
  - `floodCues(sceneStarts) → Cue[]`;
  - `<Background total sceneStarts?>`.

- [ ] **Step 1: Write the failing test**

`tests/brand/flood.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FLOOD_FRAMES, FLOOD_LEAD, floodAt, floodCues, floodScale } from "../../src/brand/flood";
import { SCENE_BG } from "../../src/brand/tokens";
import { defaultSceneStarts } from "../../src/frame/timing";

const V916 = { width: 1080, height: 1920 };
const V45 = { width: 1080, height: 1350 };
const starts = defaultSceneStarts(900); // [0, 90, 300, 510, 765]

describe("floodAt", () => {
  it("is the hook color with no flood before the first cut", () => {
    expect(floodAt(0, starts, V916)).toEqual({ base: SCENE_BG[0], flood: null });
    expect(floodAt(90 - FLOOD_LEAD - 1, starts, V916).flood).toBeNull();
  });
  it("grows the next scene's color from the top-left at the first cut", () => {
    const s = floodAt(90 - FLOOD_LEAD, starts, V916);
    expect(s.base).toBe(SCENE_BG[0]);
    expect(s.flood).toMatchObject({ color: SCENE_BG[1], progress: 0, x: 0, y: 0, scale: 0 });
  });
  it("alternates to the top-right on the next cut", () => {
    expect(floodAt(300 - FLOOD_LEAD + 3, starts, V916).flood).toMatchObject({ color: SCENE_BG[2], x: 1080, y: 0 });
  });
  it("eases out and finishes after 14 frames, leaving the new base", () => {
    const mid = floodAt(90 - FLOOD_LEAD + 7, starts, V916).flood!;
    expect(mid.progress).toBeGreaterThan(0.8);
    expect(floodAt(90 - FLOOD_LEAD + FLOOD_FRAMES, starts, V916)).toEqual({ base: SCENE_BG[1], flood: null });
  });
  it("reaches the close color and stays there", () => {
    expect(floodAt(899, starts, V916)).toEqual({ base: SCENE_BG[4], flood: null });
  });
  it("has no flood without scene starts (block previews)", () => {
    expect(floodAt(500, null, V916)).toEqual({ base: SCENE_BG[0], flood: null });
  });
  it("never overlaps two cuts for 30-frame scenes in a 15 s episode", () => {
    const tight = [0, 30, 60, 90, 120];
    for (let f = 0; f < 450; f++) {
      const s = floodAt(f, tight, V916);
      if (s.flood) {
        expect(s.base).toBe(SCENE_BG[SCENE_BG.indexOf(s.flood.color as (typeof SCENE_BG)[number]) - 1]);
      }
    }
  });
});

describe("floodScale", () => {
  it.each([["9x16", V916], ["4x5", V45]])("covers the whole %s canvas with the main pad", (_, canvas) => {
    expect(floodScale(canvas) * 20).toBeGreaterThanOrEqual(Math.hypot(canvas.width, canvas.height));
  });
});

describe("floodCues", () => {
  it("whooshes when each flood starts", () => {
    expect(floodCues(starts)).toEqual([84, 294, 504, 759].map((at) => ({ name: "whoosh", at })));
  });
  it("stays inside a 15 s video", () => {
    for (const cue of floodCues([0, 30, 60, 90, 120])) {
      expect(cue.at).toBeGreaterThanOrEqual(0);
      expect(cue.at).toBeLessThan(450);
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/brand/flood.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the flood math**

`src/brand/flood.ts`:

```ts
import type { Cue } from "./sfx";
import { SCENE_BG } from "./tokens";

export const FLOOD_LEAD = 6;
export const FLOOD_FRAMES = 14;
/** PawShape's main pad (ellipse rx 24, ry 20) in its 100×100 grid. */
export const PAD_CENTER = { x: 50, y: 66 };
const PAD_RY = 20;

export type Flood = {
  readonly color: string;
  readonly progress: number;
  /** Origin corner, canvas px. */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotate: number;
};
export type FloodState = { readonly base: string; readonly flood: Flood | null };

type Canvas = { readonly width: number; readonly height: number };

/** Scale at which the main pad alone, centered on a corner, covers the canvas. */
export const floodScale = (canvas: Canvas) => (Math.hypot(canvas.width, canvas.height) / PAD_RY) * 1.05;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Background at `frame`: the settled scene color, plus the paw growing toward the next scene's color. */
export const floodAt = (frame: number, sceneStarts: readonly number[] | null, canvas: Canvas): FloodState => {
  if (!sceneStarts) {
    return { base: SCENE_BG[0], flood: null };
  }
  let base: string = SCENE_BG[0];
  for (let k = 1; k < sceneStarts.length; k++) {
    const start = sceneStarts[k] - FLOOD_LEAD;
    if (frame < start) {
      break;
    }
    if (frame >= start + FLOOD_FRAMES) {
      base = SCENE_BG[k];
      continue;
    }
    const progress = easeOutCubic((frame - start) / FLOOD_FRAMES);
    const fromLeft = k % 2 === 1;
    // Toes point into the canvas: 135° from the top-left corner, -135° from the top-right; settle from ±15°.
    const rest = fromLeft ? 135 : -135;
    return {
      base,
      flood: {
        color: SCENE_BG[k],
        progress,
        x: fromLeft ? 0 : canvas.width,
        y: 0,
        scale: floodScale(canvas) * progress,
        rotate: rest + (fromLeft ? -15 : 15) * (1 - progress),
      },
    };
  }
  return { base, flood: null };
};

export const floodCues = (sceneStarts: readonly number[]): Cue[] =>
  sceneStarts.slice(1).map((s) => ({ name: "whoosh", at: s - FLOOD_LEAD }));
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run tests/brand/flood.test.ts`
Expected: PASS.

- [ ] **Step 5: Draw it in the background**

Replace `src/frame/Background.tsx`:

```tsx
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PAD_CENTER, floodAt } from "../brand/flood";
import { PawShape } from "../icons";
import { useLayout, usePalette } from "./contexts";
import { slotKeepOut } from "./layout";
import { CLAMP } from "./timing";

const TILE = 260;
const DRIFT = 24;

/** Flat scene color, the giant paw between scenes, and a faint drifting paw pattern. */
export const Background: React.FC<{ readonly total: number; readonly sceneStarts?: readonly number[] | null }> = ({
  total,
  sceneStarts = null,
}) => {
  const frame = useCurrentFrame();
  const c = usePalette();
  const layout = useLayout();
  const { width, height } = layout.canvas;
  const keepOut = slotKeepOut(layout);
  const drift = interpolate(frame, [0, Math.max(1, total - 1)], [0, -DRIFT], CLAMP);
  const { base, flood } = floodAt(frame, sceneStarts, layout.canvas);

  return (
    <AbsoluteFill style={{ backgroundColor: base }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="paws" width={TILE} height={TILE} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${drift})`}>
            <g transform="translate(40 40) scale(0.62) rotate(-18 50 50)">
              <PawShape fill={c.text} />
            </g>
            <g transform="translate(160 150) scale(0.5) rotate(22 50 50)">
              <PawShape fill={c.text} />
            </g>
          </pattern>
          <mask id="slot-mask">
            <rect width={width} height={height} fill="white" />
            <rect x={keepOut.x} y={keepOut.y} width={keepOut.width} height={keepOut.height} rx={layout.slot.radius + layout.slotClearance} fill="black" />
          </mask>
        </defs>
        {flood ? (
          <g
            transform={`translate(${flood.x} ${flood.y}) rotate(${flood.rotate}) scale(${flood.scale}) translate(${-PAD_CENTER.x} ${-PAD_CENTER.y})`}
          >
            <PawShape fill={flood.color} />
          </g>
        ) : null}
        <rect width={width} height={height} fill="url(#paws)" opacity={0.04} mask="url(#slot-mask)" />
      </svg>
    </AbsoluteFill>
  );
};
```

In `src/compositions/EpisodeVideo.tsx`:
- pass the starts: `<Background total={total} sceneStarts={sceneStarts} />`;
- import `floodCues` from `../brand/flood` and `SfxCues` from `../brand/Sfx`;
- right after `<Background …/>`, add `<SfxCues cues={floodCues(sceneStarts)} />`.

- [ ] **Step 6: Look at it, then commit**

Run: `npx remotion still Episode out/flood-84.png --frame=88 --public-dir examples/dani-chocolate`
Open the PNG. Expected: a peach (`#FFE0D6`) paw, toes first, growing from the top-left over cream.

Then run `npm run check -- examples/dani-chocolate`. The slot check **will fail** until Task 6 adds the slot mat; record the failure and move on. Task 6 makes it green.

```bash
git add src/brand/flood.ts src/frame/Background.tsx src/compositions/EpisodeVideo.tsx tests/brand/flood.test.ts
git commit -m "feat(brand): giant-paw flood between scenes with whoosh cues"
```

---

### Task 6: Frame restyle (talent slot mat, step tracker, captions, scene titles)

**Files:**
- Modify: `src/frame/TalentSlot.tsx`, `src/frame/StepTracker.tsx`, `src/frame/Captions.tsx`, `src/compositions/SceneRenderer.tsx`

**Interfaces:**
- Consumes: `STICKER_FILL`, `ON_COLOR`, `HIGHLIGHT`, `BORDER`, `SHADOW` (Task 1), `stickerStyle` (Task 1), `slap` (Task 2), `WEIGHT_CAPTION`, `FONT_BODY` (Task 1).
- Produces: no new exports.

- [ ] **Step 1: Talent slot with a white mat that fills the keep-out**

In `src/frame/TalentSlot.tsx`:

1. Import `BORDER`, `ON_COLOR`, `SHADOW` and `STICKER_FILL` from `../brand/tokens`.
2. Read `slotClearance` from `useLayout()`.
3. Insert the mat as the **first** child of the outer div:

   ```tsx
   {/* The sticker's white margin: fills the keep-out ring so scene floods never change pixels around the clip. */}
   <div
     style={{
       position: "absolute",
       inset: -slotClearance,
       borderRadius: slot.radius + slotClearance,
       backgroundColor: STICKER_FILL,
       border: `${BORDER}px solid ${c.text}`,
       boxShadow: `${SHADOW}px ${SHADOW}px 0 ${c.text}`,
       boxSizing: "border-box",
     }}
   />
   ```

4. In the clip container, replace `boxShadow: \`0 0 0 ${slotRing}px ${c.accent}, 0 18px 40px rgba(0,0,0,0.45)\`` with `boxShadow: "none"`. Remove `slotRing` from the destructuring if it is now unused; the linter flags unused locals.
5. Name pill: replace `backgroundColor: c.text, color: c.bg` with `backgroundColor: c.accent, color: ON_COLOR`. Add `border: \`4px solid ${c.text}\``, `rotate: "-4deg"` and `boxShadow: \`4px 4px 0 ${c.text}\``. Change `lineHeight` to `` `${namePill.height - 8 + 4}px` `` (the 4 px border on each side eats 8 px of the border-box height).

- [ ] **Step 2: Step tracker as sticker pills**

In `src/frame/StepTracker.tsx`:
1. Import `ON_COLOR` and `STICKER_FILL` from `../brand/tokens`.
2. Replace the pill's `border`, `backgroundColor`, `opacity` and `color` lines with:

   ```ts
   border: `4px solid ${c.text}`,
   backgroundColor: active ? c.accent : STICKER_FILL,
   boxShadow: `5px 5px 0 ${c.text}`,
   opacity: active || done ? 1 : 0.55,
   color: active ? ON_COLOR : c.text,
   ```

- [ ] **Step 3: Captions in a sticker with a highlighted word**

In `src/frame/Captions.tsx`:
1. Import `HIGHLIGHT` from `../brand/tokens` and `stickerStyle` from `../brand/sticker`. Replace `FONT_HEAD, WEIGHT_HEAD` with `FONT_BODY, WEIGHT_CAPTION` in the theme import.
2. Above the component, add:

   ```ts
   const PAD_X = 22;
   const PAD_Y = 10;
   const STICKER = { radius: 24, border: 5, shadow: 6 };
   // Room the sticker takes from the captions box, so text never pushes it out.
   const INSET_X = 2 * (PAD_X + STICKER.border) + STICKER.shadow;
   const INSET_Y = 2 * (PAD_Y + STICKER.border) + STICKER.shadow;
   ```

3. `measure` must use `fontFamily: FONT_BODY, fontWeight: WEIGHT_CAPTION`.
4. Layout against the inner box: `layoutPage(page, measure, { width: box.width - INSET_X, height: box.height - INSET_Y }, captionsBaseSize)`. Keep `box` in the `useMemo` deps.
5. Outer div:
   - `fontFamily: FONT_BODY`, `fontWeight: WEIGHT_CAPTION`;
   - delete the `textShadow` line;
   - keep `color: c.text` and the existing position/flex props.
6. Wrap the lines in a sticker:

   ```tsx
   <div style={{ ...stickerStyle(c, STICKER), padding: `${PAD_Y}px ${PAD_X}px` }}>
     {layout.lines.map(/* unchanged */)}
   </div>
   ```

7. Active word: replace `color: active ? c.accent : c.text` with

   ```ts
   color: c.text,
   backgroundColor: active ? HIGHLIGHT : "transparent",
   borderRadius: 10,
   padding: "0 6px",
   margin: `0 ${wi < line.length - 1 ? layout.gapPx - 6 : -6}px 0 -6px`,
   ```

   and delete the old `marginRight` line. The negative margins cancel the padding, so word positions stay where `layoutPage` put them.

- [ ] **Step 4: Scene titles as slapped stickers**

In `src/compositions/SceneRenderer.tsx`:
1. Import `slap` from `../brand/motion` and `stickerStyle` from `../brand/sticker`.
2. Replace the title `<div>` with:

   ```tsx
   <div style={{ display: "flex", justifyContent: "center" }}>
     <div
       style={{
         ...headStyle(84),
         ...stickerStyle(c),
         padding: "14px 40px 8px",
         textAlign: "center",
         whiteSpace: "nowrap",
         ...slap(frame, fps, 0),
       }}
     >
       <AccentText value={scene.title} />
     </div>
   </div>
   ```

3. Delete the now-unused `title` constant (`enter(frame, fps, 0)`). Keep the `pop` cue from Task 4.

- [ ] **Step 5: Verify (the slot check must be green again) and commit**

Run: `npm test && npm run lint && npm run check`
Expected: every example prints `✓ 9x16: … slot clear` and `✓ 4x5: … slot clear`.
- Fit warnings (`scaled to 0.8x`) are allowed at this stage.
- Any `pixels changed inside the talent slot` failure is a bug in Step 1: the mat must use `inset: -slotClearance` and the same radius as `slotRegion`.

Run: `npx remotion still Episode out/frame-120.png --frame=120 --public-dir examples/dani-chocolate`
Expected: peach background, step pills with ink borders, captions in a white sticker with one word highlighted yellow, the slot on a white mat with a coral name pill.

```bash
git add src/frame src/compositions/SceneRenderer.tsx
git commit -m "feat(brand): sticker frame (slot mat, step pills, caption sticker, slapped scene titles)"
```

---

### Task 7: Social-network icons

**Files:**
- Create: `src/icons/sets/social.tsx`
- Modify: `src/icons/names.ts`, `src/icons/index.tsx`, `tests/icons.test.ts`

**Interfaces:**
- Produces:
  - `SOCIAL_ICON_NAMES = ["instagram", "tiktok", "whatsapp", "facebook"] as const`;
  - `type SocialIconName`;
  - `SOCIAL_ICONS`;
  - `SOCIAL_COLORS: Record<SocialIconName, string>`;
  - the four names in `ICON_NAMES`, so they also work as `iconName` in schemas.

- [ ] **Step 1: Write the failing test**

In `tests/icons.test.ts`:
1. Change `expect(ICON_NAMES.length).toBe(68);` to `toBe(72)`.
2. Import `SOCIAL_COLORS` from `../src/icons/sets/social`.
3. Append:

```ts
it("includes the social icons with their official colors", () => {
  for (const name of ["instagram", "tiktok", "whatsapp", "facebook"]) {
    expect(ICON_NAMES).toContain(name);
  }
  expect(SOCIAL_COLORS).toEqual({ instagram: "#D62976", tiktok: "#111111", whatsapp: "#25D366", facebook: "#1877F2" });
});
```

Run: `npx vitest run tests/icons.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement**

In `src/icons/names.ts`, add above `ICON_NAMES`:

```ts
export const SOCIAL_ICON_NAMES = ["instagram", "tiktok", "whatsapp", "facebook"] as const;
export type SocialIconName = (typeof SOCIAL_ICON_NAMES)[number];
```

Then append to the `ICON_NAMES` list:

```ts
  // social networks (close)
  ...SOCIAL_ICON_NAMES,
```

`src/icons/sets/social.tsx`:

```tsx
import type { SocialIconName } from "../names";
import { icon, type IconComponent } from "../svg";

// Drawn on a 24-unit grid and scaled to the 100×100 icon grid. Single color; the Close passes SOCIAL_COLORS.
const S = 100 / 24;
const g24 = (children: React.ReactNode) => <g transform={`scale(${S})`}>{children}</g>;

export const SOCIAL_COLORS: Record<SocialIconName, string> = {
  instagram: "#D62976",
  tiktok: "#111111",
  whatsapp: "#25D366",
  facebook: "#1877F2",
};

export const SOCIAL_ICONS = {
  instagram: icon((c) =>
    g24(
      <>
        <rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke={c} strokeWidth="2.4" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke={c} strokeWidth="2.4" />
        <circle cx="17.3" cy="6.7" r="1.4" fill={c} />
      </>,
    ),
  ),
  tiktok: icon((c) =>
    g24(<path d="M14 3h3c.3 2.2 1.7 3.6 4 3.9v3.1c-1.5 0-2.9-.4-4-1.2V15a6 6 0 1 1-6-6h.6v3.2a2.9 2.9 0 1 0 2.4 2.8V3z" fill={c} />),
  ),
  whatsapp: icon((c) =>
    g24(
      <>
        <path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" />
        <path
          d="M8.6 7.6c.3-.6.6-.6.9-.6h.6c.2 0 .4.1.5.4l.8 1.9c.1.3 0 .5-.1.7l-.6.7c-.1.2-.1.4 0 .5.7 1.2 1.6 2.1 2.8 2.8.2.1.4.1.5 0l.7-.8c.2-.2.4-.2.7-.1l1.8.9c.3.1.4.3.4.5 0 .9-.6 1.8-1.5 2-1 .2-2.5 0-4.6-1.5-1.8-1.3-3-3.1-3.3-4.2-.3-1.2.1-2.3.4-2.9z"
          fill={c}
        />
      </>,
    ),
  ),
  facebook: icon((c) =>
    g24(<path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z" fill={c} />),
  ),
} satisfies Record<SocialIconName, IconComponent>;
```

In `src/icons/index.tsx`, import `SOCIAL_ICONS` from `./sets/social` and add `...SOCIAL_ICONS,` at the end of `ICONS`.

- [ ] **Step 3: Verify and commit**

Run: `npx vitest run tests/icons.test.ts && npm run lint`
Expected: PASS (the `describe.each` renders all 72 icons), clean.

Optional visual check: `npx remotion still IconSheet out/icons.png --public-dir examples/smoke`. The last row shows the four logos.

```bash
git add src/icons tests/icons.test.ts
git commit -m "feat(icons): instagram, tiktok, whatsapp and facebook icons with official colors"
```

---

### Task 8: Close: coral finale with social stickers

**Files:**
- Create: `src/blocks/Close.cues.ts`, `tests/brand/cues/close.test.ts`
- Modify: `src/blocks/Close.tsx`, `src/blocks/cues.ts`

**Interfaces:**
- Consumes: `CueFn` (Task 4), `STAGGER` (`src/frame/timing.ts`), `SOCIAL_COLORS`, `SocialIconName` (Task 7), `drop` (Task 2), `stickerStyle`, `HIGHLIGHT`, `ON_COLOR`, `inkShadow` (Task 1).
- Produces:
  - `ACTIONS_AT`, `BRAND_AT`, `CONTACT_AT`, `TEASER_AT`;
  - `closeContacts(handles) → { icon: SocialIconName; text: string }[]`;
  - `contactAt(timing, i) → number`;
  - `closeCues: CueFn<"Close">`.

- [ ] **Step 1: Write the failing test**

`tests/brand/cues/close.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CONTACT_AT, closeContacts, closeCues } from "../../../src/blocks/Close.cues";
import { STAGGER, beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const timing = beatTiming(0, 135);
const all = { instagram: "@dogtora.dani", tiktok: "@dogtora.dani", whatsapp: "300 123 4567", facebook: "Dogtora Dani" };

describe("closeContacts", () => {
  it("lists networks in order, skipping empty handles", () => {
    expect(closeContacts({ ...all, tiktok: "" }).map((c) => c.icon)).toEqual(["instagram", "whatsapp", "facebook"]);
    expect(closeContacts({ instagram: "", tiktok: "", whatsapp: "", facebook: "" })).toEqual([]);
  });
  it("shows the WhatsApp number as written", () => {
    expect(closeContacts(all)[2]).toEqual({ icon: "whatsapp", text: "300 123 4567" });
  });
});

describe("closeCues", () => {
  const props = sampleProps("Close");
  it("boings once per contact, STAGGER apart", () => {
    const talent = { ...BRAND_TALENT, handles: all };
    const boings = closeCues(props, timing, talent).filter((c) => c.name === "boing");
    expect(boings.map((c) => c.at)).toEqual([0, 1, 2, 3].map((i) => timing.at(CONTACT_AT) + i * STAGGER));
  });
  it("has no boing without handles", () => {
    const talent = { ...BRAND_TALENT, handles: { instagram: "", tiktok: "", whatsapp: "", facebook: "" } };
    expect(closeCues(props, timing, talent).some((c) => c.name === "boing")).toBe(false);
  });
  it("ticks once per action icon", () => {
    expect(closeCues(props, timing, BRAND_TALENT).filter((c) => c.name === "tick")).toHaveLength(props.actions.length);
  });
});
```

Run: `npx vitest run tests/brand/cues/close.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the cues**

`src/blocks/Close.cues.ts`:

```ts
import type { Talent } from "../episode/talent";
import { STAGGER, type BeatTiming } from "../frame/timing";
import type { SocialIconName } from "../icons/names";
import type { CueFn } from "./cue-types";

// Fractions of a 135-frame reference beat.
export const ACTIONS_AT = 30 / 135;
export const BRAND_AT = 45 / 135;
export const CONTACT_AT = 60 / 135;
export const TEASER_AT = 75 / 135;

export const closeContacts = (h: Talent["handles"]): { icon: SocialIconName; text: string }[] =>
  (
    [
      { icon: "instagram", text: h.instagram },
      { icon: "tiktok", text: h.tiktok },
      { icon: "whatsapp", text: h.whatsapp },
      { icon: "facebook", text: h.facebook },
    ] as const
  )
    .filter((c) => c.text)
    .map((c) => ({ ...c }));

export const contactAt = (timing: BeatTiming, i: number) => timing.at(CONTACT_AT) + i * STAGGER;

export const closeCues: CueFn<"Close"> = (props, timing, talent) => [
  ...props.actions.map((_, i) => ({ name: "tick" as const, at: timing.at(ACTIONS_AT) + i * STAGGER })),
  ...closeContacts(talent.handles).map((_, i) => ({ name: "boing" as const, at: contactAt(timing, i) })),
];
```

Register it in `src/blocks/cues.ts`: `import { closeCues } from "./Close.cues";` and set `BLOCK_CUES = { Close: closeCues }`. Later tasks add entries to this same object literal.

Run: `npx vitest run tests/brand/cues/close.test.ts`
Expected: PASS.

- [ ] **Step 3: Rewrite the component**

Replace `src/blocks/Close.tsx`:

```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { drop } from "../brand/motion";
import { stickerStyle } from "../brand/sticker";
import { HIGHLIGHT, ON_COLOR, inkShadow } from "../brand/tokens";
import { AccentText } from "../frame/AccentText";
import { usePalette, useTalent } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_BODY, WEIGHT_BODY, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, STAGGER, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { SOCIAL_COLORS } from "../icons/sets/social";
import { ACTIONS_AT, BRAND_AT, TEASER_AT, closeContacts, contactAt } from "./Close.cues";
import type { BlockComponent } from "./types";

const BOUNCE_FRAMES = 16;
const LINE_MAX_WIDTH = 900;
const CONTACT_TEXT_MAX = 380;
const CONTACT_STICKER = { radius: 24, border: 5, shadow: 6 };

export const Close: BlockComponent<"Close"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const talent = useTalent();
  const { at } = timing;
  const head = enter(frame, fps, 0);
  const brand = enter(frame, fps, at(BRAND_AT));
  const teaser = enter(frame, fps, at(TEASER_AT));
  const contacts = closeContacts(talent.handles);
  const shadow = inkShadow(5, c);

  const profLine = `${talent.profession} · ${talent.city}`;
  const profSize = fitFontSize(profLine, LINE_MAX_WIDTH, 44, FONT_BODY, WEIGHT_BODY);

  // Coral close: white headline with a hard ink shadow, ink name, social stickers that drop in.
  // No fade-out: the end holds a static frame so the loop is clean.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ opacity: head, translate: `0px ${interpolate(head, [0, 1], [30, 0])}px`, color: ON_COLOR, textShadow: shadow }}>
        <div style={{ ...headStyle(80), whiteSpace: "nowrap" }}>{props.line1}</div>
        <div style={{ ...headStyle(80), display: "flex", alignItems: "center", justifyContent: "center", gap: 18, whiteSpace: "nowrap" }}>
          <span>
            <AccentText value={props.line2} accentStyle={{ fontSize: 140, lineHeight: 1, color: HIGHLIGHT }} />
          </span>
          {props.accentIcon ? <Icon name={props.accentIcon} size={92} color={HIGHLIGHT} accent={c.text} /> : null}
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
                key={`${i}-${name}`}
                name={name}
                size={92}
                color={ON_COLOR}
                style={{
                  opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                  scale: interpolate(p, [0, 1], [0.3, 1]),
                  translate: `0px ${-24 * Math.sin(bounce)}px`,
                  filter: `drop-shadow(4px 4px 0 ${c.text})`,
                }}
              />
            );
          })}
        </div>
      ) : null}
      <div style={{ marginTop: 20, opacity: brand, translate: `0px ${interpolate(brand, [0, 1], [24, 0])}px` }}>
        <div style={{ ...headStyle(72), color: c.text }}>{talent.displayName}</div>
        <div style={{ ...bodyStyle(profSize), color: c.text, whiteSpace: "nowrap" }}>{profLine}</div>
      </div>
      {contacts.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: contacts.length > 2 ? "repeat(2, max-content)" : "max-content",
            justifyContent: "center",
            gap: "14px 22px",
            marginTop: 18,
          }}
        >
          {contacts.map((contact, i) => (
            <div
              key={contact.icon}
              style={{
                ...stickerStyle(c, CONTACT_STICKER),
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 22px 8px 14px",
                ...drop(frame, fps, contactAt(timing, i), 200),
              }}
            >
              <Icon name={contact.icon} size={52} color={SOCIAL_COLORS[contact.icon]} />
              <span style={{ ...bodyStyle(fitFontSize(contact.text, CONTACT_TEXT_MAX, 40, FONT_BODY, WEIGHT_BODY)), whiteSpace: "nowrap" }}>
                {contact.text}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {props.teaser ? (
        <div
          style={{
            ...bodyStyle(40),
            ...stickerStyle(c, { tone: "ink", radius: 999, border: 4, shadow: 6 }),
            marginTop: 20,
            padding: "6px 26px",
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

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run lint && npm run check:gallery -- --block=Close && npm run check -- examples/smoke`
Expected: PASS. The gallery prints `✓ 9x16 Close: fit ≥0.85` (and 4x5). The smoke example renders its single Instagram handle.
- If the gallery fit drops under 0.85, reduce the headline from `headStyle(80)` to `headStyle(72)` and the accent from 140 to 124, then re-run.
- The gallery uses the smoke talent, which has only an Instagram handle. To see all four contacts, add `whatsapp` and `facebook` handles to `examples/dani-chocolate/talent.json` and render `npx remotion still Episode out/close.png --frame=880 --public-dir examples/dani-chocolate`. Leave those handles in the example only if they are clearly placeholders (`"@dogtora.dani"`). Do not invent a real phone number: use `"300 000 0000"`.

```bash
git add src/blocks/Close.tsx src/blocks/Close.cues.ts src/blocks/cues.ts tests/brand/cues/close.test.ts examples
git commit -m "feat(blocks): coral Close with social stickers that drop in with a boing"
```

---

### Task 9: Pop blocks (Hook, Definition, Compare, Versus)

**Files:**
- Create: `src/blocks/{Hook,Definition,Compare,Versus}.cues.ts`, `tests/brand/cues/pop-blocks.test.ts`
- Modify: `src/blocks/{Hook,Definition,Compare,Versus}.tsx`, `src/blocks/cues.ts`

**Interfaces:**
- Consumes: `CueFn`, `stickerStyle`, `slap`, `popIn`, `jelly`, `inkShadow`, `TILT`, `STICKER_FILL`.
- Produces: `hookCues`, `definitionCues`, `compareCues`, `versusCues`, plus each block's keyframe constants, now exported from its `.cues.ts`. The component imports them from there and drops its local copies.

- [ ] **Step 1: Write the failing test**

`tests/brand/cues/pop-blocks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HERO_AT, STAMP_AT, BITES, hookCues } from "../../../src/blocks/Hook.cues";
import { ICON_AT, definitionCues } from "../../../src/blocks/Definition.cues";
import { CONCLUSION_AT, ITEMS_AT, compareCues } from "../../../src/blocks/Compare.cues";
import { SIDES_AT, VS_AT, WINNER_AT, versusCues } from "../../../src/blocks/Versus.cues";
import { STAGGER, beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const t = beatTiming(0, 105);

describe("Hook", () => {
  const base = sampleProps("Hook");
  it("ticks per bite and pops the stamp", () => {
    const cues = hookCues({ ...base, hero: { ...base.hero, animation: "bites" }, stamp: "paw" }, t, BRAND_TALENT);
    expect(cues).toEqual([...BITES.map((f) => ({ name: "tick", at: t.at(f) })), { name: "pop", at: t.at(STAMP_AT) }]);
  });
  it("pops a pop hero and bonks a shaking one", () => {
    expect(hookCues({ ...base, hero: { ...base.hero, animation: "pop" }, stamp: undefined }, t, BRAND_TALENT)).toEqual([
      { name: "pop", at: t.at(HERO_AT) },
    ]);
    expect(hookCues({ ...base, hero: { ...base.hero, animation: "shake" }, stamp: undefined }, t, BRAND_TALENT)).toEqual([
      { name: "bonk", at: t.at(HERO_AT) },
    ]);
  });
});

describe("Definition", () => {
  it("pops the icon", () => {
    expect(definitionCues(sampleProps("Definition"), t, BRAND_TALENT)).toEqual([{ name: "pop", at: t.at(ICON_AT) }]);
  });
});

describe("Compare", () => {
  const props = sampleProps("Compare");
  it("pops each item STAGGER apart and dings the conclusion", () => {
    const cues = compareCues(props, t, BRAND_TALENT);
    expect(cues.filter((c) => c.name === "pop").map((c) => c.at)).toEqual(props.items.map((_, i) => t.at(ITEMS_AT) + i * STAGGER));
    expect(cues.some((c) => c.name === "ding" && c.at === t.at(CONCLUSION_AT))).toBe(Boolean(props.conclusion));
  });
});

describe("Versus", () => {
  const props = sampleProps("Versus");
  it("pops the sides and the VS badge", () => {
    const pops = versusCues(props, t, BRAND_TALENT).filter((c) => c.name === "pop");
    expect(pops.map((c) => c.at)).toEqual([t.at(SIDES_AT), t.at(VS_AT)]);
  });
  it("chimes only when some row has a winner", () => {
    const noWinner = { ...props, rows: props.rows.map((r) => ({ ...r, winner: undefined })) };
    expect(versusCues(noWinner, t, BRAND_TALENT).some((c) => c.name === "chime")).toBe(false);
    const withWinner = { ...props, rows: props.rows.map((r, i) => ({ ...r, winner: i === 0 ? ("left" as const) : undefined })) };
    expect(versusCues(withWinner, t, BRAND_TALENT)).toContainEqual({ name: "chime", at: t.at(WINNER_AT) });
  });
});
```

If the Hook schema's shake value is not literally `"shake"`, check `src/blocks/Hook.schema.ts` for the `hero.animation` enum and use its third value. The component's fallback branch (`decay`/`wobble`) is the shake.

Run: `npx vitest run tests/brand/cues/pop-blocks.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the four cue files**

`src/blocks/Hook.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

// Fractions of the hook beat (reference: frames of a 90-frame hook).
export const BITES = [10 / 90, 22 / 90, 34 / 90];
export const HERO_AT = 10 / 90;
export const SHAKE_END = 40 / 90;
export const STAMP_AT = 40 / 90;
export const PULSE_FROM = 45 / 90;
export const PULSE_TO = 60 / 90;

export const hookCues: CueFn<"Hook"> = (props, { at }) => [
  ...(props.hero.animation === "bites"
    ? BITES.map((f) => ({ name: "tick" as const, at: at(f) }))
    : [{ name: props.hero.animation === "pop" ? ("pop" as const) : ("bonk" as const), at: at(HERO_AT) }]),
  ...(props.stamp ? [{ name: "pop" as const, at: at(STAMP_AT) }] : []),
];
```

`src/blocks/Definition.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

export const ICON_AT = 0.04;
export const TERM_FROM = 0.1;
export const TERM_TO = 0.3;
export const UNDERLINE_FROM = 0.3;
export const UNDERLINE_TO = 0.4;
export const CATEGORY_AT = 0.2;
export const PRONUNCIATION_AT = 0.28;
export const MEANING_AT = 0.4;
export const MEANING_SPAN = 0.35;

export const definitionCues: CueFn<"Definition"> = (_props, { at }) => [{ name: "pop", at: at(ICON_AT) }];
```

`src/blocks/Compare.cues.ts`:

```ts
import { STAGGER } from "../frame/timing";
import type { CueFn } from "./cue-types";

// Fractions of a 105-frame reference beat.
export const ITEMS_AT = 18 / 105;
export const METER_FROM = 36 / 105;
export const METER_TO = 90 / 105;
export const CONCLUSION_AT = 60 / 105;

export const compareCues: CueFn<"Compare"> = (props, { at }) => [
  ...props.items.map((_, i) => ({ name: "pop" as const, at: at(ITEMS_AT) + i * STAGGER })),
  ...(props.conclusion ? [{ name: "ding" as const, at: at(CONCLUSION_AT) }] : []),
];
```

`src/blocks/Versus.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

export const SIDES_AT = 0.04;
export const VS_AT = 0.12;
export const ROWS_FROM = 0.22;
export const ROWS_SPAN = 0.4;
export const WINNER_AT = 0.72;

export const versusCues: CueFn<"Versus"> = (props, { at }) => [
  { name: "pop", at: at(SIDES_AT) },
  { name: "pop", at: at(VS_AT) },
  ...(props.rows.some((r) => r.winner === "left" || r.winner === "right") ? [{ name: "chime" as const, at: at(WINNER_AT) }] : []),
];
```

Register all four in `BLOCK_CUES` (`Hook: hookCues, Definition: definitionCues, Compare: compareCues, Versus: versusCues`).

Run: `npx vitest run tests/brand/cues/pop-blocks.test.ts`
Expected: PASS.

- [ ] **Step 3: Restyle the components**

Every component deletes its local keyframe constants and imports them from its `.cues.ts`.

**Hook** (`src/blocks/Hook.tsx`):
- import `stickerStyle` from `../brand/sticker`, `jelly` from `../brand/motion` and `TILT` from `../brand/tokens`; remove `pulse` from the timing import.
- Wrap the `line1` and `line2` divs in a white sticker. There is no entrance: frame 0 is the thumbnail.

  ```tsx
  <div style={{ ...stickerStyle(c), padding: "22px 44px 26px", rotate: `${TILT}deg` }}>
    {/* line1 div unchanged */}
    {/* line2 div: replace `scale: pulse(…)` with `...jelly(frame, at(PULSE_FROM))` */}
  </div>
  ```

- Chip: replace `color: c.text`, `borderRadius` and `border` with `...stickerStyle(c, { tone: "ink", radius: 999, border: 4, shadow: 6 })`. Set `marginTop: 26`.
- `PULSE_TO` becomes unused in the component. Keep it exported from the cues file, because the jelly length is fixed (`JELLY_FRAMES`).

**Definition** (`src/blocks/Definition.tsx`):
- Icon circle: replace `backgroundColor: c.bg2`, `border: \`5px solid ${c.accent}\`` and `boxSizing` with `...stickerStyle(c, { radius: ICON_BOX / 2 })`. Keep the opacity and scale from `iconIn`.
- Category pill: replace `color: c.bg`, `backgroundColor: c.accent` and `borderRadius: 999` with `...stickerStyle(c, { tone: "accent", radius: 999, border: 4, shadow: 5 })`.

**Compare** (`src/blocks/Compare.tsx`):
- Item column: replace `opacity: p, translate: …` with `...slap(frame, fps, at(ITEMS_AT) + i * STAGGER, i % 2 ? 3 : -3)` and delete `const p = enter(…)`.
- Swatch: replace `borderRadius: 32`, `backgroundColor: …` and `boxShadow: …` with `...stickerStyle(c, { radius: 32, fill: item.color ? resolveColor(item.color, c) : STICKER_FILL })`.
- Remove `enter` from the imports if it is now unused.

**Versus** (`src/blocks/Versus.tsx`):
- VS badge: replace `backgroundColor: c.accent`, `color: c.bg`, `borderRadius` and the two `interpolate(vs, …)` lines with

  ```ts
  ...stickerStyle(c, { tone: "accent", radius: VS_SIZE / 2, border: 5, shadow: 6 }),
  ...popIn(frame, fps, at(VS_AT)),
  rotate: "-6deg",
  ```

  Then delete `const vs = pop(…)`. The badge's `lineHeight` becomes `` `${VS_SIZE - 10 + 6}px` `` because the border eats 10 px of the box.
- Add `textShadow: inkShadow(3, c)` to the winner value text when `isWinner && frame >= at(WINNER_AT)`.

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run lint && npm run check:gallery -- --block=Hook,Definition,Compare,Versus`
Expected: PASS, and every sample has `fit ≥ 0.85`.
- If Hook fails the fit, lower `line2` from `headStyle(120)` to `headStyle(108)`.
- For any other block, drop its largest `headStyle`/`bodyStyle` by 8 px and re-run. Note each adjustment in the commit body.

Run `npm run check` too. Expected: green (warnings allowed).

```bash
git add src/blocks tests/brand/cues/pop-blocks.test.ts
git commit -m "feat(blocks): sticker Hook, Definition, Compare and Versus with pop cues"
```

---

### Task 10: Data blocks (BigStat, Gauge, Proportion, Quantity, Trend)

**Files:**
- Create: `src/blocks/{BigStat,Gauge,Proportion,Quantity,Trend}.cues.ts`, `tests/brand/cues/data-blocks.test.ts`
- Modify: `src/blocks/{BigStat,Gauge,Proportion,Quantity,Trend}.tsx`, `src/blocks/parts/QuantityBars.tsx`, `src/blocks/cues.ts`

**Interfaces:**
- Consumes: `CueFn`, `jelly`, `inkShadow`, `stickerStyle`, `zoneIndex` (`Gauge.schema.ts`).
- Produces:
  - `bigStatCues`, `gaugeCues`, `proportionCues`, `quantityCues`, `trendCues`;
  - `quantityRowTimes(rows, timing) → { from: number; to: number }[]` (the component uses it too).

- [ ] **Step 1: Write the failing test**

`tests/brand/cues/data-blocks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COUNT_END, bigStatCues } from "../../../src/blocks/BigStat.cues";
import { NEEDLE_TO, gaugeCues } from "../../../src/blocks/Gauge.cues";
import { FILL_TO, proportionCues } from "../../../src/blocks/Proportion.cues";
import { quantityCues, quantityRowTimes } from "../../../src/blocks/Quantity.cues";
import { ANNOTATE_AT, LINE_TO, trendCues } from "../../../src/blocks/Trend.cues";
import { zoneIndex } from "../../../src/blocks/Gauge.schema";
import { beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const t = beatTiming(0, 150);

it("BigStat dings when the count lands", () => {
  expect(bigStatCues(sampleProps("BigStat"), t, BRAND_TALENT)).toEqual([{ name: "ding", at: t.at(COUNT_END) }]);
});

describe("Gauge", () => {
  const props = sampleProps("Gauge");
  it("dings on a safe zone and bonks on a danger zone", () => {
    const zones = props.zones.map((z) => ({ ...z }));
    const active = zoneIndex(zones, props.value);
    zones[active].tone = "ok";
    expect(gaugeCues({ ...props, zones }, t, BRAND_TALENT)).toEqual([{ name: "ding", at: t.at(NEEDLE_TO) }]);
    zones[active].tone = "danger";
    expect(gaugeCues({ ...props, zones }, t, BRAND_TALENT)).toEqual([{ name: "bonk", at: t.at(NEEDLE_TO) }]);
  });
});

it("Proportion dings when the fill lands", () => {
  expect(proportionCues(sampleProps("Proportion"), t, BRAND_TALENT)).toEqual([{ name: "ding", at: t.at(FILL_TO) }]);
});

describe("Quantity", () => {
  const props = sampleProps("Quantity");
  const q = beatTiming(0, 255);
  it("dings once, when the last bar lands", () => {
    const rows = quantityRowTimes(props.rows, q);
    expect(quantityCues(props, q, BRAND_TALENT)).toEqual([{ name: "ding", at: rows[rows.length - 1].to }]);
  });
  it("row times increase and stay inside the beat", () => {
    const rows = quantityRowTimes(props.rows, q);
    rows.forEach((r, i) => {
      expect(r.to).toBeGreaterThan(r.from);
      if (i) expect(r.from).toBeGreaterThan(rows[i - 1].from);
      expect(r.to).toBeLessThanOrEqual(255);
    });
  });
});

describe("Trend", () => {
  const props = sampleProps("Trend");
  it("dings at the end of the line and pops the annotation", () => {
    const cues = trendCues(props, t, BRAND_TALENT);
    expect(cues[0]).toEqual({ name: "ding", at: t.at(LINE_TO) });
    expect(cues.some((c) => c.name === "pop" && c.at === t.at(ANNOTATE_AT))).toBe(Boolean(props.annotate));
  });
});
```

Run: `npx vitest run tests/brand/cues/data-blocks.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the five cue files**

`src/blocks/BigStat.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

export const NUMBER_AT = 0.1;
export const COUNT_END = 0.45;
export const LABEL_AT = 0.3;
export const SOURCE_AT = 0.45;

export const bigStatCues: CueFn<"BigStat"> = (_props, { at }) => [{ name: "ding", at: at(COUNT_END) }];
```

`src/blocks/Gauge.cues.ts`:

```ts
import type { CueFn } from "./cue-types";
import { zoneIndex } from "./Gauge.schema";

export const ZONES_FROM = 0.04;
export const ZONES_TO = 0.25;
export const NEEDLE_FROM = 0.3;
export const NEEDLE_TO = 0.55;
export const LEGEND_AT = 0.6;

export const gaugeCues: CueFn<"Gauge"> = (props, { at }) => [
  { name: props.zones[zoneIndex(props.zones, props.value)].tone === "danger" ? "bonk" : "ding", at: at(NEEDLE_TO) },
];
```

`src/blocks/Proportion.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

export const TRACK_FROM = 0.05;
export const TRACK_TO = 0.2;
export const FILL_AT = 0.3;
export const FILL_TO = 0.55;
export const FILL_SPAN = 0.25;
export const LABEL_AT = 0.4;
export const SOURCE_AT = 0.55;

export const proportionCues: CueFn<"Proportion"> = (_props, { at }) => [{ name: "ding", at: at(FILL_TO) }];
```

`src/blocks/Quantity.cues.ts`:

```ts
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

// Fractions of a 255-frame reference beat.
export const CHIP_AT = 18 / 255;
export const ROWS_FROM = 36;
export const ROWS_SPAN = 150;
export const HIGHLIGHT_AT = 190 / 255;
export const CONCLUSION_AT = 202 / 255;
export const FOOTNOTE_AT = 208 / 255;

/** When each bar starts and finishes growing: longer values take longer. */
export const quantityRowTimes = (rows: readonly { value: number }[], { at }: BeatTiming) => {
  const max = Math.max(...rows.map((r) => r.value));
  const step = ROWS_SPAN / rows.length;
  return rows.map((row, i) => {
    const from = ROWS_FROM + step * i;
    const length = step * (0.4 + 0.6 * (row.value / max));
    return { from: at(from / 255), to: at((from + length) / 255) };
  });
};

export const quantityCues: CueFn<"Quantity"> = (props, timing) => {
  const rows = quantityRowTimes(props.rows, timing);
  return [{ name: "ding", at: rows[rows.length - 1].to }];
};
```

`src/blocks/Trend.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

export const LINE_FROM = 0.08;
export const LINE_TO = 0.55;
export const AREA_FROM = 0.3;
export const AREA_TO = 0.6;
export const ANNOTATE_AT = 0.68;

export const trendCues: CueFn<"Trend"> = (props, { at }) => [
  { name: "ding", at: at(LINE_TO) },
  ...(props.annotate ? [{ name: "pop" as const, at: at(ANNOTATE_AT) }] : []),
];
```

Register all five in `BLOCK_CUES`.

Run: `npx vitest run tests/brand/cues/data-blocks.test.ts`
Expected: PASS.

- [ ] **Step 3: Restyle the components**

Each component deletes its local keyframe constants and imports them from its `.cues.ts`.

**BigStat:**
- Wrap the number `<div>` in `<div style={{ ...jelly(frame, at(COUNT_END)) }}>…</div>`, so the pop entrance (inner) and the jelly landing (outer) compose.
- Add `textShadow: inkShadow(6, c)` to the number div.

**Gauge:**
- Value div (`headStyle(96)`): add `textShadow: inkShadow(5, c)` and `...jelly(frame, at(NEEDLE_TO))`.
- Center hub: `<circle … fill={c.text} />` gets `stroke={STICKER_FILL} strokeWidth={6}` (import `STICKER_FILL`).

**Proportion:**
- Numerator `<span>` (`headStyle(140)`): add `textShadow: inkShadow(6, c)`, `display: "inline-block"` and `...jelly(frame, at(FILL_TO))`.

**Quantity:**
- Chip: replace `backgroundColor: c.bg2`, `border` and `borderRadius: 999` with `...stickerStyle(c, { radius: 999, border: 4, shadow: 6 })`.
- Row timing: replace the inline `rows` math with

  ```ts
  const times = quantityRowTimes(props.rows, timing);
  const rows = props.rows.map((row, i) => ({
    label: row.label,
    value: row.value,
    color: resolveColor(row.color, c),
    outline: row.outline ? resolveColor(row.outline, c) : undefined,
    ...times[i],
  }));
  ```

  and delete `max`/`step`.
- `src/blocks/parts/QuantityBars.tsx`: import `jelly` from `../../brand/motion` and `inkShadow` from `../../brand/tokens`.
  - Wrap the number `<div>` in `<div style={{ ...jelly(frame, row.to), transformOrigin: "left center" }}>…</div>`.
  - Add `textShadow: inkShadow(4, c)` to the number div.
  - On each square, replace the bar's inset `boxShadow` with `boxShadow: \`inset 0 -5px 0 rgba(0,0,0,0.18)\`` and add `border: \`3px solid ${c.text}\``, `boxSizing: "border-box"`.

**Trend:**
- Annotation bubble: replace `backgroundColor: c.bg2`, `border` and `borderRadius: 18` with `...stickerStyle(c, { radius: 18, border: 4, shadow: 5, borderColor: c.accent })`.
- Value text: add `textShadow: inkShadow(4, c)`.
- Point dots: `stroke={c.bg}` becomes `stroke={c.text}`.

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run lint && npm run check:gallery -- --block=BigStat,Gauge,Proportion,Quantity,Trend && npm run check`
Expected: PASS and `fit ≥ 0.85` everywhere. Apply the same 8 px reduction rule as Task 9 if needed, noted in the commit body.

```bash
git add src/blocks tests/brand/cues/data-blocks.test.ts
git commit -m "feat(blocks): data blocks land with jelly and a ding (bonk in a danger zone)"
```

---

### Task 11: Verdict blocks (Checklist, DoDont, MythFact, Decision)

**Files:**
- Create: `src/blocks/{Checklist,DoDont,MythFact,Decision}.cues.ts`, `tests/brand/cues/verdict-blocks.test.ts`
- Modify: `src/blocks/{Checklist,DoDont,MythFact,Decision}.tsx`, `src/blocks/cues.ts`

**Interfaces:**
- Consumes: `CueFn`, `Tone` (`schema-parts.ts`), `isFollowUp` (`Decision.schema.ts`), `stickerStyle`, `popIn`, `slap`, `wiggleDeg`.
- Produces:
  - `checklistCues`, `doDontCues`, `mythFactCues`, `decisionCues`;
  - `toneSfx(t: Tone): SfxName` (`ok`→`chime`, `warn`→`tick`, `danger`→`bonk`), exported from `Decision.cues.ts`;
  - `CHECK_DELAY = 4`.

- [ ] **Step 1: Write the failing test**

`tests/brand/cues/verdict-blocks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CHECK_DELAY, PILL_AFTER, checklistCues, rowAt } from "../../../src/blocks/Checklist.cues";
import { doDontCues, stampAt } from "../../../src/blocks/DoDont.cues";
import { FACT_AT, STAMP_AT, mythFactCues } from "../../../src/blocks/MythFact.cues";
import { NO_AT, QUESTION_AT, YES_AT, decisionCues, toneSfx } from "../../../src/blocks/Decision.cues";
import { beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const t = beatTiming(0, 105);

it("Checklist chimes per check and pops the pill", () => {
  const props = sampleProps("Checklist");
  const cues = checklistCues(props, t, BRAND_TALENT);
  expect(cues.filter((c) => c.name === "chime").map((c) => c.at)).toEqual(props.rows.map((_, i) => t.at(rowAt(i)) + CHECK_DELAY));
  expect(cues.some((c) => c.name === "pop" && c.at === t.at(rowAt(props.rows.length - 1) + PILL_AFTER))).toBe(Boolean(props.pill));
});

it("DoDont bonks a no and chimes a yes", () => {
  const props = sampleProps("DoDont");
  expect(doDontCues(props, t, BRAND_TALENT)).toEqual(
    props.cards.map((card, i) => ({ name: card.verdict === "no" ? "bonk" : "chime", at: t.at(stampAt(i)) })),
  );
});

it("MythFact bonks the myth and chimes the fact", () => {
  expect(mythFactCues(sampleProps("MythFact"), t, BRAND_TALENT)).toEqual([
    { name: "bonk", at: t.at(STAMP_AT) },
    { name: "chime", at: t.at(FACT_AT) },
  ]);
});

describe("Decision", () => {
  it("maps tones to sounds", () => {
    expect([toneSfx("ok"), toneSfx("warn"), toneSfx("danger")]).toEqual(["chime", "tick", "bonk"]);
  });
  it("pops the question and sounds each simple outcome by tone", () => {
    const props = sampleProps("Decision");
    const simple = {
      ...props,
      yes: { label: "Tranquilo", tone: "ok" as const },
      no: { label: "Urgencias", tone: "danger" as const },
    };
    expect(decisionCues(simple, t, BRAND_TALENT)).toEqual([
      { name: "pop", at: t.at(QUESTION_AT) },
      { name: "chime", at: t.at(YES_AT) },
      { name: "bonk", at: t.at(NO_AT) },
    ]);
  });
  it("sounds both outcomes of a follow-up question", () => {
    const props = sampleProps("Decision");
    const follow = {
      ...props,
      yes: { question: "¿Vomita?", yes: { label: "Ve ya", tone: "danger" as const }, no: { label: "Observa", tone: "warn" as const } },
      no: { label: "Tranquilo", tone: "ok" as const },
    };
    expect(decisionCues(follow as typeof props, t, BRAND_TALENT)).toEqual([
      { name: "pop", at: t.at(QUESTION_AT) },
      { name: "bonk", at: t.at(YES_AT + 0.11) },
      { name: "tick", at: t.at(YES_AT + 0.16) },
      { name: "chime", at: t.at(NO_AT) },
    ]);
  });
});
```

If the Decision follow-up schema (`src/blocks/Decision.schema.ts`) names its fields differently from `question` / `yes` / `no`, adjust the literal above to the schema; `isFollowUp` checks `"question" in b`.

Run: `npx vitest run tests/brand/cues/verdict-blocks.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the four cue files**

`src/blocks/Checklist.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

// Fractions of a 105-frame reference beat.
export const rowAt = (i: number) => (12 + 21 * i) / 105;
export const PILL_AFTER = 15 / 105;
/** Frames after a row enters until its check pops. */
export const CHECK_DELAY = 4;

export const checklistCues: CueFn<"Checklist"> = (props, { at }) => [
  ...props.rows.map((_, i) => ({ name: "chime" as const, at: at(rowAt(i)) + CHECK_DELAY })),
  ...(props.pill ? [{ name: "pop" as const, at: at(rowAt(props.rows.length - 1) + PILL_AFTER) }] : []),
];
```

`src/blocks/DoDont.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

// Fractions of a 105-frame reference beat.
export const slideAt = (i: number) => (18 + 12 * i) / 105;
export const stampAt = (i: number) => (42 + 18 * i) / 105;

export const doDontCues: CueFn<"DoDont"> = (props, { at }) =>
  props.cards.map((card, i) => ({ name: card.verdict === "no" ? ("bonk" as const) : ("chime" as const), at: at(stampAt(i)) }));
```

`src/blocks/MythFact.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

export const MYTH_AT = 0.05;
export const STRIKE_FROM = 0.35;
export const STRIKE_TO = 0.45;
export const STAMP_AT = 0.45;
export const FACT_AT = 0.55;

export const mythFactCues: CueFn<"MythFact"> = (_props, { at }) => [
  { name: "bonk", at: at(STAMP_AT) },
  { name: "chime", at: at(FACT_AT) },
];
```

`src/blocks/Decision.cues.ts`:

```ts
import type { SfxName } from "../brand/sfx";
import type { CueFn } from "./cue-types";
import { isFollowUp, type DecisionBranch } from "./Decision.schema";
import type { Tone } from "./schema-parts";

export const QUESTION_AT = 0.04;
export const LINES_FROM = 0.16;
export const LINES_TO = 0.26;
export const TAGS_AT = 0.26;
export const YES_AT = 0.32;
export const NO_AT = 0.42;
export const EMPHASIS_AT = 0.8;
/** A follow-up's own yes and no land this far (beat fraction) after the branch. */
export const FOLLOW_YES = 0.11;
export const FOLLOW_NO = 0.16;

export const toneSfx = (t: Tone): SfxName => (t === "ok" ? "chime" : t === "warn" ? "tick" : "bonk");

const branchCues = (b: DecisionBranch, branchAt: number, at: (f: number) => number) =>
  isFollowUp(b)
    ? [
        { name: toneSfx(b.yes.tone), at: at(branchAt + FOLLOW_YES) },
        { name: toneSfx(b.no.tone), at: at(branchAt + FOLLOW_NO) },
      ]
    : [{ name: toneSfx(b.tone), at: at(branchAt) }];

export const decisionCues: CueFn<"Decision"> = (props, { at }) => [
  { name: "pop", at: at(QUESTION_AT) },
  ...branchCues(props.yes, YES_AT, at),
  ...branchCues(props.no, NO_AT, at),
];
```

Register all four in `BLOCK_CUES`.

Run: `npx vitest run tests/brand/cues/verdict-blocks.test.ts`
Expected: PASS.

- [ ] **Step 3: Restyle the components**

Each component deletes its local keyframe constants and imports them from its `.cues.ts`.

**Checklist:**
- Check circle: replace `borderRadius: "50%"`, `border` and `boxSizing` with `...stickerStyle(c, { radius: CHECK_CIRCLE / 2, border: 5, shadow: 5 })`, and add `...popIn(frame, fps, start + CHECK_DELAY)`.
- The tick path's draw window becomes `[start + CHECK_DELAY, start + CHECK_DELAY + CHECK_DRAW_FRAMES]`.
- Pill: replace `borderRadius`, `backgroundColor: c.accent` and `color: c.bg` with `...stickerStyle(c, { tone: "accent", radius: 999, border: 4, shadow: 6 })`.

**DoDont:**
- Card: replace `borderRadius`, `backgroundColor: c.bg2`, `border` and `boxSizing` with `...stickerStyle(c, { radius: CARD.radius })`.
- Add `rotate: \`${(i === 0 ? -2 : 2) + (isNo ? wiggleDeg(frame, stampFrame) : 0)}deg\``. Import `wiggleDeg`.

**MythFact:**
- `card`: replace `borderRadius: 32`, `backgroundColor: c.bg2` and `border` with `...stickerStyle(c, { radius: 32 })`. Because `card` is built before `c` is used elsewhere, define it after `const c = usePalette();`, where it already is.
- Myth card: add `rotate: \`${-2 + wiggleDeg(frame, at(STAMP_AT))}deg\``.
- Fact card: add `rotate: "1.5deg"`.
- `Tag` keeps its styles. Its `ink` prop stays `c.bg`, which is now cream.

**Decision:**
- Question box: replace `borderRadius: 28`, `backgroundColor: c.bg2`, `border` and the `opacity`/`scale` lines with `...stickerStyle(c, { radius: 28 })` and `...slap(frame, fps, at(QUESTION_AT), -2)`. Delete `const question = enter(…)`.
- `outcomeBox`: replace `borderRadius: 24`, `border` and `backgroundColor` with `...stickerStyle(c, { radius: 24, border: 5, shadow: 6, borderColor: toneColor(t, c), fill: \`${toneColor(t, c)}22\` })`. Keep `boxSizing` (the sticker sets it too, so you may delete the duplicate).
- Follow-up question box: replace `borderRadius: 22`, `backgroundColor: c.bg2` and `border` with `...stickerStyle(c, { radius: 22, border: 4, shadow: 5 })`.
- Inner timings: replace the literal `0.11` / `0.16` in `branchView` with `FOLLOW_YES` / `FOLLOW_NO`. Replace `0.06` with `FOLLOW_YES - 0.05`; it is the inner connector's draw start. Keep the arithmetic identical: `branchAt + 0.06` is `branchAt + FOLLOW_YES - 0.05`.

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run lint && npm run check:gallery -- --block=Checklist,DoDont,MythFact,Decision && npm run check`
Expected: PASS, `fit ≥ 0.85` (same 8 px rule if needed).

```bash
git add src/blocks tests/brand/cues/verdict-blocks.test.ts
git commit -m "feat(blocks): verdict blocks wiggle and bonk on bad, pop and chime on good"
```

---

### Task 12: Sequence blocks (Chips, Timer, Process, Cycle, Timeline, Anatomy) and the Chip part

**Files:**
- Create: `src/blocks/{Chips,Timer,Process,Cycle,Timeline,Anatomy}.cues.ts`, `tests/brand/cues/sequence-blocks.test.ts`
- Modify: `src/blocks/{Chips,Timer,Process,Cycle,Timeline,Anatomy}.tsx`, `src/blocks/parts/Chip.tsx`, `src/blocks/cues.ts`

**Interfaces:**
- Consumes: `CueFn`, `mergeCues`, `MERGE_FRAMES` (Task 3), `stickerStyle`, `drop`, `popIn`, `jelly`.
- Produces:
  - `chipsCues`, `chipStagger(duration, count) → number`;
  - `timerCues`;
  - `processCues`, `processStepAt(timing, i, n) → number`;
  - `cycleCues`, `cycleNodeAt(timing, i, n) → number`;
  - `timelineCues`, `timelineDotAt(timing, i, n) → number`;
  - `anatomyCues`, `calloutStart(timing, i, count) → number`;
  - `<Chip icon label progress tilt?>`.

- [ ] **Step 1: Write the failing test**

`tests/brand/cues/sequence-blocks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FIRST_AT, chipStagger, chipsCues } from "../../../src/blocks/Chips.cues";
import { RING_FROM, RING_TO, timerCues } from "../../../src/blocks/Timer.cues";
import { HIGHLIGHT_AT as PROCESS_HL, processCues, processStepAt } from "../../../src/blocks/Process.cues";
import { cycleCues, cycleNodeAt } from "../../../src/blocks/Cycle.cues";
import { timelineCues, timelineDotAt } from "../../../src/blocks/Timeline.cues";
import { HIGHLIGHT_AT as ANATOMY_HL, anatomyCues, calloutStart } from "../../../src/blocks/Anatomy.cues";
import { MERGE_FRAMES, mergeCues } from "../../../src/brand/sfx";
import { beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const t = beatTiming(0, 150);

describe("Chips", () => {
  const props = sampleProps("Chips");
  it("ticks per chip with the component's stagger", () => {
    const s = chipStagger(t.duration, props.items.length);
    expect(chipsCues(props, t, BRAND_TALENT).map((c) => c.at)).toEqual(props.items.map((_, i) => t.at(FIRST_AT) + i * s));
  });
  it("does not machine-gun a long list in a short beat once merged", () => {
    const many = { ...props, items: Array.from({ length: 8 }, (_, i) => ({ ...props.items[0], label: `Ítem ${i}` })) };
    const short = beatTiming(0, 40);
    const merged = mergeCues(chipsCues(many, short, BRAND_TALENT));
    merged.slice(1).forEach((c, i) => expect(c.at - merged[i].at).toBeGreaterThanOrEqual(MERGE_FRAMES));
    expect(merged.length).toBeLessThan(8);
  });
});

it("Timer ticks when the ring starts and dings when it lands", () => {
  expect(timerCues(sampleProps("Timer"), t, BRAND_TALENT)).toEqual([
    { name: "tick", at: t.at(RING_FROM) },
    { name: "ding", at: t.at(RING_TO) },
  ]);
});

it("Process ticks per step and dings the highlight", () => {
  const props = sampleProps("Process");
  const cues = processCues(props, t, BRAND_TALENT);
  const n = props.steps.length;
  expect(cues.filter((c) => c.name === "tick").map((c) => c.at)).toEqual(props.steps.map((_, i) => processStepAt(t, i, n)));
  expect(cues.some((c) => c.name === "ding" && c.at === t.at(PROCESS_HL))).toBe(props.highlightStep !== undefined);
});

it("Cycle ticks per node", () => {
  const props = sampleProps("Cycle");
  const n = props.stages.length;
  expect(cycleCues(props, t, BRAND_TALENT)).toEqual(props.stages.map((_, i) => ({ name: "tick", at: cycleNodeAt(t, i, n) })));
});

it("Timeline ticks per event", () => {
  const props = sampleProps("Timeline");
  const n = props.events.length;
  expect(timelineCues(props, t, BRAND_TALENT)).toEqual(props.events.map((_, i) => ({ name: "tick", at: timelineDotAt(t, i, n) })));
});

it("Anatomy ticks per callout and dings the highlight", () => {
  const props = sampleProps("Anatomy");
  const count = props.callouts.length;
  const cues = anatomyCues(props, t, BRAND_TALENT);
  expect(cues.filter((c) => c.name === "tick").map((c) => c.at)).toEqual(props.callouts.map((_, i) => calloutStart(t, i, count)));
  expect(cues.some((c) => c.name === "ding" && c.at === t.at(ANATOMY_HL))).toBe(props.highlight !== undefined);
});
```

Run: `npx vitest run tests/brand/cues/sequence-blocks.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement the six cue files**

`src/blocks/Chips.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

export const FIRST_AT = 0.1;
export const MAX_STAGGER = 9;
export const ENTER_SPAN = 0.5;

export const chipStagger = (duration: number, count: number) => Math.min(MAX_STAGGER, (duration * ENTER_SPAN) / count);

export const chipsCues: CueFn<"Chips"> = (props, timing) => {
  const s = chipStagger(timing.duration, props.items.length);
  return props.items.map((_, i) => ({ name: "tick" as const, at: timing.at(FIRST_AT) + i * s }));
};
```

`src/blocks/Timer.cues.ts`:

```ts
import type { CueFn } from "./cue-types";

// Fractions of a 105-frame reference beat.
export const RING_FROM = 12 / 105;
export const RING_TO = 60 / 105;
export const chipAt = (i: number) => (45 + 9 * i) / 105;

export const timerCues: CueFn<"Timer"> = (_props, { at }) => [
  { name: "tick", at: at(RING_FROM) },
  { name: "ding", at: at(RING_TO) },
];
```

`src/blocks/Process.cues.ts`:

```ts
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

export const FIRST = 0.06;
export const SPAN = 0.45;
export const HIGHLIGHT_AT = 0.72;

export const processStepAt = ({ at }: BeatTiming, i: number, n: number) => at(FIRST + (SPAN * i) / n);

export const processCues: CueFn<"Process"> = (props, timing) => [
  ...props.steps.map((_, i) => ({ name: "tick" as const, at: processStepAt(timing, i, props.steps.length) })),
  ...(props.highlightStep !== undefined ? [{ name: "ding" as const, at: timing.at(HIGHLIGHT_AT) }] : []),
];
```

`src/blocks/Cycle.cues.ts`:

```ts
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

export const RING_FROM = 0.05;
export const RING_TO = 0.45;
export const CENTER_AT = 0.48;
export const DOT_FROM = 0.55;

/** A node pops when the ring reaches the middle of its arc. */
export const cycleNodeAt = ({ at }: BeatTiming, i: number, n: number) => at(RING_FROM + ((RING_TO - RING_FROM) * (2 * i + 1)) / (2 * n));

export const cycleCues: CueFn<"Cycle"> = (props, timing) =>
  props.stages.map((_, i) => ({ name: "tick" as const, at: cycleNodeAt(timing, i, props.stages.length) }));
```

`src/blocks/Timeline.cues.ts`:

```ts
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

export const LINE_FROM = 0.05;
export const LINE_TO = 0.55;

export const timelineDotAt = ({ at }: BeatTiming, i: number, n: number) => at(LINE_FROM + ((LINE_TO - LINE_FROM) * i) / (n - 1));

export const timelineCues: CueFn<"Timeline"> = (props, timing) =>
  props.events.map((_, i) => ({ name: "tick" as const, at: timelineDotAt(timing, i, props.events.length) }));
```

`src/blocks/Anatomy.cues.ts`:

```ts
import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

export const SUBJECT_AT = 0.04;
export const CALLOUTS_FROM = 0.18;
export const CALLOUTS_SPAN = 0.45;
export const HIGHLIGHT_AT = 0.75;

export const calloutStart = ({ at }: BeatTiming, i: number, count: number) => at(CALLOUTS_FROM + (CALLOUTS_SPAN * i) / count);

export const anatomyCues: CueFn<"Anatomy"> = (props, timing) => [
  ...props.callouts.map((_, i) => ({ name: "tick" as const, at: calloutStart(timing, i, props.callouts.length) })),
  ...(props.highlight !== undefined ? [{ name: "ding" as const, at: timing.at(HIGHLIGHT_AT) }] : []),
];
```

Register all six in `BLOCK_CUES`.

Run: `npx vitest run tests/brand/cues/sequence-blocks.test.ts`
Expected: PASS.

- [ ] **Step 3: Restyle the components**

Each component deletes its local keyframe constants and helpers and imports them from its `.cues.ts`: `chipStagger`, `processStepAt`, `cycleNodeAt`, `timelineDotAt`, `calloutStart`. Replace the local `stepAt`, `nodeFrame`, `dotFrame` and the inline `start` math with these helpers, called with the same arguments, so picture and sound use one formula.

**Chip** (`src/blocks/parts/Chip.tsx`):
- Add a `tilt?: number` prop (default `0`).
- Replace `borderRadius: 999`, `backgroundColor: c.bg2` and `border` with `...stickerStyle(c, { radius: 999, border: 4, shadow: 5 })`.
- Add `rotate: \`${tilt}deg\`` and `scale: interpolate(progress, [0, 1], [0.6, 1], CLAMP)`.

**Chips:** pass `tilt={i % 2 ? 2 : -2}`, and compute the stagger with `chipStagger(timing.duration, props.items.length)`.

**Timer:**
- Wrap `<ClockRing …/>` in `<div style={{ ...jelly(frame, at(RING_TO)) }}>…</div>`.
- Pass `tilt={i % 2 ? 2 : -2}` to each `Chip`.

**Process:**
- Circle: replace `backgroundColor: c.bg2`, `border` and `boxSizing` with

  ```ts
  ...stickerStyle(c, { radius: circle / 2, border: 5, shadow: 6, borderColor: isHighlight && frame >= highlightFrame ? c.accent : c.text }),
  ```

- Replace the `opacity`/`scale` lines from `p` with `...drop(frame, fps, processStepAt(timing, i, n), 120)`. Then, **after** that spread, add `...(isHighlight && frame >= highlightFrame ? { scale: pulse(frame, highlightFrame, 14, 1.12) } : {})`.
- Delete `const p = pop(…)`.
- Badge: replace `backgroundColor: c.accent` and `color: c.bg` with `...stickerStyle(c, { tone: "accent", radius: BADGE / 2, border: 4, shadow: 3 })`. Its `lineHeight` becomes `` `${BADGE - 8 + 4}px` ``.

**Cycle:**
- Node: replace `backgroundColor: c.bg2`, `border` and `boxSizing` with `...stickerStyle(c, { radius: CYCLE_NODE / 2, border: 5, shadow: 5 })`.
- Replace the `opacity`/`scale` from `p` with `...popIn(frame, fps, cycleNodeAt(timing, i, n))`, and delete `const p = pop(…)`.

**Timeline:**
- Dot: `border: \`4px solid ${c.bg}\`` becomes `border: \`4px solid ${c.text}\``.
- Replace the `opacity`/`scale` from `p` with `...popIn(frame, fps, timelineDotAt(timing, i, n))`, and delete `const p = pop(…)` for the dot.

**Anatomy:**
- Callout dots: `stroke={c.bg}` becomes `stroke={c.text}`.
- Use `calloutStart(timing, i, count)` for `start`.
- No sticker labels: they would crowd the diagram.

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run lint && npm run check:gallery -- --block=Chips,Timer,Process,Cycle,Timeline,Anatomy && npm run check`
Expected: PASS, `fit ≥ 0.85` (same 8 px rule if needed).

```bash
git add src/blocks tests/brand/cues/sequence-blocks.test.ts
git commit -m "feat(blocks): sequence blocks tick in order on sticker chips, nodes and steps"
```

---

### Task 13: Every block has cues, full verification, docs and release

**Files:**
- Create: `tests/brand/cues/all-blocks.test.ts`
- Modify: `src/blocks/cues.ts`, `commands/setup.md`, `README.md`, `package.json`, `../.claude-plugin/plugin.json`, the marketplace entry (find it with `grep -rn '"version"' ../.claude-plugin`)

**Interfaces:**
- Consumes: everything above.
- Produces: `BLOCK_CUES: { [K in BlockName]: CueFn<K> }` (total).

- [ ] **Step 1: Write the failing test**

`tests/brand/cues/all-blocks.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import samples from "../../../src/gallery/samples.json";
import { BLOCK_CUES, cuesFor } from "../../../src/blocks/cues";
import { BLOCK_SCHEMAS, type BlockName } from "../../../src/blocks/schemas";
import { SFX_NAMES } from "../../../src/brand/sfx";
import { validateEpisode, validateTalent } from "../../../src/episode/validate";
import { SCENE_IDS, resolveSceneStarts, sceneDurations, splitBeats, totalFrames } from "../../../src/frame/timing";
import { BRAND_TALENT } from "../samples";

it("every block has a cue function", () => {
  expect(Object.keys(BLOCK_CUES).sort()).toEqual(Object.keys(BLOCK_SCHEMAS).sort());
});

describe.each(samples as { block: BlockName; props: unknown; durationInFrames: number }[])("gallery $block", (sample) => {
  it("has at least one known cue, all inside the beat", () => {
    const [timing] = splitBeats(sample.durationInFrames, 1, 0.5);
    const props = BLOCK_SCHEMAS[sample.block].parse(sample.props);
    const cues = cuesFor(sample.block, props, timing, BRAND_TALENT);
    expect(cues.length).toBeGreaterThan(0);
    for (const cue of cues) {
      expect(SFX_NAMES).toContain(cue.name);
      expect(cue.at).toBeGreaterThanOrEqual(timing.from);
      expect(cue.at).toBeLessThanOrEqual(timing.from + timing.duration);
    }
  });
});

const examples = path.resolve(__dirname, "../../../examples");
describe.each(fs.readdirSync(examples).filter((d) => fs.existsSync(path.join(examples, d, "episode.json"))))("example %s", (dir) => {
  it("every beat's cues stay inside its beat", () => {
    const episode = validateEpisode(JSON.parse(fs.readFileSync(path.join(examples, dir, "episode.json"), "utf8")));
    const talent = validateTalent(JSON.parse(fs.readFileSync(path.join(examples, dir, "talent.json"), "utf8")));
    const total = totalFrames(episode.durationSeconds);
    const durations = sceneDurations(resolveSceneStarts(episode.sceneStarts, total).starts, total);
    SCENE_IDS.forEach((id, s) => {
      const scene = episode.scenes[id];
      splitBeats(durations[s], scene.beats.length, scene.split).forEach((timing, b) => {
        const beat = scene.beats[b];
        for (const cue of cuesFor(beat.block as BlockName, beat.props, timing, talent)) {
          expect(cue.at).toBeGreaterThanOrEqual(timing.from);
          expect(cue.at).toBeLessThanOrEqual(timing.from + timing.duration);
        }
      });
    });
  });
});
```

Run: `npx vitest run tests/brand/cues/all-blocks.test.ts`
Expected: PASS for the gallery and examples once all 20 are registered. If the first test fails, it names the block a previous task forgot to register.

- [ ] **Step 2: Make the registry total**

In `src/blocks/cues.ts`:
- change the type to `export const BLOCK_CUES: { [K in BlockName]: CueFn<K> } = { … }`, so a future block without cues is a type error;
- change the comment to `// Node-safe. Every block must declare its sounds (a block with no sound returns []).`;
- in `cuesFor`, drop the `| undefined` and the `fn ?` guard.

Run: `npm run lint && npx vitest run tests/brand/cues`
Expected: clean, PASS.

- [ ] **Step 3: Update the docs**

1. `commands/setup.md`, the `colors` line: append

   > ` In the current brand (Consultorio Pop) bg, bg2 and text are set by the brand (cream, white, ink); ask mainly for accent, danger and safe, which must read on cream and white.`

2. `skills/episode-authoring/SKILL.md`, the colors bullet: append

   > ` The brand sets bg (cream), bg2 (white sticker) and text (ink); prefer accent, danger, safe or an extra for meaning.`

3. `README.md`, under "Updating", add:

   > **0.5.0 — Consultorio Pop.** Videos now use a light sticker style with Fredoka/Nunito, a paw transition between scenes, subtle sound effects (turn them off with `"sfx": false` in `episode.json`) and social icons in the close. Your talent's `accent`, `danger` and `safe` are kept; `bg`, `bg2` and `text` now come from the brand. For Dogtora Dani, set `accent` `#FF6B57`, `danger` `#E5484D`, `safe` `#2FBF71` and add `"extra": { "teal": "#2EC4B6", "sun": "#FFC93C" }` in `talents/dani.json`.

- [ ] **Step 4: Bump the version**

Set `"version": "0.5.0"` in `template/package.json`, `.claude-plugin/plugin.json` and the marketplace entry. They must match; the plugin-root tests check it.

- [ ] **Step 5: Full verification**

```bash
npm test
npm run lint
npm run check
npm run check:gallery
(cd .. && node --test scripts/tests/*.test.mjs)
```

Expected:
- every command passes;
- `check` prints `slot clear` for 3 examples × 2 layouts;
- `check:gallery` prints `✓` for all 20 blocks × 2 layouts with `fit ≥ 0.85`.

Paste the summary lines into the PR/hand-off.

- [ ] **Step 6: Render the reference episode for review**

```bash
npx remotion render Episode out/dani-chocolate-pop.mp4 --public-dir examples/dani-chocolate
```

Expected: a 30 s MP4. Watch it with sound and check:
- each cut shows the paw flood with a soft whoosh;
- the stickers slap in;
- numbers jelly with a ding;
- verdicts wiggle/bonk or pop/chime;
- the close is coral with the social stickers dropping in with a boing;
- the SFX never cover the voice. With no talent clip in the example, judge the level against the music if `musicSrc` is set; otherwise note it for the mastering spec.

Hand the file to the user for approval. This is the spec's visual review gate.

- [ ] **Step 7: Commit**

```bash
git add src/blocks/cues.ts tests/brand/cues/all-blocks.test.ts package.json ../.claude-plugin ../commands/setup.md ../skills/episode-authoring/SKILL.md ../README.md
git commit -m "feat: Consultorio Pop brand complete — every block has cues; docs and 0.5.0"
```
