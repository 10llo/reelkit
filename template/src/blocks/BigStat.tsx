import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette, useTalent } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import type { BlockComponent } from "./types";

const NUMBER_AT = 0.1;
const COUNT_END = 0.45;
const LABEL_AT = 0.3;
const SOURCE_AT = 0.45;

export const BigStat: BlockComponent<"BigStat"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { locale } = useTalent();
  const { at } = timing;
  const count = interpolate(frame, [at(NUMBER_AT), at(COUNT_END)], [0, 1], {
    ...CLAMP,
    easing: Easing.out(Easing.cubic),
  });
  const numberIn = pop(frame, fps, at(NUMBER_AT));
  const labelIn = enter(frame, fps, at(LABEL_AT));
  const sourceIn = enter(frame, fps, at(SOURCE_AT));
  const format = new Intl.NumberFormat(locale, {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div
        style={{
          ...headStyle(200),
          color: c.accent,
          lineHeight: 1,
          whiteSpace: "nowrap",
          opacity: interpolate(numberIn, [0, 0.2], [0, 1], CLAMP),
          scale: interpolate(numberIn, [0, 1], [0.6, 1]),
        }}
      >
        {props.prefix ? <span style={{ fontSize: 100 }}>{props.prefix}</span> : null}
        {format.format(props.value * count)}
        {props.unit ? <span style={{ fontSize: 100, marginLeft: 12 }}>{props.unit}</span> : null}
      </div>
      <div
        style={{
          ...bodyStyle(52),
          color: c.text,
          marginTop: 10,
          opacity: labelIn,
          translate: `0px ${interpolate(labelIn, [0, 1], [24, 0])}px`,
        }}
      >
        {props.label}
      </div>
      {props.source ? (
        <div data-reelkit-small="" style={{ ...bodyStyle(30), color: c.text, opacity: 0.7 * sourceIn, marginTop: 14 }}>{props.source}</div>
      ) : null}
    </div>
  );
};
