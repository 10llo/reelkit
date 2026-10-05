import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { fitFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const ICON_AT = 0.04;
const TERM_FROM = 0.1;
const TERM_TO = 0.3;
const UNDERLINE_FROM = 0.3;
const UNDERLINE_TO = 0.4;
const CATEGORY_AT = 0.2;
const PRONUNCIATION_AT = 0.28;
const MEANING_AT = 0.4;
const MEANING_SPAN = 0.35;
const ICON_BOX = 200;
const TERM_MAX_WIDTH = 960 - ICON_BOX - 40;
const TERM_SIZE = 96;

export const Definition: BlockComponent<"Definition"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at, duration } = timing;
  const iconIn = pop(frame, fps, at(ICON_AT));
  const wipe = interpolate(frame, [at(TERM_FROM), at(TERM_TO)], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
  const underline = interpolate(frame, [at(UNDERLINE_FROM), at(UNDERLINE_TO)], [0, 1], CLAMP);
  const category = enter(frame, fps, at(CATEGORY_AT));
  const pronunciation = enter(frame, fps, at(PRONUNCIATION_AT));
  const words = props.meaning.trim().split(/\s+/);
  const wordStagger = Math.min(2, (duration * MEANING_SPAN) / words.length);
  const termSize = fitFontSize(props.term, TERM_MAX_WIDTH, TERM_SIZE, FONT_HEAD, WEIGHT_HEAD);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <div
          style={{
            width: ICON_BOX,
            height: ICON_BOX,
            flexShrink: 0,
            borderRadius: "50%",
            backgroundColor: c.bg2,
            border: `5px solid ${c.accent}`,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: interpolate(iconIn, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(iconIn, [0, 1], [0.4, 1]),
          }}
        >
          <Icon name={props.icon} size={120} color={c.accent} accent={c.text} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
          {props.category ? (
            <div
              style={{
                ...headStyle(40),
                color: c.bg,
                backgroundColor: c.accent,
                borderRadius: 999,
                padding: "6px 22px 0",
                whiteSpace: "nowrap",
                opacity: category,
                translate: `0px ${interpolate(category, [0, 1], [16, 0])}px`,
              }}
            >
              {props.category}
            </div>
          ) : null}
          <div
            style={{
              position: "relative",
              ...headStyle(termSize),
              color: c.text,
              whiteSpace: "nowrap",
              paddingBottom: 10,
              clipPath: `inset(-20% ${(1 - wipe) * 100}% -20% 0)`,
            }}
          >
            {props.term}
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: "100%",
                height: 8,
                borderRadius: 4,
                backgroundColor: c.accent,
                scale: `${underline} 1`,
                transformOrigin: "left center",
              }}
            />
          </div>
          {props.pronunciation ? (
            <div style={{ ...bodyStyle(40), color: c.text, opacity: 0.7 * pronunciation }}>{props.pronunciation}</div>
          ) : null}
        </div>
      </div>
      <div style={{ ...bodyStyle(52), color: c.text, lineHeight: 1.2 }}>
        {words.map((word, i) => {
          const p = enter(frame, fps, at(MEANING_AT) + i * wordStagger);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.28em",
                opacity: p,
                translate: `0px ${interpolate(p, [0, 1], [14, 0])}px`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
