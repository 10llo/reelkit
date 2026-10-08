import { Video } from "@remotion/media";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BORDER, ON_COLOR, SHADOW, STICKER_FILL } from "../brand/tokens";
import { useLayout, usePalette } from "./contexts";
import { resolveSrc } from "./resolveSrc";
import { fitFontSize } from "./fit";
import { FONT_HEAD, WEIGHT_HEAD, useFontsReady } from "./theme";
import { CLAMP, enter } from "./timing";

const SLOT_FILL = "#120A18";
const PILL_PADDING = 30;
const OBJECT_POSITION = "50% 22%";

export const TalentSlot: React.FC<{
  readonly pillName: string;
  readonly clipSrc: string;
  readonly trimStartFrames: number;
}> = ({ pillName, clipSrc, trimStartFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { slot, slotBorder, slotClearance, namePill } = useLayout();
  const fontsReady = useFontsReady();
  const pillFont = fontsReady
    ? fitFontSize(pillName, namePill.maxWidth - PILL_PADDING * 2, namePill.fontSize, FONT_HEAD, WEIGHT_HEAD)
    : namePill.fontSize;
  const scale = interpolate(enter(frame, fps, 0), [0, 1], [0.96, 1], CLAMP);

  return (
    <div
      style={{
        position: "absolute",
        left: slot.x,
        top: slot.y,
        width: slot.width,
        height: slot.height,
        scale,
      }}
    >
      {/* The sticker's white margin: fills the keep-out ring so scene floods never change pixels around the clip. */}
      <div
        style={{
          position: "absolute",
          inset: -slotClearance,
          borderRadius: slot.radius + slotClearance,
          backgroundColor: STICKER_FILL,
          border: `${BORDER}px solid ${c.text}`,
          boxShadow: `${SHADOW}px ${SHADOW}px 0 ${c.text}`,
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: slot.radius,
          overflow: "hidden",
          backgroundColor: SLOT_FILL,
          boxShadow: "none",
        }}
      >
        {clipSrc ? (
          <Video
            name="Talent"
            src={resolveSrc(clipSrc)}
            trimBefore={trimStartFrames}
            objectFit="cover"
            premountFor={fps}
            style={{
              width: "100%",
              height: "100%",
              objectPosition: OBJECT_POSITION,
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: slot.radius,
          border: `${slotBorder}px solid ${c.text}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -namePill.height / 2,
          left: "50%",
          translate: "-50% 0",
          height: namePill.height,
          maxWidth: namePill.maxWidth,
          padding: `0 ${PILL_PADDING}px`,
          boxSizing: "border-box",
          borderRadius: namePill.height / 2,
          backgroundColor: c.accent,
          color: ON_COLOR,
          border: `4px solid ${c.text}`,
          rotate: "-4deg",
          fontFamily: FONT_HEAD,
          fontWeight: WEIGHT_HEAD,
          fontSize: pillFont,
          lineHeight: `${namePill.height - 8 + 4}px`,
          whiteSpace: "nowrap",
          overflow: "hidden",
          boxShadow: `4px 4px 0 ${c.text}`,
        }}
      >
        {pillName}
      </div>
    </div>
  );
};
