import { describe, expect, it } from "vitest";
import { MERGE_FRAMES, SFX_GAIN, SFX_MASTER, activeCues, mergeCues, sfxVolume } from "../../src/brand/sfx";

describe("mergeCues", () => {
  it("sorts cues by frame", () => {
    expect(mergeCues([{ name: "pop", at: 20 }, { name: "ding", at: 5 }])).toEqual([
      { name: "ding", at: 5 },
      { name: "pop", at: 20 },
    ]);
  });
  it("drops a same-name cue closer than 4 frames to the last kept one", () => {
    const ticks = [0, 2, 3.9, 4, 6, 8.5].map((at) => ({ name: "tick" as const, at }));
    expect(mergeCues(ticks).map((c) => c.at)).toEqual([0, 4, 8.5]);
  });
  it("keeps different sounds on the same frame", () => {
    expect(mergeCues([{ name: "pop", at: 10 }, { name: "ding", at: 10 }])).toHaveLength(2);
  });
  it("uses a 4-frame window", () => {
    expect(MERGE_FRAMES).toBe(4);
  });
});

describe("activeCues", () => {
  it("is silent when disabled (checkMode or sfx: false)", () => {
    expect(activeCues([{ name: "pop", at: 0 }], false)).toEqual([]);
  });
  it("merges when enabled", () => {
    expect(activeCues([{ name: "pop", at: 0 }, { name: "pop", at: 1 }], true)).toHaveLength(1);
  });
});

describe("gains", () => {
  it("keeps every sound under the master and tick at half", () => {
    expect(sfxVolume("pop")).toBeCloseTo(SFX_MASTER);
    expect(sfxVolume("tick")).toBeCloseTo(SFX_MASTER * 0.5);
    for (const g of Object.values(SFX_GAIN)) expect(g).toBeLessThanOrEqual(1);
  });
});
