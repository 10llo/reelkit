import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const MYTH_AT = 0.05;
const STRIKE_FROM = 0.35;
const STRIKE_TO = 0.45;
const STAMP_AT = 0.45;
const FACT_AT = 0.55;

const Tag: React.FC<{ readonly label: string; readonly color: string; readonly filled: boolean; readonly ink: string }> = ({
  label,
  color,
  filled,
  ink,
}) => (
  <div
    style={{
      ...headStyle(40),
      alignSelf: "flex-start",
      padding: "6px 22px 2px",
      borderRadius: 999,
      border: `3px solid ${color}`,
      backgroundColor: filled ? color : "transparent",
      color: filled ? ink : color,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </div>
);

export const MythFact: BlockComponent<"MythFact"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const myth = enter(frame, fps, at(MYTH_AT));
  const strike = interpolate(frame, [at(STRIKE_FROM), at(STRIKE_TO)], [0, 1], CLAMP);
  const stamp = pop(frame, fps, at(STAMP_AT));
  const fact = enter(frame, fps, at(FACT_AT));
  const card: React.CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: "26px 36px",
    borderRadius: 32,
    backgroundColor: c.bg2,
    border: `2px solid ${c.text}22`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div
        style={{
          ...card,
          paddingRight: 36 + 120 + 20,
          opacity: myth * interpolate(frame, [at(STAMP_AT), at(STAMP_AT) + 6], [1, 0.55], CLAMP),
          translate: `0px ${interpolate(myth, [0, 1], [30, 0])}px`,
        }}
      >
        <Tag label={props.mythTag} color={c.danger} filled={false} ink={c.bg} />
        <div style={{ ...bodyStyle(48), color: c.text }}>
          <span
            style={{
              backgroundImage: `linear-gradient(${c.danger}, ${c.danger})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "0 55%",
              backgroundSize: `${strike * 100}% 6px`,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
          >
            {props.myth}
          </span>
        </div>
        {frame >= at(STAMP_AT) ? (
          <Icon
            name="x"
            size={120}
            color={c.danger}
            style={{
              position: "absolute",
              right: 30,
              top: 20,
              rotate: "-12deg",
              scale: interpolate(stamp, [0, 1], [2, 1]),
              opacity: interpolate(stamp, [0, 0.3], [0, 1], CLAMP),
            }}
          />
        ) : null}
      </div>
      <div style={{ ...card, opacity: fact, translate: `0px ${interpolate(fact, [0, 1], [60, 0])}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Tag label={props.factTag} color={c.safe} filled ink={c.bg} />
          <Icon name="check" size={56} color={c.safe} />
        </div>
        <div style={{ ...bodyStyle(52), color: c.text }}>{props.fact}</div>
      </div>
    </div>
  );
};
