import { interpolate } from "remotion";
import { usePalette } from "../../frame/contexts";
import { bodyStyle } from "../../frame/theme";
import { CLAMP } from "../../frame/timing";
import { Icon } from "../../icons";
import type { IconName } from "../../icons/names";

export const Chip: React.FC<{ readonly icon: IconName; readonly label: string; readonly progress: number }> = ({
  icon,
  label,
  progress,
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
        borderRadius: 999,
        backgroundColor: c.bg2,
        border: `2px solid ${c.text}22`,
        color: c.text,
        whiteSpace: "nowrap",
        opacity: progress,
        translate: `${interpolate(progress, [0, 1], [40, 0], CLAMP)}px 0px`,
      }}
    >
      <Icon name={icon} size={46} color={c.accent} accent={c.text} />
      {label}
    </div>
  );
};
