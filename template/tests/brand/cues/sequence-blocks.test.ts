import { DROP_LAND } from "../../../src/brand/motion";
import { describe, expect, it } from "vitest";
import { FIRST_AT, chipStagger, chipsCues } from "../../../src/blocks/Chips.cues";
import { RING_FROM, RING_TO, timerCues } from "../../../src/blocks/Timer.cues";
import { HIGHLIGHT_AT as PROCESS_HL, processCues, processStepAt } from "../../../src/blocks/Process.cues";
import { cycleCues, cycleNodeAt } from "../../../src/blocks/Cycle.cues";
import { timelineCues, timelineDotAt } from "../../../src/blocks/Timeline.cues";
import { HIGHLIGHT_AT as ANATOMY_HL, anatomyCues, calloutStart } from "../../../src/blocks/Anatomy.cues";
import { MERGE_FRAMES, mergeCues } from "../../../src/brand/sfx";
import { beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const t = beatTiming(0, 150);

describe("Chips", () => {
  const props = sampleProps("Chips");
  it("ticks per chip with the component's stagger", () => {
    const s = chipStagger(t.duration, props.items.length);
    expect(chipsCues(props, t, BRAND_TALENT).map((c) => c.at)).toEqual(props.items.map((_, i) => t.at(FIRST_AT) + i * s));
  });
  it("does not machine-gun a long list in a short beat once merged", () => {
    const many = { ...props, items: Array.from({ length: 8 }, (_, i) => ({ ...props.items[0], label: `Ítem ${i}` })) };
    const short = beatTiming(0, 40);
    const merged = mergeCues(chipsCues(many, short, BRAND_TALENT));
    merged.slice(1).forEach((c, i) => expect(c.at - merged[i].at).toBeGreaterThanOrEqual(MERGE_FRAMES));
    expect(merged.length).toBeLessThan(8);
  });
});

it("Timer ticks when the ring starts and dings when it lands", () => {
  expect(timerCues(sampleProps("Timer"), t, BRAND_TALENT)).toEqual([
    { name: "tick", at: t.at(RING_FROM) },
    { name: "ding", at: t.at(RING_TO) },
  ]);
});

it("Process ticks per step and dings the highlight", () => {
  const props = sampleProps("Process");
  const cues = processCues(props, t, BRAND_TALENT);
  const n = props.steps.length;
  expect(cues.filter((c) => c.name === "tick").map((c) => c.at)).toEqual(props.steps.map((_, i) => processStepAt(t, i, n) + DROP_LAND));
  expect(cues.some((c) => c.name === "ding" && c.at === t.at(PROCESS_HL))).toBe(props.highlightStep !== undefined);
});

it("Cycle ticks per node", () => {
  const props = sampleProps("Cycle");
  const n = props.stages.length;
  expect(cycleCues(props, t, BRAND_TALENT)).toEqual(props.stages.map((_, i) => ({ name: "tick", at: cycleNodeAt(t, i, n) })));
});

it("Timeline ticks per event", () => {
  const props = sampleProps("Timeline");
  const n = props.events.length;
  expect(timelineCues(props, t, BRAND_TALENT)).toEqual(props.events.map((_, i) => ({ name: "tick", at: timelineDotAt(t, i, n) })));
});

it("Anatomy ticks per callout and dings the highlight", () => {
  const props = sampleProps("Anatomy");
  const count = props.callouts.length;
  const cues = anatomyCues(props, t, BRAND_TALENT);
  expect(cues.filter((c) => c.name === "tick").map((c) => c.at)).toEqual(props.callouts.map((_, i) => calloutStart(t, i, count)));
  expect(cues.some((c) => c.name === "ding" && c.at === t.at(ANATOMY_HL))).toBe(props.highlight !== undefined);
});
