import { describe, expect, it } from "vitest";
import { INK, SCENE_BG, STICKER_FILL, applyBrand, inkShadow } from "../../src/brand/tokens";
import { stickerColors, stickerStyle } from "../../src/brand/sticker";
import { DANI_TALENT } from "../fixtures";
import type { Palette } from "../../src/episode/talent";

const dark = DANI_TALENT.colors as Palette;

describe("applyBrand", () => {
  it("replaces the surfaces with the brand's cream, white and ink", () => {
    const p = applyBrand(dark);
    expect([p.bg, p.bg2, p.text]).toEqual([SCENE_BG[0], STICKER_FILL, INK]);
  });
  it("keeps the talent's accent, danger, safe and extra colors", () => {
    const p = applyBrand(dark);
    expect([p.accent, p.danger, p.safe]).toEqual([dark.accent, dark.danger, dark.safe]);
    expect(p.extra).toEqual(dark.extra);
  });
});

describe("stickers", () => {
  const c = applyBrand(dark);
  it("white stickers carry ink text, colored ones white text", () => {
    expect(stickerColors("white", c)).toEqual({ background: STICKER_FILL, color: INK });
    expect(stickerColors("accent", c)).toEqual({ background: c.accent, color: "#FFFFFF" });
    expect(stickerColors("ink", c)).toEqual({ background: INK, color: "#FFFFFF" });
  });
  it("has the 6 px ink border and the 10 px hard shadow by default", () => {
    const s = stickerStyle(c);
    expect(s.border).toBe(`6px solid ${INK}`);
    expect(s.boxShadow).toBe(`10px 10px 0 ${INK}`);
    expect(s.borderRadius).toBe(36);
  });
  it("lets a block override fill, border color and sizes", () => {
    const s = stickerStyle(c, { fill: "#123456", borderColor: "#ABCDEF", border: 4, shadow: 5, radius: 999 });
    expect(s.backgroundColor).toBe("#123456");
    expect(s.border).toBe("4px solid #ABCDEF");
    expect(s.boxShadow).toBe(`5px 5px 0 ${INK}`);
  });
  it("draws hard ink text shadows", () => {
    expect(inkShadow(4, c)).toBe(`4px 4px 0 ${INK}`);
  });
});
