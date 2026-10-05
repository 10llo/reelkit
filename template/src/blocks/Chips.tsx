import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../frame/timing";
import { Chip } from "./parts/Chip";
import type { BlockComponent } from "./types";

const FIRST_AT = 0.1;
const CHIP_STAGGER = 9;

export const Chips: BlockComponent<"Chips"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${props.columns}, max-content)`,
        justifyContent: "center",
        gap: "20px 28px",
      }}
    >
      {props.items.map((item, i) => (
        <Chip
          key={item.label}
          icon={item.icon}
          label={item.label}
          progress={enter(frame, fps, timing.at(FIRST_AT) + i * CHIP_STAGGER)}
        />
      ))}
    </div>
  );
};
