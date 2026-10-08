import { useEffect, useMemo, useState } from "react";
import type { Caption } from "@remotion/captions";
import { measureText } from "@remotion/layout-utils";
import { continueRender, delayRender, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ACTIVE_SCALE, LINE_HEIGHT, layoutPage, paginate, wordsFromCaptions, wordsFromScript } from "./captions-model";
import { HIGHLIGHT } from "../brand/tokens";
import { stickerStyle } from "../brand/sticker";
import { useLayout, usePalette } from "./contexts";
import { resolveSrc } from "./resolveSrc";
import { FONT_BODY, WEIGHT_CAPTION } from "./theme";
import { CLAMP, enter } from "./timing";

const PAD_X = 22;
const PAD_Y = 10;
const STICKER = { radius: 24, border: 5, shadow: 6 };
// Room the sticker takes from the captions box, so text never pushes it out.
const INSET_X = 2 * (PAD_X + STICKER.border) + STICKER.shadow;
const INSET_Y = 2 * (PAD_Y + STICKER.border) + STICKER.shadow;

const useCaptionFile = (captionsSrc: string) => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  useEffect(() => {
    if (!captionsSrc) {
      setCaptions(null);
      return;
    }
    const handle = delayRender("Loading captions");
    let ignore = false;
    fetch(resolveSrc(captionsSrc))
      .then((res) => res.json())
      .then((data: Caption[]) => {
        if (!ignore) {
          setCaptions(data);
        }
        continueRender(handle);
      })
      .catch((err) => {
        console.warn(`[reelkit] Could not load captions ${captionsSrc}; using script timing.`, err);
        continueRender(handle);
      });
    return () => {
      ignore = true;
    };
  }, [captionsSrc]);
  return captions;
};

const measure = (text: string, fontSize: number) =>
  measureText({
    text,
    fontFamily: FONT_BODY,
    fontWeight: WEIGHT_CAPTION,
    fontSize,
  }).width;

export const Captions: React.FC<{
  readonly script: string[];
  readonly sceneStarts: number[];
  readonly total: number;
  readonly captionsSrc: string;
}> = ({ script, sceneStarts, total, captionsSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const { captions: box, captionsBaseSize } = useLayout();
  const fileCaptions = useCaptionFile(captionsSrc);

  const pages = useMemo(
    () => paginate(fileCaptions ? wordsFromCaptions(fileCaptions, fps) : wordsFromScript(script, sceneStarts, total)),
    [fileCaptions, fps, script, sceneStarts, total],
  );
  const page = pages.find((p) => frame >= p.from && frame < p.to);
  const layout = useMemo(
    () =>
      page
        ? layoutPage(page, measure, { width: box.width - INSET_X, height: box.height - INSET_Y }, captionsBaseSize)
        : null,
    [page, box, captionsBaseSize],
  );
  if (!page || !layout) {
    return null;
  }
  const appear = enter(frame, fps, page.from);

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
        alignItems: "flex-start",
        fontFamily: FONT_BODY,
        fontWeight: WEIGHT_CAPTION,
        fontSize: layout.fontSize,
        lineHeight: LINE_HEIGHT,
        color: c.text,
        opacity: appear,
        translate: `0px ${interpolate(appear, [0, 1], [16, 0], CLAMP)}px`,
      }}
    >
      <div
        style={{
          ...stickerStyle(c, STICKER),
          padding: `${PAD_Y}px ${PAD_X}px`,
        }}
      >
        {layout.lines.map((line, li) => (
          <div key={li} style={{ whiteSpace: "nowrap" }}>
            {line.map((word, wi) => {
              const active = frame >= word.from && frame < word.to;
              return (
                <span
                  key={wi}
                  style={{
                    display: "inline-block",
                    color: c.text,
                    backgroundColor: active ? HIGHLIGHT : "transparent",
                    borderRadius: 10,
                    padding: "0 6px",
                    margin: `0 ${wi < line.length - 1 ? layout.gapPx - 6 : -6}px 0 -6px`,
                    scale: active ? ACTIVE_SCALE : 1,
                    transformOrigin: "left center",
                  }}
                >
                  {word.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
