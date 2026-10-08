import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle, headStyle } from "../frame/theme";
import { CLAMP, pop } from "../frame/timing";
import { jelly } from "../brand/motion";
import { stickerStyle } from "../brand/sticker";
import { TILT } from "../brand/tokens";
import { resolveColor } from "../episode/talent";
import { Icon } from "../icons";
import { BITES, HERO_AT, PULSE_FROM, SHAKE_END, STAMP_AT } from "./Hook.cues";
import { BiteGrid } from "./parts/BiteGrid";
import type { BlockComponent, BlockProps } from "./types";

const HERO_WIDTH = 420;
const ICON_SIZE = 260;

const Hero: React.FC<{
  readonly hero: BlockProps<"Hook">["hero"];
  readonly color: string;
  readonly at: (f: number) => number;
}> = ({ hero, color, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (hero.animation === "bites") {
    return (
      <BiteGrid
        width={HERO_WIDTH}
        cellHeight={72}
        color={color}
        bites={[
          { col: 3, row: 0, at: at(BITES[0]) },
          { col: 3, row: 1, at: at(BITES[1]) },
          { col: 2, row: 0, at: at(BITES[2]) },
        ]}
      />
    );
  }
  const icon = hero.icon ?? "info";
  if (hero.animation === "pop") {
    const p = pop(frame, fps, at(HERO_AT));
    return (
      <Icon
        name={icon}
        size={ICON_SIZE}
        color={color}
        style={{ opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP), scale: interpolate(p, [0, 1], [0.4, 1]) }}
      />
    );
  }
  const decay = interpolate(frame, [at(HERO_AT), at(SHAKE_END)], [1, 0], CLAMP);
  const wobble = frame >= at(HERO_AT) ? Math.sin((frame - at(HERO_AT)) * 0.9) * 10 * decay : 0;
  return <Icon name={icon} size={ICON_SIZE} color={color} style={{ rotate: `${wobble}deg` }} />;
};

export const Hook: BlockComponent<"Hook"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const stamp = pop(frame, fps, at(STAMP_AT));

  // Frame 0 is the thumbnail: headline and chip are fully visible, no entrance.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 22 /* tilted sticker corner would be clipped by the stage */ }}>
      <div style={{ ...stickerStyle(c), padding: "22px 44px 26px", rotate: `${TILT}deg` }}>
        <div style={{ ...headStyle(88), color: c.text, lineHeight: 1 }}>{props.line1}</div>
        <div
          style={{
            ...headStyle(92),
            color: c.accent,
            lineHeight: 1,
            whiteSpace: "nowrap",
            ...jelly(frame, at(PULSE_FROM)),
          }}
        >
          {props.line2}
        </div>
      </div>
      {props.chip ? (
        <div
          style={{
            ...bodyStyle(40),
            ...stickerStyle(c, { tone: "ink", radius: 999, border: 4, shadow: 6 }),
            marginTop: 26,
            padding: "8px 30px",
            whiteSpace: "nowrap",
          }}
        >
          {props.chip}
        </div>
      ) : null}
      <div style={{ position: "relative", marginTop: 40 }}>
        <Hero hero={props.hero} color={resolveColor(props.hero.color, c)} at={at} />
        {props.stamp ? (
          <Icon
            name={props.stamp}
            size={150}
            color={c.accent}
            style={{
              position: "absolute",
              left: "100%",
              marginLeft: 40,
              top: 50,
              opacity: interpolate(stamp, [0, 0.2], [0, 1], CLAMP),
              scale: interpolate(stamp, [0, 1], [1.8, 1]),
              rotate: "8deg",
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
