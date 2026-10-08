import { measureText } from "@remotion/layout-utils";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { stickerStyle } from "../brand/sticker";
import { inkShadow } from "../brand/tokens";
import { usePalette, useTalent } from "../frame/contexts";
import { FONT_HEAD, WEIGHT_HEAD, headStyle } from "../frame/theme";
import { CLAMP, pop } from "../frame/timing";
import { BOTTOM, H, LEFT, RIGHT, TOP, W, layoutTrendLabels } from "./parts/trendLayout";
import { ANNOTATE_AT, AREA_FROM, AREA_TO, LINE_FROM, LINE_TO } from "./Trend.cues";
import { trendScale } from "./Trend.schema";
import type { BlockComponent } from "./types";


export const Trend: BlockComponent<"Trend"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { locale } = useTalent();
  const { at } = timing;
  const n = props.points.length;
  const { lo, hi } = trendScale(props.points, props.yMin);
  const px = (i: number) => LEFT + ((RIGHT - LEFT) * i) / (n - 1);
  const py = (v: number) => BOTTOM - ((v - lo) / (hi - lo)) * (BOTTOM - TOP);
  const draw = interpolate(frame, [at(LINE_FROM), at(LINE_TO)], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.quad) });
  const area = interpolate(frame, [at(AREA_FROM), at(AREA_TO)], [0, 1], CLAMP);
  const format = new Intl.NumberFormat(locale, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals });
  const line = props.points.map((p, i) => `${i === 0 ? "M" : "L"}${px(i)} ${py(p.y)}`).join(" ");
  const first = props.points[0];
  const last = props.points[n - 1];
  const showLabel = (i: number) => n <= 7 || (n - 1 - i) % 2 === 0;
  const note = props.annotate;
  const measure = (text: string, fontSize: number) => measureText({ text, fontFamily: FONT_HEAD, fontWeight: WEIGHT_HEAD, fontSize }).width;
  const labels = layoutTrendLabels({ ys: props.points.map((p) => p.y), lo, hi, valueText: format.format(last.y), unit: props.yUnit, note, measure });
  const { valueRect, bubble, leader } = labels;
  if (!labels.clear) console.warn("[reelkit] Trend annotation overlaps the line");
  const noteIn = pop(frame, fps, at(ANNOTATE_AT));

  return (
    <div style={{ position: "relative", width: W, height: H }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.accent} stopOpacity={0.35} />
            <stop offset="1" stopColor={c.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1={LEFT} y1={BOTTOM} x2={RIGHT} y2={BOTTOM} stroke={`${c.text}40`} strokeWidth={3} />
        <path d={`${line} L${px(n - 1)} ${BOTTOM} L${px(0)} ${BOTTOM} Z`} fill="url(#trend-area)" opacity={area} />
        <path d={line} fill="none" stroke={c.accent} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        {props.points.map((p, i) => {
          const dot = pop(frame, fps, at(LINE_FROM + ((LINE_TO - LINE_FROM) * i) / (n - 1)));
          return (
            <circle
              key={i}
              cx={px(i)}
              cy={py(p.y)}
              r={10}
              fill={c.accent}
              stroke={c.text}
              strokeWidth={4}
              opacity={interpolate(dot, [0, 0.2], [0, 1], CLAMP)}
            />
          );
        })}
        {note ? (
          <circle
            cx={px(note.index)}
            cy={py(props.points[note.index].y)}
            r={24}
            fill="none"
            stroke={c.text}
            strokeWidth={4}
            opacity={interpolate(noteIn, [0, 0.2], [0, 1], CLAMP)}
          />
        ) : null}
        {leader ? (
          <line
            x1={leader.x1}
            y1={leader.y1}
            x2={leader.x2}
            y2={leader.y2}
            stroke={c.text}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.7 * interpolate(noteIn, [0, 0.2], [0, 1], CLAMP)}
          />
        ) : null}
      </svg>
      <div style={{ position: "absolute", left: 0, top: TOP - 24, width: LEFT - 20, textAlign: "right", ...headStyle(40), color: c.text, opacity: 0.6 }}>
        {format.format(hi)}
      </div>
      <div style={{ position: "absolute", left: 0, top: BOTTOM - 24, width: LEFT - 20, textAlign: "right", ...headStyle(40), color: c.text, opacity: 0.6 }}>
        {format.format(lo)}
      </div>
      {props.points.map((p, i) =>
        showLabel(i) ? (
          <div key={i} style={{ position: "absolute", left: px(i) - 100, top: BOTTOM + 14, width: 200, textAlign: "center", ...headStyle(40), color: c.text, opacity: 0.6 }}>
            {p.x}
          </div>
        ) : null,
      )}
      <div
        style={{
          position: "absolute",
          left: valueRect.x,
          top: valueRect.y,
          width: valueRect.w,
          textAlign: "right",
          ...headStyle(64),
          color: c.accent,
          whiteSpace: "nowrap",
          textShadow: inkShadow(4, c),
          opacity: draw > 0 ? 1 : 0,
        }}
      >
        {format.format(first.y + (last.y - first.y) * draw)}
        {props.yUnit ? <span style={{ fontSize: 40, marginLeft: 8 }}>{props.yUnit}</span> : null}
      </div>
      {note && bubble ? (
        <div
          style={{
            position: "absolute",
            left: bubble.x,
            top: bubble.y,
            ...headStyle(40),
            color: c.text,
            ...stickerStyle(c, { radius: 18, border: 4, shadow: 5, borderColor: c.accent }),
            padding: "8px 20px 2px",
            whiteSpace: "nowrap",
            opacity: interpolate(noteIn, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(noteIn, [0, 1], [0.6, 1]),
          }}
        >
          {note.label}
        </div>
      ) : null}
    </div>
  );
};
