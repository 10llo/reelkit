import { interpolate } from "remotion";
import { stickerStyle } from "../../brand/sticker";
import { usePalette } from "../../frame/contexts";
import { bodyStyle } from "../../frame/theme";
import { CLAMP } from "../../frame/timing";
import { Icon } from "../../icons";
import type { IconName } from "../../icons/names";

export const Chip: React.FC<{ readonly icon: IconName; readonly label: string; readonly progress: number; readonly tilt?: number }> = ({
  icon,
  label,
  progress,
  tilt = 0,
}) => {
  const c = usePalette();
  return (
    <div
      style={{
        ...bodyStyle(44),
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 26px 10px 18px",
        ...stickerStyle(c, { radius: 999, border: 4, shadow: 5 }),
        whiteSpace: "nowrap",
        rotate: `${tilt}deg`,
        scale: interpolate(progress, [0, 1], [0.6, 1], CLAMP),
        opacity: progress,
        translate: `${interpolate(progress, [0, 1], [40, 0], CLAMP)}px 0px`,
      }}
    >
      <Icon name={icon} size={46} color={c.accent} accent={c.text} />
      {label}
    </div>
  );
};
