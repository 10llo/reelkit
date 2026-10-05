import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { headStyle } from "../frame/theme";
import { CLAMP, enter, pop, pulse } from "../frame/timing";
import { Icon } from "../icons";
import { Diagram } from "../icons/diagrams";
import { ANATOMY_COLUMN, calloutSlots } from "./Anatomy.schema";
import type { BlockComponent } from "./types";

const COLUMN = ANATOMY_COLUMN;
const GAP = 30;
const SUBJECT = 400;
const W = COLUMN * 2 + GAP * 2 + SUBJECT;
const H = SUBJECT + 40;
const SUBJECT_X = COLUMN + GAP;
const SUBJECT_Y = 20;
const LABEL_H = 92;
const SUBJECT_AT = 0.04;
const CALLOUTS_FROM = 0.18;
const CALLOUTS_SPAN = 0.45;
const HIGHLIGHT_AT = 0.75;
const LINE_FRAMES = 8;

export const Anatomy: BlockComponent<"Anatomy"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const subject = enter(frame, fps, at(SUBJECT_AT));
  const slots = calloutSlots(props.callouts);
  const count = props.callouts.length;
  const highlightFrame = at(HIGHLIGHT_AT);
  const dim = props.highlight === undefined ? 1 : interpolate(frame, [highlightFrame, highlightFrame + 10], [1, 0.55], CLAMP);

  const geometry = props.callouts.map((callout, i) => {
    const { side, slot, count: sideCount } = slots[i];
    const labelY = SUBJECT_Y + ((slot + 0.5) * SUBJECT) / sideCount;
    return {
      anchorX: SUBJECT_X + (callout.x / 100) * SUBJECT,
      anchorY: SUBJECT_Y + (callout.y / 100) * SUBJECT,
      edgeX: side === "left" ? COLUMN + 8 : SUBJECT_X + SUBJECT + GAP - 8,
      labelY,
      side,
      start: at(CALLOUTS_FROM + (CALLOUTS_SPAN * i) / count),
    };
  });

  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <div style={{ position: "absolute", left: SUBJECT_X, top: SUBJECT_Y, opacity: subject, scale: interpolate(subject, [0, 1], [0.92, 1]) }}>
        {"diagram" in props.subject ? (
          <Diagram name={props.subject.diagram} size={SUBJECT} color={c.text} accent={c.bg} style={{ opacity: 0.92 }} />
        ) : (
          <Icon name={props.subject.icon} size={SUBJECT} color={c.text} accent={c.accent} />
        )}
      </div>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {geometry.map((g, i) => {
          const draw = interpolate(frame, [g.start + 4, g.start + 4 + LINE_FRAMES], [0, 1], CLAMP);
          const isHighlight = i === props.highlight;
          return (
            <line
              key={i}
              x1={g.anchorX}
              y1={g.anchorY}
              x2={g.anchorX + (g.edgeX - g.anchorX) * draw}
              y2={g.anchorY + (g.labelY - g.anchorY) * draw}
              stroke={isHighlight ? c.accent : c.text}
              strokeWidth={4}
              opacity={isHighlight ? 1 : 0.8 * dim}
            />
          );
        })}
        {geometry.map((g, i) => {
          const p = pop(frame, fps, g.start);
          const isHighlight = i === props.highlight;
          return (
            <circle
              key={i}
              cx={g.anchorX}
              cy={g.anchorY}
              r={11}
              fill={c.accent}
              stroke={c.bg}
              strokeWidth={4}
              opacity={interpolate(p, [0, 0.2], [0, 1], CLAMP) * (isHighlight ? 1 : dim)}
              style={{
                scale: interpolate(p, [0, 1], [0.3, 1]) * (isHighlight ? pulse(frame, highlightFrame, 14, 1.5) : 1),
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            />
          );
        })}
      </svg>
      {props.callouts.map((callout, i) => {
        const g = geometry[i];
        const p = enter(frame, fps, g.start + 6);
        const isHighlight = i === props.highlight;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.side === "left" ? 0 : SUBJECT_X + SUBJECT + GAP,
              top: g.labelY - LABEL_H / 2,
              width: COLUMN,
              height: LABEL_H,
              display: "flex",
              alignItems: "center",
              justifyContent: g.side === "left" ? "flex-end" : "flex-start",
              textAlign: g.side === "left" ? "right" : "left",
              ...headStyle(40),
              color: isHighlight && frame >= highlightFrame ? c.accent : c.text,
              opacity: p * (isHighlight ? 1 : dim),
            }}
          >
            {callout.label}
          </div>
        );
      })}
    </div>
  );
};
