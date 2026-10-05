import { measureText } from "@remotion/layout-utils";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette, useTalent } from "../frame/contexts";
import { FONT_HEAD, WEIGHT_HEAD, headStyle } from "../frame/theme";
import { CLAMP, pop } from "../frame/timing";
import { pickCandidate, type Rect, type Segment } from "./parts/placeLabel";
import { trendScale } from "./Trend.schema";
import type { BlockComponent } from "./types";

const W = 960;
const H = 420;
const LEFT = 190;
const RIGHT = 900;
const TOP = 80;
const BOTTOM = 340;
const LINE_FROM = 0.08;
const LINE_TO = 0.55;
const AREA_FROM = 0.3;
const AREA_TO = 0.6;
const ANNOTATE_AT = 0.68;
const BUBBLE_PAD = 46; // 2 × 20 px padding + 2 × 3 px border
const BUBBLE_H = 58; // 42 px line + 10 px padding + 2 × 3 px border
const RING = 26;
const DOT = 14;
const GAP = 12;

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
  const last = props.points[n - 1];
  const showLabel = (i: number) => n <= 7 || (n - 1 - i) % 2 === 0;
  const note = props.annotate;
  const measure = (text: string, fontSize: number) => measureText({ text, fontFamily: FONT_HEAD, fontWeight: WEIGHT_HEAD, fontSize }).width;
  const lastX = px(n - 1);
  const lastY = py(last.y);
  const segments: Segment[] = props.points.slice(1).map((p, i) => ({ x1: px(i), y1: py(props.points[i].y), x2: px(i + 1), y2: py(p.y) }));
  const around = (x: number, y: number, r: number): Rect => ({ x: x - r, y: y - r, w: 2 * r, h: 2 * r });
  const dots = props.points.map((p, i) => around(px(i), py(p.y), DOT));
  const axisLabels: Rect[] = [
    { x: 0, y: TOP - 24, w: LEFT - 20, h: 42 },
    { x: 0, y: BOTTOM - 24, w: LEFT - 20, h: 42 },
  ];
  const box: Rect = { x: 0, y: 0, w: W, h: BOTTOM };
  const ring = note ? around(px(note.index), py(props.points[note.index].y), RING) : null;
  const valueW = Math.ceil(measure(format.format(last.y), 64) + (props.yUnit ? measure(props.yUnit, 40) + 8 : 0)) + 4;
  const valueH = 68;
  const placeValue = (avoid: Rect | null) =>
    pickCandidate(
      [
        { x: lastX - valueW, y: lastY - RING - 4 - valueH, w: valueW, h: valueH },
        { x: lastX - valueW, y: lastY + RING + 4, w: valueW, h: valueH },
        { x: lastX - valueW - RING - 4, y: lastY - valueH / 2, w: valueW, h: valueH },
        // Last resort: float further above the point, clear of a steep line.
        { x: lastX - valueW, y: lastY - RING - 4 - valueH - 40, w: valueW, h: valueH },
        { x: lastX - valueW, y: lastY - RING - 4 - valueH - 80, w: valueW, h: valueH },
      ],
      { box, segments, rects: [...dots.slice(0, -1), ...axisLabels, ...(ring ? [ring] : []), ...(avoid ? [avoid] : [])] },
    );
  const placeBubble = (avoid: Rect | null): Rect | null => {
    if (!note || !ring) return null;
    const bw = Math.ceil(measure(note.label, 40) + BUBBLE_PAD);
    const nx = px(note.index);
    const ny = py(props.points[note.index].y);
    const cx = Math.min(Math.max(nx - bw / 2, 0), W - bw);
    const d = RING + GAP;
    return pickCandidate(
      [
        { x: cx, y: ny - d - BUBBLE_H, w: bw, h: BUBBLE_H },
        { x: cx, y: ny + d, w: bw, h: BUBBLE_H },
        { x: nx - d - bw, y: ny - BUBBLE_H / 2, w: bw, h: BUBBLE_H },
        { x: nx + d, y: ny - BUBBLE_H / 2, w: bw, h: BUBBLE_H },
      ],
      { box, segments, rects: [...dots, ...axisLabels, ...(avoid ? [avoid] : [])] },
    );
  };
  // The bubble is placed first against the data, then the value label around it, then the bubble is re-checked against the label.
  const valueRect = placeValue(placeBubble(null));
  const bubble = placeBubble(valueRect);
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
              stroke={c.bg}
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
          opacity: draw > 0 ? 1 : 0,
        }}
      >
        {format.format(last.y * draw)}
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
            backgroundColor: c.bg2,
            border: `3px solid ${c.accent}`,
            borderRadius: 18,
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
