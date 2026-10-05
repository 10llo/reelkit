import { expect, it } from "vitest";
import { maxTimelineWord, timelineSchema } from "../../src/blocks/Timeline.schema";

const event = (when: string, label: string) => ({ when, label });
const BASE = { events: [event("0 h", "Come el chocolate"), event("6 h", "Vómito y sed"), event("12 h", "Temblores")] };

it("accepts 3–5 events", () => {
  expect(timelineSchema.parse(BASE).events).toHaveLength(3);
  expect(timelineSchema.safeParse({ events: BASE.events.slice(0, 2) }).success).toBe(false);
});
it("limits when to 8 and label to 24 characters", () => {
  expect(timelineSchema.safeParse({ events: [event("x".repeat(9), "a"), ...BASE.events.slice(1)] }).success).toBe(false);
  expect(timelineSchema.safeParse({ events: [event("a", "x".repeat(25)), ...BASE.events.slice(1)] }).success).toBe(false);
});
it("rejects a nowMarker past the last event", () => {
  expect(timelineSchema.safeParse({ ...BASE, nowMarker: 3 }).success).toBe(false);
  expect(timelineSchema.safeParse({ ...BASE, nowMarker: 2 }).success).toBe(true);
});

it("limits the longest label word to what fits a column", () => {
  expect([3, 4, 5].map(maxTimelineWord)).toEqual([14, 10, 8]);
  const long = (n: number) => ({ events: Array.from({ length: n }, (_, i) => event(`${i}`, i === 1 ? "Recuperación" : "ok")) });
  const five = timelineSchema.safeParse(long(5));
  expect(five.success).toBe(false);
  expect(five.error?.issues[0].message).toBe('label word "Recuperación" is too long for 5 events (max 8 characters)');
  expect(timelineSchema.safeParse(long(3)).success).toBe(true);
});
