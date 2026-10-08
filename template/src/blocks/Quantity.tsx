import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { stickerStyle } from "../brand/sticker";
import { resolveColor } from "../episode/talent";
import { usePalette } from "../frame/contexts";
import { bodyStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { QuantityBars } from "./parts/QuantityBars";
import { CHIP_AT, CONCLUSION_AT, FOOTNOTE_AT, HIGHLIGHT_AT, quantityRowTimes } from "./Quantity.cues";
import { highlightIndex } from "./Quantity.schema";
import type { BlockComponent } from "./types";

export const Quantity: BlockComponent<"Quantity"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const chip = enter(frame, fps, at(CHIP_AT));
  const conclusion = pop(frame, fps, at(CONCLUSION_AT));
  const footnote = enter(frame, fps, at(FOOTNOTE_AT));
  const times = quantityRowTimes(props.rows, timing);
  const rows = props.rows.map((row, i) => ({
    label: row.label,
    value: row.value,
    color: resolveColor(row.color, c),
    outline: row.outline ? resolveColor(row.outline, c) : undefined,
    ...times[i],
  }));

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
              ...stickerStyle(c, { radius: 999, border: 4, shadow: 6 }),
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
        <div data-reelkit-small="" style={{ ...bodyStyle(30), color: c.text, opacity: 0.7 * footnote, marginTop: 6 }}>{props.footnote}</div>
      ) : null}
    </div>
  );
};
