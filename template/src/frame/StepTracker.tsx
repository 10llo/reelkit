import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon } from "../icons";
import { ON_COLOR, STICKER_FILL } from "../brand/tokens";
import { useLayout, usePalette } from "./contexts";
import { fitFontSize } from "./fit";
import { FONT_HEAD, WEIGHT_HEAD } from "./theme";
import { CLAMP, STAGGER, enter, pop, pulse } from "./timing";

const GAP = 24;
const PILL_H = 60;
const LINE_H = 6;
const LABEL_SIZE = 40;
// The tracker slides in two thirds into the hook (frame 60 of 90 in the reference).
const TRACKER_IN = 2 / 3;

export const StepTracker: React.FC<{
  readonly labels: readonly [string, string, string];
  readonly sceneStarts: number[];
  readonly total: number;
}> = ({ labels, sceneStarts, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { tracker } = useLayout();
  const pillW = (tracker.width - GAP * 2) / 3;
  const appear = enter(frame, fps, sceneStarts[1] * TRACKER_IN);
  const closeStart = sceneStarts[4];
  const progress = interpolate(frame, [sceneStarts[1], sceneStarts[4]], [0, 1], {
    ...CLAMP,
    easing: Easing.inOut(Easing.quad),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: tracker.x,
        top: tracker.y,
        width: tracker.width,
        height: tracker.height,
        opacity: appear,
        translate: `0px ${interpolate(appear, [0, 1], [-40, 0])}px`,
      }}
    >
      {labels.map((label, i) => {
        const activeFrom = sceneStarts[i + 1];
        const doneFrom = i + 2 < sceneStarts.length ? sceneStarts[i + 2] : total;
        const active = frame >= activeFrom && frame < doneFrom;
        const done = frame >= doneFrom;
        // Checks pop when completed, and once more at the start of the close (6 frames apart).
        const inClose = frame >= closeStart;
        const checkAt = inClose ? closeStart + i * STAGGER : doneFrom;
        const checkScale = done ? interpolate(pop(frame, fps, checkAt), [0, 1], [inClose ? 0.5 : 0, 1]) : 0;
        const fontSize = fitFontSize(label, pillW - 100, LABEL_SIZE, FONT_HEAD, WEIGHT_HEAD);

        return (
          <div
            key={`${i}-${label}`}
            style={{
              position: "absolute",
              left: i * (pillW + GAP),
              top: 0,
              width: pillW,
              height: PILL_H,
              borderRadius: PILL_H / 2,
              boxSizing: "border-box",
              border: `4px solid ${c.text}`,
              backgroundColor: active ? c.accent : STICKER_FILL,
              boxShadow: `5px 5px 0 ${c.text}`,
              opacity: active || done ? 1 : 0.55,
              color: active ? ON_COLOR : c.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: FONT_HEAD,
              fontWeight: WEIGHT_HEAD,
              fontSize,
              lineHeight: 1,
              paddingTop: 4,
              whiteSpace: "nowrap",
              scale: active ? pulse(frame, activeFrom, 10, 1.06) : 1,
            }}
          >
            {done ? <Icon name="check" size={34} color={c.accent} style={{ scale: checkScale, marginTop: -4 }} /> : null}
            {label}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: tracker.height - LINE_H,
          width: tracker.width,
          height: LINE_H,
          borderRadius: LINE_H / 2,
          backgroundColor: `${c.text}26`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: tracker.height - LINE_H,
          width: tracker.width * progress,
          height: LINE_H,
          borderRadius: LINE_H / 2,
          backgroundColor: c.accent,
        }}
      />
    </div>
  );
};
