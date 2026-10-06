import { describe, expect, it } from "vitest";
import { alignTranscript, alignTokens, similarity, type TranscriptWord } from "../../scripts/lib/align";

const words = (rows: [string, number, number][]): TranscriptWord[] =>
  rows.map(([text, startMs, endMs]) => ({ text, startMs, endMs }));

// Real output of whisper-webgpu "small" on a synthesized Spanish voice (Plan 3 spike).
const SPIKE = words([
  ["¿Tu", 120, 300], [" perro", 300, 540], [" se", 540, 720], [" comió", 720, 960], [" un", 960, 1180],
  [" chocolate?", 1180, 1920], [" ¡Mira", 2060, 2440], [" esto!", 2440, 2880], [" ¡Cuando", 2960, 3540],
  [" preocuparte!", 3540, 4000], [" ¡Entren", 4560, 4860], [" más", 4860, 5020], [" oscuro,", 5020, 5600],
  [" más", 5740, 5900], [" tóxico!", 5900, 6000],
]);
const SPIKE_SCRIPT = ["¿Tu perro se comió un chocolate? Mira esto.", "¿Cuándo preocuparte? Entre más oscuro, más tóxico."];

describe("alignTranscript on the spike output", () => {
  const result = alignTranscript(SPIKE_SCRIPT, SPIKE);

  it("keeps the script's spelling with Whisper's timing", () => {
    expect(result.captions).toHaveLength(15);
    expect(result.captions[0]).toMatchObject({ text: "¿Tu", startMs: 120, endMs: 300 });
    expect(result.captions[8]).toMatchObject({ text: " ¿Cuándo", startMs: 2960 });
    expect(result.captions[10]).toMatchObject({ text: " Entre", startMs: 4560, endMs: 4860 });
  });
  it("classifies each word", () => {
    const entre = result.words.find((w) => w.text === "Entre")!;
    expect(entre).toMatchObject({ status: "corrected", heard: "¡Entren", scene: 1 });
    expect(result.words.filter((w) => w.status === "match")).toHaveLength(14);
    expect(result.adLibs).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
  it("finds each scene's first word and breaks pages at scene ends", () => {
    expect(result.sceneFirstWordMs).toEqual([120, 2960]);
    expect(result.captions[7].pageBreakAfter).toBe(true);
    expect(result.captions[14].pageBreakAfter).toBe(true);
    expect(result.captions[6].pageBreakAfter).toBeUndefined();
  });
});

describe("alignTranscript edge cases", () => {
  it("matches digits to spelled-out numbers", () => {
    const r = alignTranscript(
      ["Puede tardar hasta doce horas."],
      words([["Puede", 0, 200], ["tardar", 200, 400], ["hasta", 400, 600], ["12", 600, 900], ["horas.", 900, 1200]]),
    );
    expect(r.words.every((w) => w.status === "match")).toBe(true);
    expect(r.captions[3]).toMatchObject({ text: " doce", startMs: 600, endMs: 900 });
  });
  it("spreads one spoken number over the script words it covers", () => {
    const r = alignTranscript(["antes del treinta y uno."], words([["antes", 0, 400], ["del", 400, 1000], ["31.", 1000, 1600]]));
    expect(r.captions.map((c) => [c.text.trim(), c.startMs, c.endMs])).toEqual([
      ["antes", 0, 400], ["del", 400, 1000], ["treinta", 1000, 1200], ["y", 1200, 1400], ["uno.", 1400, 1600],
    ]);
  });
  it("flags a far substitution for review", () => {
    const r = alignTranscript(["Signos de metilxantinas hoy"], words([["Signos", 0, 300], ["de", 300, 400], ["metal", 400, 900], ["hoy", 900, 1200]]));
    expect(r.words[2]).toMatchObject({ text: "metilxantinas", status: "check", heard: "metal", startMs: 400 });
    expect(r.captions[2].text).toBe(" metal");
  });
  it("keeps ad-libs with Whisper's text", () => {
    const r = alignTranscript(["Hola a todos."], words([["Bueno,", 0, 300], ["hola", 400, 600], ["a", 600, 700], ["todos.", 700, 1000]]));
    expect(r.adLibs).toEqual([{ text: "Bueno,", startMs: 0, endMs: 300, scene: 0 }]);
    expect(r.captions.map((c) => c.text.trim())).toEqual(["Bueno,", "Hola", "a", "todos."]);
  });
  it("warns about a scene that wasn't spoken and leaves its words out", () => {
    const r = alignTranscript(
      ["Hola a todos.", "Esto no se dijo.", "Chao."],
      words([["Hola", 0, 300], ["a", 300, 400], ["todos.", 400, 800], ["Chao.", 1500, 1900]]),
    );
    expect(r.words.filter((w) => w.scene === 1).every((w) => w.status === "missing")).toBe(true);
    expect(r.sceneFirstWordMs).toEqual([0, null, 1500]);
    expect(r.captions.map((c) => c.text.trim())).toEqual(["Hola", "a", "todos.", "Chao."]);
    expect(r.warnings.join("\n")).toContain("Escena 2");
  });
  it("warns when the clip barely matches the script", () => {
    const r = alignTranscript(["Uno dos tres cuatro cinco"], words([["perro", 0, 300], ["gato", 300, 600]]));
    expect(r.warnings.join("\n")).toMatch(/¿Es el clip correcto\?/);
  });
  it("keeps a spaced % in the captions", () => {
    const r = alignTranscript(["Carga al 100 %"], words([["Carga", 0, 300], ["al", 300, 500], ["100%", 500, 1100]]));
    expect(r.words.every((w) => w.status === "match")).toBe(true);
    expect(r.captions.map((c) => c.text.trim())).toEqual(["Carga", "al", "100", "%"]);
    expect(r.captions[2]).toMatchObject({ startMs: 500, endMs: 700 });
    expect(r.captions[3]).toMatchObject({ startMs: 700, endMs: 1100 });
  });
  it("matches a spaced % to a spoken por ciento", () => {
    const r = alignTranscript(
      ["Carga al 100 %"],
      words([["Carga", 0, 300], ["al", 300, 500], ["cien", 500, 700], ["por", 700, 900], ["ciento", 900, 1100]]),
    );
    expect(r.words.every((w) => w.status === "match")).toBe(true);
    expect(r.adLibs).toEqual([]);
    expect(r.captions.map((c) => c.text.trim())).toEqual(["Carga", "al", "100", "%"]);
  });
  it("starts the scene at the restarted sentence", () => {
    const r = alignTranscript(
      ["¿Cuándo preocuparte?"],
      words([["¿Cuándo…", 0, 400], ["perdón,", 500, 900], ["¿Cuándo", 2000, 2400], ["preocuparte?", 2400, 3000]]),
    );
    expect(r.sceneFirstWordMs).toEqual([2000]);
    expect(r.words.every((w) => w.status === "match")).toBe(true);
    expect(r.adLibs.map((a) => a.text)).toEqual(["¿Cuándo…", "perdón,"]);
  });
  it("handles an empty transcript", () => {
    const r = alignTranscript(["Hola."], []);
    expect(r.captions).toEqual([]);
    expect(r.words[0].status).toBe("missing");
    expect(r.warnings.join("\n")).toContain("No se escuchó voz");
  });
});

describe("helpers", () => {
  it("similarity", () => {
    expect(similarity("entre", "entren")).toBeCloseTo(5 / 6);
    expect(similarity("perro", "perro")).toBe(1);
  });
  it("alignTokens marks gaps with -1", () => {
    expect(alignTokens(["a", "b", "c"], ["a", "c"])).toEqual([[0, 0], [1, -1], [2, 1]]);
  });
});
