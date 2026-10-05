import { staticFile } from "remotion";

/** URLs pass through; anything else is a file in the episode folder (the public dir). */
export const resolveSrc = (src: string) => {
  if (/^(https?:|blob:|data:)/.test(src)) {
    return src;
  }
  return staticFile(src.replace(/^\.?\//, ""));
};
