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
