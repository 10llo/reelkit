---
name: block-authoring
description: Use when no existing reelkit block fits a line and a new block (or icon or diagram) must be added to the template — the block contract, files to touch, and the checks it must pass.
---

# Block authoring

Adding a block is the exception: first try every block in `npm run reelkit -- catalog`, two beats, or a different split. If a new block is really needed, it goes into the **plugin's** `template/` (so every workspace gets it with `/reelkit:setup --update`). The installed plugin folder is a read-only cache — don't edit it. Instead clone github.com/10llo/reelkit, work in its `template/` folder (run `npm install` there first), and open a pull request. A block added only inside a workspace works there but is replaced on the next update (a copy stays in `.reelkit-backup/`).

## Files

| File | What |
|---|---|
| `src/blocks/<Name>.schema.ts` | `z.strictObject` props with hard limits (list lengths, characters, words per field); per-word refinements for narrow columns |
| `src/blocks/<Name>.tsx` | the component |
| `src/blocks/schemas.ts` | register the schema in `BLOCK_SCHEMAS` |
| `src/blocks/registry.tsx` | register the component |
| `src/gallery/samples.json` | a sample at **maximum** content |
| `tests/blocks/<Name>.schema.test.ts` | schema tests: valid sample passes, every over-limit case fails |
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

Run these inside the `template/` folder of your clone of the plugin repository (not in a workspace, not in the installed plugin folder) when adding a block to the plugin.

```bash
npm test
npm run lint
npm run check:gallery -- --block=<Name>
npm run check
```

All must pass. Open a pull request with the block. Then release: bump the version in `template/package.json`, `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` together, and teammates run `/reelkit:setup --update`.
