import { interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { CLAMP, pop } from "../../frame/timing";

const COLS = 4;
const ROWS = 3;
const GAP = 12;
const CRUMBS = 5;
const GRAVITY = 1.1; // px / frame²
const CRUMB_LIFE = 24;

export type Bite = { col: number; row: number; at: number };

/** A 4×3 bar of rounded squares; each bite pops a square away and throws crumbs. */
export const BiteGrid: React.FC<{
  readonly width: number;
  readonly cellHeight: number;
  readonly color: string;
  readonly bites: Bite[];
}> = ({ width, cellHeight, color, bites }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cellW = (width - GAP * (COLS - 1)) / COLS;
  const height = ROWS * cellHeight + (ROWS - 1) * GAP;
  const crumbShade = `color-mix(in srgb, ${color} 65%, black)`;

  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const bite = bites.find((b) => b.col === col && b.row === row);
      const s = bite ? interpolate(pop(frame, fps, bite.at), [0, 1], [1, 0], CLAMP) : 1;
      cells.push(
        <rect
          key={`${col}-${row}`}
          x={col * (cellW + GAP)}
          y={row * (cellHeight + GAP)}
          width={cellW}
          height={cellHeight}
          rx={14}
          fill={color}
          stroke="rgba(0,0,0,0.28)"
          strokeWidth={5}
          style={{ scale: s, transformBox: "fill-box", transformOrigin: "center" }}
        />,
      );
    }
  }

  const crumbs = bites.flatMap((bite, bi) => {
    const t = frame - bite.at;
    if (t < 0 || t > CRUMB_LIFE) {
      return [];
    }
    const cx = bite.col * (cellW + GAP) + cellW / 2;
    const cy = bite.row * (cellHeight + GAP) + cellHeight / 2;
    return new Array(CRUMBS).fill(0).map((_, i) => {
      const vx = (random(`vx-${bi}-${i}`) - 0.5) * 14;
      const vy = -4 - random(`vy-${bi}-${i}`) * 8;
      const r = 5 + random(`r-${bi}-${i}`) * 6;
      return (
        <circle
          key={`${bi}-${i}`}
          cx={cx + vx * t}
          cy={cy + vy * t + 0.5 * GRAVITY * t * t}
          r={r}
          fill={i % 2 ? color : crumbShade}
          opacity={interpolate(t, [CRUMB_LIFE - 10, CRUMB_LIFE], [1, 0], CLAMP)}
        />
      );
    });
  });

  return (
    <svg width={width} height={height} overflow="visible" style={{ display: "block" }}>
      {cells}
      {crumbs}
    </svg>
  );
};
