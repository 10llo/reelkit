import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { loadFont as loadBaloo } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const baloo = loadBaloo("normal", { weights: ["800"], subsets: ["latin", "latin-ext"] });
const inter = loadInter("normal", { weights: ["600"], subsets: ["latin", "latin-ext"] });

export const FONT_HEAD = baloo.fontFamily;
export const FONT_BODY = inter.fontFamily;
export const WEIGHT_HEAD = 800;
export const WEIGHT_BODY = 600;

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
    Promise.all([baloo.waitUntilDone(), inter.waitUntilDone()]).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  return ready;
};
