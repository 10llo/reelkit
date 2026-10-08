import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { wiggleDeg } from "../brand/motion";
import { stickerStyle } from "../brand/sticker";
import { usePalette } from "../frame/contexts";
import { bodyStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { slideAt, stampAt } from "./DoDont.cues";
import type { BlockComponent } from "./types";

const CARD = { width: 450, height: 300, radius: 32 };
const STAMP_SIZE = 210;

export const DoDont: BlockComponent<"DoDont"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignSelf: "start", padding: "0 8px 8px 0" /* room for the hard shadows the stage would clip */ }}>
      {props.cards.map((card, i) => {
        const slide = enter(frame, fps, at(slideAt(i)));
        const stampFrame = at(stampAt(i));
        const stamp = pop(frame, fps, stampFrame);
        const isNo = card.verdict === "no";
        return (
          <div
            key={`${i}-${card.label}`}
            style={{
              position: "relative",
              width: CARD.width,
              height: CARD.height,
              ...stickerStyle(c, { radius: CARD.radius }),
              rotate: `${(i === 0 ? -2 : 2) + (isNo ? wiggleDeg(frame, stampFrame) : 0)}deg`,
              opacity: slide,
              translate: `${interpolate(slide, [0, 1], [-160, 0])}px 0px`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                padding: "0 30px",
                textAlign: "center",
                opacity: isNo ? interpolate(frame, [stampFrame, stampFrame + 6], [1, 0.55], CLAMP) : 1,
              }}
            >
              <Icon name={card.icon} size={120} color={c.text} accent={c.accent} />
              <div style={{ ...bodyStyle(48), color: c.text, lineHeight: 1.1 }}>{card.label}</div>
            </div>
            {frame >= stampFrame ? (
              <Icon
                name={isNo ? "x" : "check"}
                size={isNo ? STAMP_SIZE : 170}
                color={isNo ? c.danger : c.safe}
                style={{
                  position: "absolute",
                  left: (CARD.width - (isNo ? STAMP_SIZE : 170)) / 2,
                  top: (CARD.height - (isNo ? STAMP_SIZE : 170)) / 2,
                  rotate: "-12deg",
                  scale: interpolate(stamp, [0, 1], [2, 1]),
                  opacity: interpolate(stamp, [0, 0.3], [0, 1], CLAMP),
                  filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.4))",
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
