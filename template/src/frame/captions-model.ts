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
