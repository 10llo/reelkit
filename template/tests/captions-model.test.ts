import { describe, expect, it } from "vitest";
import { ACTIVE_SCALE, HIGHLIGHT_PAD, layoutPage, paginate, wordsFromCaptions, wordsFromScript, type Page } from "../src/frame/captions-model";

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
  it("widens the word gap so a scaled long word never touches its neighbour", () => {
    const l = layoutPage(page("otorrinolaringólogo", "sí"), measure, { width: 900, height: 360 }, 64);
    expect(l.gapPx).toBeGreaterThanOrEqual(0.08 * measure("otorrinolaringólogo", l.fontSize));
    expect(l.gapPx).toBeGreaterThanOrEqual(0.3 * l.fontSize);
  });
  it("leaves at least 10px between the scaled highlight box and the next word", () => {
    const l = layoutPage(page("otorrinolaringólogo", "sí"), measure, { width: 900, height: 360 }, 64);
    const w = measure("otorrinolaringólogo", l.fontSize);
    const highlightRight = ACTIVE_SCALE * (w + 2 * HIGHLIGHT_PAD) - HIGHLIGHT_PAD;
    expect(w + l.gapPx - highlightRight).toBeGreaterThanOrEqual(10);
  });
});
