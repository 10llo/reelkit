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
