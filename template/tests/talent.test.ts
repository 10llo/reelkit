import { describe, expect, it } from "vitest";
import { resolveColor, talentSchema } from "../src/episode/talent";
import { DANI_TALENT } from "./fixtures";

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
  it("rejects empty disclaimer lines", () => {
    expect(talentSchema.safeParse({ ...DANI_TALENT, disclaimer: ["", ""] }).success).toBe(false);
    expect(talentSchema.safeParse({ ...DANI_TALENT, disclaimer: ["Contenido educativo.", ""] }).success).toBe(false);
  });
});

describe("resolveColor", () => {
  const palette = talentSchema.parse(DANI_TALENT).colors;
  it("passes hex through", () => expect(resolveColor("#123456", palette)).toBe("#123456"));
  it("resolves base and extra tokens", () => {
    expect(resolveColor("accent", palette)).toBe("#FF7A1A");
    expect(resolveColor("chocoMilk", palette)).toBe("#A8693D");
  });
  it("rejects inherited object keys as tokens", () => {
    expect(() => resolveColor("constructor", palette)).toThrow(/Unknown color "constructor"/);
    expect(() => resolveColor("toString", palette)).toThrow(/Unknown color "toString"/);
  });
  it("names the valid tokens when a token is unknown", () => {
    expect(() => resolveColor("chocoMilks", palette)).toThrow(/Unknown color "chocoMilks".*chocoMilk/);
  });
});
