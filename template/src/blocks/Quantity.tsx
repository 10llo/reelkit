import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveColor } from "../episode/talent";
import { usePalette } from "../frame/contexts";
import { bodyStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { QuantityBars } from "./parts/QuantityBars";
import { highlightIndex } from "./Quantity.schema";
import type { BlockComponent } from "./types";

// Fractions of a 255-frame reference beat.
const CHIP_AT = 18 / 255;
const ROWS_FROM = 36;
const ROWS_SPAN = 150;
const HIGHLIGHT_AT = 190 / 255;
const CONCLUSION_AT = 202 / 255;
const FOOTNOTE_AT = 208 / 255;

export const Quantity: BlockComponent<"Quantity"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const chip = enter(frame, fps, at(CHIP_AT));
  const conclusion = pop(frame, fps, at(CONCLUSION_AT));
  const footnote = enter(frame, fps, at(FOOTNOTE_AT));
  const max = Math.max(...props.rows.map((r) => r.value));
  const step = ROWS_SPAN / props.rows.length;
  const rows = props.rows.map((row, i) => {
    const from = ROWS_FROM + step * i;
    const length = step * (0.4 + 0.6 * (row.value / max));
    return {
      label: row.label,
      value: row.value,
      color: resolveColor(row.color, c),
      outline: row.outline ? resolveColor(row.outline, c) : undefined,
      from: at(from / 255),
      to: at((from + length) / 255),
    };
  });

  return (
    <div>
      {props.chip ? (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div
            style={{
              ...bodyStyle(44),
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "8px 30px 8px 20px",
              borderRadius: 999,
              backgroundColor: c.bg2,
              border: `2px solid ${c.text}33`,
              color: c.text,
              whiteSpace: "nowrap",
              opacity: chip,
              scale: interpolate(chip, [0, 1], [0.8, 1]),
            }}
          >
            <Icon name={props.chip.icon} size={52} color={c.accent} accent={c.text} />
            {props.chip.label}
          </div>
        </div>
      ) : null}
      <QuantityBars
        rows={rows}
        unit={props.unit}
        approx={props.approx}
        highlight={highlightIndex(props.rows, props.highlight)}
        highlightAt={at(HIGHLIGHT_AT)}
      />
      {props.conclusion ? (
        <div
          style={{
            ...bodyStyle(52),
            color: c.accent,
            marginTop: 14,
            whiteSpace: "nowrap",
            opacity: interpolate(conclusion, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(conclusion, [0, 1], [0.6, 1]),
            transformOrigin: "left center",
          }}
        >
          {props.conclusion}
        </div>
      ) : null}
      {props.footnote ? (
        <div style={{ ...bodyStyle(30), color: c.text, opacity: 0.7 * footnote, marginTop: 6 }}>{props.footnote}</div>
      ) : null}
    </div>
  );
};
