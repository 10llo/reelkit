import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Tone } from "./schema-parts";
import { slap } from "../brand/motion";
import { stickerStyle } from "../brand/sticker";
import { usePalette } from "../frame/contexts";
import { fitWordsFontSize } from "../frame/fit";
import { FONT_BODY, FONT_HEAD, WEIGHT_BODY, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop, pulse } from "../frame/timing";
import { Icon } from "../icons";
import { EMPHASIS_AT, FOLLOW_NO, FOLLOW_YES, LINES_FROM, LINES_TO, NO_AT, QUESTION_AT, TAGS_AT, YES_AT } from "./Decision.cues";
import { isFollowUp, type DecisionBranch } from "./Decision.schema";
import { toneColor } from "./parts/tone";
import type { BlockComponent } from "./types";

const W = 960;
const COL = 474;
const SUB = 236;
const OUTCOME = COL - 24;
const LEFT_CENTER = (W - 2 * COL) / 4 + COL / 2;
const TONE_ICON = { ok: "check", warn: "warning", danger: "x" } as const;

export const Decision: BlockComponent<"Decision"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const lines = interpolate(frame, [at(LINES_FROM), at(LINES_TO)], [0, 1], CLAMP);
  const tags = pop(frame, fps, at(TAGS_AT));
  const emphasis = (t: Tone, compact: boolean) => (t === "danger" ? pulse(frame, at(EMPHASIS_AT), 16, compact ? 1.03 : 1.06) : 1);

  const tag = (label: string, x: number) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 14,
        translate: "-50% 0",
        ...headStyle(40),
        color: c.bg,
        backgroundColor: c.text,
        borderRadius: 999,
        padding: "4px 18px 0",
        opacity: interpolate(tags, [0, 0.2], [0, 1], CLAMP),
        scale: interpolate(tags, [0, 1], [0.4, 1]),
      }}
    >
      {label}
    </div>
  );

  const connector = (height: number, width: number, leftX: number, rightX: number, draw: number) => (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <path
        d={`M${width / 2} 0 V${height / 3} M${leftX} ${height / 3} H${rightX} M${leftX} ${height / 3} V${height} M${rightX} ${height / 3} V${height}`}
        stroke={c.text}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
        opacity={0.7}
      />
    </svg>
  );

  const outcomeBox = (label: string, t: Tone, width: number, compact: boolean, p: number) => (
    <div
      style={{
        width,
        boxSizing: "border-box",
        padding: compact ? "14px 10px 10px" : "18px 22px 14px",
        ...stickerStyle(c, { radius: 24, border: 5, shadow: 6, borderColor: toneColor(t, c), fill: `${toneColor(t, c)}22` }),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        textAlign: "center",
        opacity: p,
        translate: `0px ${interpolate(p, [0, 1], [24, 0])}px`,
        scale: emphasis(t, compact),
      }}
    >
      {compact ? null : <Icon name={TONE_ICON[t]} size={56} color={toneColor(t, c)} />}
      <div
        style={{
          ...(compact
            ? headStyle(fitWordsFontSize(label, width - 10 - 20, 40, FONT_HEAD, WEIGHT_HEAD))
            : bodyStyle(fitWordsFontSize(label, width - 10 - 44, 44, FONT_BODY, WEIGHT_BODY))),
          color: c.text,
        }}
      >{label}</div>
    </div>
  );

  const branchView = (b: DecisionBranch, branchAt: number) => {
    const p = enter(frame, fps, at(branchAt));
    if (!isFollowUp(b)) {
      return (
        <div style={{ width: COL, display: "flex", justifyContent: "center" }}>{outcomeBox(b.label, b.tone, OUTCOME, false, p)}</div>
      );
    }
    const innerLines = interpolate(frame, [at(branchAt + FOLLOW_YES - 0.05), at(branchAt + FOLLOW_YES)], [0, 1], CLAMP);
    return (
      <div style={{ width: COL, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: COL,
            boxSizing: "border-box",
            padding: "14px 18px 8px",
            ...stickerStyle(c, { radius: 22, border: 4, shadow: 5 }),
            ...headStyle(fitWordsFontSize(b.question, COL - 36 - 6, 44, FONT_HEAD, WEIGHT_HEAD)),
            color: c.text,
            textAlign: "center",
            opacity: p,
          }}
        >
          {b.question}
        </div>
        <div style={{ position: "relative" }}>
          {connector(60, COL, SUB / 2, COL - SUB / 2, innerLines)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", width: COL }}>
          {outcomeBox(b.yes.label, b.yes.tone, SUB, true, enter(frame, fps, at(branchAt + FOLLOW_YES)))}
          {outcomeBox(b.no.label, b.no.tone, SUB, true, enter(frame, fps, at(branchAt + FOLLOW_NO)))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          maxWidth: 860,
          boxSizing: "border-box",
          padding: "18px 32px 10px",
          ...stickerStyle(c, { radius: 28 }),
          ...headStyle(fitWordsFontSize(props.question, 860 - 64 - 8, 52, FONT_HEAD, WEIGHT_HEAD)),
          color: c.text,
          textAlign: "center",
          ...slap(frame, fps, at(QUESTION_AT), -2),
        }}
      >
        {props.question}
      </div>
      <div style={{ position: "relative" }}>
        {connector(80, W, LEFT_CENTER, W - LEFT_CENTER, lines)}
        {tag(props.yesLabel, LEFT_CENTER + 60)}
        {tag(props.noLabel, W - LEFT_CENTER - 60)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", width: W, alignItems: "flex-start" }}>
        {branchView(props.yes, YES_AT)}
        {branchView(props.no, NO_AT)}
      </div>
    </div>
  );
};
