import { measureText } from "@remotion/layout-utils";

/** Largest size ≤ base at which `text` fits on one line within maxWidth. Call only after fonts load. */
export const fitFontSize = (
  text: string,
  maxWidth: number,
  base: number,
  fontFamily: string,
  fontWeight: number,
): number => {
  const width = measureText({ text, fontFamily, fontWeight, fontSize: base }).width;
  return width <= maxWidth ? base : Math.floor((base * maxWidth) / width);
};

/** Largest size ≤ base at which the widest whitespace-separated word of `text` fits maxWidth (wrapped text never splits a word). */
export const fitWordsFontSize = (
  text: string,
  maxWidth: number,
  base: number,
  fontFamily: string,
  fontWeight: number,
  measure: (word: string, fontSize: number) => number = (word, fontSize) =>
    measureText({ text: word, fontFamily, fontWeight, fontSize }).width,
): number => {
  const widest = Math.max(0, ...text.split(/\s+/).filter(Boolean).map((w) => measure(w, base)));
  return widest <= maxWidth || widest === 0 ? base : Math.floor((base * maxWidth) / widest);
};
