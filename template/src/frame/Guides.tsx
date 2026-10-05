import { AbsoluteFill } from "remotion";
import { useLayout } from "./contexts";
import { slotKeepOut, type Rect } from "./layout";

export const Guides: React.FC = () => {
  const l = useLayout();
  const guides: { name: string; rect: Rect; color: string }[] = [
    { name: "TOP SAFE", rect: { x: 0, y: 0, width: l.canvas.width, height: l.safe.top }, color: "255,0,0" },
    {
      name: "BOTTOM SAFE",
      rect: { x: 0, y: l.canvas.height - l.safe.bottom, width: l.canvas.width, height: l.safe.bottom },
      color: "255,0,0",
    },
    {
      name: "GUTTER",
      rect: {
        x: l.slot.x + l.slot.width,
        y: l.slot.y,
        width: l.canvas.width - l.slot.x - l.slot.width,
        height: l.slot.height,
      },
      color: "255,0,0",
    },
    { name: "TRACKER", rect: l.tracker, color: "0,200,255" },
    { name: "STAGE", rect: l.stage, color: "0,255,120" },
    { name: "CAPTIONS", rect: l.captions, color: "255,220,0" },
    { name: "DISCLAIMER", rect: l.disclaimer, color: "255,160,0" },
    { name: "SLOT + CLEARANCE", rect: slotKeepOut(l), color: "255,0,255" },
  ];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {guides.map((g) => (
        <div
          key={g.name}
          style={{
            position: "absolute",
            left: g.rect.x,
            top: g.rect.y,
            width: g.rect.width,
            height: g.rect.height,
            backgroundColor: `rgba(${g.color},0.15)`,
            outline: `2px dashed rgba(${g.color},0.8)`,
            outlineOffset: -2,
            color: `rgb(${g.color})`,
            fontFamily: "monospace",
            fontSize: 24,
            padding: 6,
          }}
        >
          {g.name}
        </div>
      ))}
    </AbsoluteFill>
  );
};
