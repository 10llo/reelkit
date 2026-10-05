import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../frame/timing";
import { Chip } from "./parts/Chip";
import { chipColumns } from "./Chips.schema";
import type { BlockComponent } from "./types";

const FIRST_AT = 0.1;
const MAX_STAGGER = 9;
const ENTER_SPAN = 0.5;

export const Chips: BlockComponent<"Chips"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stagger = Math.min(MAX_STAGGER, (timing.duration * ENTER_SPAN) / props.items.length);
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
          progress={enter(frame, fps, timing.at(FIRST_AT) + i * stagger)}
        />
      ))}
    </div>
  );
};
