import { useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle } from "../frame/theme";
import { enter } from "../frame/timing";
import { Chip } from "./parts/Chip";
import { ClockRing } from "./parts/ClockRing";
import { RING_FROM, RING_TO, chipAt } from "./Timer.cues";
import { jelly } from "../brand/motion";
import type { BlockComponent } from "./types";

export const Timer: BlockComponent<"Timer"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
      <div style={{ ...jelly(frame, at(RING_TO)) }}>
        <ClockRing
          size={280}
          from={at(RING_FROM)}
          to={at(RING_TO)}
          low={props.low}
          high={props.high}
          unit={props.unit}
          fontSize={72}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
        <div style={{ ...bodyStyle(52), color: c.text, marginBottom: 6 }}>
          {props.caption.split("\n").map((line, i) => (
            <div key={`${i}-${line}`}>{line}</div>
          ))}
        </div>
        {props.chips.map((chip, i) => (
          <Chip key={`${i}-${chip.label}`} icon={chip.icon} label={chip.label} progress={enter(frame, fps, at(chipAt(i)))} tilt={i % 2 ? 2 : -2} />
        ))}
      </div>
    </div>
  );
};
