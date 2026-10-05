# reelkit Plan 2 — Explainer Blocks, Icons, Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the template from 10 to 20 blocks so it can explain any subject, back them with ~100 icons and 7 anatomy diagrams, and prove every block fits the stage at its maximum content with a gallery check.

**Architecture:** Builds on Plan 1's `template/` (merged on `main`). New blocks follow the existing contract: a node-safe `<Block>.schema.ts` (strict zod objects, enforced content limits), a component taking `{ props, timing }` whose keyframes are fractions of the beat, and an entry in `schemas.ts` + `registry.tsx`. A `samples.json` file holds one maximum-content sample per block; it drives a `BlockGallery` composition for Studio and `npm run check -- --gallery`, which renders each sample's last frame in both layouts and fails if the stage had to scale below 0.85 or any readable text is under 40 px.

**Tech Stack:** Remotion 4.0.532, React 19.2.3, TypeScript 5.9.3, zod 4.5.4, Vitest 3.2.4, jsdom 26.1.0 (one DOM test), pngjs 7.0.0, @remotion/bundler + @remotion/renderer.

**Spec:** `docs/superpowers/specs/2026-10-05-reelkit-design.md` — §5 "Explainer blocks (v1, any subject)", "Choosing a block", "Icons", `npm run check --gallery`, §10 testing. Plan 1 (done): `docs/superpowers/plans/2026-10-05-reelkit-plan-1-template-foundation.md`.

## Global Constraints

- All `@remotion/*` and `remotion` exactly `4.0.532`; `zod` exactly `4.5.4`. New dev dependency: `jsdom` exactly `26.1.0`.
- Block schemas use `z.strictObject` at every level (unknown props are errors). Every string prop has a max length; arrays have min/max counts. Limits are the contract that keeps blocks inside the stage.
- Block keyframes are fractions of the beat (`timing.at(f)`); fixed frame offsets are allowed only for short micro-delays (≤ 12 frames) and staggers capped by the beat length.
- Motion only via `useCurrentFrame()` with `interpolate`/`spring`; frame-driven `interpolate` calls are clamped; a spring's own progress mapped to scale/translate may be unclamped (pop overshoot).
- Readable text ≥ 40 px nominal. Exceptions must carry the `data-reelkit-small` attribute: footnotes and sources (30 px). No emoji characters, no external images; icons and diagrams are inline SVG.
- Colors only from the talent palette (`c.bg`, `c.bg2`, `c.accent`, `c.text`, `c.danger`, `c.safe`) or `resolveColor` on a color prop. Tone mapping everywhere: `ok → c.safe`, `warn → c.accent`, `danger → c.danger`.
- Gallery thresholds: fail if FitStage scale < 0.85 or nominal text < 40 px (excluding `data-reelkit-small`), in both layouts.
- Every commit message ends with a blank line and `Co-Authored-By: Claude <model> <noreply@anthropic.com>` naming the model that wrote it.

## Review Focus

1. **Maximum-length content in a block** (labels at their character limit, the maximum item count): must fit the stage at ≥ 0.85 with no text under 40 px in both layouts. Pinned by the gallery check on every block (Tasks 5, 6, 7–11).
2. **Short beats** (a 15 s episode gives a two-beat scene ~50 frames per beat): staggers must still finish inside the beat. Pinned by staggers computed from `timing.duration` and by a 15 s variant of the engineering example in Task 12.
3. **Cross-field mistakes in props** (a highlight index past the list, a gauge value outside its range, zones not ascending, two nested decision branches): must fail validation with a message naming the field. Pinned by schema tests in each block task.
4. **An icon or diagram name that doesn't exist**: must fail validation listing the valid names. Pinned by `z.enum` on names and the icon/diagram registry tests (Tasks 1–3).
5. **Existing episodes after limits tighten** (Task 6): smoke and Dani examples must still validate and pass `npm run check`. Pinned by `examples.test.ts` and the check run in Task 6.

---

## File Structure

```
template/
  package.json                       + jsdom devDependency, "check:gallery" script
  src/
    icons/
      names.ts                       ICON_NAMES (105 names), DIAGRAM_NAMES (7)
      svg.tsx                        Svg wrapper, IconProps, IconComponent, icon() helper
      sets/core.tsx                  the 15 Plan 1 icons (moved)
      sets/health.tsx  veterinary.tsx  food.tsx  engineering.tsx  energy.tsx  technology.tsx  money.tsx
      sets/education.tsx  nature.tsx  home.tsx  transport.tsx  time.tsx  people.tsx  warnings.tsx  actions.tsx
      index.tsx                      ICONS (all sets), Icon, PawShape (re-export)
      diagrams.tsx                   DIAGRAMS, Diagram (400×400 silhouettes)
    frame/
      minFont.ts                     SMALL_TEXT_ATTR, measureMinFont
      FitStage.tsx                   + logs [reelkit:minfont]
    blocks/
      Definition.*  Process.*  Cycle.*  Timeline.*  Versus.*  Proportion.*  Gauge.*  Trend.*  Anatomy.*  Decision.*
      schema-parts.ts                + diagramName, tone
    gallery/
      samples.json                   one max-content sample per block
    compositions/
      BlockGallery.tsx               all samples back to back (Studio)
      IconSheet.tsx                  every icon and diagram with its name (Studio)
    Root.tsx                         + BlockGallery, BlockGallery45, IconSheet
  scripts/
    check-lib.mjs                    + parseMinFontLog
    check.mjs                        + --gallery mode, min-font warnings in episode mode
  tests/
    icons.test.ts  diagrams.test.ts  minFont.test.ts  gallery.test.ts  registry.test.ts
    blocks/<Block>.schema.test.ts    × 10 new
  examples/
    engineering-sample/              episode.json, talent.json (45 s, new blocks only)
```

---

### Task 1: Icon library restructure + domains A (health, veterinary, food, engineering, energy, technology, money)

**Files:**
- Create: `template/src/icons/svg.tsx`, `template/src/icons/sets/core.tsx`, `sets/health.tsx`, `sets/veterinary.tsx`, `sets/food.tsx`, `sets/engineering.tsx`, `sets/energy.tsx`, `sets/technology.tsx`, `sets/money.tsx`, `template/src/compositions/IconSheet.tsx`
- Modify: `template/src/icons/names.ts`, `template/src/icons/index.tsx`, `template/src/Root.tsx`
- Test: `template/tests/icons.test.ts`

**Interfaces:**
- Consumes: Plan 1 `Icon`, `ICONS`, `PawShape`, `IconProps` (all importers keep working: `import { Icon, PawShape } from "../icons"`).
- Produces: `IconComponent = React.FC<IconProps>`; `icon(render)` helper; `ICON_NAMES` grows by 44 names (listed below); `IconSheet` still composition (1080×1920) for visual review.

- [ ] **Step 1: Write the failing test**

Replace `template/tests/icons.test.ts` with:
```ts
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ICONS } from "../src/icons";
import { ICON_NAMES } from "../src/icons/names";

it("registers a component for exactly the declared icon names", () => {
  expect(Object.keys(ICONS).sort()).toEqual([...ICON_NAMES].sort());
});

it("has no duplicate names", () => {
  expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length);
});

describe.each([...ICON_NAMES])("icon %s", (name) => {
  it("renders a 100×100 svg using the given colors", () => {
    const html = renderToStaticMarkup(createElement(ICONS[name], { size: 64, color: "#123456", accent: "#ABCDEF" }));
    expect(html.startsWith("<svg")).toBe(true);
    expect(html).toContain('viewBox="0 0 100 100"');
    expect(html).toContain("#123456");
  });
});

it("includes the domain A icons", () => {
  for (const name of ["heart", "pill", "cat", "apple", "wrench", "lightning", "phone", "coin"]) {
    expect(ICON_NAMES).toContain(name);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run tests/icons.test.ts`
Expected: FAIL — `includes the domain A icons` (names missing).

- [ ] **Step 3: Create the SVG helper and move the core icons**

`template/src/icons/svg.tsx`:
```tsx
import type React from "react";

// Inline SVG icons on a 100×100 grid. `color` is the main fill/stroke; `accent` an optional second color.
export type IconProps = {
  readonly size: number;
  readonly color: string;
  readonly accent?: string;
  readonly style?: React.CSSProperties;
};
export type IconComponent = React.FC<IconProps>;

export const Svg: React.FC<{ readonly size: number; readonly style?: React.CSSProperties; readonly children: React.ReactNode }> = ({
  size,
  style,
  children,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style} overflow="visible">
    {children}
  </svg>
);

/** Builds an icon from a render function; `a` is the accent (defaults to the main color). */
export const icon =
  (render: (c: string, a: string) => React.ReactNode): IconComponent =>
  ({ size, color, accent, style }) => (
    <Svg size={size} style={style}>
      {render(color, accent ?? color)}
    </Svg>
  );

Create `template/src/icons/sets/core.tsx` by **moving** every entry of the current `ICONS` object in `template/src/icons/index.tsx` (paw, check, x, milk, spoonDrop, vomit, panting, tremor, dog, pumpkin, bookmark, share, clock, warning, info) into:
```tsx
import { PawShape } from "../paw";
import { Svg, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const CORE_ICONS = {
  // …the 15 entries, unchanged, cut from index.tsx…
} satisfies Partial<Record<IconName, IconComponent>>;
```
and move `PawShape` (unchanged) into `template/src/icons/paw.tsx`:
```tsx
export const PawShape: React.FC<{ readonly fill: string }> = ({ fill }) => (
  <g fill={fill}>
    <ellipse cx="50" cy="66" rx="24" ry="20" />
    <ellipse cx="22" cy="42" rx="10" ry="13" transform="rotate(-20 22 42)" />
    <ellipse cx="40" cy="24" rx="10" ry="14" transform="rotate(-6 40 24)" />
    <ellipse cx="60" cy="24" rx="10" ry="14" transform="rotate(6 60 24)" />
    <ellipse cx="78" cy="42" rx="10" ry="13" transform="rotate(20 78 42)" />
  </g>
);
```
The moved entries keep their exact JSX; only their imports change (`Svg` now comes from `../svg`).

- [ ] **Step 4: Add the domain A sets**

`template/src/icons/sets/health.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const HEALTH_ICONS = {
  heart: icon((c) => <path d="M50 86 C20 64 8 46 8 32 A20 20 0 0 1 50 24 A20 20 0 0 1 92 32 C92 46 80 64 50 86 Z" fill={c} />),
  pill: icon((c, a) => (
    <g transform="rotate(-45 50 50)">
      <rect x="14" y="34" width="72" height="32" rx="16" fill={c} />
      <path d="M50 34 H70 A16 16 0 0 1 70 66 H50 Z" fill={a} opacity={0.6} />
    </g>
  )),
  syringe: icon((c, a) => (
    <g transform="rotate(-45 50 50)" strokeLinecap="round" strokeLinejoin="round">
      <rect x="26" y="38" width="44" height="24" rx="4" fill={a} opacity={0.5} />
      <rect x="26" y="38" width="44" height="24" rx="4" fill="none" stroke={c} strokeWidth="7" />
      <path d="M70 50 H92 M10 50 H26 M10 38 V62 M40 38 V50 M52 38 V50" stroke={c} strokeWidth="7" fill="none" />
    </g>
  )),
  thermometer: icon((c, a) => (
    <g>
      <rect x="40" y="8" width="20" height="58" rx="10" fill="none" stroke={c} strokeWidth="7" />
      <rect x="46" y="34" width="8" height="40" rx="4" fill={a} />
      <circle cx="50" cy="76" r="16" fill={a} />
    </g>
  )),
  stethoscope: icon((c, a) => (
    <g fill="none" stroke={c} strokeWidth="7" strokeLinecap="round">
      <path d="M26 12 V38 A24 24 0 0 0 74 38 V12" />
      <path d="M50 62 V72 A14 14 0 0 0 78 72 V62" />
      <circle cx="78" cy="54" r="9" fill={a} stroke="none" />
    </g>
  )),
  bandage: icon((c, a) => (
    <g transform="rotate(-45 50 50)">
      <rect x="8" y="34" width="84" height="32" rx="16" fill={c} />
      <rect x="36" y="34" width="28" height="32" fill={a} opacity={0.6} />
      <circle cx="44" cy="44" r="2.5" fill={c} />
      <circle cx="56" cy="56" r="2.5" fill={c} />
    </g>
  )),
  tooth: icon((c) => (
    <path
      d="M30 14 C18 14 12 26 14 40 C16 52 22 58 24 70 C26 84 30 92 36 92 C42 92 42 74 50 74 C58 74 58 92 64 92 C70 92 74 84 76 70 C78 58 84 52 86 40 C88 26 82 14 70 14 C62 14 58 20 50 20 C42 20 38 14 30 14 Z"
      fill={c}
    />
  )),
  lungs: icon((c, a) => (
    <g>
      <path d="M50 8 V44 M50 38 L40 48 M50 38 L60 48" stroke={a} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M40 32 C24 32 12 56 12 76 C12 88 22 92 32 88 C40 84 42 76 42 66 V40 Z" fill={c} />
      <path d="M60 32 C76 32 88 56 88 76 C88 88 78 92 68 88 C60 84 58 76 58 66 V40 Z" fill={c} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/veterinary.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const VETERINARY_ICONS = {
  cat: icon((c, a) => (
    <g>
      <path d="M22 30 L26 8 L42 22 Q50 20 58 22 L74 8 L78 30 Q86 42 84 56 Q80 84 50 86 Q20 84 16 56 Q14 42 22 30 Z" fill={c} />
      <circle cx="38" cy="50" r="5" fill={a === c ? "#00000066" : a} />
      <circle cx="62" cy="50" r="5" fill={a === c ? "#00000066" : a} />
      <path d="M46 62 L50 66 L54 62 Z" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  bone: icon((c) => (
    <g fill={c} transform="rotate(-30 50 50)">
      <rect x="22" y="42" width="56" height="16" rx="6" />
      <circle cx="20" cy="40" r="10" />
      <circle cx="20" cy="60" r="10" />
      <circle cx="80" cy="40" r="10" />
      <circle cx="80" cy="60" r="10" />
    </g>
  )),
  fish: icon((c, a) => (
    <g>
      <ellipse cx="44" cy="50" rx="32" ry="20" fill={c} />
      <path d="M70 50 L94 30 V70 Z" fill={c} />
      <circle cx="30" cy="46" r="4" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  bird: icon((c, a) => (
    <g>
      <path d="M12 58 C22 36 46 28 60 36 L74 28 L70 42 C80 46 88 54 88 54 C72 52 64 60 56 70 C44 82 24 76 12 58 Z" fill={c} />
      <circle cx="58" cy="44" r="3.5" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  collar: icon((c, a) => (
    <g>
      <ellipse cx="50" cy="40" rx="36" ry="18" fill="none" stroke={c} strokeWidth="10" />
      <path d="M50 58 V64" stroke={c} strokeWidth="5" />
      <circle cx="50" cy="74" r="11" fill={a} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/food.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const FOOD_ICONS = {
  apple: icon((c, a) => (
    <g>
      <path d="M50 30 C38 20 14 22 14 50 C14 74 32 92 44 90 C48 89 50 87 50 87 C50 87 52 89 56 90 C68 92 86 74 86 50 C86 22 62 20 50 30 Z" fill={c} />
      <path d="M50 30 C50 22 54 14 60 10" stroke={a} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M56 18 C64 10 76 12 78 16 C72 22 62 22 56 18 Z" fill={a} />
    </g>
  )),
  drop: icon((c) => <path d="M50 8 C50 8 22 46 22 62 A28 28 0 0 0 78 62 C78 46 50 8 50 8 Z" fill={c} />),
  coffee: icon((c, a) => (
    <g>
      <path d="M16 36 H70 V64 A18 18 0 0 1 52 82 H34 A18 18 0 0 1 16 64 Z" fill={c} />
      <path d="M70 44 H78 A10 10 0 0 1 78 64 H70" stroke={c} strokeWidth="7" fill="none" />
      <path d="M32 26 Q28 20 32 12 M46 26 Q42 20 46 12" stroke={a} strokeWidth="5" strokeLinecap="round" fill="none" />
    </g>
  )),
  salt: icon((c, a) => (
    <g>
      <path d="M34 30 H66 L72 90 H28 Z" fill={c} />
      <rect x="30" y="12" width="40" height="18" rx="6" fill={a} />
      <circle cx="42" cy="21" r="2.5" fill={c} />
      <circle cx="50" cy="21" r="2.5" fill={c} />
      <circle cx="58" cy="21" r="2.5" fill={c} />
    </g>
  )),
  sugar: icon((c, a) => (
    <g>
      <rect x="14" y="46" width="36" height="36" rx="5" fill={c} />
      <rect x="54" y="46" width="36" height="36" rx="5" fill={c} />
      <rect x="34" y="12" width="36" height="36" rx="5" fill={a} transform="rotate(10 52 30)" />
    </g>
  )),
  bread: icon((c, a) => (
    <g>
      <path d="M12 46 C12 24 88 24 88 46 C88 52 82 54 80 54 V86 H20 V54 C18 54 12 52 12 46 Z" fill={c} />
      <path d="M36 42 L44 34 M50 42 L58 34 M64 42 L72 34" stroke={a === c ? "#00000055" : a} strokeWidth="5" strokeLinecap="round" />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/engineering.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

const TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

export const ENGINEERING_ICONS = {
  wrench: icon((c) => (
    <path
      d="M66 8 A24 24 0 0 0 44 40 L12 72 A10 10 0 0 0 28 88 L60 56 A24 24 0 0 0 92 34 L78 46 L64 42 L58 28 L70 14 Z"
      fill={c}
    />
  )),
  gear: icon((c, a) => (
    <g>
      {TEETH.map((deg) => (
        <rect key={deg} x="43" y="4" width="14" height="22" rx="3" fill={c} transform={`rotate(${deg} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="30" fill={c} />
      <circle cx="50" cy="50" r="11" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  hammer: icon((c, a) => (
    <g transform="rotate(-40 50 50)">
      <rect x="44" y="34" width="12" height="60" rx="5" fill={a} />
      <path d="M22 16 H72 L80 26 L72 36 H22 Z" fill={c} />
    </g>
  )),
  screwdriver: icon((c, a) => (
    <g transform="rotate(-45 50 50)">
      <rect x="38" y="6" width="24" height="38" rx="8" fill={c} />
      <rect x="46" y="44" width="8" height="38" fill={a} />
      <path d="M44 82 H56 L50 94 Z" fill={a} />
    </g>
  )),
  ruler: icon((c, a) => (
    <g transform="rotate(-35 50 50)">
      <rect x="4" y="36" width="92" height="28" rx="4" fill={c} />
      <path d="M16 36 V48 M28 36 V44 M40 36 V48 M52 36 V44 M64 36 V48 M76 36 V44 M88 36 V48" stroke={a === c ? "#00000066" : a} strokeWidth="3" />
    </g>
  )),
  helmet: icon((c, a) => (
    <g>
      <path d="M14 66 C14 40 30 22 50 22 C70 22 86 40 86 66 Z" fill={c} />
      <rect x="6" y="64" width="88" height="12" rx="6" fill={c} />
      <path d="M50 22 V46" stroke={a === c ? "#00000055" : a} strokeWidth="7" strokeLinecap="round" />
    </g>
  )),
  magnet: icon((c, a) => (
    <g>
      <path d="M26 16 V52 A24 24 0 0 0 74 52 V16" stroke={c} strokeWidth="18" fill="none" />
      <rect x="17" y="10" width="18" height="16" fill={a} />
      <rect x="65" y="10" width="18" height="16" fill={a} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/energy.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

export const ENERGY_ICONS = {
  lightning: icon((c) => <path d="M56 6 L18 56 H46 L40 94 L82 40 H54 Z" fill={c} strokeLinejoin="round" />),
  battery: icon((c, a) => (
    <g>
      <rect x="8" y="30" width="74" height="40" rx="7" fill="none" stroke={c} strokeWidth="7" />
      <rect x="84" y="42" width="9" height="16" rx="2" fill={c} />
      <rect x="17" y="39" width="38" height="22" rx="3" fill={a} />
    </g>
  )),
  plug: icon((c, a) => (
    <g>
      <rect x="36" y="12" width="8" height="26" rx="3" fill={c} />
      <rect x="56" y="12" width="8" height="26" rx="3" fill={c} />
      <rect x="26" y="36" width="48" height="32" rx="8" fill={c} />
      <path d="M50 68 V92" stroke={a} strokeWidth="8" strokeLinecap="round" />
    </g>
  )),
  bulb: icon((c, a) => (
    <g>
      <circle cx="50" cy="40" r="28" fill={c} />
      <rect x="38" y="64" width="24" height="9" rx="3" fill={a} />
      <rect x="40" y="77" width="20" height="9" rx="3" fill={a} />
    </g>
  )),
  sun: icon((c, a) => (
    <g>
      {RAYS.map((deg) => (
        <path key={deg} d="M50 6 V18" stroke={a} strokeWidth="7" strokeLinecap="round" transform={`rotate(${deg} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="22" fill={c} />
    </g>
  )),
  flame: icon((c, a) => (
    <g>
      <path d="M50 6 C56 30 80 40 80 62 A30 30 0 0 1 20 62 C20 48 30 40 34 28 C40 42 46 44 50 44 C46 30 46 18 50 6 Z" fill={c} />
      <path d="M50 58 C54 66 62 70 62 78 A12 12 0 0 1 38 78 C38 70 46 66 50 58 Z" fill={a === c ? "#FFFFFF55" : a} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/technology.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

const PINS = [34, 50, 66];

export const TECHNOLOGY_ICONS = {
  phone: icon((c, a) => (
    <g>
      <rect x="28" y="6" width="44" height="88" rx="9" fill={c} />
      <rect x="34" y="16" width="32" height="58" rx="3" fill={a === c ? "#00000055" : a} />
      <circle cx="50" cy="84" r="4" fill={a === c ? "#00000055" : a} />
    </g>
  )),
  laptop: icon((c, a) => (
    <g>
      <rect x="18" y="18" width="64" height="46" rx="5" fill={c} />
      <rect x="24" y="24" width="52" height="34" rx="2" fill={a === c ? "#00000055" : a} />
      <path d="M6 70 H94 L88 82 H12 Z" fill={c} />
    </g>
  )),
  wifi: icon((c) => (
    <g fill="none" stroke={c} strokeWidth="8" strokeLinecap="round">
      <path d="M12 40 A54 54 0 0 1 88 40" />
      <path d="M25 55 A34 34 0 0 1 75 55" />
      <path d="M38 70 A16 16 0 0 1 62 70" />
      <circle cx="50" cy="82" r="5" fill={c} stroke="none" />
    </g>
  )),
  chip: icon((c, a) => (
    <g>
      {PINS.map((p) => (
        <g key={p} stroke={c} strokeWidth="5" strokeLinecap="round">
          <path d={`M${p} 8 V22 M${p} 78 V92 M8 ${p} H22 M78 ${p} H92`} />
        </g>
      ))}
      <rect x="22" y="22" width="56" height="56" rx="8" fill={c} />
      <rect x="38" y="38" width="24" height="24" rx="3" fill={a === c ? "#00000055" : a} />
    </g>
  )),
  lock: icon((c, a) => (
    <g>
      <path d="M32 46 V32 A18 18 0 0 1 68 32 V46" stroke={c} strokeWidth="9" fill="none" />
      <rect x="20" y="44" width="60" height="46" rx="8" fill={c} />
      <circle cx="50" cy="62" r="7" fill={a === c ? "#00000066" : a} />
      <rect x="47" y="64" width="6" height="14" rx="3" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  code: icon((c, a) => (
    <g fill="none" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M34 26 L12 50 L34 74 M66 26 L88 50 L66 74" stroke={c} />
      <path d="M57 18 L43 82" stroke={a} />
    </g>
  )),
  database: icon((c, a) => (
    <g>
      <path d="M16 22 V78 C16 88 84 88 84 78 V22 Z" fill={c} />
      <ellipse cx="50" cy="22" rx="34" ry="12" fill={a === c ? "#FFFFFF44" : a} />
      <path d="M16 42 C16 52 84 52 84 42 M16 60 C16 70 84 70 84 60" stroke={a === c ? "#00000055" : a} strokeWidth="4" fill="none" />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/money.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const MONEY_ICONS = {
  coin: icon((c, a) => (
    <g>
      <circle cx="50" cy="50" r="40" fill={c} />
      <circle cx="50" cy="50" r="29" fill="none" stroke={a === c ? "#00000044" : a} strokeWidth="5" />
      <path d="M50 34 V66 M42 40 H56 A6 6 0 0 1 56 52 H44 A6 6 0 0 0 44 64 H58" stroke={a === c ? "#00000066" : a} strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  )),
  bill: icon((c, a) => (
    <g>
      <rect x="6" y="26" width="88" height="48" rx="6" fill={c} />
      <circle cx="50" cy="50" r="13" fill={a === c ? "#00000044" : a} />
      <circle cx="20" cy="50" r="4" fill={a === c ? "#00000044" : a} />
      <circle cx="80" cy="50" r="4" fill={a === c ? "#00000044" : a} />
    </g>
  )),
  card: icon((c, a) => (
    <g>
      <rect x="8" y="22" width="84" height="56" rx="8" fill={c} />
      <rect x="8" y="34" width="84" height="11" fill={a === c ? "#00000055" : a} />
      <rect x="18" y="56" width="20" height="12" rx="2" fill={a === c ? "#FFFFFF55" : a} />
    </g>
  )),
  piggy: icon((c, a) => (
    <g>
      <ellipse cx="48" cy="54" rx="36" ry="26" fill={c} />
      <path d="M28 34 L24 20 L38 30 Z" fill={c} />
      <rect x="22" y="72" width="10" height="16" rx="3" fill={c} />
      <rect x="60" y="72" width="10" height="16" rx="3" fill={c} />
      <ellipse cx="86" cy="52" rx="8" ry="10" fill={c} />
      <rect x="40" y="34" width="20" height="5" rx="2.5" fill={a === c ? "#00000055" : a} />
      <circle cx="30" cy="48" r="3.5" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  trendUp: icon((c, a) => (
    <g fill="none" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 78 L36 52 L52 64 L86 28" stroke={c} />
      <path d="M64 26 H88 V50" stroke={a} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

- [ ] **Step 5: Declare the names and assemble the registry**

`template/src/icons/names.ts`:
```ts
// Node-safe list of every icon name (used by zod schemas). Grouped by domain; Task 2 adds the rest.
export const ICON_NAMES = [
  // core (Plan 1)
  "paw", "check", "x", "milk", "spoonDrop", "vomit", "panting", "tremor", "dog", "pumpkin", "bookmark", "share", "clock", "warning", "info",
  // health
  "heart", "pill", "syringe", "thermometer", "stethoscope", "bandage", "tooth", "lungs",
  // veterinary
  "cat", "bone", "fish", "bird", "collar",
  // food
  "apple", "drop", "coffee", "salt", "sugar", "bread",
  // engineering and tools
  "wrench", "gear", "hammer", "screwdriver", "ruler", "helmet", "magnet",
  // energy
  "lightning", "battery", "plug", "bulb", "sun", "flame",
  // technology
  "phone", "laptop", "wifi", "chip", "lock", "code", "database",
  // money
  "coin", "bill", "card", "piggy", "trendUp",
] as const;
export type IconName = (typeof ICON_NAMES)[number];
```

`template/src/icons/index.tsx`:
```tsx
import type { IconName } from "./names";
import { CORE_ICONS } from "./sets/core";
import { ENERGY_ICONS } from "./sets/energy";
import { ENGINEERING_ICONS } from "./sets/engineering";
import { FOOD_ICONS } from "./sets/food";
import { HEALTH_ICONS } from "./sets/health";
import { MONEY_ICONS } from "./sets/money";
import { TECHNOLOGY_ICONS } from "./sets/technology";
import { VETERINARY_ICONS } from "./sets/veterinary";
import type { IconComponent, IconProps } from "./svg";

export { PawShape } from "./paw";
export type { IconProps } from "./svg";

export const ICONS = {
  ...CORE_ICONS,
  ...HEALTH_ICONS,
  ...VETERINARY_ICONS,
  ...FOOD_ICONS,
  ...ENGINEERING_ICONS,
  ...ENERGY_ICONS,
  ...TECHNOLOGY_ICONS,
  ...MONEY_ICONS,
} satisfies Record<IconName, IconComponent>;

export const Icon: React.FC<IconProps & { readonly name: IconName }> = ({ name, ...rest }) => {
  const Component: IconComponent | undefined = ICONS[name];
  if (!Component) {
    throw new Error(`Unknown icon "${name}"`);
  }
  return <Component {...rest} />;
};
```

- [ ] **Step 6: Add the icon sheet composition**

`template/src/compositions/IconSheet.tsx`:
```tsx
import { AbsoluteFill } from "remotion";
import { ICONS } from "../icons";
import { ICON_NAMES } from "../icons/names";
import { FONT_BODY } from "../frame/theme";

// Studio-only review sheet: every icon at 72 px with its name. Not part of any video.
const COLS = 7;
const CELL_W = 150;
const CELL_H = 118;
const BG = "#1A1023";
const FG = "#FFF3E0";
const ACCENT = "#FF7A1A";

export const IconSheet: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BG, padding: 15 }}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`, gridAutoRows: CELL_H }}>
      {ICON_NAMES.map((name) => {
        const Component = ICONS[name];
        return (
          <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Component size={72} color={FG} accent={ACCENT} />
            <div style={{ fontFamily: FONT_BODY, fontSize: 20, color: FG, opacity: 0.7 }}>{name}</div>
          </div>
        );
      })}
    </div>
  </AbsoluteFill>
);
```
In `template/src/Root.tsx`, add `import { IconSheet } from "./compositions/IconSheet";` and, inside the `<Folder name="reelkit">`, after the last composition:
```tsx
      <Still id="IconSheet" component={IconSheet} width={1080} height={1920} />
```

- [ ] **Step 7: Run tests, lint and look at the sheet**

Run:
```bash
cd template
npx vitest run && npm run lint
mkdir -p out && npx remotion still IconSheet out/icon-sheet.png --public-dir examples/smoke --log=error
```
Expected: all tests PASS (icons: 59 names, each renders); lint exit 0. Open `out/icon-sheet.png` with the Read tool: every icon is recognisable, centred in its cell, inside its 100×100 box (no clipped shapes), and uses the cream main color with orange accents. Fix any icon whose shape is broken by editing its path and re-render; report which ones you changed.

- [ ] **Step 8: Commit**

```bash
git add template/src/icons template/src/compositions/IconSheet.tsx template/src/Root.tsx template/tests/icons.test.ts
git commit -m "feat(icons): split icon sets by domain and add health, vet, food, engineering, energy, tech and money icons"
```

---

### Task 2: Icon domains B (education, nature, home, transport, time, people, warnings, actions)

**Files:**
- Create: `template/src/icons/sets/education.tsx`, `nature.tsx`, `home.tsx`, `transport.tsx`, `time.tsx`, `people.tsx`, `warnings.tsx`, `actions.tsx`
- Modify: `template/src/icons/names.ts`, `template/src/icons/index.tsx`
- Test: `template/tests/icons.test.ts`

**Interfaces:**
- Consumes: `icon`, `IconComponent` (Task 1).
- Produces: 46 more names (105 total), including `person`, `ban`, `house`, `sofa`, `shield`, `refresh`, `star`, `question`, `arrowRight` used by later blocks and examples.

- [ ] **Step 1: Write the failing test**

Append to `template/tests/icons.test.ts`:
```ts
it("includes the domain B icons and at least 100 icons in total", () => {
  for (const name of ["book", "leaf", "house", "car", "calendar", "person", "shield", "arrowRight", "question"]) {
    expect(ICON_NAMES).toContain(name);
  }
  expect(ICON_NAMES.length).toBeGreaterThanOrEqual(100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run tests/icons.test.ts`
Expected: FAIL — the new test (names missing, 59 < 100).

- [ ] **Step 3: Add the sets**

`template/src/icons/sets/education.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const EDUCATION_ICONS = {
  book: icon((c, a) => (
    <g>
      <path d="M50 26 C38 18 22 18 10 22 V82 C22 78 38 78 50 86 C62 78 78 78 90 82 V22 C78 18 62 18 50 26 Z" fill={c} />
      <path d="M50 26 V86" stroke={a === c ? "#00000055" : a} strokeWidth="4" />
    </g>
  )),
  gradCap: icon((c, a) => (
    <g>
      <path d="M50 18 L94 38 L50 58 L6 38 Z" fill={c} />
      <path d="M26 48 V68 C26 78 74 78 74 68 V48 L50 60 Z" fill={c} />
      <path d="M88 40 V66" stroke={a} strokeWidth="5" strokeLinecap="round" />
      <circle cx="88" cy="70" r="5" fill={a} />
    </g>
  )),
  pencil: icon((c, a) => (
    <g transform="rotate(-45 50 50)">
      <rect x="38" y="4" width="24" height="64" rx="3" fill={c} />
      <rect x="38" y="4" width="24" height="12" rx="3" fill={a} />
      <path d="M38 68 H62 L50 94 Z" fill={a === c ? "#00000055" : a} />
    </g>
  )),
  flask: icon((c, a) => (
    <g>
      <path d="M30 82 H70 L58 58 H42 Z" fill={a} />
      <path d="M40 8 H60 M44 8 V38 L18 82 A6 6 0 0 0 24 90 H76 A6 6 0 0 0 82 82 L56 38 V8" stroke={c} strokeWidth="7" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </g>
  )),
  barChart: icon((c, a) => (
    <g>
      <rect x="12" y="52" width="18" height="36" rx="3" fill={c} />
      <rect x="41" y="30" width="18" height="58" rx="3" fill={a} />
      <rect x="70" y="12" width="18" height="76" rx="3" fill={c} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/nature.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

const CLOUD = "M28 74 A18 18 0 0 1 28 38 A24 24 0 0 1 72 34 A20 20 0 0 1 74 74 Z";

export const NATURE_ICONS = {
  leaf: icon((c, a) => (
    <g>
      <path d="M86 14 C40 14 14 40 14 70 C14 78 18 86 18 86 C18 86 26 90 34 90 C66 90 86 60 86 14 Z" fill={c} />
      <path d="M22 82 L66 34" stroke={a === c ? "#00000055" : a} strokeWidth="5" strokeLinecap="round" />
    </g>
  )),
  tree: icon((c, a) => (
    <g>
      <rect x="44" y="58" width="12" height="34" rx="3" fill={a} />
      <circle cx="50" cy="38" r="30" fill={c} />
    </g>
  )),
  cloud: icon((c) => <path d={CLOUD} fill={c} />),
  rain: icon((c, a) => (
    <g>
      <path d={CLOUD} fill={c} transform="translate(0 -14)" />
      <path d="M34 72 L28 88 M52 72 L46 88 M70 72 L64 88" stroke={a} strokeWidth="6" strokeLinecap="round" />
    </g>
  )),
  snow: icon((c) => (
    <g stroke={c} strokeWidth="7" strokeLinecap="round">
      <path d="M50 10 V90 M15 30 L85 70 M15 70 L85 30" />
      <path d="M40 16 L50 26 L60 16 M40 84 L50 74 L60 84" fill="none" />
    </g>
  )),
  wind: icon((c, a) => (
    <g fill="none" strokeWidth="7" strokeLinecap="round">
      <path d="M8 38 H62 A12 12 0 1 0 50 26" stroke={c} />
      <path d="M8 56 H78 A12 12 0 1 1 66 68" stroke={c} />
      <path d="M8 74 H40" stroke={a} />
    </g>
  )),
  mountain: icon((c, a) => (
    <g>
      <path d="M4 86 L38 28 L56 58 L68 42 L96 86 Z" fill={c} />
      <path d="M38 28 L48 45 L42 50 L36 44 L30 48 Z" fill={a === c ? "#FFFFFF66" : a} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/home.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const HOME_ICONS = {
  house: icon((c, a) => (
    <g>
      <path d="M8 50 L50 12 L92 50 V90 H62 V64 H38 V90 H8 Z" fill={c} />
      <rect x="40" y="66" width="20" height="24" fill={a === c ? "#00000044" : a} />
    </g>
  )),
  door: icon((c, a) => (
    <g>
      <rect x="24" y="6" width="52" height="88" rx="4" fill={c} />
      <circle cx="64" cy="52" r="5" fill={a === c ? "#00000066" : a} />
    </g>
  )),
  bed: icon((c, a) => (
    <g>
      <rect x="8" y="24" width="10" height="64" rx="3" fill={c} />
      <rect x="8" y="54" width="84" height="20" rx="4" fill={c} />
      <rect x="82" y="64" width="10" height="24" rx="3" fill={c} />
      <rect x="22" y="40" width="26" height="14" rx="6" fill={a} />
    </g>
  )),
  sofa: icon((c, a) => (
    <g>
      <rect x="18" y="26" width="64" height="30" rx="8" fill={c} />
      <rect x="6" y="44" width="18" height="34" rx="7" fill={c} />
      <rect x="76" y="44" width="18" height="34" rx="7" fill={c} />
      <rect x="20" y="54" width="60" height="18" rx="4" fill={a} />
      <path d="M14 78 V88 M86 78 V88" stroke={c} strokeWidth="6" strokeLinecap="round" />
    </g>
  )),
  trash: icon((c, a) => (
    <g>
      <rect x="14" y="16" width="72" height="12" rx="4" fill={c} />
      <rect x="40" y="6" width="20" height="10" rx="3" fill={c} />
      <path d="M22 32 H78 L72 92 H28 Z" fill={c} />
      <path d="M40 44 V80 M60 44 V80" stroke={a === c ? "#00000055" : a} strokeWidth="5" strokeLinecap="round" />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/transport.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

const wheel = (cx: number, cy: number, c: string, a: string) => (
  <g key={`${cx}-${cy}`}>
    <circle cx={cx} cy={cy} r="10" fill={c} />
    <circle cx={cx} cy={cy} r="4" fill={a === c ? "#00000066" : a} />
  </g>
);

export const TRANSPORT_ICONS = {
  car: icon((c, a) => (
    <g>
      <path d="M8 64 L16 42 C18 36 24 32 30 32 H70 C76 32 82 36 84 42 L92 64 V76 H8 Z" fill={c} />
      <path d="M26 44 L30 38 H48 V50 H24 Z M54 38 H70 L76 50 H54 Z" fill={a === c ? "#00000055" : a} />
      {wheel(28, 78, c, a)}
      {wheel(72, 78, c, a)}
    </g>
  )),
  bike: icon((c, a) => (
    <g fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="66" r="16" stroke={c} />
      <circle cx="76" cy="66" r="16" stroke={c} />
      <path d="M24 66 L42 36 H64 L76 66 M42 36 L54 66 H24 M60 26 H70" stroke={a} />
    </g>
  )),
  bus: icon((c, a) => (
    <g>
      <rect x="14" y="10" width="72" height="72" rx="10" fill={c} />
      <rect x="22" y="20" width="56" height="28" rx="3" fill={a === c ? "#00000055" : a} />
      {wheel(30, 84, c, a)}
      {wheel(70, 84, c, a)}
    </g>
  )),
  plane: icon((c) => (
    <path
      d="M50 6 C54 6 56 12 56 18 V40 L92 58 V66 L56 56 V76 L68 86 V92 L50 86 L32 92 V86 L44 76 V56 L8 66 V58 L44 40 V18 C44 12 46 6 50 6 Z"
      fill={c}
    />
  )),
  truck: icon((c, a) => (
    <g>
      <rect x="6" y="24" width="56" height="46" rx="4" fill={c} />
      <path d="M62 36 H80 L94 54 V70 H62 Z" fill={c} />
      <path d="M68 42 H78 L86 54 H68 Z" fill={a === c ? "#00000055" : a} />
      {wheel(24, 74, c, a)}
      {wheel(78, 74, c, a)}
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/time.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const TIME_ICONS = {
  calendar: icon((c, a) => (
    <g>
      <rect x="10" y="18" width="80" height="72" rx="8" fill={c} />
      <rect x="10" y="18" width="80" height="18" rx="8" fill={a} />
      <path d="M30 10 V24 M70 10 V24" stroke={c} strokeWidth="7" strokeLinecap="round" />
      <rect x="24" y="48" width="14" height="12" rx="2" fill={a === c ? "#00000055" : a} />
      <rect x="44" y="48" width="14" height="12" rx="2" fill={a === c ? "#00000055" : a} />
      <rect x="24" y="68" width="14" height="12" rx="2" fill={a === c ? "#00000055" : a} />
    </g>
  )),
  hourglass: icon((c, a) => (
    <g>
      <path d="M22 8 H78 M22 92 H78" stroke={c} strokeWidth="7" strokeLinecap="round" />
      <path d="M30 10 C30 40 50 44 50 50 C50 56 30 60 30 90 H70 C70 60 50 56 50 50 C50 44 70 40 70 10 Z" fill="none" stroke={c} strokeWidth="6" strokeLinejoin="round" />
      <path d="M38 88 C40 72 50 66 50 66 C50 66 60 72 62 88 Z M40 22 H60 C58 32 50 38 50 38 C50 38 42 32 40 22 Z" fill={a} />
    </g>
  )),
  alarm: icon((c, a) => (
    <g>
      <circle cx="50" cy="54" r="34" fill={c} />
      <path d="M14 26 A16 16 0 0 1 34 12 M86 26 A16 16 0 0 0 66 12" stroke={a} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M50 36 V54 L62 62" stroke={a === c ? "#00000066" : a} strokeWidth="7" strokeLinecap="round" fill="none" />
    </g>
  )),
  stopwatch: icon((c, a) => (
    <g>
      <rect x="42" y="6" width="16" height="10" rx="3" fill={c} />
      <circle cx="50" cy="56" r="36" fill="none" stroke={c} strokeWidth="8" />
      <path d="M50 56 L62 38" stroke={a} strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="56" r="5" fill={a} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/people.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

const person = (x: number, y: number, s: number, fill: string) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
    <circle cx="50" cy="24" r="16" />
    <path d="M20 92 C20 62 32 48 50 48 C68 48 80 62 80 92 Z" />
  </g>
);

export const PEOPLE_ICONS = {
  person: icon((c) => person(0, 0, 1, c)),
  people: icon((c, a) => (
    <g>
      {person(30, 4, 0.7, a)}
      {person(-8, 10, 0.9, c)}
    </g>
  )),
  child: icon((c) => person(15, 28, 0.7, c)),
  elder: icon((c, a) => (
    <g>
      {person(-6, 0, 1, c)}
      <path d="M80 50 V92 M80 50 C80 42 70 42 70 48" stroke={a} strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>
  )),
  hand: icon((c) => (
    <g fill={c}>
      <rect x="26" y="44" width="50" height="46" rx="14" />
      <rect x="26" y="20" width="11" height="40" rx="5.5" />
      <rect x="40" y="10" width="11" height="44" rx="5.5" />
      <rect x="54" y="14" width="11" height="40" rx="5.5" />
      <rect x="68" y="24" width="10" height="34" rx="5" />
      <rect x="10" y="48" width="24" height="11" rx="5.5" transform="rotate(35 22 54)" />
    </g>
  )),
  eye: icon((c, a) => (
    <g>
      <path d="M6 50 C22 24 78 24 94 50 C78 76 22 76 6 50 Z" fill={c} />
      <circle cx="50" cy="50" r="16" fill={a === c ? "#00000055" : a} />
      <circle cx="50" cy="50" r="7" fill={c} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/warnings.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

export const WARNING_ICONS = {
  shield: icon((c, a) => (
    <g>
      <path d="M50 6 L86 20 V46 C86 70 70 86 50 94 C30 86 14 70 14 46 V20 Z" fill={c} />
      <path d="M34 50 L46 62 L68 38" stroke={a === c ? "#00000066" : a} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  )),
  stop: icon((c, a) => (
    <g>
      <path d="M32 6 H68 L94 32 V68 L68 94 H32 L6 68 V32 Z" fill={c} />
      <rect x="24" y="43" width="52" height="14" rx="4" fill={a === c ? "#FFFFFF" : a} />
    </g>
  )),
  ban: icon((c) => (
    <g fill="none" stroke={c} strokeWidth="10">
      <circle cx="50" cy="50" r="38" />
      <path d="M24 24 L76 76" strokeLinecap="round" />
    </g>
  )),
  siren: icon((c, a) => (
    <g>
      <path d="M26 74 V50 A24 24 0 0 1 74 50 V74 Z" fill={c} />
      <rect x="16" y="74" width="68" height="14" rx="4" fill={c} />
      <path d="M50 6 V16 M18 20 L25 27 M82 20 L75 27" stroke={a} strokeWidth="7" strokeLinecap="round" />
    </g>
  )),
  poison: icon((c, a) => (
    <g>
      <rect x="40" y="6" width="20" height="14" rx="3" fill={c} />
      <path d="M38 20 H62 V30 C76 36 82 48 82 62 V86 A6 6 0 0 1 76 92 H24 A6 6 0 0 1 18 86 V62 C18 48 24 36 38 30 Z" fill={c} />
      <path d="M38 52 L62 76 M62 52 L38 76" stroke={a === c ? "#00000066" : a} strokeWidth="8" strokeLinecap="round" />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

`template/src/icons/sets/actions.tsx`:
```tsx
import { icon, type IconComponent } from "../svg";
import type { IconName } from "../names";

const stroke = (d: string, c: string, width = 10) => (
  <path d={d} stroke={c} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
);

export const ACTION_ICONS = {
  arrowRight: icon((c) => stroke("M10 50 H82 M58 26 L84 50 L58 74", c)),
  arrowUp: icon((c) => stroke("M50 90 V18 M26 42 L50 16 L74 42", c)),
  arrowDown: icon((c) => stroke("M50 10 V82 M26 58 L50 84 L74 58", c)),
  refresh: icon((c, a) => (
    <g>
      {stroke("M80 44 A32 32 0 1 0 74 72", c)}
      {stroke("M84 18 V44 H58", a)}
    </g>
  )),
  plus: icon((c) => stroke("M50 14 V86 M14 50 H86", c, 12)),
  minus: icon((c) => stroke("M14 50 H86", c, 12)),
  search: icon((c, a) => (
    <g>
      <circle cx="42" cy="42" r="26" stroke={c} strokeWidth="9" fill="none" />
      {stroke("M62 62 L88 88", a, 12)}
    </g>
  )),
  star: icon((c) => <path d="M50 8 L62 36 L92 38 L68 58 L76 88 L50 72 L24 88 L32 58 L8 38 L38 36 Z" fill={c} strokeLinejoin="round" />),
  question: icon((c, a) => (
    <g>
      {stroke("M32 34 A18 18 0 1 1 54 50 C50 52 50 56 50 64", c, 11)}
      <circle cx="50" cy="84" r="7" fill={a} />
    </g>
  )),
} satisfies Partial<Record<IconName, IconComponent>>;
```

- [ ] **Step 4: Register them**

In `template/src/icons/names.ts`, extend the array (before `] as const;`):
```ts
  // education
  "book", "gradCap", "pencil", "flask", "barChart",
  // nature and weather
  "leaf", "tree", "cloud", "rain", "snow", "wind", "mountain",
  // home
  "house", "door", "bed", "sofa", "trash",
  // transport
  "car", "bike", "bus", "plane", "truck",
  // time
  "calendar", "hourglass", "alarm", "stopwatch",
  // people
  "person", "people", "child", "elder", "hand", "eye",
  // warnings
  "shield", "stop", "ban", "siren", "poison",
  // actions and arrows
  "arrowRight", "arrowUp", "arrowDown", "refresh", "plus", "minus", "search", "star", "question",
```
In `template/src/icons/index.tsx`, import the eight new sets and spread them into `ICONS` after `...MONEY_ICONS`:
```tsx
import { ACTION_ICONS } from "./sets/actions";
import { EDUCATION_ICONS } from "./sets/education";
import { HOME_ICONS } from "./sets/home";
import { NATURE_ICONS } from "./sets/nature";
import { PEOPLE_ICONS } from "./sets/people";
import { TIME_ICONS } from "./sets/time";
import { TRANSPORT_ICONS } from "./sets/transport";
import { WARNING_ICONS } from "./sets/warnings";
```
```tsx
  ...EDUCATION_ICONS,
  ...NATURE_ICONS,
  ...HOME_ICONS,
  ...TRANSPORT_ICONS,
  ...TIME_ICONS,
  ...PEOPLE_ICONS,
  ...WARNING_ICONS,
  ...ACTION_ICONS,
```

- [ ] **Step 5: Run tests, lint and look at the sheet**

Run:
```bash
cd template
npx vitest run && npm run lint
npx remotion still IconSheet out/icon-sheet.png --public-dir examples/smoke --log=error
```
Expected: all tests PASS (105 icons); lint exit 0. Open `out/icon-sheet.png` with Read: all 105 icons recognisable and unclipped (the sheet is 7 × 15 cells). Fix broken shapes and report which.

- [ ] **Step 6: Commit**

```bash
git add template/src/icons template/tests/icons.test.ts
git commit -m "feat(icons): add education, nature, home, transport, time, people, warning and action icons (105 total)"
```

---

### Task 3: Anatomy diagrams

**Files:**
- Create: `template/src/icons/diagrams.tsx`
- Modify: `template/src/icons/names.ts` (add `DIAGRAM_NAMES`), `template/src/blocks/schema-parts.ts` (add `diagramName`), `template/src/compositions/IconSheet.tsx` (diagram row)
- Test: `template/tests/diagrams.test.ts`

**Interfaces:**
- Produces: `DIAGRAM_NAMES = ["human","dog","cat","tooth","car","house","circuit"] as const`, `type DiagramName`, `DIAGRAMS: Record<DiagramName, React.FC<DiagramProps>>`, `<Diagram name size color accent style? />` on a 400×400 viewBox (`color` = body fill, `accent` = detail lines/areas), `diagramName` zod enum in schema-parts. The `dog` faces left (head on the left half); `human` faces the viewer.

- [ ] **Step 1: Write the failing test**

`template/tests/diagrams.test.ts`:
```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { diagramName } from "../src/blocks/schema-parts";
import { DIAGRAMS } from "../src/icons/diagrams";
import { DIAGRAM_NAMES } from "../src/icons/names";

it("registers exactly the declared diagrams", () => {
  expect(Object.keys(DIAGRAMS).sort()).toEqual([...DIAGRAM_NAMES].sort());
  expect(DIAGRAM_NAMES).toEqual(["human", "dog", "cat", "tooth", "car", "house", "circuit"]);
});

describe.each([...DIAGRAM_NAMES])("diagram %s", (name) => {
  it("renders on a 400×400 viewBox with both colors", () => {
    const html = renderToStaticMarkup(createElement(DIAGRAMS[name], { size: 400, color: "#111111", accent: "#222222" }));
    expect(html).toContain('viewBox="0 0 400 400"');
    expect(html).toContain("#111111");
    expect(html).toContain("#222222");
  });
});

it("rejects unknown diagram names in schemas", () => {
  expect(diagramName.safeParse("robot").success).toBe(false);
  expect(diagramName.safeParse("dog").success).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run tests/diagrams.test.ts`
Expected: FAIL — cannot resolve `../src/icons/diagrams`.

- [ ] **Step 3: Implement**

Append to `template/src/icons/names.ts`:
```ts
export const DIAGRAM_NAMES = ["human", "dog", "cat", "tooth", "car", "house", "circuit"] as const;
export type DiagramName = (typeof DIAGRAM_NAMES)[number];
```

Append to `template/src/blocks/schema-parts.ts` (and add `DIAGRAM_NAMES` to the existing `../icons/names` import):
```ts
export const diagramName = z.enum(DIAGRAM_NAMES);
export const tone = z.enum(["ok", "warn", "danger"]);
export type Tone = z.infer<typeof tone>;
```

`template/src/icons/diagrams.tsx`:
```tsx
import type React from "react";
import type { DiagramName } from "./names";

// Large silhouettes for the Anatomy block, on a 400×400 grid.
// `color` fills the body; `accent` draws details (windows, joints, traces…).
export type DiagramProps = {
  readonly size: number;
  readonly color: string;
  readonly accent: string;
  readonly style?: React.CSSProperties;
};

const Box: React.FC<{ readonly size: number; readonly style?: React.CSSProperties; readonly children: React.ReactNode }> = ({
  size,
  style,
  children,
}) => (
  <svg width={size} height={size} viewBox="0 0 400 400" style={style}>
    {children}
  </svg>
);

const wheel = (cx: number, c: string, a: string) => (
  <g key={cx}>
    <circle cx={cx} cy="290" r="42" fill={c} />
    <circle cx={cx} cy="290" r="18" fill={a} />
  </g>
);

export const DIAGRAMS: Record<DiagramName, React.FC<DiagramProps>> = {
  human: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <circle cx="200" cy="62" r="42" fill={color} />
      <path
        d="M148 112 H252 C276 112 290 126 292 150 L312 262 C314 274 298 278 294 266 L270 172 V250 L262 390 H230 L212 272 H188 L170 390 H138 L130 250 V172 L106 266 C102 278 86 274 88 262 L108 150 C110 126 124 112 148 112 Z"
        fill={color}
      />
      <path d="M150 230 H250" stroke={accent} strokeWidth="8" strokeLinecap="round" />
    </Box>
  ),
  dog: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <path
        d="M52 172 L74 118 L98 150 H128 L150 116 L160 168 C166 190 150 206 134 212 H290 C320 212 342 196 352 170 L366 178 C358 206 342 224 326 232 V340 H296 L290 272 H200 L190 340 H160 L154 244 C118 240 78 224 52 202 Z"
        fill={color}
      />
      <circle cx="104" cy="176" r="8" fill={accent} />
      <ellipse cx="58" cy="196" rx="10" ry="8" fill={accent} />
    </Box>
  ),
  cat: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <path
        d="M140 122 L150 58 L186 96 H214 L250 58 L260 122 C280 152 276 190 256 212 C302 242 312 300 292 342 H108 C88 300 98 242 144 212 C124 190 120 152 140 122 Z"
        fill={color}
      />
      <path d="M290 332 C352 322 364 258 330 236" stroke={color} strokeWidth="22" strokeLinecap="round" fill="none" />
      <circle cx="176" cy="150" r="9" fill={accent} />
      <circle cx="224" cy="150" r="9" fill={accent} />
      <path d="M192 176 L200 184 L208 176 Z" fill={accent} />
    </Box>
  ),
  tooth: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <path
        d="M120 58 C80 58 60 100 66 150 C72 190 92 210 98 250 C104 300 116 352 140 352 C164 352 166 290 200 290 C234 290 236 352 260 352 C284 352 296 300 302 250 C308 210 328 190 334 150 C340 100 320 58 280 58 C252 58 236 78 200 78 C164 78 148 58 120 58 Z"
        fill={color}
      />
      <path d="M78 196 C140 216 260 216 322 196" stroke={accent} strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M118 98 C104 110 100 130 104 150" stroke={accent} strokeWidth="8" fill="none" strokeLinecap="round" />
    </Box>
  ),
  car: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <path
        d="M28 252 L60 190 C70 170 90 160 110 160 H270 C290 160 310 170 322 186 L352 230 C364 232 374 244 374 258 V290 H28 Z"
        fill={color}
      />
      <path d="M100 176 H190 V226 H74 Z M206 176 H268 L304 226 H206 Z" fill={accent} />
      {wheel(108, color, accent)}
      {wheel(292, color, accent)}
    </Box>
  ),
  house: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <rect x="262" y="86" width="34" height="70" fill={color} />
      <path d="M58 192 L200 70 L342 192 V352 H58 Z" fill={color} />
      <rect x="170" y="262" width="60" height="90" rx="4" fill={accent} />
      <rect x="92" y="216" width="54" height="50" rx="4" fill={accent} />
      <rect x="254" y="216" width="54" height="50" rx="4" fill={accent} />
    </Box>
  ),
  circuit: ({ size, color, accent, style }) => (
    <Box size={size} style={style}>
      <rect x="40" y="40" width="320" height="320" rx="22" fill={color} />
      <g stroke={accent} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M80 100 H150 V160 M320 100 H250 V160 M80 300 H150 V240 M320 300 H250 V240 M200 80 V150 M200 250 V320" />
      </g>
      <rect x="150" y="150" width="100" height="100" rx="10" fill={accent} />
      {[
        [80, 100],
        [320, 100],
        [80, 300],
        [320, 300],
        [200, 80],
        [200, 320],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="12" fill={accent} />
      ))}
    </Box>
  ),
};

export const Diagram: React.FC<DiagramProps & { readonly name: DiagramName }> = ({ name, ...rest }) => {
  const Component = DIAGRAMS[name];
  if (!Component) {
    throw new Error(`Unknown diagram "${name}"`);
  }
  return <Component {...rest} />;
};
```

In `template/src/compositions/IconSheet.tsx`, import `DIAGRAMS` and `DIAGRAM_NAMES`, and render after the icon grid:
```tsx
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
      {DIAGRAM_NAMES.map((name) => {
        const Component = DIAGRAMS[name];
        return <Component key={name} size={140} color={FG} accent={BG} />;
      })}
    </div>
```
(Reduce the icon grid's `CELL_H` from 118 to 110 so the diagram row fits within 1920 px.)

- [ ] **Step 4: Run tests, lint and look**

Run:
```bash
cd template
npx vitest run && npm run lint
npx remotion still IconSheet out/icon-sheet.png --public-dir examples/smoke --log=error
```
Expected: tests PASS; lint exit 0; the bottom row of `out/icon-sheet.png` shows seven recognisable cream silhouettes (person, dog facing left, sitting cat, tooth, car, house, circuit board) with dark details.

- [ ] **Step 5: Commit**

```bash
git add template/src/icons template/src/blocks/schema-parts.ts template/src/compositions/IconSheet.tsx template/tests/diagrams.test.ts
git commit -m "feat(icons): seven anatomy diagrams and a diagramName schema part"
```

---

### Task 4: Minimum text size measurement

**Files:**
- Create: `template/src/frame/minFont.ts`
- Modify: `template/src/frame/FitStage.tsx`, `template/src/blocks/BigStat.tsx` (source), `template/src/blocks/Quantity.tsx` (footnote), `template/scripts/check-lib.mjs`, `template/scripts/check.mjs` (episode-mode warning), `template/package.json` (jsdom)
- Test: `template/tests/minFont.test.ts`, `template/tests/check-lib.test.ts`

**Interfaces:**
- Produces: `SMALL_TEXT_ATTR = "data-reelkit-small"`; `measureMinFont(root: Element, fontSizeOf?: (el: Element) => number): number | null` — smallest font size among elements that directly contain non-blank text, skipping subtrees marked `data-reelkit-small`; FitStage logs `[reelkit:minfont] <name> <px>` once per mount; `parseMinFontLog(text) → { name, px } | null` in check-lib. Episode-mode `npm run check` prints `⚠ <layout>: scene "<name>" has text at <px> px` when < 40.

- [ ] **Step 1: Install jsdom and write the failing tests**

Run: `cd template && npm install --save-dev --save-exact jsdom@26.1.0`

`template/tests/minFont.test.ts`:
```ts
// @vitest-environment jsdom
import { expect, it } from "vitest";
import { SMALL_TEXT_ATTR, measureMinFont } from "../src/frame/minFont";

const fromInline = (el: Element) => parseFloat((el as HTMLElement).style.fontSize || "0");

const build = (html: string) => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
};

it("returns the smallest font size among elements with their own text", () => {
  const root = build('<div style="font-size:88px">Title<span style="font-size:52px">body</span></div><div style="font-size:12px"><b style="font-size:44px">only child text</b></div>');
  expect(measureMinFont(root, fromInline)).toBe(44);
});

it("skips subtrees marked as small text", () => {
  const root = build(`<div style="font-size:52px">Label</div><div ${SMALL_TEXT_ATTR} style="font-size:30px">Fuente: ejemplo<span style="font-size:20px">x</span></div>`);
  expect(measureMinFont(root, fromInline)).toBe(52);
});

it("returns null when there is no text", () => {
  expect(measureMinFont(build('<div style="font-size:52px">   </div>'), fromInline)).toBeNull();
});
```

Append to `template/tests/check-lib.test.ts` (and add `parseMinFontLog` to its import):
```ts
it("parses min-font logs", () => {
  expect(parseMinFontLog("[reelkit:minfont] step2 44.0")).toEqual({ name: "step2", px: 44 });
  expect(parseMinFontLog("[reelkit:fit] step2 1.000")).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/minFont.test.ts tests/check-lib.test.ts`
Expected: FAIL — cannot resolve `../src/frame/minFont`; `parseMinFontLog` is not a function.

- [ ] **Step 3: Implement**

`template/src/frame/minFont.ts`:
```ts
/** Mark footnotes and sources with this attribute: they may be smaller than 40 px. */
export const SMALL_TEXT_ATTR = "data-reelkit-small";

const computedFontSize = (el: Element) => parseFloat(getComputedStyle(el).fontSize);

/** Smallest font size (px) of any element that directly holds visible text, ignoring small-text subtrees. */
export const measureMinFont = (root: Element, fontSizeOf: (el: Element) => number = computedFontSize): number | null => {
  let min: number | null = null;
  const visit = (el: Element) => {
    if (el.hasAttribute(SMALL_TEXT_ATTR)) {
      return;
    }
    const hasOwnText = Array.from(el.childNodes).some(
      (node) => node.nodeType === 3 && (node.textContent ?? "").trim() !== "",
    );
    if (hasOwnText) {
      const size = fontSizeOf(el);
      if (!Number.isNaN(size)) {
        min = min === null ? size : Math.min(min, size);
      }
    }
    Array.from(el.children).forEach(visit);
  };
  visit(root);
  return min;
};
```

In `template/src/frame/FitStage.tsx`, import `measureMinFont` from `./minFont` and, inside the `useLayoutEffect` right after the existing `[reelkit:fit]` log, add:
```ts
    const minFont = measureMinFont(el);
    if (minFont !== null) {
      console.log(`[reelkit:minfont] ${name} ${minFont.toFixed(1)}`);
    }
```

Mark the two existing small texts with the attribute:
- `template/src/blocks/BigStat.tsx`: on the source `<div>` add `data-reelkit-small=""`.
- `template/src/blocks/Quantity.tsx`: on the footnote `<div>` add `data-reelkit-small=""`.

Append to `template/scripts/check-lib.mjs`:
```js
export const parseMinFontLog = (text) => {
  const match = /^\[reelkit:minfont\] (\S+) ([0-9.]+)$/.exec(text);
  return match ? { name: match[1], px: Number(match[2]) } : null;
};
```

In `template/scripts/check.mjs`:
- add `parseMinFontLog` to the `./check-lib.mjs` import and `const MIN_TEXT_PX = 40;` next to `FIT_WARN`;
- in `checkLayout`, next to `const fits = new Map();` add `const minFonts = new Map();`, and inside `onBrowserLog` add:
```js
        const font = parseMinFontLog(log.text);
        if (font) minFonts.set(font.name, Math.min(minFonts.get(font.name) ?? Infinity, font.px));
```
- after the fit warnings loop add:
```js
  for (const [name, px] of minFonts) {
    if (px < MIN_TEXT_PX) console.warn(`⚠ ${layoutName}: scene "${name}" has text at ${px} px`);
  }
```

- [ ] **Step 4: Run tests and the episode check**

Run: `cd template && npx vitest run && npm run lint && npm run check`
Expected: all tests PASS; lint exit 0; the check passes both examples in both layouts. Report any `has text at` warnings verbatim (none expected for the examples).

- [ ] **Step 5: Commit**

```bash
git add template/package.json template/package-lock.json template/src/frame template/src/blocks/BigStat.tsx template/src/blocks/Quantity.tsx template/scripts template/tests
git commit -m "feat(check): measure the smallest readable text per scene"
```

---

### Task 5: Block gallery — samples, composition and `--gallery` check

**Files:**
- Create: `template/src/gallery/samples.json`, `template/src/compositions/BlockGallery.tsx`
- Modify: `template/src/Root.tsx`, `template/scripts/check.mjs`, `template/package.json` (script `check:gallery`)
- Test: `template/tests/gallery.test.ts`

**Interfaces:**
- Consumes: `validateBeat`, `validateBeatColors`, `validateTalent`, `fetchJson`, `SceneRenderer`, `BlockPreview` composition (Plan 1), `parseFitLog`, `parseMinFontLog`.
- Produces: `samples.json` = array of `{ block: string; title: Accented | null; durationInFrames: number; props: object }`, one per block, at maximum content; compositions `BlockGallery` (9:16) and `BlockGallery45` (4:5) for Studio (public dir must contain a `talent.json`, e.g. `examples/smoke`); `npm run check -- --gallery [--block=A,B] [--layouts=…]` which renders each sample's last frame through `BlockPreview` with `examples/smoke` as public dir and fails if fit < 0.85 or text < 40 px. Every later block task appends its sample.

- [ ] **Step 1: Write the failing test**

`template/tests/gallery.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import smokeTalent from "../examples/smoke/talent.json";
import { BLOCK_SCHEMAS } from "../src/blocks/schemas";
import { validateBeat, validateBeatColors, validateTalent } from "../src/episode/validate";
import samples from "../src/gallery/samples.json";

const talent = validateTalent(smokeTalent);

describe.each(samples.map((sample, i) => [i, sample] as const))("gallery sample %i", (i, sample) => {
  it(`${sample.block} validates against its schema and the palette`, () => {
    const beat = validateBeat({ block: sample.block, props: sample.props as Record<string, unknown> }, `gallery[${i}]`);
    expect(() => validateBeatColors(beat, `gallery[${i}]`, talent)).not.toThrow();
    expect(sample.durationInFrames).toBeGreaterThanOrEqual(60);
  });
});

it("has exactly one sample per registered block", () => {
  expect(samples.map((s) => s.block).sort()).toEqual(Object.keys(BLOCK_SCHEMAS).sort());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run tests/gallery.test.ts`
Expected: FAIL — cannot resolve `../src/gallery/samples.json`.

- [ ] **Step 3: Write the core samples (maximum content)**

`template/src/gallery/samples.json`:
```json
[
  {
    "block": "Hook",
    "title": null,
    "durationInFrames": 90,
    "props": {
      "line1": "¿Sabes qué pasa si tu perro",
      "line2": "¿COME CHOCOLATE?",
      "chip": "Guía rápida para tutores · 30 segundos",
      "hero": { "animation": "bites", "color": "accent" },
      "stamp": "paw"
    }
  },
  {
    "block": "BigStat",
    "title": { "text": "¿CUÁNTO basta?", "accent": "CUÁNTO" },
    "durationInFrames": 150,
    "props": {
      "value": 1250,
      "prefix": "≈",
      "unit": "mg/kg",
      "label": "de metilxantinas bastan para síntomas en un perro pequeño",
      "source": "Merck Veterinary Manual, Chocolate Toxicosis in Animals, febrero 2026"
    }
  },
  {
    "block": "Compare",
    "title": { "text": "¿CUÁNDO preocuparte?", "accent": "CUÁNDO" },
    "durationInFrames": 105,
    "props": {
      "items": [
        { "label": "Blanco", "color": "#F3E3C7" },
        { "label": "De leche", "color": "#A8693D" },
        { "label": "Semiamargo", "color": "#6B3F23" },
        { "label": "Amargo", "color": "#3B2114" }
      ],
      "conclusion": { "text": "Más oscuro = más tóxico para tu perro", "accent": "más tóxico", "tone": "danger" }
    }
  },
  {
    "block": "Timer",
    "title": { "text": "¿CUÁNDO preocuparte?", "accent": "CUÁNDO" },
    "durationInFrames": 105,
    "props": {
      "low": 6,
      "high": 12,
      "unit": "h",
      "caption": "Los síntomas\npueden tardar",
      "chips": [
        { "icon": "vomit", "label": "Vómito y diarrea" },
        { "icon": "panting", "label": "Inquietud y jadeo" },
        { "icon": "tremor", "label": "Temblores musculares" }
      ]
    }
  },
  {
    "block": "Chips",
    "title": { "text": "¿QUÉ la daña?", "accent": "QUÉ" },
    "durationInFrames": 150,
    "props": {
      "items": [
        { "icon": "warning", "label": "Calor del cargador" },
        { "icon": "clock", "label": "Carga al 100 % siempre" },
        { "icon": "info", "label": "Cargadores genéricos" },
        { "icon": "x", "label": "Descarga total seguida" },
        { "icon": "warning", "label": "Fundas muy gruesas" },
        { "icon": "info", "label": "Apps en segundo plano" }
      ]
    }
  },
  {
    "block": "DoDont",
    "title": { "text": "¿CÓMO actuar?", "accent": "CÓMO" },
    "durationInFrames": 105,
    "props": {
      "cards": [
        { "icon": "milk", "label": "Darle leche para neutralizar", "verdict": "no" },
        { "icon": "spoonDrop", "label": "Hacerlo vomitar por tu cuenta", "verdict": "no" }
      ]
    }
  },
  {
    "block": "Checklist",
    "title": { "text": "¿CÓMO actuar?", "accent": "CÓMO" },
    "durationInFrames": 105,
    "props": {
      "rows": [
        "Guarda el empaque del producto",
        "Calcula cuánto comió y a qué hora",
        "Anota los síntomas que observes",
        "Llama ya a tu veterinaria"
      ],
      "pill": "Las primeras 2 horas cuentan"
    }
  },
  {
    "block": "Quantity",
    "title": { "text": "¿CUÁNTO es peligroso?", "accent": "CUÁNTO" },
    "durationInFrames": 255,
    "props": {
      "chip": { "icon": "dog", "label": "Ejemplo: perro de 5 kg" },
      "unit": "g",
      "approx": true,
      "rows": [
        { "label": "Chocolate de leche suave", "value": 45, "color": "#A8693D" },
        { "label": "Semiamargo para repostería", "value": 20, "color": "#6B3F23" },
        { "label": "Amargo (100 % cacao)", "value": 7, "color": "#3B2114", "outline": "danger" }
      ],
      "highlight": "last",
      "conclusion": "Con esta cantidad ya hay síntomas",
      "footnote": "Dosis orientativa. Cada perro es distinto: ante la duda, llama a tu veterinaria."
    }
  },
  {
    "block": "MythFact",
    "title": { "text": "¿MITO o realidad?", "accent": "MITO" },
    "durationInFrames": 150,
    "props": {
      "myth": "Dejarlo cargando toda la noche daña la batería",
      "fact": "El cargador corta la corriente cuando llega al 100 %"
    }
  },
  {
    "block": "Close",
    "title": null,
    "durationInFrames": 135,
    "props": {
      "line1": "Guárdalo y compártelo hoy",
      "line2": { "text": "antes del 31 de octubre", "accent": "31" },
      "accentIcon": "pumpkin",
      "actions": ["bookmark", "share", "star"],
      "teaser": "Próximo: uvas y pasas, ¿son peligrosas?"
    }
  }
]
```
Note: `star` is a Task 2 icon. The Checklist sample has 4 rows and the Quantity sample 3 rows on purpose; Task 6 aligns limits with what fits.

- [ ] **Step 4: Add the gallery composition**

`template/src/compositions/BlockGallery.tsx`:
```tsx
import { useMemo } from "react";
import { AbsoluteFill, Series, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import type { Accented } from "../blocks/schema-parts";
import { fetchJson } from "../episode/fetchJson";
import type { Talent } from "../episode/talent";
import { validateBeat, validateBeatColors, validateTalent } from "../episode/validate";
import { Background } from "../frame/Background";
import { LayoutContext, PaletteContext, TalentContext } from "../frame/contexts";
import { LAYOUTS, type LayoutName } from "../frame/layout";
import { TalentSlot } from "../frame/TalentSlot";
import { bodyStyle, useFontsReady } from "../frame/theme";
import samples from "../gallery/samples.json";
import { SceneRenderer } from "./SceneRenderer";

type Sample = { block: string; title: Accented | null; durationInFrames: number; props: Record<string, unknown> };
const SAMPLES = samples as Sample[];
const TOTAL = SAMPLES.reduce((sum, s) => sum + s.durationInFrames, 0);

export type GalleryProps = { layoutName: LayoutName; talent: Talent | null };

export const calculateGalleryMetadata: CalculateMetadataFunction<GalleryProps> = async ({ props }) => {
  const talent = validateTalent(props.talent ?? (await fetchJson("talent.json")));
  SAMPLES.forEach((sample, i) => {
    const beat = validateBeat({ block: sample.block, props: sample.props }, `gallery[${i}]`);
    validateBeatColors(beat, `gallery[${i}]`, talent);
  });
  const { width, height } = LAYOUTS[props.layoutName].canvas;
  return { durationInFrames: TOTAL, width, height, props: { ...props, talent } };
};

/** Every block's maximum-content sample, back to back. Studio only (one template, generated on purpose). */
export const BlockGallery: React.FC<GalleryProps> = ({ layoutName, talent }) => {
  const { fps } = useVideoConfig();
  const ready = useFontsReady();
  const beats = useMemo(
    () => SAMPLES.map((s, i) => validateBeat({ block: s.block, props: s.props }, `gallery[${i}]`)),
    [],
  );
  if (!talent) {
    throw new Error("Talent was not loaded; calculateMetadata must run first.");
  }
  return (
    <LayoutContext.Provider value={LAYOUTS[layoutName]}>
      <PaletteContext.Provider value={talent.colors}>
        <TalentContext.Provider value={talent}>
          <AbsoluteFill>
            <Background total={TOTAL} />
            {ready ? (
              <Series>
                {SAMPLES.map((sample, i) => (
                  <Series.Sequence key={i} name={sample.block} durationInFrames={sample.durationInFrames} premountFor={fps}>
                    <SceneRenderer
                      name={`gallery-${sample.block}`}
                      scene={{ title: sample.title ?? undefined, beats: [beats[i]], split: 0.5 }}
                      duration={sample.durationInFrames}
                      fadeOutAtEnd={false}
                    />
                    <div style={{ position: "absolute", left: 60, top: 40, ...bodyStyle(32), color: talent.colors.text, opacity: 0.6 }}>
                      {i + 1}/{SAMPLES.length} · {sample.block}
                    </div>
                  </Series.Sequence>
                ))}
              </Series>
            ) : null}
            <TalentSlot pillName={talent.pillName} clipSrc="" trimStartFrames={0} />
          </AbsoluteFill>
        </TalentContext.Provider>
      </PaletteContext.Provider>
    </LayoutContext.Provider>
  );
};
```

In `template/src/Root.tsx` add `import { BlockGallery, calculateGalleryMetadata } from "./compositions/BlockGallery";` and, inside the folder:
```tsx
      <Composition
        id="BlockGallery"
        component={BlockGallery}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ layoutName: "9x16", talent: null }}
        calculateMetadata={calculateGalleryMetadata}
      />
      <Composition
        id="BlockGallery45"
        component={BlockGallery}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ layoutName: "4x5", talent: null }}
        calculateMetadata={calculateGalleryMetadata}
      />
```

- [ ] **Step 5: Add `--gallery` to the check**

In `template/scripts/check.mjs`:
- next to the other constants: `const GALLERY_MIN_SCALE = 0.85;`
- add this function above `main`:
```js
const checkGallery = async () => {
  const samples = JSON.parse(fs.readFileSync(path.join(root, "src/gallery/samples.json"), "utf8"));
  const only = args.find((a) => a.startsWith("--block="))?.split("=")[1].split(",");
  const selected = samples.map((sample, i) => ({ sample, i })).filter(({ sample }) => !only || only.includes(sample.block));
  if (!selected.length) {
    fail(`No gallery samples match --block=${only}`);
    return;
  }
  const publicDir = path.join(root, "examples/smoke");
  console.log("Bundling the gallery…");
  const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir });
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-gallery-"));
  for (const layoutName of layoutNames) {
    for (const { sample, i } of selected) {
      const inputProps = {
        layoutName,
        block: sample.block,
        props: sample.props,
        title: sample.title,
        durationInFrames: sample.durationInFrames,
        talent: null,
      };
      let composition;
      try {
        composition = await selectComposition({ serveUrl, id: "BlockPreview", inputProps });
      } catch (err) {
        fail(`${layoutName} ${sample.block}: the sample did not validate:\n${err.message}`);
        continue;
      }
      let scale = 1;
      let minFont = null;
      const output = path.join(outDir, `${layoutName}-${String(i).padStart(2, "0")}-${sample.block}.png`);
      await renderStill({
        serveUrl,
        composition,
        frame: composition.durationInFrames - 1,
        output,
        imageFormat: "png",
        inputProps,
        onBrowserLog: (log) => {
          const fit = parseFitLog(log.text);
          if (fit) scale = Math.min(scale, fit.scale);
          const font = parseMinFontLog(log.text);
          if (font) minFont = minFont === null ? font.px : Math.min(minFont, font.px);
        },
      });
      const problems = [];
      if (scale < GALLERY_MIN_SCALE) problems.push(`scaled to ${scale.toFixed(2)}`);
      if (minFont !== null && minFont < MIN_TEXT_PX) problems.push(`text at ${minFont} px`);
      if (problems.length) {
        fail(`${layoutName} ${sample.block}: ${problems.join(", ")} (${output})`);
      } else {
        console.log(`✓ ${layoutName} ${sample.block}: fit ${scale.toFixed(2)}, smallest text ${minFont ?? "-"} px`);
      }
    }
  }
  console.log(`Frames: ${outDir}`);
};
```
- at the start of `main`:
```js
  if (args.includes("--gallery")) {
    await checkGallery();
    return;
  }
```
- update the usage comment at the top: `// Usage: npm run check -- [episodeDir] [--layouts=9x16,4x5] | npm run check -- --gallery [--block=A,B]`

In `template/package.json` scripts add: `"check:gallery": "node scripts/check.mjs --gallery"`.

- [ ] **Step 6: Run tests, lint and the gallery check**

Run:
```bash
cd template
npx vitest run && npm run lint
npm run check:gallery
```
Expected: tests PASS (one sample per block); lint exit 0. The gallery check prints one ✓/✗ line per block per layout and exits 1 because some core blocks do not fit at maximum content yet. Copy every ✗ line into the report — Task 6 fixes them. Open two gallery PNGs (one passing, one failing) with Read to confirm the frames look right. Also open the BlockGallery composition once: `npx remotion still BlockGallery out/gallery-f200.png --public-dir examples/smoke --frame=200 --log=error`.

- [ ] **Step 7: Commit**

```bash
git add template/src/gallery template/src/compositions/BlockGallery.tsx template/src/Root.tsx template/scripts/check.mjs template/package.json template/tests/gallery.test.ts
git commit -m "feat(gallery): max-content samples, BlockGallery and check --gallery"
```

---

### Task 6: Tighten core block limits so every core block passes the gallery

**Files:**
- Modify: `template/src/blocks/Chips.schema.ts`, `Chips.tsx`, `Checklist.schema.ts`, `Checklist.tsx`, `Quantity.schema.ts`, `MythFact.schema.ts`, `Compare.schema.ts`, `template/src/gallery/samples.json`, `template/examples/smoke/episode.json`
- Test: `template/tests/blocks/Chips.schema.test.ts`, `Checklist.schema.test.ts`, `Quantity.schema.test.ts`, `MythFact.schema.test.ts`, `Compare.schema.test.ts`

**Interfaces:**
- Produces (new limits): Chips `columns: 1 | 2 | "auto"` default `"auto"` (2 columns only if every label ≤ 14 characters); Checklist rows ≤ 34 characters, rows render at 52 px for ≤ 3 rows and 44 px for 4 rows; Quantity rows 2–3; MythFact myth ≤ 50, fact ≤ 60; Compare item labels ≤ 10. Exported helper `chipColumns(items, columns): 1 | 2` from `Chips.schema.ts`.

- [ ] **Step 1: Write the failing tests**

Append to `template/tests/blocks/Chips.schema.test.ts` (add `chipColumns` to the import):
```ts
it("defaults to auto columns: two only when every label is ≤ 14 characters", () => {
  const short = chipsSchema.parse({ items: [item("Calor"), item("Polvo")] });
  expect(short.columns).toBe("auto");
  expect(chipColumns(short.items, short.columns)).toBe(2);
  const long = chipsSchema.parse({ items: [item("Calor"), item("Cargadores genéricos")] });
  expect(chipColumns(long.items, long.columns)).toBe(1);
  expect(chipColumns(long.items, 2)).toBe(2);
});
```
Replace the "defaults to two columns" test in that file with the test above (delete the old one).

Append to `template/tests/blocks/Checklist.schema.test.ts`:
```ts
it("limits rows to 34 characters", () => {
  expect(checklistSchema.safeParse({ rows: ["a", "x".repeat(34)] }).success).toBe(true);
  expect(checklistSchema.safeParse({ rows: ["a", "x".repeat(35)] }).success).toBe(false);
});
```
and delete its old "limits rows to 40 characters" test.

Append to `template/tests/blocks/Quantity.schema.test.ts`:
```ts
it("accepts at most 3 rows", () => {
  expect(quantitySchema.safeParse({ ...DANI, rows: [...DANI.rows, DANI.rows[0]] }).success).toBe(false);
});
```

Replace the length test in `template/tests/blocks/MythFact.schema.test.ts` with:
```ts
it("limits the myth to 50 and the fact to 60 characters", () => {
  expect(mythFactSchema.safeParse({ myth: "x".repeat(51), fact: "y" }).success).toBe(false);
  expect(mythFactSchema.safeParse({ myth: "x", fact: "y".repeat(61) }).success).toBe(false);
  expect(mythFactSchema.safeParse({ myth: "x".repeat(50), fact: "y".repeat(60) }).success).toBe(true);
});
```

Append to `template/tests/blocks/Compare.schema.test.ts`:
```ts
it("limits item labels to 10 characters", () => {
  expect(compareSchema.safeParse({ items: [{ label: "x".repeat(11), color: "accent" }, DANI.items[0]] }).success).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks`
Expected: FAIL in the five files (old limits still accept the longer values; `chipColumns` missing).

- [ ] **Step 3: Implement the limits**

`template/src/blocks/Chips.schema.ts`:
```ts
import { z } from "zod";
import { chipItem } from "./schema-parts";

const TWO_COLUMN_MAX_LABEL = 14;

export const chipsSchema = z.strictObject({
  items: z.array(chipItem).min(2).max(6),
  columns: z.union([z.literal(1), z.literal(2), z.literal("auto")]).default("auto"),
});

/** "auto" uses two columns only when every label is short enough to sit side by side. */
export const chipColumns = (items: { label: string }[], columns: 1 | 2 | "auto"): 1 | 2 =>
  columns !== "auto" ? columns : items.every((item) => item.label.length <= TWO_COLUMN_MAX_LABEL) ? 2 : 1;
```
In `template/src/blocks/Chips.tsx`, import `chipColumns` from `./Chips.schema` and use `repeat(${chipColumns(props.items, props.columns)}, max-content)` for `gridTemplateColumns`.

`template/src/blocks/Checklist.schema.ts`: change the row limit to `.max(34)`.
In `template/src/blocks/Checklist.tsx`, compute `const rowSize = props.rows.length > 3 ? 44 : 52;` and use `bodyStyle(rowSize)` for the row text instead of `bodyStyle(52)`.

`template/src/blocks/Quantity.schema.ts`: change rows to `.min(2).max(3)`.
`template/src/blocks/MythFact.schema.ts`: `myth: z.string().min(1).max(50)`, `fact: z.string().min(1).max(60)`.
`template/src/blocks/Compare.schema.ts`: item `label: z.string().min(1).max(10)`.

Update `template/examples/smoke/episode.json` step1 MythFact `fact` to `"El cargador corta la corriente al llegar al 100 %"` (49 characters). The Dani example already satisfies every new limit.

- [ ] **Step 4: Run tests, the examples check and the gallery**

Run:
```bash
cd template
npx vitest run && npm run lint
npm run check
npm run check:gallery
```
Expected: tests PASS; lint exit 0; `npm run check` passes both examples in both layouts; `check:gallery` passes all 10 core blocks in both layouts (exit 0).

If a block still fails the gallery: lower that block's offending **content limit** (never a font size below 40) by the smallest step that passes, update its sample and schema test to the new limit, re-run, and list every extra change in the report with the before/after fit.

- [ ] **Step 5: Commit**

```bash
git add template/src/blocks template/src/gallery/samples.json template/examples/smoke/episode.json template/tests/blocks
git commit -m "fix(blocks): tighten core content limits so every block fits at maximum content"
```

---

## Block tasks 7–11: shared procedure

Each of Tasks 7–11 adds two blocks. For each block the task gives the schema, its tests, the component and a maximum-content gallery sample. Registration is always the same two edits, keeping keys alphabetical:

- `template/src/blocks/schemas.ts`: `import { <name>Schema } from "./<Name>.schema";` and the entry `<Name>: <name>Schema,` in `BLOCK_SCHEMAS`.
- `template/src/blocks/registry.tsx`: `import { <Name> } from "./<Name>";` and the entry `<Name>,` in `BLOCKS`.

Each task's verification is the same:
```bash
cd template
npx vitest run && npm run lint
npm run check:gallery -- --block=<A>,<B>
```
and opening both 9:16 PNGs the gallery check prints (Read tool) to confirm the block looks as described. If the gallery fails for a new block, lower the offending **content limit** (never a font below 40 px) by the smallest step that passes, update the schema, its test and the sample, and report the change with before/after fit.

Shared imports used by the components below:
```tsx
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette, useTalent } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, STAGGER, enter, pop, pulse } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";
```
Each component imports only what it uses (lint enforces no unused imports).

The tone helper, used by Gauge and Decision, goes in `template/src/blocks/parts/tone.ts` (created in Task 10):
```ts
import type { Palette } from "../../episode/talent";
import type { Tone } from "../schema-parts";

export const toneColor = (tone: Tone, c: Palette) => (tone === "ok" ? c.safe : tone === "warn" ? c.accent : c.danger);
```

---

### Task 7: `Definition` and `Process`

**Files:**
- Create: `template/src/blocks/Definition.schema.ts`, `Definition.tsx`, `Process.schema.ts`, `Process.tsx`
- Modify: `schemas.ts`, `registry.tsx`, `template/src/gallery/samples.json`, `template/tests/registry.test.ts`
- Test: `template/tests/blocks/Definition.schema.test.ts`, `Process.schema.test.ts`

**Interfaces:**
- Produces:
  - `Definition` `{ term ≤24, pronunciation ≤30 = "", category ≤20 = "", meaning ≤120 chars and ≤18 words, icon }`. Keyframes: icon 0.04, term wipe 0.10→0.30, underline 0.30→0.40, category 0.20, pronunciation 0.28, meaning words from 0.40 (stagger `min(2, 0.35·duration/words)` frames).
  - `Process` `{ steps: { icon; label ≤20 chars, ≤4 words }[3–5], connector: "arrow"|"chevron" = "arrow", highlightStep?: index }`. Keyframes: step i pops at `0.06 + 0.45·i/n`, connector i draws 6→14 frames after step i, highlight at 0.72 (pulse 1.12, others dim to 55 %).
  - `registry.test.ts` now asserts every key of `BLOCK_SCHEMAS` has a component in `BLOCKS` (instead of a fixed list).

- [ ] **Step 1: Write the failing tests**

`template/tests/blocks/Definition.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { definitionSchema } from "../../src/blocks/Definition.schema";

const BASE = {
  term: "Interruptor diferencial",
  pronunciation: "in-ter-rup-TOR di-fe-ren-CIAL",
  category: "Electricidad en casa",
  meaning: "Aparato que corta la luz en milésimas de segundo si detecta una fuga de corriente hacia tu cuerpo.",
  icon: "lightning",
};

it("accepts a full definition and fills defaults", () => {
  const p = definitionSchema.parse({ term: "Breaker", meaning: "Corta la luz.", icon: "lightning" });
  expect([p.pronunciation, p.category]).toEqual(["", ""]);
  expect(definitionSchema.parse(BASE).term).toBe("Interruptor diferencial");
});
it("rejects meanings over 18 words", () => {
  expect(definitionSchema.safeParse({ ...BASE, meaning: new Array(19).fill("palabra").join(" ") }).success).toBe(false);
});
it("rejects a term over 24 characters and unknown props", () => {
  expect(definitionSchema.safeParse({ ...BASE, term: "x".repeat(25) }).success).toBe(false);
  expect(definitionSchema.safeParse({ ...BASE, subtitle: "x" }).success).toBe(false);
});
```

`template/tests/blocks/Process.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { processSchema } from "../../src/blocks/Process.schema";

const step = (label: string) => ({ icon: "gear", label });
const BASE = { steps: [step("Entra la corriente"), step("Se calienta"), step("Corta si es mucha")] };

it("defaults to arrow connectors", () => {
  expect(processSchema.parse(BASE).connector).toBe("arrow");
});
it("accepts 3–5 steps", () => {
  expect(processSchema.safeParse({ steps: BASE.steps.slice(0, 2) }).success).toBe(false);
  expect(processSchema.safeParse({ steps: [...BASE.steps, ...BASE.steps] }).success).toBe(false);
});
it("limits labels to 4 words and 20 characters", () => {
  expect(processSchema.safeParse({ steps: [step("uno dos tres cuatro cinco"), ...BASE.steps.slice(1)] }).success).toBe(false);
  expect(processSchema.safeParse({ steps: [step("x".repeat(21)), ...BASE.steps.slice(1)] }).success).toBe(false);
});
it("rejects a highlightStep past the last step", () => {
  const r = processSchema.safeParse({ ...BASE, highlightStep: 3 });
  expect(r.success).toBe(false);
  expect(JSON.stringify(r.error?.issues)).toContain("highlightStep");
});
```

Replace `template/tests/registry.test.ts` with:
```ts
import { expect, it } from "vitest";
import { BLOCKS } from "../src/blocks/registry";
import { BLOCK_SCHEMAS } from "../src/blocks/schemas";

it("has a component for every registered schema", () => {
  expect(Object.keys(BLOCKS).sort()).toEqual(Object.keys(BLOCK_SCHEMAS).sort());
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks/Definition.schema.test.ts tests/blocks/Process.schema.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the schemas**

`template/src/blocks/Definition.schema.ts`:
```ts
import { z } from "zod";
import { iconName } from "./schema-parts";

const MAX_WORDS = 18;

export const definitionSchema = z.strictObject({
  term: z.string().min(1).max(24),
  pronunciation: z.string().max(30).default(""),
  category: z.string().max(20).default(""),
  meaning: z
    .string()
    .min(1)
    .max(120)
    .refine((s) => s.trim().split(/\s+/).length <= MAX_WORDS, { message: `meaning must be ${MAX_WORDS} words or fewer` }),
  icon: iconName,
});
```

`template/src/blocks/Process.schema.ts`:
```ts
import { z } from "zod";
import { iconName } from "./schema-parts";

export const processSchema = z
  .strictObject({
    steps: z
      .array(
        z.strictObject({
          icon: iconName,
          label: z
            .string()
            .min(1)
            .max(20)
            .refine((s) => s.trim().split(/\s+/).length <= 4, { message: "label must be 4 words or fewer" }),
        }),
      )
      .min(3)
      .max(5),
    connector: z.enum(["arrow", "chevron"]).default("arrow"),
    highlightStep: z.number().int().min(0).optional(),
  })
  .refine((p) => p.highlightStep === undefined || p.highlightStep < p.steps.length, {
    message: "highlightStep must point at a step",
    path: ["highlightStep"],
  });
```

- [ ] **Step 4: Implement the components**

`template/src/blocks/Definition.tsx`:
```tsx
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const ICON_AT = 0.04;
const TERM_FROM = 0.1;
const TERM_TO = 0.3;
const UNDERLINE_FROM = 0.3;
const UNDERLINE_TO = 0.4;
const CATEGORY_AT = 0.2;
const PRONUNCIATION_AT = 0.28;
const MEANING_AT = 0.4;
const MEANING_SPAN = 0.35;
const ICON_BOX = 200;
const TERM_MAX_WIDTH = 960 - ICON_BOX - 40;
const TERM_SIZE = 96;

export const Definition: BlockComponent<"Definition"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at, duration } = timing;
  const iconIn = pop(frame, fps, at(ICON_AT));
  const wipe = interpolate(frame, [at(TERM_FROM), at(TERM_TO)], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const underline = interpolate(frame, [at(UNDERLINE_FROM), at(UNDERLINE_TO)], [0, 1], CLAMP);
  const category = enter(frame, fps, at(CATEGORY_AT));
  const pronunciation = enter(frame, fps, at(PRONUNCIATION_AT));
  const words = props.meaning.trim().split(/\s+/);
  const wordStagger = Math.min(2, (duration * MEANING_SPAN) / words.length);
  const termSize = fitFontSize(props.term, TERM_MAX_WIDTH, TERM_SIZE, FONT_HEAD, WEIGHT_HEAD);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <div
          style={{
            width: ICON_BOX,
            height: ICON_BOX,
            flexShrink: 0,
            borderRadius: "50%",
            backgroundColor: c.bg2,
            border: `5px solid ${c.accent}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: interpolate(iconIn, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(iconIn, [0, 1], [0.4, 1]),
          }}
        >
          <Icon name={props.icon} size={120} color={c.accent} accent={c.text} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
          {props.category ? (
            <div
              style={{
                ...headStyle(40),
                color: c.bg,
                backgroundColor: c.accent,
                borderRadius: 999,
                padding: "6px 22px 0",
                whiteSpace: "nowrap",
                opacity: category,
                translate: `0px ${interpolate(category, [0, 1], [16, 0])}px`,
              }}
            >
              {props.category}
            </div>
          ) : null}
          <div
            style={{
              position: "relative",
              ...headStyle(termSize),
              color: c.text,
              whiteSpace: "nowrap",
              paddingBottom: 10,
              clipPath: `inset(-20% ${(1 - wipe) * 100}% -20% 0)`,
            }}
          >
            {props.term}
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: "100%",
                height: 8,
                borderRadius: 4,
                backgroundColor: c.accent,
                scale: `${underline} 1`,
                transformOrigin: "left center",
              }}
            />
          </div>
          {props.pronunciation ? (
            <div style={{ ...bodyStyle(40), color: c.text, opacity: 0.7 * pronunciation }}>{props.pronunciation}</div>
          ) : null}
        </div>
      </div>
      <div style={{ ...bodyStyle(52), color: c.text, lineHeight: 1.2 }}>
        {words.map((word, i) => {
          const p = enter(frame, fps, at(MEANING_AT) + i * wordStagger);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.28em",
                opacity: p,
                translate: `0px ${interpolate(p, [0, 1], [14, 0])}px`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
```

`template/src/blocks/Process.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { headStyle } from "../frame/theme";
import { CLAMP, enter, pop, pulse } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const ROW = 960;
const FIRST = 0.06;
const SPAN = 0.45;
const HIGHLIGHT_AT = 0.72;
const LINK_DELAY = 6;
const LINK_FRAMES = 8;
const BADGE = 52;

export const Process: BlockComponent<"Process"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const n = props.steps.length;
  const col = ROW / n;
  const circle = Math.min(150, col - 60);
  const r = circle / 2;
  const stepAt = (i: number) => at(FIRST + (SPAN * i) / n);
  const hl = props.highlightStep;
  const highlightFrame = at(HIGHLIGHT_AT);
  const dim = hl === undefined ? 1 : interpolate(frame, [highlightFrame, highlightFrame + 10], [1, 0.55], CLAMP);

  return (
    <div style={{ position: "relative", width: ROW }}>
      <svg width={ROW} height={circle} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {props.steps.slice(0, -1).map((_, i) => {
          const x1 = (i + 0.5) * col + r + 12;
          const x2 = (i + 1.5) * col - r - 12;
          const draw = interpolate(frame, [stepAt(i) + LINK_DELAY, stepAt(i) + LINK_DELAY + LINK_FRAMES], [0, 1], CLAMP);
          if (props.connector === "chevron") {
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={i}
                d={`M${mx - 10} ${r - 18} L${mx + 8} ${r} L${mx - 10} ${r + 18}`}
                fill="none"
                stroke={c.accent}
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={draw}
              />
            );
          }
          return (
            <g key={i} stroke={c.accent} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none">
              <line x1={x1} y1={r} x2={x1 + (x2 - x1) * draw} y2={r} />
              <path d={`M${x2 - 14} ${r - 12} L${x2} ${r} L${x2 - 14} ${r + 12}`} opacity={draw >= 1 ? 1 : 0} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex" }}>
        {props.steps.map((step, i) => {
          const p = pop(frame, fps, stepAt(i));
          const label = enter(frame, fps, stepAt(i) + 4);
          const isHighlight = i === hl;
          return (
            <div
              key={i}
              style={{ width: col, display: "flex", flexDirection: "column", alignItems: "center", opacity: isHighlight ? 1 : dim }}
            >
              <div
                style={{
                  position: "relative",
                  width: circle,
                  height: circle,
                  borderRadius: "50%",
                  backgroundColor: c.bg2,
                  border: `5px solid ${isHighlight && frame >= highlightFrame ? c.accent : `${c.text}33`}`,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                  scale: interpolate(p, [0, 1], [0.4, 1]) * (isHighlight ? pulse(frame, highlightFrame, 14, 1.12) : 1),
                }}
              >
                <Icon name={step.icon} size={Math.round(circle * 0.56)} color={c.accent} accent={c.text} />
                <div
                  style={{
                    position: "absolute",
                    left: -8,
                    top: -8,
                    width: BADGE,
                    height: BADGE,
                    borderRadius: "50%",
                    backgroundColor: c.accent,
                    color: c.bg,
                    ...headStyle(40),
                    lineHeight: `${BADGE + 4}px`,
                    textAlign: "center",
                  }}
                >
                  {i + 1}
                </div>
              </div>
              <div
                style={{
                  ...headStyle(40),
                  color: c.text,
                  textAlign: "center",
                  width: col - 12,
                  marginTop: 14,
                  opacity: label,
                  translate: `0px ${interpolate(label, [0, 1], [16, 0])}px`,
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Register and add the gallery samples**

Register `Definition` and `Process` (shared procedure). Append to `template/src/gallery/samples.json` (inside the array):
```json
  {
    "block": "Definition",
    "title": { "text": "¿QUÉ ES el diferencial?", "accent": "QUÉ ES" },
    "durationInFrames": 210,
    "props": {
      "term": "Interruptor diferencial",
      "pronunciation": "in-ter-rup-TOR di-fe-ren-CIAL",
      "category": "Electricidad en casa",
      "meaning": "Aparato que corta la luz en milésimas de segundo si detecta una fuga de corriente hacia tu cuerpo.",
      "icon": "lightning"
    }
  },
  {
    "block": "Process",
    "title": { "text": "¿CÓMO se dispara?", "accent": "CÓMO" },
    "durationInFrames": 210,
    "props": {
      "steps": [
        { "icon": "plug", "label": "Entra la corriente" },
        { "icon": "lightning", "label": "Pasa por el cable" },
        { "icon": "flame", "label": "Se calienta" },
        { "icon": "gear", "label": "El breaker la mide" },
        { "icon": "ban", "label": "Corta si es mucha" }
      ],
      "connector": "arrow",
      "highlightStep": 4
    }
  }
```

- [ ] **Step 6: Verify (shared procedure)** with `--block=Definition,Process`. Expected: both pass in both layouts. Definition: icon disc left, category pill, the full term with its accent underline, pronunciation, and the full meaning below. Process: five numbered circles joined by arrows, labels under each, step 5 ringed in accent and the rest dimmed.

- [ ] **Step 7: Commit**

```bash
git add template/src/blocks template/src/gallery/samples.json template/tests
git commit -m "feat(blocks): Definition and Process"
```

---

### Task 8: `Cycle` and `Timeline`

**Files:**
- Create: `template/src/blocks/Cycle.schema.ts`, `Cycle.tsx`, `Timeline.schema.ts`, `Timeline.tsx`
- Modify: `schemas.ts`, `registry.tsx`, `template/src/gallery/samples.json`
- Test: `template/tests/blocks/Cycle.schema.test.ts`, `Timeline.schema.test.ts`, `template/tests/cycle-geometry.test.ts`

**Interfaces:**
- Produces:
  - `Cycle` `{ stages: { icon; label ≤16 }[3–6], centerLabel ≤10 = "", direction: "cw"|"ccw" = "cw" }`. Nodes sit on a ring (radius 150) at angles `-90° ± (2i+1)·180°/n` so no two labels collide; labels go beside the node (left/right) or below/above when the node is near the vertical axis. Keyframes: ring draws 0.05→0.45; node i pops when the ring reaches it; centre label 0.48; a dot travels once around the ring from 0.55 to the end. Pure helper `cycleLayout(n, direction)` exported from `Cycle.schema.ts` returns node positions, label sides and the box height.
  - `Timeline` `{ events: { when ≤8; label ≤24; icon? }[3–5], nowMarker?: index }`. Keyframes: line draws 0.05→0.55; event i's dot pops as the line reaches it, its texts enter 3 frames later; the now-marker dot is larger, accent-coloured and pulses continuously.

- [ ] **Step 1: Write the failing tests**

`template/tests/blocks/Cycle.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { cycleSchema } from "../../src/blocks/Cycle.schema";

const stage = (label: string) => ({ icon: "refresh", label });

it("defaults centre label and direction", () => {
  const p = cycleSchema.parse({ stages: [stage("a"), stage("b"), stage("c")] });
  expect([p.centerLabel, p.direction]).toEqual(["", "cw"]);
});
it("accepts 3–6 stages with labels ≤ 16 characters", () => {
  expect(cycleSchema.safeParse({ stages: [stage("a"), stage("b")] }).success).toBe(false);
  expect(cycleSchema.safeParse({ stages: new Array(7).fill(stage("a")) }).success).toBe(false);
  expect(cycleSchema.safeParse({ stages: [stage("x".repeat(17)), stage("b"), stage("c")] }).success).toBe(false);
});
it("limits the centre label to 10 characters", () => {
  expect(cycleSchema.safeParse({ stages: [stage("a"), stage("b"), stage("c")], centerLabel: "x".repeat(11) }).success).toBe(false);
});
```

`template/tests/cycle-geometry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { CYCLE_NODE, CYCLE_RADIUS, cycleLayout } from "../src/blocks/Cycle.schema";

describe.each([3, 4, 5, 6])("cycleLayout with %i stages", (n) => {
  const layout = cycleLayout(n, "cw");
  it("places every node on the ring", () => {
    for (const node of layout.nodes) expect(Math.hypot(node.x, node.y)).toBeCloseTo(CYCLE_RADIUS);
  });
  it("keeps every label inside the 960 px row", () => {
    for (const node of layout.nodes) {
      const left = node.labelSide === "left" ? node.x - CYCLE_NODE / 2 - 16 - 210 : node.x - 105;
      const right = node.labelSide === "right" ? node.x + CYCLE_NODE / 2 + 16 + 210 : node.x + 105;
      expect(left).toBeGreaterThanOrEqual(-480);
      expect(right).toBeLessThanOrEqual(480);
    }
  });
  it("is at most 560 px tall", () => {
    expect(layout.height).toBeLessThanOrEqual(560);
  });
});

it("mirrors counter-clockwise", () => {
  const cw = cycleLayout(3, "cw").nodes[0];
  const ccw = cycleLayout(3, "ccw").nodes[0];
  expect(ccw.x).toBeCloseTo(-cw.x);
  expect(ccw.y).toBeCloseTo(cw.y);
});
```

`template/tests/blocks/Timeline.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { timelineSchema } from "../../src/blocks/Timeline.schema";

const event = (when: string, label: string) => ({ when, label });
const BASE = { events: [event("0 h", "Come el chocolate"), event("6 h", "Vómito y sed"), event("12 h", "Temblores")] };

it("accepts 3–5 events", () => {
  expect(timelineSchema.parse(BASE).events).toHaveLength(3);
  expect(timelineSchema.safeParse({ events: BASE.events.slice(0, 2) }).success).toBe(false);
});
it("limits when to 8 and label to 24 characters", () => {
  expect(timelineSchema.safeParse({ events: [event("x".repeat(9), "a"), ...BASE.events.slice(1)] }).success).toBe(false);
  expect(timelineSchema.safeParse({ events: [event("a", "x".repeat(25)), ...BASE.events.slice(1)] }).success).toBe(false);
});
it("rejects a nowMarker past the last event", () => {
  expect(timelineSchema.safeParse({ ...BASE, nowMarker: 3 }).success).toBe(false);
  expect(timelineSchema.safeParse({ ...BASE, nowMarker: 2 }).success).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks/Cycle.schema.test.ts tests/blocks/Timeline.schema.test.ts tests/cycle-geometry.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the schemas**

`template/src/blocks/Cycle.schema.ts`:
```ts
import { z } from "zod";
import { iconName } from "./schema-parts";

export const cycleSchema = z.strictObject({
  stages: z.array(z.strictObject({ icon: iconName, label: z.string().min(1).max(16) })).min(3).max(6),
  centerLabel: z.string().max(10).default(""),
  direction: z.enum(["cw", "ccw"]).default("cw"),
});

export const CYCLE_RADIUS = 150;
export const CYCLE_NODE = 120;
export const CYCLE_LABEL_W = 210;
export const CYCLE_LABEL_H = 92;
const GAP = 16;
const MARGIN = 14;

export type CycleNode = { x: number; y: number; angle: number; labelSide: "left" | "right" | "above" | "below" };

/** Node centres relative to the ring centre, label sides, and the block height / centre offset. */
export const cycleLayout = (n: number, direction: "cw" | "ccw") => {
  const dir = direction === "cw" ? 1 : -1;
  const nodes: CycleNode[] = Array.from({ length: n }, (_, i) => {
    const angle = -90 + (dir * (2 * i + 1) * 180) / n;
    const rad = (angle * Math.PI) / 180;
    const x = CYCLE_RADIUS * Math.cos(rad);
    const y = CYCLE_RADIUS * Math.sin(rad);
    const vertical = Math.abs(Math.cos(rad)) < 0.25;
    const labelSide = vertical ? (y > 0 ? "below" : "above") : x > 0 ? "right" : "left";
    return { x, y, angle, labelSide };
  });
  const tops = nodes.map((p) => p.y - CYCLE_NODE / 2 - (p.labelSide === "above" ? CYCLE_LABEL_H + GAP : 0));
  const bottoms = nodes.map((p) => p.y + CYCLE_NODE / 2 + (p.labelSide === "below" ? CYCLE_LABEL_H + GAP : 0));
  const minY = Math.min(-CYCLE_RADIUS - 12, ...tops);
  const maxY = Math.max(CYCLE_RADIUS + 12, ...bottoms);
  return { nodes, height: maxY - minY + MARGIN * 2, centerY: -minY + MARGIN };
};
```

`template/src/blocks/Timeline.schema.ts`:
```ts
import { z } from "zod";
import { iconName } from "./schema-parts";

export const timelineSchema = z
  .strictObject({
    events: z
      .array(z.strictObject({ when: z.string().min(1).max(8), label: z.string().min(1).max(24), icon: iconName.optional() }))
      .min(3)
      .max(5),
    nowMarker: z.number().int().min(0).optional(),
  })
  .refine((t) => t.nowMarker === undefined || t.nowMarker < t.events.length, {
    message: "nowMarker must point at an event",
    path: ["nowMarker"],
  });
```

- [ ] **Step 4: Implement the components**

`template/src/blocks/Cycle.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { CYCLE_LABEL_H, CYCLE_LABEL_W, CYCLE_NODE, CYCLE_RADIUS, cycleLayout } from "./Cycle.schema";
import type { BlockComponent } from "./types";

const WIDTH = 960;
const RING_FROM = 0.05;
const RING_TO = 0.45;
const CENTER_AT = 0.48;
const DOT_FROM = 0.55;
const GAP = 16;

export const Cycle: BlockComponent<"Cycle"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const n = props.stages.length;
  const dir = props.direction === "cw" ? 1 : -1;
  const { nodes, height, centerY } = cycleLayout(n, props.direction);
  const cx = WIDTH / 2;
  const cy = centerY;
  const ring = interpolate(frame, [at(RING_FROM), at(RING_TO)], [0, 1], CLAMP);
  const circumference = 2 * Math.PI * CYCLE_RADIUS;
  const nodeFrame = (i: number) => at(RING_FROM + ((RING_TO - RING_FROM) * (2 * i + 1)) / (2 * n));
  const center = enter(frame, fps, at(CENTER_AT));
  const travel = interpolate(frame, [at(DOT_FROM), at(1)], [0, 1], CLAMP);
  const dotAngle = ((-90 + dir * 360 * travel) * Math.PI) / 180;
  const ringTransform =
    props.direction === "cw"
      ? `rotate(-90 ${cx} ${cy})`
      : `translate(${cx} ${cy}) scale(-1 1) rotate(-90) translate(${-cx} ${-cy})`;

  return (
    <div style={{ position: "relative", width: WIDTH, height }}>
      <svg width={WIDTH} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={CYCLE_RADIUS} fill="none" stroke={`${c.text}26`} strokeWidth={8} />
        <circle
          cx={cx}
          cy={cy}
          r={CYCLE_RADIUS}
          fill="none"
          stroke={c.accent}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ring)}
          transform={ringTransform}
          opacity={ring > 0 ? 1 : 0}
        />
        {nodes.map((node, i) => {
          const midFraction = (i + 1) / n;
          const mid = ((node.angle + (dir * 180) / n) * Math.PI) / 180;
          const x = cx + CYCLE_RADIUS * Math.cos(mid);
          const y = cy + CYCLE_RADIUS * Math.sin(mid);
          const tangent = (mid * 180) / Math.PI + dir * 90;
          return (
            <path
              key={i}
              d="M-10 -12 L6 0 L-10 12"
              transform={`translate(${x} ${y}) rotate(${tangent})`}
              fill="none"
              stroke={c.accent}
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={ring >= midFraction ? 1 : 0}
            />
          );
        })}
        <circle
          cx={cx + CYCLE_RADIUS * Math.cos(dotAngle)}
          cy={cy + CYCLE_RADIUS * Math.sin(dotAngle)}
          r={12}
          fill={c.text}
          opacity={interpolate(frame, [at(DOT_FROM), at(DOT_FROM) + 6], [0, 1], CLAMP)}
        />
      </svg>
      {nodes.map((node, i) => {
        const p = pop(frame, fps, nodeFrame(i));
        const label = enter(frame, fps, nodeFrame(i) + 4);
        const nx = cx + node.x;
        const ny = cy + node.y;
        const labelBox: React.CSSProperties =
          node.labelSide === "right"
            ? { left: nx + CYCLE_NODE / 2 + GAP, top: ny - CYCLE_LABEL_H / 2, textAlign: "left", alignItems: "center" }
            : node.labelSide === "left"
              ? { left: nx - CYCLE_NODE / 2 - GAP - CYCLE_LABEL_W, top: ny - CYCLE_LABEL_H / 2, textAlign: "right", alignItems: "center", justifyContent: "flex-end" }
              : node.labelSide === "below"
                ? { left: nx - CYCLE_LABEL_W / 2, top: ny + CYCLE_NODE / 2 + 8, textAlign: "center", justifyContent: "center" }
                : { left: nx - CYCLE_LABEL_W / 2, top: ny - CYCLE_NODE / 2 - 8 - CYCLE_LABEL_H, textAlign: "center", justifyContent: "center", alignItems: "flex-end" };
        return (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: nx - CYCLE_NODE / 2,
                top: ny - CYCLE_NODE / 2,
                width: CYCLE_NODE,
                height: CYCLE_NODE,
                borderRadius: "50%",
                backgroundColor: c.bg2,
                border: `5px solid ${c.accent}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                scale: interpolate(p, [0, 1], [0.4, 1]),
              }}
            >
              <Icon name={props.stages[i].icon} size={64} color={c.accent} accent={c.text} />
            </div>
            <div
              style={{
                position: "absolute",
                display: "flex",
                width: CYCLE_LABEL_W,
                height: CYCLE_LABEL_H,
                ...labelBox,
                ...headStyle(40),
                color: c.text,
                opacity: label,
              }}
            >
              {props.stages[i].label}
            </div>
          </div>
        );
      })}
      {props.centerLabel ? (
        <div
          style={{
            position: "absolute",
            left: cx - 85,
            top: cy - 50,
            width: 170,
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            ...headStyle(40),
            color: c.accent,
            opacity: center,
            scale: interpolate(center, [0, 1], [0.8, 1]),
          }}
        >
          {props.centerLabel}
        </div>
      ) : null}
    </div>
  );
};
```

`template/src/blocks/Timeline.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const ROW = 960;
const LINE_FROM = 0.05;
const LINE_TO = 0.55;
const DOT = 32;
const NOW_DOT = 44;
const DOT_ROW = 64;
const WHEN_SIZE = 48;

export const Timeline: BlockComponent<"Timeline"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const n = props.events.length;
  const col = ROW / n;
  const xs = props.events.map((_, i) => (i + 0.5) * col);
  const hasIcons = props.events.some((e) => e.icon);
  const dotFrame = (i: number) => at(LINE_FROM + ((LINE_TO - LINE_FROM) * i) / (n - 1));
  const line = interpolate(frame, [at(LINE_FROM), at(LINE_TO)], [0, 1], CLAMP);

  const column = (i: number, child: React.ReactNode) => (
    <div key={i} style={{ width: col, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {child}
    </div>
  );

  return (
    <div style={{ width: ROW, display: "flex", flexDirection: "column", gap: 10 }}>
      {hasIcons ? (
        <div style={{ display: "flex", height: 72 }}>
          {props.events.map((e, i) => {
            const p = enter(frame, fps, dotFrame(i) + 3);
            return column(i, e.icon ? <Icon name={e.icon} size={64} color={c.accent} accent={c.text} style={{ opacity: p }} /> : null);
          })}
        </div>
      ) : null}
      <div style={{ display: "flex" }}>
        {props.events.map((e, i) => {
          const p = enter(frame, fps, dotFrame(i) + 3);
          const size = fitFontSize(e.when, col - 16, WHEN_SIZE, FONT_HEAD, WEIGHT_HEAD);
          return column(
            i,
            <div
              style={{
                ...headStyle(size),
                color: i === props.nowMarker ? c.accent : c.text,
                whiteSpace: "nowrap",
                opacity: p,
                translate: `0px ${interpolate(p, [0, 1], [-12, 0])}px`,
              }}
            >
              {e.when}
            </div>,
          );
        })}
      </div>
      <div style={{ position: "relative", height: DOT_ROW }}>
        <div style={{ position: "absolute", left: xs[0], top: DOT_ROW / 2 - 3, width: xs[n - 1] - xs[0], height: 6, borderRadius: 3, backgroundColor: `${c.text}26` }} />
        <div
          style={{
            position: "absolute",
            left: xs[0],
            top: DOT_ROW / 2 - 3,
            width: (xs[n - 1] - xs[0]) * line,
            height: 6,
            borderRadius: 3,
            backgroundColor: c.accent,
          }}
        />
        {props.events.map((_, i) => {
          const isNow = i === props.nowMarker;
          const size = isNow ? NOW_DOT : DOT;
          const p = pop(frame, fps, dotFrame(i));
          const halo = isNow && frame >= dotFrame(i) ? 0.5 + 0.5 * Math.sin((frame - dotFrame(i)) * 0.2) : 0;
          return (
            <div key={i}>
              {isNow ? (
                <div
                  style={{
                    position: "absolute",
                    left: xs[i] - size,
                    top: DOT_ROW / 2 - size,
                    width: size * 2,
                    height: size * 2,
                    borderRadius: "50%",
                    border: `4px solid ${c.accent}`,
                    boxSizing: "border-box",
                    opacity: 0.6 * halo,
                    scale: 0.7 + 0.3 * halo,
                  }}
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: xs[i] - size / 2,
                  top: DOT_ROW / 2 - size / 2,
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  backgroundColor: isNow ? c.accent : c.text,
                  border: `4px solid ${c.bg}`,
                  boxSizing: "border-box",
                  opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                  scale: interpolate(p, [0, 1], [0.3, 1]),
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex" }}>
        {props.events.map((e, i) => {
          const p = enter(frame, fps, dotFrame(i) + 3);
          return column(
            i,
            <div
              style={{
                ...bodyStyle(40),
                color: c.text,
                textAlign: "center",
                width: col - 12,
                opacity: p,
                translate: `0px ${interpolate(p, [0, 1], [12, 0])}px`,
              }}
            >
              {e.label}
            </div>,
          );
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Register and add the gallery samples**

Register `Cycle` and `Timeline`. Append to `samples.json`:
```json
  {
    "block": "Cycle",
    "title": { "text": "¿POR QUÉ vuelven?", "accent": "POR QUÉ" },
    "durationInFrames": 255,
    "props": {
      "stages": [
        { "icon": "house", "label": "Huevo en la casa" },
        { "icon": "sofa", "label": "Larva en tapetes" },
        { "icon": "shield", "label": "Pupa protegida" },
        { "icon": "paw", "label": "Pulga adulta" },
        { "icon": "dog", "label": "Salta a tu perro" },
        { "icon": "refresh", "label": "Pone más huevos" }
      ],
      "centerLabel": "3 SEMANAS",
      "direction": "cw"
    }
  },
  {
    "block": "Timeline",
    "title": { "text": "¿CUÁNDO actuar?", "accent": "CUÁNDO" },
    "durationInFrames": 210,
    "props": {
      "events": [
        { "when": "Hora 0", "label": "Come el chocolate", "icon": "clock" },
        { "when": "Hora 2", "label": "Vómito y sed intensa", "icon": "vomit" },
        { "when": "Hora 6", "label": "Inquietud y jadeo", "icon": "panting" },
        { "when": "Hora 12", "label": "Temblores posibles", "icon": "tremor" },
        { "when": "Día 2", "label": "Recuperación con apoyo", "icon": "heart" }
      ],
      "nowMarker": 1
    }
  }
```

- [ ] **Step 6: Verify (shared procedure)** with `--block=Cycle,Timeline`. Expected: both pass in both layouts. Cycle: six icon discs on an accent ring with chevrons between them, every label fully visible beside/below its node, "3 SEMANAS" in the centre, the travelling dot on the ring. Timeline: five icons, "Hora 0…Día 2" headings, the full accent line with dots (the second larger and accent with a halo), and labels under each.

- [ ] **Step 7: Commit**

```bash
git add template/src/blocks template/src/gallery/samples.json template/tests
git commit -m "feat(blocks): Cycle and Timeline"
```

---

### Task 9: `Versus` and `Proportion`

**Files:**
- Create: `template/src/blocks/Versus.schema.ts`, `Versus.tsx`, `Proportion.schema.ts`, `Proportion.tsx`
- Modify: `schemas.ts`, `registry.tsx`, `template/src/gallery/samples.json`
- Test: `template/tests/blocks/Versus.schema.test.ts`, `Proportion.schema.test.ts`

**Interfaces:**
- Produces:
  - `Versus` `{ vsLabel ≤4 = "VS", left: { name ≤14; icon }, right: { name ≤14; icon }, rows: { attribute ≤14; left ≤12; right ≤12; winner?: "left"|"right"|"tie" }[2–4] }`. Columns 340 | 280 | 340. Keyframes: sides slide in 0.04, VS pops 0.12, row i at `0.22 + 0.4·i/rows`, winner checks pop 0.72 and losing values dim to 50 %.
  - `Proportion` `{ numerator ≥0 int, denominator 2–100 int, style: "dots"|"donut"|"people" = "dots", ofWord ≤10 = "de cada", label ≤60, source ≤80 = "" }`, numerator ≤ denominator, `people` only up to 20. Visual 380×380 left, text column right. Keyframes: grid/track fades in 0.05→0.20, filled units stagger from 0.30 (stagger `min(3, 0.25·duration/numerator)` frames) or the donut arc draws 0.30→0.55, numerator counts 0.30→0.55, label 0.40, source 0.55 (source is `data-reelkit-small`, 30 px). Helper `gridShape(denominator)` → `{ cols, rows }` exported from the schema file.

- [ ] **Step 1: Write the failing tests**

`template/tests/blocks/Versus.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { versusSchema } from "../../src/blocks/Versus.schema";

const row = (attribute: string, winner?: string) => ({ attribute, left: "Sí", right: "No", ...(winner ? { winner } : {}) });
const BASE = {
  left: { name: "Breaker", icon: "lightning" },
  right: { name: "Fusible", icon: "flame" },
  rows: [row("Se reutiliza", "left"), row("Precio", "right")],
};

it("defaults the VS label", () => {
  expect(versusSchema.parse(BASE).vsLabel).toBe("VS");
});
it("accepts 2–4 rows", () => {
  expect(versusSchema.safeParse({ ...BASE, rows: [row("a")] }).success).toBe(false);
  expect(versusSchema.safeParse({ ...BASE, rows: new Array(5).fill(row("a")) }).success).toBe(false);
});
it("limits names to 14, attributes to 14 and values to 12 characters", () => {
  expect(versusSchema.safeParse({ ...BASE, left: { name: "x".repeat(15), icon: "flame" } }).success).toBe(false);
  expect(versusSchema.safeParse({ ...BASE, rows: [row("x".repeat(15)), row("b")] }).success).toBe(false);
  expect(versusSchema.safeParse({ ...BASE, rows: [{ attribute: "a", left: "x".repeat(13), right: "b" }, row("b")] }).success).toBe(false);
});
it("rejects unknown winners", () => {
  expect(versusSchema.safeParse({ ...BASE, rows: [row("a", "both"), row("b")] }).success).toBe(false);
});
```

`template/tests/blocks/Proportion.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { gridShape, proportionSchema } from "../../src/blocks/Proportion.schema";

const BASE = { numerator: 1, denominator: 4, label: "de los perros intoxicados comieron chocolate" };

it("fills defaults", () => {
  const p = proportionSchema.parse(BASE);
  expect([p.style, p.ofWord, p.source]).toEqual(["dots", "de cada", ""]);
});
it("rejects a numerator above the denominator", () => {
  const r = proportionSchema.safeParse({ ...BASE, numerator: 5 });
  expect(r.success).toBe(false);
  expect(JSON.stringify(r.error?.issues)).toContain("numerator");
});
it("limits the denominator to 2–100 and people to 20", () => {
  expect(proportionSchema.safeParse({ ...BASE, denominator: 101 }).success).toBe(false);
  expect(proportionSchema.safeParse({ ...BASE, denominator: 1, numerator: 1 }).success).toBe(false);
  expect(proportionSchema.safeParse({ ...BASE, style: "people", denominator: 21 }).success).toBe(false);
  expect(proportionSchema.safeParse({ ...BASE, style: "people", denominator: 20 }).success).toBe(true);
});
it("lays out grids as close to square as possible", () => {
  expect(gridShape(4)).toEqual({ cols: 2, rows: 2 });
  expect(gridShape(10)).toEqual({ cols: 4, rows: 3 });
  expect(gridShape(100)).toEqual({ cols: 10, rows: 10 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks/Versus.schema.test.ts tests/blocks/Proportion.schema.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the schemas**

`template/src/blocks/Versus.schema.ts`:
```ts
import { z } from "zod";
import { iconName } from "./schema-parts";

const side = z.strictObject({ name: z.string().min(1).max(14), icon: iconName });

export const versusSchema = z.strictObject({
  vsLabel: z.string().min(1).max(4).default("VS"),
  left: side,
  right: side,
  rows: z
    .array(
      z.strictObject({
        attribute: z.string().min(1).max(14),
        left: z.string().min(1).max(12),
        right: z.string().min(1).max(12),
        winner: z.enum(["left", "right", "tie"]).optional(),
      }),
    )
    .min(2)
    .max(4),
});
```

`template/src/blocks/Proportion.schema.ts`:
```ts
import { z } from "zod";

const PEOPLE_MAX = 20;

export const proportionSchema = z
  .strictObject({
    numerator: z.number().int().min(0),
    denominator: z.number().int().min(2).max(100),
    style: z.enum(["dots", "donut", "people"]).default("dots"),
    ofWord: z.string().min(1).max(10).default("de cada"),
    label: z.string().min(1).max(60),
    source: z.string().max(80).default(""),
  })
  .refine((p) => p.numerator <= p.denominator, { message: "numerator must be ≤ denominator", path: ["numerator"] })
  .refine((p) => p.style !== "people" || p.denominator <= PEOPLE_MAX, {
    message: `"people" style supports at most ${PEOPLE_MAX} units`,
    path: ["style"],
  });

/** Columns × rows for `denominator` units, as square as possible. */
export const gridShape = (denominator: number) => {
  const cols = Math.ceil(Math.sqrt(denominator));
  return { cols, rows: Math.ceil(denominator / cols) };
};
```

- [ ] **Step 4: Implement the components**

`template/src/blocks/Versus.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const SIDE = 340;
const MIDDLE = 280;
const SIDES_AT = 0.04;
const VS_AT = 0.12;
const ROWS_FROM = 0.22;
const ROWS_SPAN = 0.4;
const WINNER_AT = 0.72;
const VS_SIZE = 110;

export const Versus: BlockComponent<"Versus"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const sides = enter(frame, fps, at(SIDES_AT));
  const vs = pop(frame, fps, at(VS_AT));
  const winners = pop(frame, fps, at(WINNER_AT));
  const loserDim = interpolate(frame, [at(WINNER_AT), at(WINNER_AT) + 10], [1, 0.5], CLAMP);

  const header = (s: { name: string; icon: (typeof props.left)["icon"] }, fromLeft: boolean) => (
    <div
      style={{
        width: SIDE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: sides,
        translate: `${interpolate(sides, [0, 1], [fromLeft ? -80 : 80, 0])}px 0px`,
      }}
    >
      <Icon name={s.icon} size={96} color={c.accent} accent={c.text} />
      <div style={{ ...headStyle(fitFontSize(s.name, SIDE - 20, 52, FONT_HEAD, WEIGHT_HEAD)), color: c.text, whiteSpace: "nowrap" }}>{s.name}</div>
    </div>
  );

  const value = (text: string, isWinner: boolean, isLoser: boolean, align: "left" | "right") => (
    <div
      style={{
        width: SIDE,
        display: "flex",
        alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        flexDirection: align === "right" ? "row" : "row-reverse",
        gap: 12,
        opacity: isLoser ? loserDim : 1,
      }}
    >
      {isWinner ? (
        <Icon
          name="check"
          size={44}
          color={c.safe}
          style={{ opacity: interpolate(winners, [0, 0.2], [0, 1], CLAMP), scale: interpolate(winners, [0, 1], [0.3, 1]) }}
        />
      ) : null}
      <div
        style={{
          ...headStyle(fitFontSize(text, SIDE - 60, 48, FONT_HEAD, WEIGHT_HEAD)),
          color: isWinner && frame >= at(WINNER_AT) ? c.accent : c.text,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );

  return (
    <div style={{ width: SIDE * 2 + MIDDLE, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {header(props.left, true)}
        <div style={{ width: MIDDLE, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: VS_SIZE,
              height: VS_SIZE,
              borderRadius: "50%",
              backgroundColor: c.accent,
              color: c.bg,
              ...headStyle(48),
              lineHeight: `${VS_SIZE + 6}px`,
              textAlign: "center",
              opacity: interpolate(vs, [0, 0.2], [0, 1], CLAMP),
              scale: interpolate(vs, [0, 1], [0.3, 1]),
            }}
          >
            {props.vsLabel}
          </div>
        </div>
        {header(props.right, false)}
      </div>
      {props.rows.map((row, i) => {
        const p = enter(frame, fps, at(ROWS_FROM + (ROWS_SPAN * i) / props.rows.length));
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              minHeight: 68,
              borderTop: `2px solid ${c.text}26`,
              paddingTop: 10,
              opacity: p,
              translate: `0px ${interpolate(p, [0, 1], [20, 0])}px`,
            }}
          >
            {value(row.left, row.winner === "left", row.winner === "right", "right")}
            <div
              style={{
                width: MIDDLE,
                textAlign: "center",
                ...headStyle(fitFontSize(row.attribute, MIDDLE - 16, 40, FONT_HEAD, WEIGHT_HEAD)),
                color: c.text,
                opacity: 0.65,
                whiteSpace: "nowrap",
              }}
            >
              {row.attribute}
            </div>
            {value(row.right, row.winner === "right", row.winner === "left", "left")}
          </div>
        );
      })}
    </div>
  );
};
```

`template/src/blocks/Proportion.tsx`:
```tsx
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette, useTalent } from "../frame/contexts";
import { SMALL_TEXT_ATTR } from "../frame/minFont";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter } from "../frame/timing";
import { Icon } from "../icons";
import { gridShape } from "./Proportion.schema";
import type { BlockComponent } from "./types";

const VISUAL = 380;
const TEXT_W = 540;
const TRACK_FROM = 0.05;
const TRACK_TO = 0.2;
const FILL_AT = 0.3;
const FILL_TO = 0.55;
const FILL_SPAN = 0.25;
const LABEL_AT = 0.4;
const SOURCE_AT = 0.55;
const DONUT_R = 150;
const DONUT_STROKE = 54;

export const Proportion: BlockComponent<"Proportion"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { locale } = useTalent();
  const { at, duration } = timing;
  const track = interpolate(frame, [at(TRACK_FROM), at(TRACK_TO)], [0, 1], CLAMP);
  const fill = interpolate(frame, [at(FILL_AT), at(FILL_TO)], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const label = enter(frame, fps, at(LABEL_AT));
  const source = enter(frame, fps, at(SOURCE_AT));
  const stagger = Math.min(3, (FILL_SPAN * duration) / Math.max(1, props.numerator));
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  const grid = () => {
    const { cols } = gridShape(props.denominator);
    const cell = VISUAL / cols;
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridAutoRows: cell, opacity: track }}>
        {Array.from({ length: props.denominator }, (_, i) => {
          const on = i < props.numerator ? enter(frame, fps, at(FILL_AT) + i * stagger) : 0;
          const color = on > 0.5 ? c.accent : `${c.text}33`;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {props.style === "people" ? (
                <Icon name="person" size={cell * 0.9} color={color} style={{ scale: 1 + 0.15 * on * (1 - on) * 4 }} />
              ) : (
                <div style={{ width: cell * 0.72, height: cell * 0.72, borderRadius: "50%", backgroundColor: color, scale: 1 + 0.6 * on * (1 - on) }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const donut = () => {
    const circumference = 2 * Math.PI * DONUT_R;
    const share = props.numerator / props.denominator;
    return (
      <div style={{ position: "relative", width: VISUAL, height: VISUAL, opacity: track }}>
        <svg width={VISUAL} height={VISUAL}>
          <circle cx={VISUAL / 2} cy={VISUAL / 2} r={DONUT_R} fill="none" stroke={`${c.text}26`} strokeWidth={DONUT_STROKE} />
          <circle
            cx={VISUAL / 2}
            cy={VISUAL / 2}
            r={DONUT_R}
            fill="none"
            stroke={c.accent}
            strokeWidth={DONUT_STROKE}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - share * fill)}
            transform={`rotate(-90 ${VISUAL / 2} ${VISUAL / 2})`}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", ...headStyle(72), color: c.accent }}>
          {format.format(share * 100 * fill)} %
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
      <div style={{ width: VISUAL, flexShrink: 0 }}>{props.style === "donut" ? donut() : grid()}</div>
      <div style={{ width: TEXT_W, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ ...headStyle(64), color: c.text, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 140, color: c.accent, lineHeight: 1 }}>{format.format(Math.round(props.numerator * fill))}</span>{" "}
          {props.ofWord} {format.format(props.denominator)}
        </div>
        <div style={{ ...bodyStyle(48), color: c.text, opacity: label, translate: `0px ${interpolate(label, [0, 1], [16, 0])}px` }}>
          {props.label}
        </div>
        {props.source ? (
          <div {...{ [SMALL_TEXT_ATTR]: "" }} style={{ ...bodyStyle(30), color: c.text, opacity: 0.7 * source }}>
            {props.source}
          </div>
        ) : null}
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Register and add the gallery samples**

Register `Versus` and `Proportion`. Append to `samples.json`:
```json
  {
    "block": "Versus",
    "title": { "text": "¿CUÁL protege mejor?", "accent": "CUÁL" },
    "durationInFrames": 210,
    "props": {
      "left": { "name": "Taco o breaker", "icon": "lightning" },
      "right": { "name": "Fusible viejo", "icon": "flame" },
      "rows": [
        { "attribute": "Se reutiliza", "left": "Se rearma", "right": "Se reemplaza", "winner": "left" },
        { "attribute": "Precio", "left": "Más caro", "right": "Muy barato", "winner": "right" },
        { "attribute": "Velocidad", "left": "Muy rápido", "right": "Rápido", "winner": "left" },
        { "attribute": "Mantenimiento", "left": "Casi ninguno", "right": "Cambiarlo", "winner": "left" }
      ]
    }
  },
  {
    "block": "Proportion",
    "title": { "text": "¿QUÉ TAN común es?", "accent": "QUÉ TAN" },
    "durationInFrames": 210,
    "props": {
      "numerator": 23,
      "denominator": 100,
      "style": "dots",
      "label": "de los perros atendidos por intoxicación comieron chocolate",
      "source": "Dato de ejemplo para la galería de bloques, no es una estadística real"
    }
  }
```

- [ ] **Step 6: Verify (shared procedure)** with `--block=Versus,Proportion`. Also render the two other Proportion styles once to check them visually:
```bash
npx remotion still BlockPreview out/proportion-donut.png --public-dir examples/smoke --frame=209 --props='{"layoutName":"9x16","block":"Proportion","props":{"numerator":1,"denominator":4,"style":"donut","label":"de los tutores no sabe qué hacer"},"title":null,"durationInFrames":210,"talent":null}'
npx remotion still BlockPreview out/proportion-people.png --public-dir examples/smoke --frame=209 --props='{"layoutName":"9x16","block":"Proportion","props":{"numerator":3,"denominator":10,"style":"people","label":"de cada 10 perros"},"title":null,"durationInFrames":210,"talent":null}'
```
Expected: both gallery samples pass in both layouts. Versus: two headers with icons, an accent VS disc, four ruled rows with values either side, winners with green checks and accent values, losers dimmed. Proportion: a 10×10 dot grid with 23 accent dots, "23 de cada 100", the label and a small source line; the donut shows a quarter ring with "25 %"; the people grid shows 3 accent figures out of 10.

- [ ] **Step 7: Commit**

```bash
git add template/src/blocks template/src/gallery/samples.json template/tests
git commit -m "feat(blocks): Versus and Proportion"
```

---

### Task 10: `Gauge` and `Trend`

**Files:**
- Create: `template/src/blocks/parts/tone.ts`, `template/src/blocks/Gauge.schema.ts`, `Gauge.tsx`, `Trend.schema.ts`, `Trend.tsx`
- Modify: `schemas.ts`, `registry.tsx`, `template/src/gallery/samples.json`
- Test: `template/tests/blocks/Gauge.schema.test.ts`, `Trend.schema.test.ts`

**Interfaces:**
- Consumes: `tone`, `Tone` (schema-parts, Task 3).
- Produces:
  - `toneColor(tone, palette)` in `parts/tone.ts` (shown in the shared procedure).
  - `Gauge` `{ value, unit ≤6 = "", decimals 0–2 = 0, min = 0, max, zones: { to; label ≤12; tone }[2–4], needleLabel ≤30 = "" }`; max > min; zones strictly ascending above min; last zone ends at max; min ≤ value ≤ max. Helper `zoneIndex(zones, value)` exported from the schema. Keyframes: zone arcs draw in sequence 0.04→0.25; needle sweeps 0.30→0.55 with a slight overshoot (`Easing.back`); value counts with it; the value's zone chip pulses and the others dim from 0.60.
  - `Trend` `{ points: { x ≤5; y }[3–12], yUnit ≤6 = "", decimals 0–2 = 0, yMin?, annotate?: { index; label ≤24 } }`; annotate index within points; `yMin` ≤ the smallest y. Helper `trendScale(points, yMin?)` → `{ lo, hi }` exported from the schema. Keyframes: line and points draw 0.08→0.55, area fades 0.30→0.60, last value counts with the line, annotation 0.68.

- [ ] **Step 1: Write the failing tests**

`template/tests/blocks/Gauge.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { gaugeSchema, zoneIndex } from "../../src/blocks/Gauge.schema";

const BASE = {
  value: 39.6,
  decimals: 1,
  unit: "°C",
  min: 36,
  max: 42,
  zones: [
    { to: 39.2, label: "Normal", tone: "ok" },
    { to: 40, label: "Fiebre", tone: "warn" },
    { to: 42, label: "Urgencia", tone: "danger" },
  ],
};

it("accepts a valid gauge", () => {
  expect(gaugeSchema.parse(BASE).needleLabel).toBe("");
});
it("requires the value inside min–max", () => {
  expect(gaugeSchema.safeParse({ ...BASE, value: 43 }).success).toBe(false);
});
it("requires ascending zones that end at max", () => {
  expect(gaugeSchema.safeParse({ ...BASE, zones: [BASE.zones[1], BASE.zones[0], BASE.zones[2]] }).success).toBe(false);
  expect(gaugeSchema.safeParse({ ...BASE, zones: [BASE.zones[0], { ...BASE.zones[2], to: 41 }] }).success).toBe(false);
});
it("requires max > min and 2–4 zones", () => {
  expect(gaugeSchema.safeParse({ ...BASE, min: 42 }).success).toBe(false);
  expect(gaugeSchema.safeParse({ ...BASE, zones: [{ to: 42, label: "Todo", tone: "ok" }] }).success).toBe(false);
});
it("finds the zone holding a value", () => {
  const { zones } = gaugeSchema.parse(BASE);
  expect(zoneIndex(zones, 36)).toBe(0);
  expect(zoneIndex(zones, 39.6)).toBe(1);
  expect(zoneIndex(zones, 42)).toBe(2);
});
```

`template/tests/blocks/Trend.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { trendSchema, trendScale } from "../../src/blocks/Trend.schema";

const pts = (...ys: number[]) => ys.map((y, i) => ({ x: `M${i + 1}`, y }));

it("accepts 3–12 points", () => {
  expect(trendSchema.safeParse({ points: pts(1, 2) }).success).toBe(false);
  expect(trendSchema.safeParse({ points: pts(...new Array(13).fill(1)) }).success).toBe(false);
  expect(trendSchema.safeParse({ points: pts(1, 2, 3) }).success).toBe(true);
});
it("limits x labels to 5 characters", () => {
  expect(trendSchema.safeParse({ points: [{ x: "Enero", y: 1 }, { x: "Febrero", y: 2 }, { x: "Mar", y: 3 }] }).success).toBe(false);
});
it("rejects an annotation past the last point and a yMin above the data", () => {
  expect(trendSchema.safeParse({ points: pts(1, 2, 3), annotate: { index: 3, label: "x" } }).success).toBe(false);
  expect(trendSchema.safeParse({ points: pts(5, 6, 7), yMin: 6 }).success).toBe(false);
});
it("scales from 0 (or yMin) with 10 % headroom", () => {
  expect(trendScale(pts(10, 20, 40))).toEqual({ lo: 0, hi: 44 });
  expect(trendScale(pts(-10, 0, 10))).toEqual({ lo: -10, hi: 12 });
  expect(trendScale(pts(36, 38, 40), 35)).toEqual({ lo: 35, hi: 40.5 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks/Gauge.schema.test.ts tests/blocks/Trend.schema.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the schemas and the tone helper**

`template/src/blocks/parts/tone.ts`:
```ts
import type { Palette } from "../../episode/talent";
import type { Tone } from "../schema-parts";

export const toneColor = (t: Tone, c: Palette) => (t === "ok" ? c.safe : t === "warn" ? c.accent : c.danger);
```

`template/src/blocks/Gauge.schema.ts`:
```ts
import { z } from "zod";
import { tone } from "./schema-parts";

export const gaugeSchema = z
  .strictObject({
    value: z.number(),
    unit: z.string().max(6).default(""),
    decimals: z.number().int().min(0).max(2).default(0),
    min: z.number().default(0),
    max: z.number(),
    zones: z.array(z.strictObject({ to: z.number(), label: z.string().min(1).max(12), tone })).min(2).max(4),
    needleLabel: z.string().max(30).default(""),
  })
  .refine((g) => g.max > g.min, { message: "max must be greater than min", path: ["max"] })
  .refine((g) => g.zones.every((zone, i) => zone.to > (i === 0 ? g.min : g.zones[i - 1].to)), {
    message: "zones must be strictly ascending, starting above min",
    path: ["zones"],
  })
  .refine((g) => g.zones[g.zones.length - 1].to === g.max, { message: "the last zone must end at max", path: ["zones"] })
  .refine((g) => g.value >= g.min && g.value <= g.max, { message: "value must be within min–max", path: ["value"] });

/** Index of the zone that holds `value` (zones end at their `to`, inclusive). */
export const zoneIndex = (zones: { to: number }[], value: number) => {
  const i = zones.findIndex((zone) => value <= zone.to);
  return i === -1 ? zones.length - 1 : i;
};
```

`template/src/blocks/Trend.schema.ts`:
```ts
import { z } from "zod";

const HEADROOM = 0.1;

export const trendSchema = z
  .strictObject({
    points: z.array(z.strictObject({ x: z.string().min(1).max(5), y: z.number() })).min(3).max(12),
    yUnit: z.string().max(6).default(""),
    decimals: z.number().int().min(0).max(2).default(0),
    yMin: z.number().optional(),
    annotate: z.strictObject({ index: z.number().int().min(0), label: z.string().min(1).max(24) }).optional(),
  })
  .refine((t) => !t.annotate || t.annotate.index < t.points.length, {
    message: "annotate.index must point at a point",
    path: ["annotate", "index"],
  })
  .refine((t) => t.yMin === undefined || t.yMin <= Math.min(...t.points.map((p) => p.y)), {
    message: "yMin must be at or below the smallest value",
    path: ["yMin"],
  });

/** Vertical range: from yMin (or 0, or the lowest value if negative) to the highest value plus 10 % of the span. */
export const trendScale = (points: { y: number }[], yMin?: number) => {
  const ys = points.map((p) => p.y);
  const lo = yMin ?? Math.min(0, ...ys);
  const top = Math.max(...ys);
  const span = top - lo || 1;
  return { lo, hi: Math.round((top + span * HEADROOM) * 1e6) / 1e6 };
};
```

- [ ] **Step 4: Implement the components**

`template/src/blocks/Gauge.tsx`:
```tsx
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette, useTalent } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, pulse } from "../frame/timing";
import { zoneIndex } from "./Gauge.schema";
import { toneColor } from "./parts/tone";
import type { BlockComponent } from "./types";

const W = 560;
const H = 300;
const CX = W / 2;
const CY = 270;
const R = 230;
const STROKE = 50;
const ZONES_FROM = 0.04;
const ZONES_TO = 0.25;
const NEEDLE_FROM = 0.3;
const NEEDLE_TO = 0.55;
const LEGEND_AT = 0.6;

const point = (t: number, r = R) => ({ x: CX - r * Math.cos(Math.PI * t), y: CY - r * Math.sin(Math.PI * t) });

export const Gauge: BlockComponent<"Gauge"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { locale } = useTalent();
  const { at } = timing;
  const span = props.max - props.min;
  const frac = (v: number) => (v - props.min) / span;
  const active = zoneIndex(props.zones, props.value);
  const activeColor = toneColor(props.zones[active].tone, c);
  const sweep = interpolate(frame, [at(NEEDLE_FROM), at(NEEDLE_TO)], [0, 1], { ...CLAMP, easing: Easing.out(Easing.back(1.6)) });
  const needle = point(frac(props.value) * sweep, R - 46);
  const shown = props.min + (props.value - props.min) * Math.min(1, sweep);
  const format = new Intl.NumberFormat(locale, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals });
  const legendDim = interpolate(frame, [at(LEGEND_AT), at(LEGEND_AT) + 10], [1, 0.55], CLAMP);
  const zoneSpan = (ZONES_TO - ZONES_FROM) / props.zones.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: W, height: H }}>
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          {props.zones.map((zone, i) => {
            const from = point(frac(i === 0 ? props.min : props.zones[i - 1].to));
            const to = point(frac(zone.to));
            const draw = interpolate(frame, [at(ZONES_FROM + zoneSpan * i), at(ZONES_FROM + zoneSpan * (i + 1))], [0, 1], CLAMP);
            return (
              <path
                key={i}
                d={`M${from.x} ${from.y} A${R} ${R} 0 0 1 ${to.x} ${to.y}`}
                fill="none"
                stroke={toneColor(zone.tone, c)}
                strokeWidth={STROKE}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - draw}
              />
            );
          })}
          <line x1={CX} y1={CY} x2={needle.x} y2={needle.y} stroke={activeColor} strokeWidth={12} strokeLinecap="round" opacity={sweep > 0 ? 1 : 0} />
          <circle cx={CX} cy={CY} r={22} fill={c.text} />
        </svg>
        <div style={{ position: "absolute", left: CX - R - 60, top: CY + 30, width: 120, textAlign: "center", ...headStyle(40), color: c.text, opacity: 0.6 }}>
          {format.format(props.min)}
        </div>
        <div style={{ position: "absolute", left: CX + R - 60, top: CY + 30, width: 120, textAlign: "center", ...headStyle(40), color: c.text, opacity: 0.6 }}>
          {format.format(props.max)}
        </div>
      </div>
      <div style={{ ...headStyle(96), color: activeColor, whiteSpace: "nowrap", marginTop: 30 }}>
        {format.format(shown)}
        {props.unit ? <span style={{ fontSize: 56, marginLeft: 10 }}>{props.unit}</span> : null}
      </div>
      {props.needleLabel ? <div style={{ ...bodyStyle(44), color: c.text }}>{props.needleLabel}</div> : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 18px", marginTop: 6 }}>
        {props.zones.map((zone, i) => {
          const isActive = i === active;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 20px 2px 14px",
                borderRadius: 999,
                border: `3px solid ${isActive && frame >= at(LEGEND_AT) ? toneColor(zone.tone, c) : "transparent"}`,
                ...headStyle(40),
                color: c.text,
                whiteSpace: "nowrap",
                opacity: isActive ? 1 : legendDim,
                scale: isActive ? pulse(frame, at(LEGEND_AT), 14, 1.1) : 1,
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: toneColor(zone.tone, c), marginTop: -4 }} />
              {zone.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

`template/src/blocks/Trend.tsx`:
```tsx
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette, useTalent } from "../frame/contexts";
import { headStyle } from "../frame/theme";
import { CLAMP, pop } from "../frame/timing";
import { trendScale } from "./Trend.schema";
import type { BlockComponent } from "./types";

const W = 960;
const H = 420;
const LEFT = 130;
const RIGHT = 900;
const TOP = 80;
const BOTTOM = 340;
const LINE_FROM = 0.08;
const LINE_TO = 0.55;
const AREA_FROM = 0.3;
const AREA_TO = 0.6;
const ANNOTATE_AT = 0.68;
const BUBBLE_HALF = 230;

export const Trend: BlockComponent<"Trend"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { locale } = useTalent();
  const { at } = timing;
  const n = props.points.length;
  const { lo, hi } = trendScale(props.points, props.yMin);
  const px = (i: number) => LEFT + ((RIGHT - LEFT) * i) / (n - 1);
  const py = (v: number) => BOTTOM - ((v - lo) / (hi - lo)) * (BOTTOM - TOP);
  const draw = interpolate(frame, [at(LINE_FROM), at(LINE_TO)], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.quad) });
  const area = interpolate(frame, [at(AREA_FROM), at(AREA_TO)], [0, 1], CLAMP);
  const format = new Intl.NumberFormat(locale, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals });
  const line = props.points.map((p, i) => `${i === 0 ? "M" : "L"}${px(i)} ${py(p.y)}`).join(" ");
  const last = props.points[n - 1];
  const showLabel = (i: number) => n <= 7 || i % 2 === 0 || i === n - 1;
  const note = props.annotate;
  const noteIn = pop(frame, fps, at(ANNOTATE_AT));

  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.accent} stopOpacity={0.35} />
            <stop offset="1" stopColor={c.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1={LEFT} y1={BOTTOM} x2={RIGHT} y2={BOTTOM} stroke={`${c.text}40`} strokeWidth={3} />
        <path d={`${line} L${px(n - 1)} ${BOTTOM} L${px(0)} ${BOTTOM} Z`} fill="url(#trend-area)" opacity={area} />
        <path d={line} fill="none" stroke={c.accent} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        {props.points.map((p, i) => {
          const dot = pop(frame, fps, at(LINE_FROM + ((LINE_TO - LINE_FROM) * i) / (n - 1)));
          return (
            <circle
              key={i}
              cx={px(i)}
              cy={py(p.y)}
              r={10}
              fill={c.accent}
              stroke={c.bg}
              strokeWidth={4}
              opacity={interpolate(dot, [0, 0.2], [0, 1], CLAMP)}
            />
          );
        })}
        {note ? (
          <circle
            cx={px(note.index)}
            cy={py(props.points[note.index].y)}
            r={24}
            fill="none"
            stroke={c.text}
            strokeWidth={4}
            opacity={interpolate(noteIn, [0, 0.2], [0, 1], CLAMP)}
          />
        ) : null}
      </svg>
      <div style={{ position: "absolute", left: 0, top: TOP - 24, width: LEFT - 20, textAlign: "right", ...headStyle(40), color: c.text, opacity: 0.6 }}>
        {format.format(hi)}
      </div>
      <div style={{ position: "absolute", left: 0, top: BOTTOM - 24, width: LEFT - 20, textAlign: "right", ...headStyle(40), color: c.text, opacity: 0.6 }}>
        {format.format(lo)}
      </div>
      {props.points.map((p, i) =>
        showLabel(i) ? (
          <div key={i} style={{ position: "absolute", left: px(i) - 60, top: BOTTOM + 14, width: 120, textAlign: "center", ...headStyle(40), color: c.text, opacity: 0.6 }}>
            {p.x}
          </div>
        ) : null,
      )}
      <div
        style={{
          position: "absolute",
          left: px(n - 1),
          top: py(last.y) - 84,
          translate: "-100% 0",
          ...headStyle(64),
          color: c.accent,
          whiteSpace: "nowrap",
          opacity: draw > 0 ? 1 : 0,
        }}
      >
        {format.format(last.y * draw)}
        {props.yUnit ? <span style={{ fontSize: 40, marginLeft: 8 }}>{props.yUnit}</span> : null}
      </div>
      {note ? (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(px(note.index), BUBBLE_HALF), W - BUBBLE_HALF),
            top: py(props.points[note.index].y) > TOP + 110 ? py(props.points[note.index].y) - 120 : py(props.points[note.index].y) + 40,
            translate: "-50% 0",
            ...headStyle(40),
            color: c.text,
            backgroundColor: c.bg2,
            border: `3px solid ${c.accent}`,
            borderRadius: 18,
            padding: "8px 20px 2px",
            whiteSpace: "nowrap",
            opacity: interpolate(noteIn, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(noteIn, [0, 1], [0.6, 1]),
          }}
        >
          {note.label}
        </div>
      ) : null}
    </div>
  );
};
```

- [ ] **Step 5: Register and add the gallery samples**

Register `Gauge` and `Trend`. Append to `samples.json`:
```json
  {
    "block": "Gauge",
    "title": { "text": "¿TIENE fiebre?", "accent": "TIENE" },
    "durationInFrames": 210,
    "props": {
      "value": 39.6,
      "unit": "°C",
      "decimals": 1,
      "min": 36,
      "max": 42,
      "zones": [
        { "to": 39.2, "label": "Normal", "tone": "ok" },
        { "to": 40, "label": "Fiebre leve", "tone": "warn" },
        { "to": 41, "label": "Fiebre alta", "tone": "danger" },
        { "to": 42, "label": "Urgencia", "tone": "danger" }
      ],
      "needleLabel": "Temperatura de tu perro hoy"
    }
  },
  {
    "block": "Trend",
    "title": { "text": "¿CUÁNDO hay más casos?", "accent": "CUÁNDO" },
    "durationInFrames": 210,
    "props": {
      "points": [
        { "x": "Ene", "y": 12 },
        { "x": "Feb", "y": 10 },
        { "x": "Mar", "y": 14 },
        { "x": "Abr", "y": 18 },
        { "x": "May", "y": 15 },
        { "x": "Jun", "y": 13 },
        { "x": "Jul", "y": 16 },
        { "x": "Ago", "y": 17 },
        { "x": "Sep", "y": 20 },
        { "x": "Oct", "y": 41 },
        { "x": "Nov", "y": 22 },
        { "x": "Dic", "y": 35 }
      ],
      "yUnit": "casos",
      "annotate": { "index": 9, "label": "Pico por Halloween" }
    }
  }
```

- [ ] **Step 6: Verify (shared procedure)** with `--block=Gauge,Trend`. Expected: both pass in both layouts. Gauge: a four-colour semicircle (green, orange, red, red), min/max under the ends, the needle in the orange zone, "39,6 °C" in orange, the needle label, and a legend with "Fiebre leve" outlined. Trend: an orange line over 12 months with dots, a soft area under it, "45"/"0" on the left, every other month labelled plus "Dic", "35 casos" near the last point, a ring on October and the "Pico por Halloween" bubble fully inside the chart.

- [ ] **Step 7: Commit**

```bash
git add template/src/blocks template/src/gallery/samples.json template/tests
git commit -m "feat(blocks): Gauge and Trend"
```

---

### Task 11: `Anatomy` and `Decision`

**Files:**
- Create: `template/src/blocks/Anatomy.schema.ts`, `Anatomy.tsx`, `Decision.schema.ts`, `Decision.tsx`
- Modify: `schemas.ts`, `registry.tsx`, `template/src/gallery/samples.json`
- Test: `template/tests/blocks/Anatomy.schema.test.ts`, `Decision.schema.test.ts`

**Interfaces:**
- Consumes: `Diagram`, `diagramName` (Task 3), `toneColor`, `tone` (Task 10).
- Produces:
  - `Anatomy` `{ subject: { diagram: DiagramName } | { icon: IconName }, callouts: { label ≤16; x 0–100; y 0–100 }[2–6], highlight?: index }`; at most 3 callouts per side (x < 50 is the left column). Layout: label column 250 | subject 400×400 | label column 250 (with 30 px gaps). Labels stack evenly per side in y order; a leader line joins each label to a dot at its anchor. Keyframes: subject enters 0.04; callout i (input order) at `0.18 + 0.45·i/count` (dot pops, line draws over 8 frames, label enters 6 frames later); highlight at 0.75 (label accent, dot pulses, others dim to 55 %). Helper `calloutSlots(callouts)` → per callout `{ side, slot, count }` exported from the schema.
  - `Decision` `{ question ≤60, yesLabel ≤6 = "SÍ", noLabel ≤6 = "NO", yes: Outcome | FollowUp, no: Outcome | FollowUp }` where `Outcome = { label ≤40; tone }` and `FollowUp = { question ≤44; yes: { label ≤24; tone }; no: { label ≤24; tone } }`; only one branch may be a follow-up (depth ≤ 2). Keyframes: question 0.04, branch lines 0.16→0.26, yes/no tags 0.26, yes branch 0.32, no branch 0.42 (a follow-up's inner lines draw 8→16 frames later and its outcomes enter 16 and 22 frames later), danger outcomes pulse at 0.80.

- [ ] **Step 1: Write the failing tests**

`template/tests/blocks/Anatomy.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { anatomySchema, calloutSlots } from "../../src/blocks/Anatomy.schema";

const callout = (label: string, x: number, y: number) => ({ label, x, y });
const BASE = { subject: { diagram: "dog" }, callouts: [callout("Nariz", 10, 40), callout("Cola", 90, 45)] };

it("accepts a diagram or an icon as subject, not both or neither", () => {
  expect(anatomySchema.safeParse(BASE).success).toBe(true);
  expect(anatomySchema.safeParse({ ...BASE, subject: { icon: "car" } }).success).toBe(true);
  expect(anatomySchema.safeParse({ ...BASE, subject: { diagram: "dog", icon: "car" } }).success).toBe(false);
  expect(anatomySchema.safeParse({ ...BASE, subject: { diagram: "robot" } }).success).toBe(false);
});
it("allows at most 3 callouts per side and 2–6 in total", () => {
  const left = [callout("a", 10, 10), callout("b", 20, 20), callout("c", 30, 30), callout("d", 40, 40)];
  const r = anatomySchema.safeParse({ ...BASE, callouts: left });
  expect(r.success).toBe(false);
  expect(JSON.stringify(r.error?.issues)).toContain("at most 3 callouts per side");
  expect(anatomySchema.safeParse({ ...BASE, callouts: [callout("a", 10, 10)] }).success).toBe(false);
});
it("rejects a highlight past the last callout and anchors outside 0–100", () => {
  expect(anatomySchema.safeParse({ ...BASE, highlight: 2 }).success).toBe(false);
  expect(anatomySchema.safeParse({ ...BASE, callouts: [callout("a", 101, 10), BASE.callouts[1]] }).success).toBe(false);
});
it("assigns slots per side in y order", () => {
  const slots = calloutSlots([callout("low", 10, 80), callout("high", 10, 20), callout("right", 70, 50)]);
  expect(slots).toEqual([
    { side: "left", slot: 1, count: 2 },
    { side: "left", slot: 0, count: 2 },
    { side: "right", slot: 0, count: 1 },
  ]);
});
```

`template/tests/blocks/Decision.schema.test.ts`:
```ts
import { expect, it } from "vitest";
import { decisionSchema } from "../../src/blocks/Decision.schema";

const outcome = (label: string, tone = "ok") => ({ label, tone });
const followUp = { question: "¿Ya tiene vómito o temblores?", yes: outcome("Urgencias ya", "danger"), no: outcome("Llama a tu veterinaria", "warn") };
const BASE = { question: "¿Comió chocolate amargo?", yes: followUp, no: outcome("Observa 12 horas") };

it("accepts one follow-up branch and fills the tag labels", () => {
  const p = decisionSchema.parse(BASE);
  expect([p.yesLabel, p.noLabel]).toEqual(["SÍ", "NO"]);
});
it("rejects two follow-up branches (depth ≤ 2)", () => {
  const r = decisionSchema.safeParse({ ...BASE, no: followUp });
  expect(r.success).toBe(false);
  expect(JSON.stringify(r.error?.issues)).toContain("only one branch");
});
it("limits lengths: question 60, outcome 40, follow-up question 44, follow-up outcomes 24", () => {
  expect(decisionSchema.safeParse({ ...BASE, question: "x".repeat(61) }).success).toBe(false);
  expect(decisionSchema.safeParse({ ...BASE, no: outcome("x".repeat(41)) }).success).toBe(false);
  expect(decisionSchema.safeParse({ ...BASE, yes: { ...followUp, question: "x".repeat(45) } }).success).toBe(false);
  expect(decisionSchema.safeParse({ ...BASE, yes: { ...followUp, no: outcome("x".repeat(25)) } }).success).toBe(false);
});
it("rejects unknown tones", () => {
  expect(decisionSchema.safeParse({ ...BASE, no: outcome("a", "maybe") }).success).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd template && npx vitest run tests/blocks/Anatomy.schema.test.ts tests/blocks/Decision.schema.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the schemas**

`template/src/blocks/Anatomy.schema.ts`:
```ts
import { z } from "zod";
import { diagramName, iconName } from "./schema-parts";

const PER_SIDE = 3;
const callout = z.strictObject({
  label: z.string().min(1).max(16),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const anatomySchema = z
  .strictObject({
    subject: z.union([z.strictObject({ diagram: diagramName }), z.strictObject({ icon: iconName })]),
    callouts: z.array(callout).min(2).max(6),
    highlight: z.number().int().min(0).optional(),
  })
  .refine(
    (a) => a.callouts.filter((c) => c.x < 50).length <= PER_SIDE && a.callouts.filter((c) => c.x >= 50).length <= PER_SIDE,
    { message: `at most ${PER_SIDE} callouts per side (x < 50 is the left side)`, path: ["callouts"] },
  )
  .refine((a) => a.highlight === undefined || a.highlight < a.callouts.length, {
    message: "highlight must point at a callout",
    path: ["highlight"],
  });

export type CalloutSlot = { side: "left" | "right"; slot: number; count: number };

/** Each callout's column and its position in that column (sorted top to bottom by anchor y). */
export const calloutSlots = (callouts: { x: number; y: number }[]): CalloutSlot[] => {
  const sideOf = (c: { x: number }) => (c.x < 50 ? "left" : "right");
  return callouts.map((c, i) => {
    const same = callouts.map((o, j) => ({ o, j })).filter(({ o }) => sideOf(o) === sideOf(c));
    const ordered = [...same].sort((a, b) => a.o.y - b.o.y || a.j - b.j);
    return { side: sideOf(c), slot: ordered.findIndex(({ j }) => j === i), count: same.length };
  });
};
```

`template/src/blocks/Decision.schema.ts`:
```ts
import { z } from "zod";
import { tone } from "./schema-parts";

const outcome = z.strictObject({ label: z.string().min(1).max(40), tone });
const followUp = z.strictObject({
  question: z.string().min(1).max(44),
  yes: z.strictObject({ label: z.string().min(1).max(24), tone }),
  no: z.strictObject({ label: z.string().min(1).max(24), tone }),
});
const branch = z.union([outcome, followUp]);

export const decisionSchema = z
  .strictObject({
    question: z.string().min(1).max(60),
    yesLabel: z.string().min(1).max(6).default("SÍ"),
    noLabel: z.string().min(1).max(6).default("NO"),
    yes: branch,
    no: branch,
  })
  .refine((d) => !("question" in d.yes && "question" in d.no), {
    message: "only one branch may ask a follow-up question (depth ≤ 2)",
    path: ["no"],
  });

export type DecisionBranch = z.infer<typeof branch>;
export const isFollowUp = (b: DecisionBranch): b is z.infer<typeof followUp> => "question" in b;
```

- [ ] **Step 4: Implement the components**

`template/src/blocks/Anatomy.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { headStyle } from "../frame/theme";
import { CLAMP, enter, pop, pulse } from "../frame/timing";
import { Icon } from "../icons";
import { Diagram } from "../icons/diagrams";
import { calloutSlots } from "./Anatomy.schema";
import type { BlockComponent } from "./types";

const COLUMN = 250;
const GAP = 30;
const SUBJECT = 400;
const W = COLUMN * 2 + GAP * 2 + SUBJECT;
const H = SUBJECT + 40;
const SUBJECT_X = COLUMN + GAP;
const SUBJECT_Y = 20;
const LABEL_H = 92;
const SUBJECT_AT = 0.04;
const CALLOUTS_FROM = 0.18;
const CALLOUTS_SPAN = 0.45;
const HIGHLIGHT_AT = 0.75;
const LINE_FRAMES = 8;

export const Anatomy: BlockComponent<"Anatomy"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const subject = enter(frame, fps, at(SUBJECT_AT));
  const slots = calloutSlots(props.callouts);
  const count = props.callouts.length;
  const highlightFrame = at(HIGHLIGHT_AT);
  const dim = props.highlight === undefined ? 1 : interpolate(frame, [highlightFrame, highlightFrame + 10], [1, 0.55], CLAMP);

  const geometry = props.callouts.map((callout, i) => {
    const { side, slot, count: sideCount } = slots[i];
    const labelY = SUBJECT_Y + ((slot + 0.5) * SUBJECT) / sideCount;
    return {
      anchorX: SUBJECT_X + (callout.x / 100) * SUBJECT,
      anchorY: SUBJECT_Y + (callout.y / 100) * SUBJECT,
      edgeX: side === "left" ? COLUMN + 8 : SUBJECT_X + SUBJECT + GAP - 8,
      labelY,
      side,
      start: at(CALLOUTS_FROM + (CALLOUTS_SPAN * i) / count),
    };
  });

  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <div style={{ position: "absolute", left: SUBJECT_X, top: SUBJECT_Y, opacity: subject, scale: interpolate(subject, [0, 1], [0.92, 1]) }}>
        {"diagram" in props.subject ? (
          <Diagram name={props.subject.diagram} size={SUBJECT} color={c.text} accent={c.bg} style={{ opacity: 0.92 }} />
        ) : (
          <Icon name={props.subject.icon} size={SUBJECT} color={c.text} accent={c.accent} />
        )}
      </div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {geometry.map((g, i) => {
          const draw = interpolate(frame, [g.start + 4, g.start + 4 + LINE_FRAMES], [0, 1], CLAMP);
          const isHighlight = i === props.highlight;
          return (
            <line
              key={i}
              x1={g.anchorX}
              y1={g.anchorY}
              x2={g.anchorX + (g.edgeX - g.anchorX) * draw}
              y2={g.anchorY + (g.labelY - g.anchorY) * draw}
              stroke={isHighlight ? c.accent : c.text}
              strokeWidth={4}
              opacity={isHighlight ? 1 : 0.8 * dim}
            />
          );
        })}
        {geometry.map((g, i) => {
          const p = pop(frame, fps, g.start);
          const isHighlight = i === props.highlight;
          return (
            <circle
              key={i}
              cx={g.anchorX}
              cy={g.anchorY}
              r={11}
              fill={c.accent}
              stroke={c.bg}
              strokeWidth={4}
              opacity={interpolate(p, [0, 0.2], [0, 1], CLAMP) * (isHighlight ? 1 : dim)}
              style={{
                scale: interpolate(p, [0, 1], [0.3, 1]) * (isHighlight ? pulse(frame, highlightFrame, 14, 1.5) : 1),
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            />
          );
        })}
      </svg>
      {props.callouts.map((callout, i) => {
        const g = geometry[i];
        const p = enter(frame, fps, g.start + 6);
        const isHighlight = i === props.highlight;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.side === "left" ? 0 : SUBJECT_X + SUBJECT + GAP,
              top: g.labelY - LABEL_H / 2,
              width: COLUMN,
              height: LABEL_H,
              display: "flex",
              alignItems: "center",
              justifyContent: g.side === "left" ? "flex-end" : "flex-start",
              textAlign: g.side === "left" ? "right" : "left",
              ...headStyle(40),
              color: isHighlight && frame >= highlightFrame ? c.accent : c.text,
              opacity: p * (isHighlight ? 1 : dim),
            }}
          >
            {callout.label}
          </div>
        );
      })}
    </div>
  );
};
```

`template/src/blocks/Decision.tsx`:
```tsx
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Tone } from "./schema-parts";
import { usePalette } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop, pulse } from "../frame/timing";
import { Icon } from "../icons";
import { isFollowUp, type DecisionBranch } from "./Decision.schema";
import { toneColor } from "./parts/tone";
import type { BlockComponent } from "./types";

const W = 960;
const COL = 460;
const SUB = 210;
const QUESTION_AT = 0.04;
const LINES_FROM = 0.16;
const LINES_TO = 0.26;
const TAGS_AT = 0.26;
const YES_AT = 0.32;
const NO_AT = 0.42;
const EMPHASIS_AT = 0.8;
const TONE_ICON = { ok: "check", warn: "warning", danger: "x" } as const;

export const Decision: BlockComponent<"Decision"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const question = enter(frame, fps, at(QUESTION_AT));
  const lines = interpolate(frame, [at(LINES_FROM), at(LINES_TO)], [0, 1], CLAMP);
  const tags = pop(frame, fps, at(TAGS_AT));
  const emphasis = (t: Tone) => (t === "danger" ? pulse(frame, at(EMPHASIS_AT), 16, 1.06) : 1);

  const tag = (label: string, x: number) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 14,
        translate: "-50% 0",
        ...headStyle(40),
        color: c.bg,
        backgroundColor: c.text,
        borderRadius: 999,
        padding: "4px 18px 0",
        opacity: interpolate(tags, [0, 0.2], [0, 1], CLAMP),
        scale: interpolate(tags, [0, 1], [0.4, 1]),
      }}
    >
      {label}
    </div>
  );

  const connector = (height: number, width: number, leftX: number, rightX: number, draw: number) => (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <path
        d={`M${width / 2} 0 V${height / 3} M${leftX} ${height / 3} H${rightX} M${leftX} ${height / 3} V${height} M${rightX} ${height / 3} V${height}`}
        stroke={c.text}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
        opacity={0.7}
      />
    </svg>
  );

  const outcomeBox = (label: string, t: Tone, width: number, compact: boolean, p: number) => (
    <div
      style={{
        width,
        boxSizing: "border-box",
        padding: compact ? "14px 14px 10px" : "18px 22px 14px",
        borderRadius: 24,
        border: `5px solid ${toneColor(t, c)}`,
        backgroundColor: `${toneColor(t, c)}22`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        textAlign: "center",
        opacity: p,
        translate: `0px ${interpolate(p, [0, 1], [24, 0])}px`,
        scale: emphasis(t),
      }}
    >
      {compact ? null : <Icon name={TONE_ICON[t]} size={56} color={toneColor(t, c)} />}
      <div style={{ ...(compact ? headStyle(40) : bodyStyle(44)), color: c.text }}>{label}</div>
    </div>
  );

  const branchView = (b: DecisionBranch, start: number) => {
    const p = enter(frame, fps, start);
    if (!isFollowUp(b)) {
      return outcomeBox(b.label, b.tone, COL, false, p);
    }
    const innerLines = interpolate(frame, [start + 8, start + 16], [0, 1], CLAMP);
    return (
      <div style={{ width: COL, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: COL - 20,
            boxSizing: "border-box",
            padding: "14px 18px 8px",
            borderRadius: 22,
            backgroundColor: c.bg2,
            border: `3px solid ${c.text}55`,
            ...headStyle(44),
            color: c.text,
            textAlign: "center",
            opacity: p,
          }}
        >
          {b.question}
        </div>
        <div style={{ position: "relative" }}>
          {connector(60, COL, SUB / 2 + 10, COL - SUB / 2 - 10, innerLines)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", width: COL - 20 }}>
          {outcomeBox(b.yes.label, b.yes.tone, SUB, true, enter(frame, fps, start + 16))}
          {outcomeBox(b.no.label, b.no.tone, SUB, true, enter(frame, fps, start + 22))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          maxWidth: 860,
          boxSizing: "border-box",
          padding: "18px 32px 10px",
          borderRadius: 28,
          backgroundColor: c.bg2,
          border: `4px solid ${c.accent}`,
          ...headStyle(52),
          color: c.text,
          textAlign: "center",
          opacity: question,
          scale: interpolate(question, [0, 1], [0.9, 1]),
        }}
      >
        {props.question}
      </div>
      <div style={{ position: "relative" }}>
        {connector(80, W, COL / 2, W - COL / 2, lines)}
        {tag(props.yesLabel, COL / 2 + 60)}
        {tag(props.noLabel, W - COL / 2 - 60)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", width: W, alignItems: "flex-start" }}>
        {branchView(props.yes, at(YES_AT))}
        {branchView(props.no, at(NO_AT))}
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Register and add the gallery samples**

Register `Anatomy` and `Decision`. Append to `samples.json`:
```json
  {
    "block": "Anatomy",
    "title": { "text": "¿DÓNDE revisar?", "accent": "DÓNDE" },
    "durationInFrames": 210,
    "props": {
      "subject": { "diagram": "dog" },
      "callouts": [
        { "label": "Nariz y olfato", "x": 14, "y": 49 },
        { "label": "Ojos brillantes", "x": 27, "y": 44 },
        { "label": "Patas delanteras", "x": 44, "y": 80 },
        { "label": "Pelaje y piel", "x": 62, "y": 57 },
        { "label": "Cola", "x": 88, "y": 45 },
        { "label": "Patas traseras", "x": 76, "y": 80 }
      ],
      "highlight": 0
    }
  },
  {
    "block": "Decision",
    "title": { "text": "¿QUÉ hago ahora?", "accent": "QUÉ" },
    "durationInFrames": 255,
    "props": {
      "question": "¿Tu perro comió chocolate amargo en las últimas dos horas?",
      "yes": {
        "question": "¿Ya tiene vómito, temblores o jadeo?",
        "yes": { "label": "Urgencias ahora mismo", "tone": "danger" },
        "no": { "label": "Llama a tu veterinaria", "tone": "warn" }
      },
      "no": { "label": "Observa 12 horas y guarda el empaque", "tone": "ok" }
    }
  }
```

- [ ] **Step 6: Verify (shared procedure)** with `--block=Anatomy,Decision`. Also render the icon-subject variant once:
```bash
npx remotion still BlockPreview out/anatomy-icon.png --public-dir examples/smoke --frame=209 --props='{"layoutName":"9x16","block":"Anatomy","props":{"subject":{"icon":"car"},"callouts":[{"label":"Frenos","x":28,"y":78},{"label":"Motor","x":70,"y":50}]},"title":null,"durationInFrames":210,"talent":null}'
```
Expected: both gallery samples pass in both layouts. Anatomy: the cream dog silhouette in the middle, three labels each side joined by lines to accent dots on the body, "Nariz y olfato" in accent with its dot pulsing and the others dimmed. Decision: the question in an accent-bordered box, branch lines to SÍ (left) and NO (right), the left branch's follow-up question with two small outcome boxes (red, orange), the right branch's green outcome with a check icon. The icon variant shows a large car with two callouts.

- [ ] **Step 7: Commit**

```bash
git add template/src/blocks template/src/gallery/samples.json template/tests
git commit -m "feat(blocks): Anatomy and Decision"
```

---

### Task 12: Engineering example and full verification

**Files:**
- Create: `template/examples/engineering-sample/episode.json`, `template/examples/engineering-sample/talent.json`
- Test: `template/tests/examples.test.ts` (runs automatically for every example folder), `template/tests/engineering-example.test.ts`

**Interfaces:**
- Consumes: all 20 blocks.
- Produces: a 45 s reference episode in a different field whose three steps use only the new explainer blocks (`Definition`, `Gauge`, `Process`, `Versus`, `Decision`), with a different palette. `npm run check` (no args) now checks three examples.

- [ ] **Step 1: Write the failing test**

`template/tests/engineering-example.test.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { validateEpisode } from "../src/episode/validate";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../examples/engineering-sample");

it("is a 45 s episode whose steps use only the new explainer blocks", () => {
  const episode = validateEpisode(JSON.parse(fs.readFileSync(path.join(dir, "episode.json"), "utf8")));
  expect(episode.durationSeconds).toBe(45);
  const stepBlocks = [episode.scenes.step1, episode.scenes.step2, episode.scenes.step3].flatMap((s) => s.beats.map((b) => b.block));
  expect(new Set(stepBlocks)).toEqual(new Set(["Definition", "Gauge", "Process", "Versus", "Decision"]));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd template && npx vitest run tests/engineering-example.test.ts`
Expected: FAIL — ENOENT (episode.json missing).

- [ ] **Step 3: Write the example**

`template/examples/engineering-sample/talent.json`:
```json
{
  "id": "ingenieria",
  "displayName": "Ingeniería en casa",
  "pillName": "Ingeniería en casa",
  "profession": "Ingeniera electricista",
  "city": "Medellín",
  "country": "CO",
  "locale": "es-CO",
  "colors": {
    "bg": "#0E1726",
    "bg2": "#18263D",
    "accent": "#FFC21A",
    "text": "#F2F6FF",
    "danger": "#FF5A5A",
    "safe": "#3DDC97",
    "extra": {}
  },
  "disclaimer": ["Contenido de ejemplo.", "Ante dudas, llama a un electricista."]
}
```

`template/examples/engineering-sample/episode.json`:
```json
{
  "schemaVersion": 1,
  "talent": "ingenieria",
  "slug": "engineering-sample",
  "durationSeconds": 45,
  "stage": "built",
  "frame": { "steps": ["QUÉ ES", "CÓMO PASA", "QUÉ HACER"] },
  "script": [
    "¿Se te dispara el breaker cada rato? Te explico por qué.",
    "¿Qué es? Un interruptor que corta la luz cuando por el cable pasa más corriente de la que aguanta. Si la carga supera el cien por ciento, salta.",
    "¿Cómo pasa? Conectas varios aparatos, la corriente sube, el cable se calienta y el breaker la corta. Y a diferencia de un fusible, lo puedes volver a subir.",
    "¿Qué hacer? Si se vuelve a disparar sin nada conectado, no lo fuerces y llama a un electricista. Si pasó al conectar algo, desconéctalo y súbelo.",
    "Soy ingeniera electricista. Guárdalo para cuando se vaya la luz."
  ],
  "sceneStarts": null,
  "scenes": {
    "hook": {
      "beats": [
        {
          "block": "Hook",
          "props": {
            "line1": "¿Se te dispara el",
            "line2": "BREAKER?",
            "chip": "Electricidad en casa · 45 segundos",
            "hero": { "animation": "shake", "icon": "lightning", "color": "accent" }
          }
        }
      ]
    },
    "step1": {
      "title": { "text": "¿QUÉ ES un breaker?", "accent": "QUÉ ES" },
      "beats": [
        {
          "block": "Definition",
          "props": {
            "term": "Breaker",
            "pronunciation": "BREI-ker",
            "category": "Protección eléctrica",
            "meaning": "Interruptor que corta la luz cuando pasa más corriente de la que el cable aguanta.",
            "icon": "lightning"
          }
        },
        {
          "block": "Gauge",
          "props": {
            "value": 115,
            "unit": "%",
            "min": 0,
            "max": 150,
            "zones": [
              { "to": 80, "label": "Normal", "tone": "ok" },
              { "to": 100, "label": "Al límite", "tone": "warn" },
              { "to": 150, "label": "Se dispara", "tone": "danger" }
            ],
            "needleLabel": "Carga del circuito"
          }
        }
      ]
    },
    "step2": {
      "title": { "text": "¿CÓMO PASA?", "accent": "CÓMO" },
      "beats": [
        {
          "block": "Process",
          "props": {
            "steps": [
              { "icon": "plug", "label": "Conectas aparatos" },
              { "icon": "lightning", "label": "Sube la corriente" },
              { "icon": "flame", "label": "El cable se calienta" },
              { "icon": "ban", "label": "El breaker corta" }
            ],
            "connector": "arrow",
            "highlightStep": 3
          }
        },
        {
          "block": "Versus",
          "props": {
            "left": { "name": "Breaker", "icon": "lightning" },
            "right": { "name": "Fusible", "icon": "flame" },
            "rows": [
              { "attribute": "Se reutiliza", "left": "Sí", "right": "No", "winner": "left" },
              { "attribute": "Tras un corte", "left": "Lo subes", "right": "Lo cambias", "winner": "left" },
              { "attribute": "Precio", "left": "Más caro", "right": "Barato", "winner": "right" }
            ]
          }
        }
      ]
    },
    "step3": {
      "title": { "text": "¿QUÉ HACER?", "accent": "QUÉ" },
      "beats": [
        {
          "block": "Decision",
          "props": {
            "question": "¿Se vuelve a disparar sin nada conectado?",
            "yes": { "label": "No lo fuerces: llama a un electricista", "tone": "danger" },
            "no": {
              "question": "¿Pasó al conectar algo?",
              "yes": { "label": "Desconéctalo y súbelo", "tone": "ok" },
              "no": { "label": "Revisa la carga total", "tone": "warn" }
            }
          }
        }
      ]
    },
    "close": {
      "beats": [
        {
          "block": "Close",
          "props": {
            "line1": "Guárdalo para cuando",
            "line2": { "text": "se vaya la luz", "accent": "luz" },
            "accentIcon": "bulb",
            "actions": ["bookmark", "share"]
          }
        }
      ]
    }
  },
  "facts": [
    { "claim": "Un breaker corta el circuito cuando la corriente supera su capacidad", "source": "Contenido de ejemplo" }
  ],
  "coverFrame": 60
}
```

- [ ] **Step 4: Run every check**

Run:
```bash
cd template
npx vitest run && npm run lint
npm run check
npm run check:gallery
```
Expected: all tests PASS (examples.test covers the new folder; the engineering test passes); lint exit 0; `npm run check` passes all three examples in both layouts (quote any ⚠ lines); `check:gallery` passes all 20 blocks in both layouts.

- [ ] **Step 5: Short-beat check (Review Focus 2)**

Run:
```bash
cd template
rm -rf /tmp/reelkit-eng15 && cp -R examples/engineering-sample /tmp/reelkit-eng15
node -e 'const f="/tmp/reelkit-eng15/episode.json";const e=JSON.parse(require("fs").readFileSync(f));e.durationSeconds=15;e.coverFrame=30;require("fs").writeFileSync(f,JSON.stringify(e,null,2))'
npm run check -- /tmp/reelkit-eng15
```
Expected: passes both layouts. Then render the frame 3 frames before the end of step1's second beat and step2's second beat (frame numbers from the check's output list) and open them with Read: the Gauge needle, value and legend, and every Versus row and winner check, are fully in place before their scene fades.

- [ ] **Step 6: Look at the episode**

Render frames 60, 300, 600, 900, 1200 and 1349 of `Episode` with `--public-dir examples/engineering-sample` to `template/out/eng-*.png` and open them with Read. Expected: yellow-on-navy palette; tracker QUÉ ES / CÓMO PASA / QUÉ HACER; every block fully inside the stage; nothing in the bottom-right talent slot; the close shows "Ingeniería en casa / Ingeniera electricista · Medellín".

- [ ] **Step 7: Commit**

```bash
git add template/examples/engineering-sample template/tests/engineering-example.test.ts
git commit -m "feat(examples): 45 s engineering episode built from the explainer blocks"
```

---

## Self-review notes (resolved)

- **Spec coverage:** 10 explainer blocks with limits (Tasks 7–11), selection guide shapes covered (Definition/Process/Cycle/Timeline/Quantity/BigStat/Proportion/Gauge/Trend/Versus/Compare/Anatomy/Checklist/DoDont/Decision/MythFact/Chips), ~100 icons in 15 domains (105, Tasks 1–2), 7 Anatomy diagrams (Task 3), `BlockGallery` + `check --gallery` with the 0.85 / 40 px rules in both layouts (Tasks 4–5), engineering reference episode built only from new blocks (Task 12), schema-limit tests (every block task).
- **Spec refinements:** Process labels are ≤ 20 characters as well as ≤ 4 words; Timeline `when` is ≤ 8 characters; Versus attributes ≤ 14 and values ≤ 12 characters; Gauge and Trend gain `decimals`; Proportion gains `ofWord` (locale wording) and `source`; Decision's depth limit is expressed as "one follow-up branch"; Cycle `centerLabel` ≤ 10. Core limits tightened in Task 6 (Chips auto columns, Checklist 34 chars / 44 px at 4 rows, Quantity ≤ 3 rows, MythFact 50/60, Compare labels 10).
- **Deferred:** per-talent font overrides and the cover crop check remain Plan 3; CI running `check:gallery` is Plan 4.
