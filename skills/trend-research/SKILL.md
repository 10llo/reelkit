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
