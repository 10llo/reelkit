import { describe, expect, it } from "vitest";
import { JELLY_FRAMES, WIGGLE_FRAMES, drop, jelly, popIn, slap, wiggle, wiggleDeg } from "../../src/brand/motion";

const scaleOf = (s: unknown): [number, number] => {
  const [x, y = x] = String(s).split(" ").map(Number);
  return [x, y];
};
const deg = (r: unknown) => Number(String(r).replace("deg", ""));
const FPS = 30;

describe("slap", () => {
  it("is hidden before it starts", () => {
    expect(slap(9, FPS, 10).opacity).toBe(0);
  });
  it("squashes on the way in (wider than tall)", () => {
    const [x, y] = scaleOf(slap(13, FPS, 10).scale);
    expect(x).toBeGreaterThan(y);
  });
  it("settles at full size on its tilt", () => {
    const m = slap(70, FPS, 10, -3);
    const [x, y] = scaleOf(m.scale);
    expect(x).toBeCloseTo(1, 2);
    expect(y).toBeCloseTo(1, 2);
    expect(deg(m.rotate)).toBeCloseTo(-3, 1);
  });
});

describe("drop", () => {
  it("starts above and lands at 0", () => {
    expect(drop(0, FPS, 0, 260).translate).toBe("0px -260px");
    expect(drop(80, FPS, 0, 260).translate).toBe("0px 0px");
  });
  it("never goes below the ground; the overshoot becomes squash", () => {
    for (let f = 0; f < 60; f++) {
      const m = drop(f, FPS, 0, 260);
      const y = Number(String(m.translate).split(" ")[1].replace("px", ""));
      expect(y).toBeLessThanOrEqual(0);
      const [x, sy] = scaleOf(m.scale ?? "1 1");
      expect(x).toBeGreaterThanOrEqual(1);
      expect(sy).toBeLessThanOrEqual(1);
    }
  });
});

describe("wiggle", () => {
  it("is still outside its window", () => {
    expect(wiggleDeg(9, 10)).toBe(0);
    expect(wiggleDeg(10 + WIGGLE_FRAMES + 1, 10)).toBe(0);
    expect(wiggle(5, 10).rotate).toBe("0deg");
  });
  it("shakes and decays", () => {
    const early = Math.max(...[11, 12, 13].map((f) => Math.abs(wiggleDeg(f, 10, 9))));
    const late = Math.max(...[24, 25, 26].map((f) => Math.abs(wiggleDeg(f, 10, 9))));
    expect(early).toBeGreaterThan(late);
    expect(early).toBeLessThanOrEqual(9);
  });
});

describe("popIn", () => {
  it("grows from 0 and settles at 1", () => {
    expect(popIn(4, FPS, 5).opacity).toBe(0);
    expect(Number(popIn(70, FPS, 5).scale)).toBeCloseTo(1, 2);
  });
});

describe("jelly", () => {
  it("is neutral outside its window and wobbles inside", () => {
    expect(jelly(9, 10).scale).toBe("1 1");
    expect(jelly(10 + JELLY_FRAMES, 10).scale).toBe("1 1");
    const [x, y] = scaleOf(jelly(12, 10).scale);
    expect(x).not.toBeCloseTo(1, 3);
    expect(x + y).toBeCloseTo(2, 6);
  });
});
