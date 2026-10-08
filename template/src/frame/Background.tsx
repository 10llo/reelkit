import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PAD_CENTER, floodAt } from "../brand/flood";
import { PawShape } from "../icons";
import { useLayout, usePalette } from "./contexts";
import { slotKeepOut } from "./layout";
import { CLAMP } from "./timing";

const TILE = 260;
const DRIFT = 24;

/** Flat scene color, the giant paw between scenes, and a faint drifting paw pattern. */
export const Background: React.FC<{ readonly total: number; readonly sceneStarts?: readonly number[] | null; readonly base?: string }> = ({
  total,
  sceneStarts = null,
  base: flatBase,
}) => {
  const frame = useCurrentFrame();
  const c = usePalette();
  const layout = useLayout();
  const { width, height } = layout.canvas;
  const keepOut = slotKeepOut(layout);
  const drift = interpolate(frame, [0, Math.max(1, total - 1)], [0, -DRIFT], CLAMP);
  const { base, flood } = floodAt(frame, sceneStarts, layout.canvas, flatBase);

  return (
    <AbsoluteFill style={{ backgroundColor: base }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="paws" width={TILE} height={TILE} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${drift})`}>
            <g transform="translate(40 40) scale(0.62) rotate(-18 50 50)">
              <PawShape fill={c.text} />
            </g>
            <g transform="translate(160 150) scale(0.5) rotate(22 50 50)">
              <PawShape fill={c.text} />
            </g>
          </pattern>
          <mask id="slot-mask">
            <rect width={width} height={height} fill="white" />
            <rect x={keepOut.x} y={keepOut.y} width={keepOut.width} height={keepOut.height} rx={layout.slot.radius + layout.slotClearance} fill="black" />
          </mask>
        </defs>
        {flood ? (
          <g
            transform={`translate(${flood.x} ${flood.y}) rotate(${flood.rotate}) scale(${flood.scale}) translate(${-PAD_CENTER.x} ${-PAD_CENTER.y})`}
          >
            <PawShape fill={flood.color} />
          </g>
        ) : null}
        <rect width={width} height={height} fill="url(#paws)" opacity={0.04} mask="url(#slot-mask)" />
      </svg>
    </AbsoluteFill>
  );
};
