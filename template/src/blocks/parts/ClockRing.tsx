import { Easing, interpolate, useCurrentFrame } from "remotion";
import { usePalette } from "../../frame/contexts";
import { FONT_HEAD, WEIGHT_HEAD } from "../../frame/theme";
import { CLAMP } from "../../frame/timing";

const STROKE = 20;

/** A ring drawing clockwise from 12 o'clock while the centre counts up to low–high. */
export const ClockRing: React.FC<{
  readonly size: number;
  readonly from: number;
  readonly to: number;
  readonly low: number;
  readonly high: number;
  readonly unit: string;
  readonly fontSize: number;
}> = ({ size, from, to, low, high, unit, fontSize }) => {
  const frame = useCurrentFrame();
  const c = usePalette();
  const progress = interpolate(frame, [from, to], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const lo = Math.round(low * progress);
  const hi = Math.round(high * progress);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${c.text}26`} strokeWidth={STROKE} />
        {[0, 90, 180, 270].map((deg) => (
          <line
            key={deg}
            x1={size / 2}
            y1={STROKE + 10}
            x2={size / 2}
            y2={STROKE + 24}
            stroke={`${c.text}80`}
            strokeWidth={6}
            strokeLinecap="round"
            transform={`rotate(${deg} ${size / 2} ${size / 2})`}
          />
        ))}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c.accent}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={progress > 0 ? 1 : 0}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_HEAD,
          fontWeight: WEIGHT_HEAD,
          fontSize,
          lineHeight: 1,
          paddingTop: fontSize * 0.08,
          color: c.accent,
          whiteSpace: "nowrap",
        }}
      >
        {low === high ? hi : `${lo}–${hi}`}
        <span style={{ fontSize: fontSize * 0.6, marginLeft: fontSize * 0.08 }}>{unit}</span>
      </div>
    </div>
  );
};
