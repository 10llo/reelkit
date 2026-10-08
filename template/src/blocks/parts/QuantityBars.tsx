import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { jelly } from "../../brand/motion";
import { inkShadow } from "../../brand/tokens";
import { usePalette, useTalent } from "../../frame/contexts";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle } from "../../frame/theme";
import { CLAMP, enter, pulse } from "../../frame/timing";
import { CountUpText } from "./CountUpText";

export type BarRow = { label: string; value: number; color: string; outline?: string; from: number; to: number };

const MAX_BAR = 620;
const BAR_H = 46;
const SQUARE = 38;
const SQUARE_GAP = 6;
const NUMBER_SIZE = 72;
const ROW_H = Math.round(NUMBER_SIZE * 0.9);

export const QuantityBars: React.FC<{
  readonly rows: BarRow[];
  readonly unit: string;
  readonly approx: boolean;
  readonly highlight: number; // row index, -1 for none
  readonly highlightAt: number;
}> = ({ rows, unit, approx, highlight, highlightAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { locale } = useTalent();
  const max = Math.max(...rows.map((r) => r.value));
  const dim = highlight >= 0 ? interpolate(frame, [highlightAt, highlightAt + 12], [1, 0.6], CLAMP) : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row, i) => {
        const isHighlight = i === highlight;
        const grow = interpolate(frame, [row.from, row.to], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
        const appear = enter(frame, fps, row.from - 12);
        const fullWidth = (row.value / max) * MAX_BAR;
        const squares = Math.max(1, Math.round((fullWidth + SQUARE_GAP) / (SQUARE + SQUARE_GAP)));
        const squareW = (fullWidth - SQUARE_GAP * (squares - 1)) / squares;
        const format = new Intl.NumberFormat(locale, { maximumFractionDigits: Number.isInteger(row.value) ? 0 : 1 });
        const shown = Number.isInteger(row.value) ? Math.round(row.value * grow) : row.value * grow;

        return (
          <div
            key={`${i}-${row.label}`}
            style={{
              opacity: appear * (isHighlight || highlight < 0 ? 1 : dim),
              translate: `${interpolate(appear, [0, 1], [-40, 0])}px 0px`,
            }}
          >
            <div style={{ ...bodyStyle(48), color: c.text, lineHeight: 1.05, marginBottom: 2 }}>{row.label}</div>
            <div style={{ display: "flex", alignItems: "center", height: ROW_H }}>
              <div
                style={{
                  width: fullWidth * grow,
                  height: BAR_H,
                  overflow: "hidden",
                  flexShrink: 0,
                  borderRadius: 10,
                  outline: row.outline ? `4px solid ${row.outline}` : undefined,
                  outlineOffset: 3,
                }}
              >
                <div style={{ display: "flex", gap: SQUARE_GAP, width: fullWidth, height: BAR_H }}>
                  {new Array(squares).fill(0).map((_, s) => (
                    <div
                      key={s}
                      style={{
                        width: squareW,
                        height: BAR_H,
                        flexShrink: 0,
                        borderRadius: 8,
                        backgroundColor: row.color,
                        boxShadow: `inset 0 -5px 0 rgba(0,0,0,0.18)`,
                        border: `3px solid ${c.text}`,
                        boxSizing: "border-box",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ ...jelly(frame, row.to), transformOrigin: "left center" }}>
              <div
                style={{
                  marginLeft: 22,
                  fontFamily: FONT_HEAD,
                  fontWeight: WEIGHT_HEAD,
                  fontSize: NUMBER_SIZE,
                  lineHeight: 0.9,
                  whiteSpace: "nowrap",
                  color: isHighlight && frame >= highlightAt ? c.danger : c.accent,
                  scale: isHighlight ? pulse(frame, highlightAt, 14, 1.15) : 1,
                  transformOrigin: "left center",
                  textShadow: inkShadow(4, c),
                }}
              >
                {approx ? "≈ " : ""}
                <CountUpText current={format.format(shown)} final={format.format(row.value)} align="left" />
                {unit ? ` ${unit}` : ""}
              </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
