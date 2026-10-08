import { describe, expect, it } from "vitest";
import { validateBeat, validateColors, validateEpisode, validateTalent } from "../src/episode/validate";
import { DANI_TALENT, minimalEpisode } from "./fixtures";

describe("validateEpisode", () => {
  it("accepts a minimal episode and fills defaults", () => {
    const e = validateEpisode(minimalEpisode());
    expect(e.clip).toEqual({ src: "", trimStartFrames: 0 });
    expect(e.coverFrame).toBe(60);
    expect(e.scenes.step2.split).toBe(0.5);
    expect(e.scenes.hook.beats[0].props).toMatchObject({ value: 42, decimals: 0, unit: "" });
  });
  it("names the path and the known blocks for an unknown block", () => {
    const raw = minimalEpisode();
    raw.scenes.step1.beats[0].block = "BigStats";
    expect(() => validateEpisode(raw)).toThrow(/scenes\.step1\.beats\[0\]: unknown block "BigStats"\. Known blocks: .*BigStat/);
  });
  it("names the path of invalid block props", () => {
    const raw = minimalEpisode();
    raw.scenes.step3.beats[0].props.label = "";
    expect(() => validateEpisode(raw)).toThrow(/scenes\.step3\.beats\[0\]\.props\.label/);
  });
  it("rejects durations outside 15–60 s", () => {
    expect(() => validateEpisode({ ...minimalEpisode(), durationSeconds: 90 })).toThrow(/durationSeconds/);
  });
  it("rejects an accent that is not part of the title", () => {
    const raw = minimalEpisode();
    raw.scenes.step1.title = { text: "¿UNO?", accent: "DOS" };
    expect(() => validateEpisode(raw)).toThrow(/accent must appear in text/);
  });
  it("rejects a cover frame past the end", () => {
    expect(() => validateEpisode({ ...minimalEpisode(), coverFrame: 600 })).toThrow(/coverFrame/);
  });
  it("rejects more than two beats per scene", () => {
    const raw = minimalEpisode();
    raw.scenes.step2.beats.push(raw.scenes.step2.beats[0]);
    expect(() => validateEpisode(raw)).toThrow(/scenes\.step2\.beats/);
  });
});

describe("validateColors", () => {
  const talent = validateTalent(DANI_TALENT);
  const withBeat = (block: string, props: Record<string, unknown>) => {
    const raw = minimalEpisode();
    raw.scenes.step3.beats[0] = { block, props } as never;
    return validateEpisode(raw);
  };
  it("accepts base tokens, extra tokens and hex", () => {
    const episode = withBeat("Quantity", {
      rows: [
        { label: "A", value: 1, color: "chocoMilk" },
        { label: "B", value: 2, color: "#112233", outline: "danger" },
      ],
    });
    expect(() => validateColors(episode, talent)).not.toThrow();
  });
  it("names the path of a typo'd token", () => {
    const episode = withBeat("Quantity", {
      rows: [
        { label: "A", value: 1, color: "chocoSemii" },
        { label: "B", value: 2, color: "accent", outline: "dangr" },
      ],
    });
    expect(() => validateColors(episode, talent)).toThrow(
      /scenes\.step3\.beats\[0\]\.props\.rows\[0\]\.color: Unknown color "chocoSemii"\. Use #RRGGBB or one of: .*\n.*rows\[1\]\.outline: Unknown color "dangr"/,
    );
  });
  it("checks hero.color", () => {
    const episode = withBeat("Hook", {
      line1: "A",
      line2: "B",
      hero: { animation: "pop", icon: "dog", color: "accentt" },
    });
    expect(() => validateColors(episode, talent)).toThrow(/props\.hero\.color: Unknown color "accentt"/);
  });
});

describe("union errors are actionable", () => {
  const message = (block: string, props: Record<string, unknown>) => {
    try {
      validateBeat({ block, props } as never, "b");
    } catch (err) {
      return (err as Error).message;
    }
    return "";
  };
  it("names the bad Anatomy diagram and lists the valid ones", () => {
    const m = message("Anatomy", { subject: { diagram: "horse" }, callouts: [{ label: "Uno", x: 10, y: 10 }, { label: "Dos", x: 80, y: 10 }] });
    expect(m).toMatch(/subject\.diagram/);
    expect(m).toMatch(/dog/);
    expect(m).not.toMatch(/Invalid input$/m);
  });
  it("names the bad tone in a Decision branch and lists the valid tones", () => {
    const m = message("Decision", { question: "¿Algo?", yes: { label: "Sí", tone: "maybe" }, no: { label: "No", tone: "ok" } });
    expect(m).toMatch(/yes\.tone/);
    expect(m).toMatch(/ok/);
    expect(m).toMatch(/danger/);
  });
  it("names the bad tone inside a follow-up", () => {
    const m = message("Decision", {
      question: "¿Algo?",
      yes: { question: "¿Más?", yes: { label: "Sí", tone: "maybe" }, no: { label: "No", tone: "ok" } },
      no: { label: "No", tone: "ok" },
    });
    expect(m).toMatch(/yes\.yes\.tone/);
  });
});

describe("sfx flag", () => {
  it("defaults to true", () => {
    expect(validateEpisode(minimalEpisode()).sfx).toBe(true);
  });
  it("accepts false", () => {
    expect(validateEpisode({ ...minimalEpisode(), sfx: false }).sfx).toBe(false);
  });
  it("rejects a non-boolean", () => {
    expect(() => validateEpisode({ ...minimalEpisode(), sfx: "no" })).toThrow(/sfx/);
  });
});
