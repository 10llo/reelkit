import { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { useLayout } from "./contexts";
import { measureMinFont } from "./minFont";

/**
 * Confines a scene to the stage. Content is laid out at least at the stage width (wider content widens the box); if it is
 * taller or wider than the stage, the whole group scales down uniformly to fit,
 * and anything outside the stage is clipped. Logs the scale for `npm run check`.
 */
export const FitStage: React.FC<{
  readonly name: string;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({ name, children, style }) => {
  const { stage } = useLayout();
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; offsetX: number; offsetY: number } | null>(null);
  const [handle] = useState(() => delayRender(`Fitting ${name} to the stage`));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const scale = Math.min(1, stage.width / w, stage.height / h);
    console.log(`[reelkit:fit] ${name} ${scale.toFixed(3)}`);
    const minFont = measureMinFont(el);
    if (minFont !== null) {
      console.log(`[reelkit:minfont] ${name} ${minFont.toFixed(1)}`);
    }
    setFit({ scale, offsetX: (stage.width - w * scale) / 2, offsetY: (stage.height - h * scale) / 2 });
    continueRender(handle);
  }, [handle, name, stage]);

  return (
    <div
      style={{
        position: "absolute",
        left: stage.x,
        top: stage.y,
        width: stage.width,
        height: stage.height,
        overflow: "hidden",
      }}
    >
      <div
        ref={ref}
        style={{
          position: "absolute",
          left: fit?.offsetX ?? 0,
          top: fit?.offsetY ?? 0,
          width: "fit-content",
          minWidth: stage.width,
          scale: fit?.scale ?? 1,
          transformOrigin: "top left",
          visibility: fit ? "visible" : "hidden",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
};
