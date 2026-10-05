import { describe, expect, it } from "vitest";
import { resolveColor, talentSchema } from "../src/episode/talent";

export const DANI_TALENT = {
  id: "dani",
  displayName: "Dogtora Dani",
  pillName: "Dogtora Dani",
  profession: "Médica veterinaria",
  city: "Manizales",
  country: "CO",
  locale: "es-CO",
  colors: {
    bg: "#1A1023",
    bg2: "#2A1838",
    accent: "#FF7A1A",
    text: "#FFF3E0",
    danger: "#FF4D4D",
    safe: "#3DDC97",
    extra: { chocoWhite: "#F3E3C7", chocoMilk: "#A8693D", chocoSemi: "#6B3F23", chocoDark: "#3B2114" },
  },
  disclaimer: ["Contenido educativo.", "No reemplaza la consulta veterinaria."],
};

describe("talentSchema", () => {
  it("accepts the Dani profile and fills defaults", () => {
    const t = talentSchema.parse(DANI_TALENT);
    expect(t.handles).toEqual({ instagram: "", tiktok: "", whatsapp: "", facebook: "" });
    expect(t.voiceNotes).toBe("");
  });
  it("rejects a 3-digit hex color", () => {
    const bad = { ...DANI_TALENT, colors: { ...DANI_TALENT.colors, bg: "#123" } };
    expect(talentSchema.safeParse(bad).success).toBe(false);
  });
  it("rejects a pill name longer than 18 characters", () => {
    expect(talentSchema.safeParse({ ...DANI_TALENT, pillName: "Doctora Daniela Gómez" }).success).toBe(false);
  });
});

describe("resolveColor", () => {
  const palette = talentSchema.parse(DANI_TALENT).colors;
  it("passes hex through", () => expect(resolveColor("#123456", palette)).toBe("#123456"));
  it("resolves base and extra tokens", () => {
    expect(resolveColor("accent", palette)).toBe("#FF7A1A");
    expect(resolveColor("chocoMilk", palette)).toBe("#A8693D");
  });
  it("names the valid tokens when a token is unknown", () => {
    expect(() => resolveColor("chocoMilks", palette)).toThrow(/Unknown color "chocoMilks".*chocoMilk/);
  });
});
