import { expect, it } from "vitest";
import { gaugeSchema, zoneIndex } from "../../src/blocks/Gauge.schema";

const BASE = {
  value: 39.6,
  decimals: 1,
  unit: "°C",
  min: 36,
  max: 42,
  zones: [
    { to: 39.2, label: "Normal", tone: "ok" },
    { to: 40, label: "Fiebre", tone: "warn" },
    { to: 42, label: "Urgencia", tone: "danger" },
  ],
};

it("accepts a valid gauge", () => {
  expect(gaugeSchema.parse(BASE).needleLabel).toBe("");
});
it("requires the value inside min–max", () => {
  expect(gaugeSchema.safeParse({ ...BASE, value: 43 }).success).toBe(false);
});
it("requires ascending zones that end at max", () => {
  expect(gaugeSchema.safeParse({ ...BASE, zones: [BASE.zones[1], BASE.zones[0], BASE.zones[2]] }).success).toBe(false);
  expect(gaugeSchema.safeParse({ ...BASE, zones: [BASE.zones[0], { ...BASE.zones[2], to: 41 }] }).success).toBe(false);
});
it("requires max > min and 2–4 zones", () => {
  expect(gaugeSchema.safeParse({ ...BASE, min: 42 }).success).toBe(false);
  expect(gaugeSchema.safeParse({ ...BASE, zones: [{ to: 42, label: "Todo", tone: "ok" }] }).success).toBe(false);
});
it("finds the zone holding a value", () => {
  const { zones } = gaugeSchema.parse(BASE);
  expect(zoneIndex(zones, 36)).toBe(0);
  expect(zoneIndex(zones, 39.6)).toBe(1);
  expect(zoneIndex(zones, 42)).toBe(2);
});
