import { Video } from "@remotion/media";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useLayout, usePalette } from "./contexts";
import { resolveSrc } from "./resolveSrc";
import { FONT_HEAD, WEIGHT_HEAD } from "./theme";
import { CLAMP, enter } from "./timing";

const SLOT_FILL = "#120A18";
const OBJECT_POSITION = "50% 22%";

export const TalentSlot: React.FC<{
  readonly pillName: string;
  readonly clipSrc: string;
  readonly trimStartFrames: number;
}> = ({ pillName, clipSrc, trimStartFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { slot, slotBorder, slotRing, namePill } = useLayout();
  const scale = interpolate(enter(frame, fps, 0), [0, 1], [0.96, 1], CLAMP);

  return (
    <div style={{ position: "absolute", left: slot.x, top: slot.y, width: slot.width, height: slot.height, scale }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: slot.radius,
          overflow: "hidden",
          backgroundColor: SLOT_FILL,
          boxShadow: `0 0 0 ${slotRing}px ${c.accent}, 0 18px 40px rgba(0,0,0,0.45)`,
        }}
      >
        {clipSrc ? (
          <Video
            name="Talent"
            src={resolveSrc(clipSrc)}
            trimBefore={trimStartFrames}
            objectFit="cover"
            premountFor={fps}
            style={{ width: "100%", height: "100%", objectPosition: OBJECT_POSITION }}
          />
        ) : null}
      </div>
      <div
        style={{ position: "absolute", inset: 0, borderRadius: slot.radius, border: `${slotBorder}px solid ${c.text}` }}
      />
      <div
        style={{
          position: "absolute",
          top: -namePill.height / 2,
          left: "50%",
          translate: "-50% 0",
          height: namePill.height,
          maxWidth: namePill.maxWidth,
          padding: "0 30px",
          boxSizing: "border-box",
          borderRadius: namePill.height / 2,
          backgroundColor: c.text,
          color: c.bg,
          fontFamily: FONT_HEAD,
          fontWeight: WEIGHT_HEAD,
          fontSize: namePill.fontSize,
          lineHeight: `${namePill.height + 4}px`,
          whiteSpace: "nowrap",
          overflow: "hidden",
          boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
        }}
      >
        {pillName}
      </div>
    </div>
  );
};
