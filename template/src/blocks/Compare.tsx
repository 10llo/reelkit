import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { resolveColor } from "../episode/talent";
import { AccentText } from "../frame/AccentText";
import { usePalette } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, STAGGER, pop } from "../frame/timing";
import { slap } from "../brand/motion";
import { stickerStyle } from "../brand/sticker";
import { STICKER_FILL } from "../brand/tokens";
import { Icon } from "../icons";
import { CONCLUSION_AT, ITEMS_AT, METER_FROM, METER_TO } from "./Compare.cues";
import { ScaleMeter } from "./parts/ScaleMeter";
import type { BlockComponent } from "./types";

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
          return (
            <div
              key={`${i}-${item.label}`}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                ...slap(frame, fps, at(ITEMS_AT) + i * STAGGER, i % 2 ? 3 : -3),
              }}
            >
              <div
                style={{
                  width: SWATCH,
                  height: SWATCH,
                  ...stickerStyle(c, { radius: 32, fill: item.color ? resolveColor(item.color, c) : STICKER_FILL }),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
