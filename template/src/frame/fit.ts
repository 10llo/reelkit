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
