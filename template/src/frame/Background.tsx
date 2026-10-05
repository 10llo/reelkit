import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PawShape } from "../icons";
import { useLayout, usePalette } from "./contexts";
import { slotKeepOut } from "./layout";
import { CLAMP } from "./timing";

const TILE = 200;
const DRIFT = 24;

export const Background: React.FC<{ readonly total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  const c = usePalette();
  const layout = useLayout();
  const { width, height } = layout.canvas;
  const keepOut = slotKeepOut(layout);
  const drift = interpolate(frame, [0, Math.max(1, total - 1)], [0, -DRIFT], CLAMP);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: c.bg,
        backgroundImage: `radial-gradient(ellipse 80% 55% at 50% 38%, ${c.bg2} 0%, ${c.bg} 100%)`,
      }}
    >
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern
            id="paws"
            width={TILE}
            height={TILE}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(0 ${drift})`}
          >
            <g transform="translate(30 30) scale(0.5) rotate(-18 50 50)">
              <PawShape fill={c.text} />
            </g>
            <g transform="translate(125 120) scale(0.4) rotate(22 50 50)">
              <PawShape fill={c.text} />
            </g>
          </pattern>
          <mask id="slot-mask">
            <rect width={width} height={height} fill="white" />
            <rect
              x={keepOut.x}
              y={keepOut.y}
              width={keepOut.width}
              height={keepOut.height}
              rx={layout.slot.radius + layout.slotClearance}
              fill="black"
            />
          </mask>
        </defs>
        <rect width={width} height={height} fill="url(#paws)" opacity={0.05} mask="url(#slot-mask)" />
      </svg>
    </AbsoluteFill>
  );
};
