import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Tone } from "./schema-parts";
import { usePalette } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop, pulse } from "../frame/timing";
import { Icon } from "../icons";
import { isFollowUp, type DecisionBranch } from "./Decision.schema";
import { toneColor } from "./parts/tone";
import type { BlockComponent } from "./types";

const W = 960;
const COL = 470;
const SUB = 230;
const OUTCOME = COL - 24;
const LEFT_CENTER = (W - 2 * COL) / 4 + COL / 2;
const QUESTION_AT = 0.04;
const LINES_FROM = 0.16;
const LINES_TO = 0.26;
const TAGS_AT = 0.26;
const YES_AT = 0.32;
const NO_AT = 0.42;
const EMPHASIS_AT = 0.8;
const TONE_ICON = { ok: "check", warn: "warning", danger: "x" } as const;

export const Decision: BlockComponent<"Decision"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const question = enter(frame, fps, at(QUESTION_AT));
  const lines = interpolate(frame, [at(LINES_FROM), at(LINES_TO)], [0, 1], CLAMP);
  const tags = pop(frame, fps, at(TAGS_AT));
  const emphasis = (t: Tone) => (t === "danger" ? pulse(frame, at(EMPHASIS_AT), 16, 1.06) : 1);

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
        padding: compact ? "14px 4px 10px" : "18px 22px 14px",
        borderRadius: 24,
        border: `5px solid ${toneColor(t, c)}`,
        backgroundColor: `${toneColor(t, c)}22`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        textAlign: "center",
        opacity: p,
        translate: `0px ${interpolate(p, [0, 1], [24, 0])}px`,
        scale: emphasis(t),
      }}
    >
      {compact ? null : <Icon name={TONE_ICON[t]} size={56} color={toneColor(t, c)} />}
      <div style={{ ...(compact ? headStyle(40) : bodyStyle(44)), color: c.text }}>{label}</div>
    </div>
  );

  const branchView = (b: DecisionBranch, start: number) => {
    const p = enter(frame, fps, start);
    if (!isFollowUp(b)) {
      return (
        <div style={{ width: COL, display: "flex", justifyContent: "center" }}>{outcomeBox(b.label, b.tone, OUTCOME, false, p)}</div>
      );
    }
    const innerLines = interpolate(frame, [start + 8, start + 16], [0, 1], CLAMP);
    return (
      <div style={{ width: COL, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: COL - 20,
            boxSizing: "border-box",
            padding: "14px 18px 8px",
            borderRadius: 22,
            backgroundColor: c.bg2,
            border: `3px solid ${c.text}55`,
            ...headStyle(44),
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
          {outcomeBox(b.yes.label, b.yes.tone, SUB, true, enter(frame, fps, start + 16))}
          {outcomeBox(b.no.label, b.no.tone, SUB, true, enter(frame, fps, start + 22))}
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
          borderRadius: 28,
          backgroundColor: c.bg2,
          border: `4px solid ${c.accent}`,
          ...headStyle(52),
          color: c.text,
          textAlign: "center",
          opacity: question,
          scale: interpolate(question, [0, 1], [0.9, 1]),
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
        {branchView(props.yes, at(YES_AT))}
        {branchView(props.no, at(NO_AT))}
      </div>
    </div>
  );
};
