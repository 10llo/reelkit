import { describe, expect, it } from "vitest";
import { HERO_AT, STAMP_AT, BITES, hookCues } from "../../../src/blocks/Hook.cues";
import { ICON_AT, definitionCues } from "../../../src/blocks/Definition.cues";
import { CONCLUSION_AT, ITEMS_AT, compareCues } from "../../../src/blocks/Compare.cues";
import { SIDES_AT, VS_AT, WINNER_AT, versusCues } from "../../../src/blocks/Versus.cues";
import { STAGGER, beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const t = beatTiming(0, 105);

describe("Hook", () => {
  const base = sampleProps("Hook");
  it("ticks per bite and pops the stamp", () => {
    const cues = hookCues({ ...base, hero: { ...base.hero, animation: "bites" }, stamp: "paw" }, t, BRAND_TALENT);
    expect(cues).toEqual([...BITES.map((f) => ({ name: "tick", at: t.at(f) })), { name: "pop", at: t.at(STAMP_AT) }]);
  });
  it("pops a pop hero and bonks a shaking one", () => {
    expect(hookCues({ ...base, hero: { ...base.hero, animation: "pop" }, stamp: undefined }, t, BRAND_TALENT)).toEqual([
      { name: "pop", at: t.at(HERO_AT) },
    ]);
    expect(hookCues({ ...base, hero: { ...base.hero, animation: "shake" }, stamp: undefined }, t, BRAND_TALENT)).toEqual([
      { name: "bonk", at: t.at(HERO_AT) },
    ]);
  });
});

describe("Definition", () => {
  it("pops the icon", () => {
    expect(definitionCues(sampleProps("Definition"), t, BRAND_TALENT)).toEqual([{ name: "pop", at: t.at(ICON_AT) }]);
  });
});

describe("Compare", () => {
  const props = sampleProps("Compare");
  it("pops each item STAGGER apart and dings the conclusion", () => {
    const cues = compareCues(props, t, BRAND_TALENT);
    expect(cues.filter((c) => c.name === "pop").map((c) => c.at)).toEqual(props.items.map((_, i) => t.at(ITEMS_AT) + i * STAGGER));
    expect(cues.some((c) => c.name === "ding" && c.at === t.at(CONCLUSION_AT))).toBe(Boolean(props.conclusion));
  });
});

describe("Versus", () => {
  const props = sampleProps("Versus");
  it("pops the sides and the VS badge", () => {
    const pops = versusCues(props, t, BRAND_TALENT).filter((c) => c.name === "pop");
    expect(pops.map((c) => c.at)).toEqual([t.at(SIDES_AT), t.at(VS_AT)]);
  });
  it("chimes only when some row has a winner", () => {
    const noWinner = { ...props, rows: props.rows.map((r) => ({ ...r, winner: undefined })) };
    expect(versusCues(noWinner, t, BRAND_TALENT).some((c) => c.name === "chime")).toBe(false);
    const withWinner = { ...props, rows: props.rows.map((r, i) => ({ ...r, winner: i === 0 ? ("left" as const) : undefined })) };
    expect(versusCues(withWinner, t, BRAND_TALENT)).toContainEqual({ name: "chime", at: t.at(WINNER_AT) });
  });
});
