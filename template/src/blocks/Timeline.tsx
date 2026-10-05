import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const ROW = 960;
const LINE_FROM = 0.05;
const LINE_TO = 0.55;
const DOT = 32;
const NOW_DOT = 44;
const DOT_ROW = 64;
const WHEN_SIZE = 48;

export const Timeline: BlockComponent<"Timeline"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const n = props.events.length;
  const col = ROW / n;
  const xs = props.events.map((_, i) => (i + 0.5) * col);
  const hasIcons = props.events.some((e) => e.icon);
  const dotFrame = (i: number) => at(LINE_FROM + ((LINE_TO - LINE_FROM) * i) / (n - 1));
  const line = interpolate(frame, [at(LINE_FROM), at(LINE_TO)], [0, 1], CLAMP);

  const column = (i: number, child: React.ReactNode) => (
    <div key={i} style={{ width: col, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {child}
    </div>
  );

  return (
    <div style={{ width: ROW, display: "flex", flexDirection: "column", gap: 10 }}>
      {hasIcons ? (
        <div style={{ display: "flex", height: 72 }}>
          {props.events.map((e, i) => {
            const p = enter(frame, fps, dotFrame(i) + 3);
            return column(i, e.icon ? <Icon name={e.icon} size={64} color={c.accent} accent={c.text} style={{ opacity: p }} /> : null);
          })}
        </div>
      ) : null}
      <div style={{ display: "flex" }}>
        {props.events.map((e, i) => {
          const p = enter(frame, fps, dotFrame(i) + 3);
          const size = fitFontSize(e.when, col - 16, WHEN_SIZE, FONT_HEAD, WEIGHT_HEAD);
          return column(
            i,
            <div
              style={{
                ...headStyle(size),
                color: i === props.nowMarker ? c.accent : c.text,
                whiteSpace: "nowrap",
                opacity: p,
                translate: `0px ${interpolate(p, [0, 1], [-12, 0])}px`,
              }}
            >
              {e.when}
            </div>,
          );
        })}
      </div>
      <div style={{ position: "relative", height: DOT_ROW }}>
        <div style={{ position: "absolute", left: xs[0], top: DOT_ROW / 2 - 3, width: xs[n - 1] - xs[0], height: 6, borderRadius: 3, backgroundColor: `${c.text}26` }} />
        <div
          style={{
            position: "absolute",
            left: xs[0],
            top: DOT_ROW / 2 - 3,
            width: (xs[n - 1] - xs[0]) * line,
            height: 6,
            borderRadius: 3,
            backgroundColor: c.accent,
          }}
        />
        {props.events.map((_, i) => {
          const isNow = i === props.nowMarker;
          const size = isNow ? NOW_DOT : DOT;
          const p = pop(frame, fps, dotFrame(i));
          const halo = isNow && frame >= dotFrame(i) ? 0.5 + 0.5 * Math.sin((frame - dotFrame(i)) * 0.2) : 0;
          return (
            <div key={i}>
              {isNow ? (
                <div
                  style={{
                    position: "absolute",
                    left: xs[i] - size,
                    top: DOT_ROW / 2 - size,
                    width: size * 2,
                    height: size * 2,
                    borderRadius: "50%",
                    border: `4px solid ${c.accent}`,
                    boxSizing: "border-box",
                    opacity: 0.6 * halo,
                    scale: 0.7 + 0.3 * halo,
                  }}
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: xs[i] - size / 2,
                  top: DOT_ROW / 2 - size / 2,
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  backgroundColor: isNow ? c.accent : c.text,
                  border: `4px solid ${c.bg}`,
                  boxSizing: "border-box",
                  opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                  scale: interpolate(p, [0, 1], [0.3, 1]),
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex" }}>
        {props.events.map((e, i) => {
          const p = enter(frame, fps, dotFrame(i) + 3);
          return column(
            i,
            <div
              style={{
                ...bodyStyle(40),
                color: c.text,
                textAlign: "center",
                width: col - 12,
                opacity: p,
                translate: `0px ${interpolate(p, [0, 1], [12, 0])}px`,
              }}
            >
              {e.label}
            </div>,
          );
        })}
      </div>
    </div>
  );
};
