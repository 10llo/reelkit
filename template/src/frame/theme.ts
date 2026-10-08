import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { loadFont } from "@remotion/fonts";
import fredokaLatin from "@fontsource/fredoka/files/fredoka-latin-700-normal.woff2";
import fredokaLatinExt from "@fontsource/fredoka/files/fredoka-latin-ext-700-normal.woff2";
import nunitoLatin800 from "@fontsource/nunito/files/nunito-latin-800-normal.woff2";
import nunitoLatinExt800 from "@fontsource/nunito/files/nunito-latin-ext-800-normal.woff2";
import nunitoLatin900 from "@fontsource/nunito/files/nunito-latin-900-normal.woff2";
import nunitoLatinExt900 from "@fontsource/nunito/files/nunito-latin-ext-900-normal.woff2";

const HEAD_NAME = "Fredoka";
const BODY_NAME = "Nunito";
// Quoted so a family name with a digit or space stays valid CSS.
export const FONT_HEAD = `"${HEAD_NAME}"`;
export const FONT_BODY = `"${BODY_NAME}"`;

// Unicode ranges from the matching @fontsource CSS.
const RANGE_LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const RANGE_LATIN_EXT =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

const face = (family: string, url: string, weight: string, unicodeRange: string) =>
  loadFont({ family, url, weight, style: "normal", unicodeRange });

// Bundled with the template (npm), so renders never need the network.
const fontsLoaded: Promise<void> = Promise.all([
  face(HEAD_NAME, fredokaLatin, "700", RANGE_LATIN),
  face(HEAD_NAME, fredokaLatinExt, "700", RANGE_LATIN_EXT),
  face(BODY_NAME, nunitoLatin800, "800", RANGE_LATIN),
  face(BODY_NAME, nunitoLatinExt800, "800", RANGE_LATIN_EXT),
  face(BODY_NAME, nunitoLatin900, "900", RANGE_LATIN),
  face(BODY_NAME, nunitoLatinExt900, "900", RANGE_LATIN_EXT),
]).then(() => undefined);
// Avoid an unhandled-rejection warning; useFontsReady reports the failure.
fontsLoaded.catch(() => undefined);

export const WEIGHT_HEAD = 700;
export const WEIGHT_BODY = 800;
/** Captions: the heaviest Nunito, so a word reads at a glance. */
export const WEIGHT_CAPTION = 900;

export const headStyle = (fontSize: number): React.CSSProperties => ({
  fontFamily: FONT_HEAD,
  fontWeight: WEIGHT_HEAD,
  fontSize,
  lineHeight: 1.05,
});

export const bodyStyle = (fontSize: number): React.CSSProperties => ({
  fontFamily: FONT_BODY,
  fontWeight: WEIGHT_BODY,
  fontSize,
  lineHeight: 1.2,
});

/** Blocks rendering until both fonts are loaded, so text measurement is exact. */
export const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    fontsLoaded
      .catch((err: unknown) => {
        console.error("[reelkit] Could not load bundled fonts", err);
      })
      .then(() => {
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return ready;
};
