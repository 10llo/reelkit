import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette, useTalent } from "../frame/contexts";
import { SMALL_TEXT_ATTR } from "../frame/minFont";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter } from "../frame/timing";
import { Icon } from "../icons";
import { gridShape } from "./Proportion.schema";
import type { BlockComponent } from "./types";

const VISUAL = 380;
const TEXT_W = 540;
const TRACK_FROM = 0.05;
const TRACK_TO = 0.2;
const FILL_AT = 0.3;
const FILL_TO = 0.55;
const FILL_SPAN = 0.25;
const LABEL_AT = 0.4;
const SOURCE_AT = 0.55;
const DONUT_R = 150;
const DONUT_STROKE = 54;

export const Proportion: BlockComponent<"Proportion"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { locale } = useTalent();
  const { at, duration } = timing;
  const track = interpolate(
    frame,
    [at(TRACK_FROM), at(TRACK_TO)],
    [0, 1],
    CLAMP,
  );
  const fill = interpolate(frame, [at(FILL_AT), at(FILL_TO)], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const label = enter(frame, fps, at(LABEL_AT));
  const source = enter(frame, fps, at(SOURCE_AT));
  const stagger = Math.min(
    3,
    (FILL_SPAN * duration) / Math.max(1, props.numerator),
  );
  const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  const ofText = `${props.ofWord} ${format.format(props.denominator)}`;
  const ofSize = fitFontSize(ofText, TEXT_W, 64, FONT_HEAD, WEIGHT_HEAD);

  const grid = () => {
    const { cols } = gridShape(props.denominator);
    const cell = VISUAL / cols;
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
          gridAutoRows: cell,
          opacity: track,
        }}
      >
        {Array.from({ length: props.denominator }, (_, i) => {
          const on =
            i < props.numerator
              ? enter(frame, fps, at(FILL_AT) + i * stagger)
              : 0;
          const color = on > 0.5 ? c.accent : `${c.text}33`;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {props.style === "people" ? (
                <Icon
                  name="person"
                  size={cell * 0.9}
                  color={color}
                  style={{ scale: 1 + 0.15 * on * (1 - on) * 4 }}
                />
              ) : (
                <div
                  style={{
                    width: cell * 0.72,
                    height: cell * 0.72,
                    borderRadius: "50%",
                    backgroundColor: color,
                    scale: 1 + 0.6 * on * (1 - on),
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const donut = () => {
    const circumference = 2 * Math.PI * DONUT_R;
    const share = props.numerator / props.denominator;
    return (
      <div
        style={{
          position: "relative",
          width: VISUAL,
          height: VISUAL,
          opacity: track,
        }}
      >
        <svg width={VISUAL} height={VISUAL}>
          <circle
            cx={VISUAL / 2}
            cy={VISUAL / 2}
            r={DONUT_R}
            fill="none"
            stroke={`${c.text}26`}
            strokeWidth={DONUT_STROKE}
          />
          <circle
            cx={VISUAL / 2}
            cy={VISUAL / 2}
            r={DONUT_R}
            fill="none"
            stroke={c.accent}
            strokeWidth={DONUT_STROKE}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - share * fill)}
            transform={`rotate(-90 ${VISUAL / 2} ${VISUAL / 2})`}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...headStyle(72),
            color: c.accent,
          }}
        >
          {format.format(share * 100 * fill)} %
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
      <div style={{ width: VISUAL, flexShrink: 0 }}>
        {props.style === "donut" ? donut() : grid()}
      </div>
      <div
        style={{
          width: TEXT_W,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            columnGap: 16,
          }}
        >
          <span style={{ ...headStyle(140), color: c.accent, lineHeight: 1 }}>
            {format.format(Math.round(props.numerator * fill))}
          </span>
          <span
            style={{
              ...headStyle(ofSize),
              color: c.text,
              whiteSpace: "nowrap",
            }}
          >
            {ofText}
          </span>
        </div>
        <div
          style={{
            ...bodyStyle(48),
            color: c.text,
            opacity: label,
            translate: `0px ${interpolate(label, [0, 1], [16, 0])}px`,
          }}
        >
          {props.label}
        </div>
        {props.source ? (
          <div
            {...{ [SMALL_TEXT_ATTR]: "" }}
            style={{ ...bodyStyle(30), color: c.text, opacity: 0.7 * source }}
          >
            {props.source}
          </div>
        ) : null}
      </div>
    </div>
  );
};
