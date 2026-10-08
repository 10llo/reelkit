import type { SfxName } from "../brand/sfx";
import type { CueFn } from "./cue-types";
import { isFollowUp, type DecisionBranch } from "./Decision.schema";
import type { Tone } from "./schema-parts";

export const QUESTION_AT = 0.04;
export const LINES_FROM = 0.16;
export const LINES_TO = 0.26;
export const TAGS_AT = 0.26;
export const YES_AT = 0.32;
export const NO_AT = 0.42;
export const EMPHASIS_AT = 0.8;
/** A follow-up's own yes and no land this far (beat fraction) after the branch. */
export const FOLLOW_YES = 0.11;
export const FOLLOW_NO = 0.16;

export const toneSfx = (t: Tone): SfxName => (t === "ok" ? "chime" : t === "warn" ? "tick" : "bonk");

const branchCues = (b: DecisionBranch, branchAt: number, at: (f: number) => number) =>
  isFollowUp(b)
    ? [
        { name: toneSfx(b.yes.tone), at: at(branchAt + FOLLOW_YES) },
        { name: toneSfx(b.no.tone), at: at(branchAt + FOLLOW_NO) },
      ]
    : [{ name: toneSfx(b.tone), at: at(branchAt) }];

export const decisionCues: CueFn<"Decision"> = (props, { at }) => [
  { name: "pop", at: at(QUESTION_AT) },
  ...branchCues(props.yes, YES_AT, at),
  ...branchCues(props.no, NO_AT, at),
];
