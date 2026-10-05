import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { headStyle } from "../frame/theme";
import { CLAMP, enter, pop, pulse } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const ROW = 960;
const FIRST = 0.06;
const SPAN = 0.45;
const HIGHLIGHT_AT = 0.72;
const LINK_DELAY = 6;
const LINK_FRAMES = 8;
const BADGE = 52;

export const Process: BlockComponent<"Process"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const n = props.steps.length;
  const col = ROW / n;
  const circle = Math.min(150, col - 60);
  const r = circle / 2;
  const stepAt = (i: number) => at(FIRST + (SPAN * i) / n);
  const hl = props.highlightStep;
  const highlightFrame = at(HIGHLIGHT_AT);
  const dim = hl === undefined ? 1 : interpolate(frame, [highlightFrame, highlightFrame + 10], [1, 0.55], CLAMP);

  return (
    <div style={{ position: "relative", width: ROW }}>
      <svg width={ROW} height={circle} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {props.steps.slice(0, -1).map((_, i) => {
          const x1 = (i + 0.5) * col + r + 12;
          const x2 = (i + 1.5) * col - r - 12;
          const draw = interpolate(frame, [stepAt(i) + LINK_DELAY, stepAt(i) + LINK_DELAY + LINK_FRAMES], [0, 1], CLAMP);
          if (props.connector === "chevron") {
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={i}
                d={`M${mx - 10} ${r - 18} L${mx + 8} ${r} L${mx - 10} ${r + 18}`}
                fill="none"
                stroke={c.accent}
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={draw}
              />
            );
          }
          return (
            <g key={i} stroke={c.accent} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none">
              <line x1={x1} y1={r} x2={x1 + (x2 - x1) * draw} y2={r} />
              <path d={`M${x2 - 14} ${r - 12} L${x2} ${r} L${x2 - 14} ${r + 12}`} opacity={draw >= 1 ? 1 : 0} />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex" }}>
        {props.steps.map((step, i) => {
          const p = pop(frame, fps, stepAt(i));
          const label = enter(frame, fps, stepAt(i) + 4);
          const isHighlight = i === hl;
          return (
            <div
              key={i}
              style={{ width: col, display: "flex", flexDirection: "column", alignItems: "center", opacity: isHighlight ? 1 : dim }}
            >
              <div
                style={{
                  position: "relative",
                  width: circle,
                  height: circle,
                  borderRadius: "50%",
                  backgroundColor: c.bg2,
                  border: `5px solid ${isHighlight && frame >= highlightFrame ? c.accent : `${c.text}33`}`,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                  scale: interpolate(p, [0, 1], [0.4, 1]) * (isHighlight ? pulse(frame, highlightFrame, 14, 1.12) : 1),
                }}
              >
                <Icon name={step.icon} size={Math.round(circle * 0.56)} color={c.accent} accent={c.text} />
                <div
                  style={{
                    position: "absolute",
                    left: -8,
                    top: -8,
                    width: BADGE,
                    height: BADGE,
                    borderRadius: "50%",
                    backgroundColor: c.accent,
                    color: c.bg,
                    ...headStyle(40),
                    lineHeight: `${BADGE + 4}px`,
                    textAlign: "center",
                  }}
                >
                  {i + 1}
                </div>
              </div>
              <div
                style={{
                  ...headStyle(40),
                  color: c.text,
                  textAlign: "center",
                  width: col - 12,
                  marginTop: 14,
                  opacity: label,
                  translate: `0px ${interpolate(label, [0, 1], [16, 0])}px`,
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
