import type { BeatTiming } from "../frame/timing";
import type { CueFn } from "./cue-types";

// Fractions of a 255-frame reference beat.
export const CHIP_AT = 18 / 255;
export const ROWS_FROM = 36;
export const ROWS_SPAN = 150;
export const HIGHLIGHT_AT = 190 / 255;
export const CONCLUSION_AT = 202 / 255;
export const FOOTNOTE_AT = 208 / 255;

/** When each bar starts and finishes growing: longer values take longer. */
export const quantityRowTimes = (rows: readonly { value: number }[], { at }: BeatTiming) => {
  const max = Math.max(...rows.map((r) => r.value));
  const step = ROWS_SPAN / rows.length;
  return rows.map((row, i) => {
    const from = ROWS_FROM + step * i;
    const length = step * (0.4 + 0.6 * (row.value / max));
    return { from: at(from / 255), to: at((from + length) / 255) };
  });
};

export const quantityCues: CueFn<"Quantity"> = (props, timing) => {
  const rows = quantityRowTimes(props.rows, timing);
  return [{ name: "ding", at: rows[rows.length - 1].to }];
};
