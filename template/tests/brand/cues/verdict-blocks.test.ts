import { describe, expect, it } from "vitest";
import { CHECK_DELAY, PILL_AFTER, checklistCues, rowAt } from "../../../src/blocks/Checklist.cues";
import { doDontCues, stampAt } from "../../../src/blocks/DoDont.cues";
import { FACT_AT, STAMP_AT, mythFactCues } from "../../../src/blocks/MythFact.cues";
import { NO_AT, QUESTION_AT, YES_AT, decisionCues, toneSfx } from "../../../src/blocks/Decision.cues";
import { beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const t = beatTiming(0, 105);

it("Checklist chimes per check and pops the pill", () => {
  const props = sampleProps("Checklist");
  const cues = checklistCues(props, t, BRAND_TALENT);
  expect(cues.filter((c) => c.name === "chime").map((c) => c.at)).toEqual(props.rows.map((_, i) => t.at(rowAt(i)) + CHECK_DELAY));
  expect(cues.some((c) => c.name === "pop" && c.at === t.at(rowAt(props.rows.length - 1) + PILL_AFTER))).toBe(Boolean(props.pill));
});

it("DoDont bonks a no and chimes a yes", () => {
  const props = sampleProps("DoDont");
  expect(doDontCues(props, t, BRAND_TALENT)).toEqual(
    props.cards.map((card, i) => ({ name: card.verdict === "no" ? "bonk" : "chime", at: t.at(stampAt(i)) })),
  );
});

it("MythFact bonks the myth and chimes the fact", () => {
  expect(mythFactCues(sampleProps("MythFact"), t, BRAND_TALENT)).toEqual([
    { name: "bonk", at: t.at(STAMP_AT) },
    { name: "chime", at: t.at(FACT_AT) },
  ]);
});

describe("Decision", () => {
  it("maps tones to sounds", () => {
    expect([toneSfx("ok"), toneSfx("warn"), toneSfx("danger")]).toEqual(["chime", "tick", "bonk"]);
  });
  it("pops the question and sounds each simple outcome by tone", () => {
    const props = sampleProps("Decision");
    const simple = {
      ...props,
      yes: { label: "Tranquilo", tone: "ok" as const },
      no: { label: "Urgencias", tone: "danger" as const },
    };
    expect(decisionCues(simple, t, BRAND_TALENT)).toEqual([
      { name: "pop", at: t.at(QUESTION_AT) },
      { name: "chime", at: t.at(YES_AT) },
      { name: "bonk", at: t.at(NO_AT) },
    ]);
  });
  it("sounds both outcomes of a follow-up question", () => {
    const props = sampleProps("Decision");
    const follow = {
      ...props,
      yes: { question: "¿Vomita?", yes: { label: "Ve ya", tone: "danger" as const }, no: { label: "Observa", tone: "warn" as const } },
      no: { label: "Tranquilo", tone: "ok" as const },
    };
    expect(decisionCues(follow as typeof props, t, BRAND_TALENT)).toEqual([
      { name: "pop", at: t.at(QUESTION_AT) },
      { name: "bonk", at: t.at(YES_AT + 0.11) },
      { name: "tick", at: t.at(YES_AT + 0.16) },
      { name: "chime", at: t.at(NO_AT) },
    ]);
  });
});
