import { describe, expect, it } from "vitest";
import { COUNT_END, bigStatCues } from "../../../src/blocks/BigStat.cues";
import { NEEDLE_TO, gaugeCues } from "../../../src/blocks/Gauge.cues";
import { FILL_TO, proportionCues } from "../../../src/blocks/Proportion.cues";
import { quantityCues, quantityRowTimes } from "../../../src/blocks/Quantity.cues";
import { ANNOTATE_AT, LINE_TO, trendCues } from "../../../src/blocks/Trend.cues";
import { zoneIndex } from "../../../src/blocks/Gauge.schema";
import { beatTiming } from "../../../src/frame/timing";
import { BRAND_TALENT, sampleProps } from "../samples";

const t = beatTiming(0, 150);

it("BigStat dings when the count lands", () => {
  expect(bigStatCues(sampleProps("BigStat"), t, BRAND_TALENT)).toEqual([{ name: "ding", at: t.at(COUNT_END) }]);
});

describe("Gauge", () => {
  const props = sampleProps("Gauge");
  it("dings on a safe zone and bonks on a danger zone", () => {
    const zones = props.zones.map((z) => ({ ...z }));
    const active = zoneIndex(zones, props.value);
    zones[active].tone = "ok";
    expect(gaugeCues({ ...props, zones }, t, BRAND_TALENT)).toEqual([{ name: "ding", at: t.at(NEEDLE_TO) }]);
    zones[active].tone = "danger";
    expect(gaugeCues({ ...props, zones }, t, BRAND_TALENT)).toEqual([{ name: "bonk", at: t.at(NEEDLE_TO) }]);
  });
});

it("Proportion dings when the fill lands", () => {
  expect(proportionCues(sampleProps("Proportion"), t, BRAND_TALENT)).toEqual([{ name: "ding", at: t.at(FILL_TO) }]);
});

describe("Quantity", () => {
  const props = sampleProps("Quantity");
  const q = beatTiming(0, 255);
  it("dings once, when the last bar lands", () => {
    const rows = quantityRowTimes(props.rows, q);
    expect(quantityCues(props, q, BRAND_TALENT)).toEqual([{ name: "ding", at: rows[rows.length - 1].to }]);
  });
  it("row times increase and stay inside the beat", () => {
    const rows = quantityRowTimes(props.rows, q);
    rows.forEach((r, i) => {
      expect(r.to).toBeGreaterThan(r.from);
      if (i) expect(r.from).toBeGreaterThan(rows[i - 1].from);
      expect(r.to).toBeLessThanOrEqual(255);
    });
  });
});

describe("Trend", () => {
  const props = sampleProps("Trend");
  it("dings at the end of the line and pops the annotation", () => {
    const cues = trendCues(props, t, BRAND_TALENT);
    expect(cues[0]).toEqual({ name: "ding", at: t.at(LINE_TO) });
    expect(cues.some((c) => c.name === "pop" && c.at === t.at(ANNOTATE_AT))).toBe(Boolean(props.annotate));
  });
});
