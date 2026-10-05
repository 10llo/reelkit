import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { fitWordsFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import { CYCLE_LABEL_H, CYCLE_LABEL_W, CYCLE_NODE, CYCLE_RADIUS, cycleLayout } from "./Cycle.schema";
import type { BlockComponent } from "./types";

const WIDTH = 960;
const RING_FROM = 0.05;
const RING_TO = 0.45;
const CENTER_AT = 0.48;
const DOT_FROM = 0.55;
const GAP = 16;

export const Cycle: BlockComponent<"Cycle"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const n = props.stages.length;
  const dir = props.direction === "cw" ? 1 : -1;
  const { nodes, height, centerY } = cycleLayout(n, props.direction);
  const cx = WIDTH / 2;
  const cy = centerY;
  const ring = interpolate(frame, [at(RING_FROM), at(RING_TO)], [0, 1], CLAMP);
  const circumference = 2 * Math.PI * CYCLE_RADIUS;
  const nodeFrame = (i: number) => at(RING_FROM + ((RING_TO - RING_FROM) * (2 * i + 1)) / (2 * n));
  const center = enter(frame, fps, at(CENTER_AT));
  const travel = interpolate(frame, [at(DOT_FROM), at(1)], [0, 1], CLAMP);
  const dotAngle = ((-90 + dir * 360 * travel) * Math.PI) / 180;
  const ringTransform =
    props.direction === "cw"
      ? `rotate(-90 ${cx} ${cy})`
      : `translate(${cx} ${cy}) scale(-1 1) rotate(-90) translate(${-cx} ${-cy})`;

  return (
    <div style={{ position: "relative", width: WIDTH, height }}>
      <svg width={WIDTH} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={CYCLE_RADIUS} fill="none" stroke={`${c.text}26`} strokeWidth={8} />
        <circle
          cx={cx}
          cy={cy}
          r={CYCLE_RADIUS}
          fill="none"
          stroke={c.accent}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ring)}
          transform={ringTransform}
          opacity={ring > 0 ? 1 : 0}
        />
        {nodes.map((node, i) => {
          const midFraction = (i + 1) / n;
          const mid = ((node.angle + (dir * 180) / n) * Math.PI) / 180;
          const x = cx + CYCLE_RADIUS * Math.cos(mid);
          const y = cy + CYCLE_RADIUS * Math.sin(mid);
          const tangent = (mid * 180) / Math.PI + dir * 90;
          return (
            <path
              key={i}
              d="M-10 -12 L6 0 L-10 12"
              transform={`translate(${x} ${y}) rotate(${tangent})`}
              fill="none"
              stroke={c.accent}
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={ring >= midFraction ? 1 : 0}
            />
          );
        })}
        <circle
          cx={cx + CYCLE_RADIUS * Math.cos(dotAngle)}
          cy={cy + CYCLE_RADIUS * Math.sin(dotAngle)}
          r={12}
          fill={c.text}
          opacity={interpolate(frame, [at(DOT_FROM), at(DOT_FROM) + 6], [0, 1], CLAMP)}
        />
      </svg>
      {nodes.map((node, i) => {
        const p = pop(frame, fps, nodeFrame(i));
        const label = enter(frame, fps, nodeFrame(i) + 4);
        const nx = cx + node.x;
        const ny = cy + node.y;
        const labelBox: React.CSSProperties =
          node.labelSide === "right"
            ? { left: nx + CYCLE_NODE / 2 + GAP, top: ny - CYCLE_LABEL_H / 2, textAlign: "left", alignItems: "center" }
            : node.labelSide === "left"
              ? { left: nx - CYCLE_NODE / 2 - GAP - CYCLE_LABEL_W, top: ny - CYCLE_LABEL_H / 2, textAlign: "right", alignItems: "center", justifyContent: "flex-end" }
              : node.labelSide === "below"
                ? { left: nx - CYCLE_LABEL_W / 2, top: ny + CYCLE_NODE / 2 + 8, textAlign: "center", justifyContent: "center" }
                : { left: nx - CYCLE_LABEL_W / 2, top: ny - CYCLE_NODE / 2 - 8 - CYCLE_LABEL_H, textAlign: "center", justifyContent: "center", alignItems: "flex-end" };
        return (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: nx - CYCLE_NODE / 2,
                top: ny - CYCLE_NODE / 2,
                width: CYCLE_NODE,
                height: CYCLE_NODE,
                borderRadius: "50%",
                backgroundColor: c.bg2,
                border: `5px solid ${c.accent}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: interpolate(p, [0, 0.2], [0, 1], CLAMP),
                scale: interpolate(p, [0, 1], [0.4, 1]),
              }}
            >
              <Icon name={props.stages[i].icon} size={64} color={c.accent} accent={c.text} />
            </div>
            <div
              style={{
                position: "absolute",
                display: "flex",
                width: CYCLE_LABEL_W,
                height: CYCLE_LABEL_H,
                ...labelBox,
                ...headStyle(fitWordsFontSize(props.stages[i].label, CYCLE_LABEL_W, 40, FONT_HEAD, WEIGHT_HEAD)),
                color: c.text,
                opacity: label,
              }}
            >
              {props.stages[i].label}
            </div>
          </div>
        );
      })}
      {props.centerLabel ? (
        <div
          style={{
            position: "absolute",
            left: cx - 90,
            top: cy - 50,
            width: 180,
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            ...headStyle(40),
            color: c.accent,
            opacity: center,
            scale: interpolate(center, [0, 1], [0.8, 1]),
          }}
        >
          {props.centerLabel}
        </div>
      ) : null}
    </div>
  );
};
