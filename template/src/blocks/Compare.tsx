import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveColor } from "../episode/talent";
import { AccentText } from "../frame/AccentText";
import { usePalette } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, STAGGER, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { ScaleMeter } from "./parts/ScaleMeter";
import type { BlockComponent } from "./types";

// Fractions of a 105-frame reference beat.
const ITEMS_AT = 18 / 105;
const METER_FROM = 36 / 105;
const METER_TO = 90 / 105;
const CONCLUSION_AT = 60 / 105;
const SWATCH = 180;
const ROW_WIDTH = 960;
const LABEL_SIZE = 40;

export const Compare: BlockComponent<"Compare"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const colWidth = ROW_WIDTH / props.items.length;
  const conclusion = pop(frame, fps, at(CONCLUSION_AT));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", width: "100%" }}>
        {props.items.map((item, i) => {
          const p = enter(frame, fps, at(ITEMS_AT) + i * STAGGER);
          return (
            <div
              key={`${i}-${item.label}`}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: p,
                translate: `0px ${interpolate(p, [0, 1], [40, 0])}px`,
              }}
            >
              <div
                style={{
                  width: SWATCH,
                  height: SWATCH,
                  borderRadius: 32,
                  backgroundColor: item.color ? resolveColor(item.color, c) : c.bg2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "inset 0 -10px 0 rgba(0,0,0,0.25), 0 10px 24px rgba(0,0,0,0.35)",
                }}
              >
                {item.icon ? <Icon name={item.icon} size={110} color={c.text} accent={c.accent} /> : null}
              </div>
              <div
                style={{
                  ...headStyle(fitFontSize(item.label, colWidth - 4, LABEL_SIZE, FONT_HEAD, WEIGHT_HEAD)),
                  color: c.text,
                  marginTop: 14,
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
      {props.meter ? (
        <div style={{ marginTop: 26 }}>
          <ScaleMeter width={900} from={at(METER_FROM)} to={at(METER_TO)} />
        </div>
      ) : null}
      {props.conclusion ? (
        <div
          style={{
            ...bodyStyle(56),
            color: c.text,
            marginTop: 22,
            whiteSpace: "nowrap",
            opacity: interpolate(conclusion, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(conclusion, [0, 1], [0.6, 1]),
          }}
        >
          <AccentText value={props.conclusion} />
        </div>
      ) : null}
    </div>
  );
};
