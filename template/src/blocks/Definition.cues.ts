import type { CueFn } from "./cue-types";

export const ICON_AT = 0.04;
export const TERM_FROM = 0.1;
export const TERM_TO = 0.3;
export const UNDERLINE_FROM = 0.3;
export const UNDERLINE_TO = 0.4;
export const CATEGORY_AT = 0.2;
export const PRONUNCIATION_AT = 0.28;
export const MEANING_AT = 0.4;
export const MEANING_SPAN = 0.35;

export const definitionCues: CueFn<"Definition"> = (_props, { at }) => [{ name: "pop", at: at(ICON_AT) }];
