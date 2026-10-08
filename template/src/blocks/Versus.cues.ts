import type { CueFn } from "./cue-types";

export const SIDES_AT = 0.04;
export const VS_AT = 0.12;
export const ROWS_FROM = 0.22;
export const ROWS_SPAN = 0.4;
export const WINNER_AT = 0.72;

export const versusCues: CueFn<"Versus"> = (props, { at }) => [
  { name: "pop", at: at(SIDES_AT) },
  { name: "pop", at: at(VS_AT) },
  ...(props.rows.some((r) => r.winner === "left" || r.winner === "right") ? [{ name: "chime" as const, at: at(WINNER_AT) }] : []),
];
