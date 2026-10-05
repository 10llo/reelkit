import { Easing, interpolate, useCurrentFrame } from "remotion";
import { usePalette } from "../../frame/contexts";
import { CLAMP } from "../../frame/timing";

const BAR_H = 36;
const ARROW = 30;

/** A safe → accent → danger bar that wipes left to right, with an arrow riding the edge. */
export const ScaleMeter: React.FC<{ readonly width: number; readonly from: number; readonly to: number }> = ({
  width,
  from,
  to,
}) => {
  const frame = useCurrentFrame();
  const c = usePalette();
  const progress = interpolate(frame, [from, to], [0, 1], { ...CLAMP, easing: Easing.inOut(Easing.cubic) });
  const edge = width * progress;

  return (
    <div style={{ position: "relative", width, height: BAR_H + ARROW + 6 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: ARROW + 6,
          width,
          height: BAR_H,
          borderRadius: BAR_H / 2,
          backgroundColor: `${c.text}1F`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: ARROW + 6,
          width,
          height: BAR_H,
          borderRadius: BAR_H / 2,
          backgroundImage: `linear-gradient(90deg, ${c.safe}, ${c.accent}, ${c.danger})`,
          clipPath: `inset(0 ${width - edge}px 0 0 round ${BAR_H / 2}px)`,
        }}
      />
      <svg
        width={ARROW}
        height={ARROW}
        viewBox="0 0 30 30"
        style={{
          position: "absolute",
          top: 0,
          left: Math.min(Math.max(edge, ARROW / 2), width - ARROW / 2) - ARROW / 2,
          opacity: interpolate(frame, [from, from + 4], [0, 1], CLAMP),
        }}
      >
        <path d="M2 4 H28 L15 28 Z" fill={c.text} strokeLinejoin="round" />
      </svg>
    </div>
  );
};
