import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../frame/timing";
import { FIRST_AT, chipStagger } from "./Chips.cues";
import { Chip } from "./parts/Chip";
import { chipColumns } from "./Chips.schema";
import type { BlockComponent } from "./types";

export const Chips: BlockComponent<"Chips"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stagger = chipStagger(timing.duration, props.items.length);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${chipColumns(props.items, props.columns)}, max-content)`,
        justifyContent: "center",
        gap: "20px 28px",
      }}
    >
      {props.items.map((item, i) => (
        <Chip
          key={`${i}-${item.label}`}
          icon={item.icon}
          label={item.label}
          tilt={i % 2 ? 2 : -2}
          progress={enter(frame, fps, timing.at(FIRST_AT) + i * stagger)}
        />
      ))}
    </div>
  );
};
