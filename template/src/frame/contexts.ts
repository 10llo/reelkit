import { createContext, useContext } from "react";
import type { Palette, Talent } from "../episode/talent";
import { LAYOUTS, type Layout } from "./layout";

export const LayoutContext = createContext<Layout>(LAYOUTS["9x16"]);
export const useLayout = () => useContext(LayoutContext);

export const PaletteContext = createContext<Palette | null>(null);
export const usePalette = (): Palette => {
  const palette = useContext(PaletteContext);
  if (!palette) {
    throw new Error("usePalette() needs a PaletteContext.Provider");
  }
  return palette;
};

export const TalentContext = createContext<Talent | null>(null);
export const useTalent = (): Talent => {
  const talent = useContext(TalentContext);
  if (!talent) {
    throw new Error("useTalent() needs a TalentContext.Provider");
  }
  return talent;
};
