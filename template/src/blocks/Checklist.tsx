import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import type { BlockComponent } from "./types";

const CHECK_CIRCLE = 72;
const CHECK_DRAW_FRAMES = 10;
const CHECK_PATH_LENGTH = 90;
// Fractions of a 105-frame reference beat.
const rowAt = (i: number) => (12 + 21 * i) / 105;
const PILL_AFTER = 15 / 105;

export const Checklist: BlockComponent<"Checklist"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const pill = pop(frame, fps, at(rowAt(props.rows.length - 1) + PILL_AFTER));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingLeft: 20 }}>
      {props.rows.map((row, i) => {
        const start = at(rowAt(i));
        const p = enter(frame, fps, start);
        const draw = interpolate(frame, [start + 4, start + 4 + CHECK_DRAW_FRAMES], [0, 1], CLAMP);
        return (
          <div
            key={row}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              opacity: p,
              translate: `${interpolate(p, [0, 1], [40, 0])}px 0px`,
            }}
          >
            <div
              style={{
                width: CHECK_CIRCLE,
                height: CHECK_CIRCLE,
                flexShrink: 0,
                borderRadius: "50%",
                border: `5px solid ${c.safe}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={48} height={48} viewBox="0 0 100 100">
                <path
                  d="M22 52 L42 72 L80 30"
                  fill="none"
                  stroke={c.safe}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={CHECK_PATH_LENGTH}
                  strokeDashoffset={CHECK_PATH_LENGTH * (1 - draw)}
                />
              </svg>
            </div>
            <div style={{ ...bodyStyle(52), color: c.text, lineHeight: 1.15 }}>{row}</div>
          </div>
        );
      })}
      {props.pill ? (
        <div
          style={{
            ...headStyle(44),
            alignSelf: "flex-start",
            marginLeft: CHECK_CIRCLE + 26,
            marginTop: 4,
            padding: "10px 30px 6px",
            borderRadius: 999,
            backgroundColor: c.accent,
            color: c.bg,
            whiteSpace: "nowrap",
            opacity: interpolate(pill, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(pill, [0, 1], [0.5, 1]),
          }}
        >
          {props.pill}
        </div>
      ) : null}
    </div>
  );
};
