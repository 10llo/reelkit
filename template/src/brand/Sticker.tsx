import { usePalette } from "../frame/contexts";
import { stickerStyle, type StickerOptions } from "./sticker";
import { TILT } from "./tokens";

/** A sticker surface with its content. `style` comes last, so motion presets can override `rotate`/`scale`. */
export const Sticker: React.FC<
  StickerOptions & {
    readonly tilt?: number;
    readonly padding?: React.CSSProperties["padding"];
    readonly style?: React.CSSProperties;
    readonly children: React.ReactNode;
  }
> = ({ tilt = TILT, padding = "14px 30px", style, children, ...opts }) => {
  const c = usePalette();
  return <div style={{ ...stickerStyle(c, opts), padding, rotate: `${tilt}deg`, ...style }}>{children}</div>;
};
