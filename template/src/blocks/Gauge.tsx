import { Easing, interpolate, useCurrentFrame } from "remotion";
import { jelly } from "../brand/motion";
import { STICKER_FILL, inkShadow } from "../brand/tokens";
import { usePalette, useTalent } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, pulse } from "../frame/timing";
import { LEGEND_AT, NEEDLE_FROM, NEEDLE_TO, ZONES_FROM, ZONES_TO } from "./Gauge.cues";
import { zoneIndex } from "./Gauge.schema";
import { CountUpText, widestText } from "./parts/CountUpText";
import { toneColor } from "./parts/tone";
import type { BlockComponent } from "./types";

const W = 560;
const H = 250;
const CX = W / 2;
const CY = 240;
const R = 200;
const STROKE = 50;

const point = (t: number, r = R) => ({ x: CX - r * Math.cos(Math.PI * t), y: CY - r * Math.sin(Math.PI * t) });

export const Gauge: BlockComponent<"Gauge"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const c = usePalette();
  const { locale } = useTalent();
  const { at } = timing;
  const span = props.max - props.min;
  const frac = (v: number) => (v - props.min) / span;
  const active = zoneIndex(props.zones, props.value);
  const activeColor = toneColor(props.zones[active].tone, c);
  const sweep = interpolate(frame, [at(NEEDLE_FROM), at(NEEDLE_TO)], [0, 1], { ...CLAMP, easing: Easing.out(Easing.back(1.6)) });
  const needle = point(frac(props.value) * sweep, R - 46);
  const shown = props.min + (props.value - props.min) * Math.min(1, sweep);
  const format = new Intl.NumberFormat(locale, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals });
  const legendDim = interpolate(frame, [at(LEGEND_AT), at(LEGEND_AT) + 10], [1, 0.55], CLAMP);
  const zoneSpan = (ZONES_TO - ZONES_FROM) / props.zones.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: W, height: H }}>
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          {props.zones.map((zone, i) => {
            const from = point(frac(i === 0 ? props.min : props.zones[i - 1].to));
            const to = point(frac(zone.to));
            const draw = interpolate(frame, [at(ZONES_FROM + zoneSpan * i), at(ZONES_FROM + zoneSpan * (i + 1))], [0, 1], CLAMP);
            return (
              <path
                key={i}
                d={`M${from.x} ${from.y} A${R} ${R} 0 0 1 ${to.x} ${to.y}`}
                fill="none"
                stroke={toneColor(zone.tone, c)}
                strokeWidth={STROKE}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - draw}
              />
            );
          })}
          <line x1={CX} y1={CY} x2={needle.x} y2={needle.y} stroke={activeColor} strokeWidth={12} strokeLinecap="round" opacity={sweep > 0 ? 1 : 0} />
          <circle cx={CX} cy={CY} r={22} fill={c.text} stroke={STICKER_FILL} strokeWidth={6} />
        </svg>
        <div style={{ position: "absolute", left: CX - R - 100, top: CY + 10, width: 200, textAlign: "center", ...headStyle(40), color: c.text, opacity: 0.6 }}>
          {format.format(props.min)}
        </div>
        <div style={{ position: "absolute", left: CX + R - 100, top: CY + 10, width: 200, textAlign: "center", ...headStyle(40), color: c.text, opacity: 0.6 }}>
          {format.format(props.max)}
        </div>
      </div>
      <div style={{ ...headStyle(80), color: activeColor, whiteSpace: "nowrap", marginTop: 40, textShadow: inkShadow(5, c), ...jelly(frame, at(NEEDLE_TO)) }}>
        <CountUpText current={format.format(shown)} final={widestText([format.format(props.min), format.format(props.value)])} />
        {props.unit ? <span style={{ fontSize: 56, marginLeft: 10 }}>{props.unit}</span> : null}
      </div>
      {props.needleLabel ? <div style={{ ...bodyStyle(44), color: c.text }}>{props.needleLabel}</div> : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 18px", marginTop: 6, width: 960 }}>
        {props.zones.map((zone, i) => {
          const isActive = i === active;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 20px 2px 14px",
                borderRadius: 999,
                border: `3px solid ${isActive && frame >= at(LEGEND_AT) ? toneColor(zone.tone, c) : "transparent"}`,
                ...headStyle(40),
                color: c.text,
                whiteSpace: "nowrap",
                opacity: isActive ? 1 : legendDim,
                scale: isActive ? pulse(frame, at(LEGEND_AT), 14, 1.1) : 1,
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: toneColor(zone.tone, c), marginTop: -4 }} />
              {zone.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};
