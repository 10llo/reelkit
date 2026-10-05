import { measureText } from "@remotion/layout-utils";
import { useLayout, usePalette } from "./contexts";
import { FONT_BODY, WEIGHT_BODY, bodyStyle } from "./theme";

const TARGET_SIZE = 28;

/** Two fixed lines; shrinks only if a line would not fit the column. */
export const Disclaimer: React.FC<{ readonly lines: readonly [string, string] }> = ({ lines }) => {
  const c = usePalette();
  const { disclaimer: box } = useLayout();
  const widest = Math.max(
    ...lines.map(
      (text) => measureText({ text, fontFamily: FONT_BODY, fontWeight: WEIGHT_BODY, fontSize: TARGET_SIZE }).width,
    ),
  );
  const fontSize = widest <= box.width ? TARGET_SIZE : Math.floor((TARGET_SIZE * box.width) / widest);

  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        ...bodyStyle(fontSize),
        color: c.text,
        opacity: 0.6,
        whiteSpace: "nowrap",
      }}
    >
      {lines.map((line, i) => (
        <div key={`${i}-${line}`}>{line}</div>
      ))}
    </div>
  );
};
