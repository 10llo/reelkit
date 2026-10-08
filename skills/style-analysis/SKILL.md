---
name: style-analysis
description: Use when analyzing TikTok or Instagram creators' video style for reelkit — reading contact sheets and metrics.json, and writing report.md with evidence-backed style, block and script proposals.
---

# Style analysis

`npm run reelkit -- style analyze` has measured the videos and drawn the images. Your job is the design judgement: look at the images, read the numbers, and write `report.md` with proposals the user can act on. This skill changes no code.

## Inputs

In the style folder (`styles/<yyyy-mm-dd>-<slug>/`):

- `accounts.json`: accounts, `own` flag, `status` and `reason` for failures, and per-account medians.
- Per video, in `<network>-<account>/<video-id>/`: `metrics.json` (cuts, speech, audio levels, palette, post data), `sheet.png` (12 frames with timestamps) and `hook.png` (0–2.5 s, one frame every 0.5 s).

The talent's `locale` (in `talents/<id>.json`) sets the language of the report. Everything else in this skill is instructions for you.

## How to look

Open every `sheet.png` and `hook.png` with the Read tool. Do not write about a video whose images you have not opened. For each account, note:

- **Framing:** where the creator sits in the frame and how large they are.
- **Typography and captions:** position, case, colour, word by word or whole phrases.
- **Graphics and stickers:** what appears, how often, how big.
- **Transitions:** hard cuts or effects.
- **Colour:** what you see, compared with `palette`, `brightness` and `saturation`.
- **The hook in the first 3 s:** `speech.hookText` plus the `hook.png` strip.

Also find the video with the most `post.views` and say why it probably worked.

## Report template

Write `report.md` in the talent's language. Sections, in this order (the section titles below are the Spanish ones; translate them for other locales):

1. **Encabezado:** accounts analyzed, videos per account, and failed accounts with their reason.
2. **Resumen** in 5 lines.
3. **Tabla comparativa** per account (medians from `accounts.json`). Columns: duración, cortes/min, palabras/min, 1ª palabra, fondo bajo la voz (`gapDb`), paleta.
4. **Por cuenta**, each with a one-sentence character summary, then:
   - gancho, linking its `hook.png`;
   - ritmo;
   - encuadre y cámara;
   - tipografía y subtítulos;
   - gráficos y stickers;
   - color;
   - sonido;
   - el video con más vistas y por qué creemos que funcionó.
5. **Patrones comunes** and **Huecos** (what nobody does).
6. **Cuenta propia vs referencias**, only if there is an own account. Compare without judging.
7. **Propuestas para reelkit**, ordered by impact and effort. Each one has:
   - **tipo:** `estilo` | `bloque` | `guion`;
   - **evidencia:** accounts and videos with their URL, plus the sheet it comes from;
   - **impacto:** alto, medio or bajo;
   - **esfuerzo:** alto, medio or bajo;
   - **choque con la brand:** say so if it contradicts the current brand (Consultorio Pop); otherwise write that there is none.

## Proposals map to reelkit

- `estilo`: name a file and a value in `src/brand/` (`tokens.ts`, `motion.ts` or `sfx.ts`), with the current value and the proposed one.
- `bloque`: follow the block catalog format (`npm run reelkit -- catalog` shows it): name, purpose, props, motion preset and sound cue.
- `guion`: name a rule for `reelkit:script-writing` (for example a hook length or a first-word rule).

## Rules

- Every number comes from the JSON files. Never estimate or round into a different claim.
- What you interpret from the images is an observation: say "se ve…" (or "looks like…" in English), kept apart from the measurements.
- No proposal copies another creator's design, logo or content. Propose the pattern, not the artwork.
- The own account is compared, not judged.
- List failed accounts with their reason.
- If `speech.unavailable` is set, say so and do not invent pace or hook text.
- Cite each video by its URL (`post.url`).
