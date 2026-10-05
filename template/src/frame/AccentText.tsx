import type { Accented } from "../blocks/schema-parts";
import { usePalette } from "./contexts";

/** Renders `value.text`, coloring the first occurrence of `value.accent` by its tone. */
export const AccentText: React.FC<{ readonly value: Accented; readonly accentStyle?: React.CSSProperties }> = ({
  value,
  accentStyle,
}) => {
  const c = usePalette();
  if (!value.accent) {
    return <>{value.text}</>;
  }
  const color = value.tone === "danger" ? c.danger : value.tone === "safe" ? c.safe : c.accent;
  const i = value.text.indexOf(value.accent);
  return (
    <>
      {value.text.slice(0, i)}
      <span style={{ color, ...accentStyle }}>{value.accent}</span>
      {value.text.slice(i + value.accent.length)}
    </>
  );
};
