import type { CueFn } from "./cue-types";

// Fractions of a 105-frame reference beat.
export const rowAt = (i: number) => (12 + 21 * i) / 105;
export const PILL_AFTER = 15 / 105;
/** Frames after a row enters until its check pops. */
export const CHECK_DELAY = 4;

export const checklistCues: CueFn<"Checklist"> = (props, { at }) => [
  ...props.rows.map((_, i) => ({ name: "chime" as const, at: at(rowAt(i)) + CHECK_DELAY })),
  ...(props.pill ? [{ name: "pop" as const, at: at(rowAt(props.rows.length - 1) + PILL_AFTER) }] : []),
];
