import { useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { bodyStyle } from "../frame/theme";
import { enter } from "../frame/timing";
import { Chip } from "./parts/Chip";
import { ClockRing } from "./parts/ClockRing";
import type { BlockComponent } from "./types";

// Fractions of a 105-frame reference beat.
const RING_FROM = 12 / 105;
const RING_TO = 60 / 105;
const chipAt = (i: number) => (45 + 9 * i) / 105;

export const Timer: BlockComponent<"Timer"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
      <ClockRing
        size={280}
        from={at(RING_FROM)}
        to={at(RING_TO)}
        low={props.low}
        high={props.high}
        unit={props.unit}
        fontSize={72}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
        <div style={{ ...bodyStyle(52), color: c.text, marginBottom: 6 }}>
          {props.caption.split("\n").map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        {props.chips.map((chip, i) => (
          <Chip key={chip.label} icon={chip.icon} label={chip.label} progress={enter(frame, fps, at(chipAt(i)))} />
        ))}
      </div>
    </div>
  );
};
