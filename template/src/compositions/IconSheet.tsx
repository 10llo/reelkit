import { AbsoluteFill } from "remotion";
import { ICONS } from "../icons";
import { DIAGRAMS } from "../icons/diagrams";
import { DIAGRAM_NAMES, ICON_NAMES } from "../icons/names";
import { FONT_BODY } from "../frame/theme";

// Studio-only review sheet: every icon at 72 px with its name. Not part of any video.
const COLS = 7;
const CELL_W = 150;
const CELL_H = 110;
const BG = "#1A1023";
const FG = "#FFF3E0";
const ACCENT = "#FF7A1A";

export const IconSheet: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BG, padding: 15 }}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`, gridAutoRows: CELL_H }}>
      {ICON_NAMES.map((name) => {
        const Component = ICONS[name];
        return (
          <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Component size={72} color={FG} accent={ACCENT} />
            <div style={{ fontFamily: FONT_BODY, fontSize: 20, color: FG, opacity: 0.7 }}>{name}</div>
          </div>
        );
      })}
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
      {DIAGRAM_NAMES.map((name) => {
        const Component = DIAGRAMS[name];
        return <Component key={name} size={140} color={FG} accent={BG} />;
      })}
    </div>
  </AbsoluteFill>
);
