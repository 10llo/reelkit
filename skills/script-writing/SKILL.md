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
