import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { usePalette } from "../frame/contexts";
import { fitFontSize, fitWordsFontSize } from "../frame/fit";
import { FONT_HEAD, WEIGHT_HEAD, headStyle } from "../frame/theme";
import { CLAMP, enter, pop } from "../frame/timing";
import { Icon } from "../icons";
import type { BlockComponent } from "./types";

const SIDE = 340;
const MIDDLE = 280;
const SIDES_AT = 0.04;
const VS_AT = 0.12;
const ROWS_FROM = 0.22;
const ROWS_SPAN = 0.4;
const WINNER_AT = 0.72;
const VS_SIZE = 110;

export const Versus: BlockComponent<"Versus"> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { at } = timing;
  const sides = enter(frame, fps, at(SIDES_AT));
  const vs = pop(frame, fps, at(VS_AT));
  const winners = pop(frame, fps, at(WINNER_AT));
  const loserDim = interpolate(
    frame,
    [at(WINNER_AT), at(WINNER_AT) + 10],
    [1, 0.5],
    CLAMP,
  );

  const header = (
    s: { name: string; icon: (typeof props.left)["icon"] },
    fromLeft: boolean,
  ) => (
    <div
      style={{
        width: SIDE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: sides,
        translate: `${interpolate(sides, [0, 1], [fromLeft ? -80 : 80, 0])}px 0px`,
      }}
    >
      <Icon name={s.icon} size={96} color={c.accent} accent={c.text} />
      <div
        style={{
          ...headStyle(
            fitFontSize(s.name, SIDE - 20, 52, FONT_HEAD, WEIGHT_HEAD),
          ),
          color: c.text,
          whiteSpace: "nowrap",
        }}
      >
        {s.name}
      </div>
    </div>
  );

  const value = (
    text: string,
    isWinner: boolean,
    isLoser: boolean,
    isTie: boolean,
    align: "left" | "right",
  ) => (
    <div
      style={{
        width: SIDE,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        flexDirection: align === "right" ? "row" : "row-reverse",
        gap: 12,
        opacity: isLoser ? loserDim : 1,
      }}
    >
      {isWinner ? (
        <Icon
          name="check"
          size={44}
          color={c.safe}
          style={{
            opacity: interpolate(winners, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(winners, [0, 1], [0.3, 1]),
          }}
        />
      ) : null}
      {isTie ? (
        <svg
          width={44}
          height={44}
          viewBox="0 0 44 44"
          style={{
            opacity: interpolate(winners, [0, 0.2], [0, 1], CLAMP),
            scale: interpolate(winners, [0, 1], [0.3, 1]),
          }}
        >
          <path d="M9 16 H35 M9 28 H35" stroke={c.text} strokeWidth={6} strokeLinecap="round" fill="none" />
        </svg>
      ) : null}
      <div
        style={{
          ...headStyle(
            fitFontSize(text, SIDE - 60, 48, FONT_HEAD, WEIGHT_HEAD),
          ),
          color: isWinner && frame >= at(WINNER_AT) ? c.accent : c.text,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: SIDE * 2 + MIDDLE,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {header(props.left, true)}
        <div
          style={{ width: MIDDLE, display: "flex", justifyContent: "center" }}
        >
          <div
            style={{
              minWidth: VS_SIZE,
              maxWidth: MIDDLE - 20,
              height: VS_SIZE,
              padding: "0 24px",
              boxSizing: "border-box",
              whiteSpace: "nowrap",
              borderRadius: VS_SIZE / 2,
              backgroundColor: c.accent,
              color: c.bg,
              ...headStyle(48),
              lineHeight: `${VS_SIZE + 6}px`,
              textAlign: "center",
              opacity: interpolate(vs, [0, 0.2], [0, 1], CLAMP),
              scale: interpolate(vs, [0, 1], [0.3, 1]),
            }}
          >
            {props.vsLabel}
          </div>
        </div>
        {header(props.right, false)}
      </div>
      {props.rows.map((row, i) => {
        const p = enter(
          frame,
          fps,
          at(ROWS_FROM + (ROWS_SPAN * i) / props.rows.length),
        );
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              minHeight: 68,
              borderTop: `2px solid ${c.text}26`,
              paddingTop: 10,
              opacity: p,
              translate: `0px ${interpolate(p, [0, 1], [20, 0])}px`,
            }}
          >
            {value(
              row.left,
              row.winner === "left",
              row.winner === "right",
              row.winner === "tie",
              "right",
            )}
            <div
              style={{
                width: MIDDLE,
                textAlign: "center",
                ...headStyle(fitWordsFontSize(row.attribute, MIDDLE, 40, FONT_HEAD, WEIGHT_HEAD)),
                lineHeight: 1.1,
                color: c.text,
                opacity: 0.65,
              }}
            >
              {row.attribute}
            </div>
            {value(
              row.right,
              row.winner === "right",
              row.winner === "left",
              row.winner === "tie",
              "left",
            )}
          </div>
        );
      })}
    </div>
  );
};
