import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apply, prepare, type SyncDeps } from "../../scripts/commands/sync";
import { readJson } from "../../scripts/lib/episode-files";
import type { ClipInfo } from "../../scripts/lib/probe";
import { TranscriptionUnavailable } from "../../scripts/lib/transcribe";
import { TEMPLATE_ROOT } from "./paths";
import { concat, silence, tone } from "./wav";

const INFO: ClipInfo = {
  durationSeconds: 31, width: 1080, height: 1920, rotation: 0, fps: 30,
  hasVideo: true, hasAudio: true, videoCodec: "avc", audioCodec: "aac",
};

/** Says the script word by word: `per` ms per word, 400 ms between lines, starting at `start` ms. */
const fakeTranscript = (script: string[], { start = 1000, per = 300, replace = {} as Record<string, string> } = {}) => {
  let t = start;
  return script.flatMap((line, i) => {
    if (i) t += 400;
    return line.split(/\s+/).map((w) => {
      const word = { text: replace[w] ?? w, startMs: t, endMs: t + per };
      t += per;
      return word;
    });
  });
};

let dir: string;
let clip: string;
let script: string[];
const deps = (overrides: Partial<SyncDeps> = {}): Partial<SyncDeps> => ({
  probe: async () => INFO,
  decode: async () => concat(silence(1.5, 16000), tone(20, 16000), silence(1, 16000)),
  transcribe: async () => fakeTranscript(script, { replace: { doce: "12", Entre: "Entren" } }),
  now: () => new Date("2026-10-05T12:00:00Z"),
  ...overrides,
});
const file = (name: string) => path.join(dir, name);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-sync-"));
  fs.cpSync(path.join(TEMPLATE_ROOT, "examples", "dani-chocolate"), dir, { recursive: true });
  clip = path.join(dir, "..", `${path.basename(dir)}-clip.MOV`);
  fs.writeFileSync(clip, "not really a video");
  script = readJson(file("episode.json")).script;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(clip, { force: true });
});

describe("sync prepare", () => {
  it("proposes trim, scene cuts and captions without touching episode.json", async () => {
    const before = fs.readFileSync(file("episode.json"), "utf8");
    expect(await prepare(dir, clip, { model: "small" }, deps())).toBe(0);
    expect(fs.readFileSync(file("episode.json"), "utf8")).toBe(before);
    expect(fs.existsSync(file("talent.proposed.mov"))).toBe(true);
    expect(fs.existsSync(file("talent.mov"))).toBe(false);

    const proposal = readJson(file("sync-proposal.json"));
    expect(proposal).toEqual({
      clip: { src: "talent.mov", trimStartFrames: 24 },
      stagedClip: "talent.proposed.mov",
      sceneStarts: [0, 87, 234, 408, 609],
      captionsSrc: "captions.json",
      transcribed: true,
      model: "small",
      speechOverrunSeconds: 0,
      clipOverrunSeconds: 0.2,
      createdAt: "2026-10-05T12:00:00.000Z",
    });

    const captions = readJson(file("captions.proposed.json"));
    expect(captions).toHaveLength(71);
    expect(captions[0]).toMatchObject({ text: "¿Tu", startMs: 200 });
    expect(captions.map((c: { text: string }) => c.text.trim())).toContain("doce");
    expect(readJson(file("captions.raw.json"))).toHaveLength(71);

    const report = fs.readFileSync(file("sync-report.md"), "utf8");
    expect(report).toContain("# Sincronización — 2026-10-chocolate");
    expect(report).toContain("| Cuándo | 3,0 s | 2,9 s |");
    expect(report).toContain("| Cuándo | Entre | Entren | Corregida");
    expect(report).toContain("**70 de 71 palabras del guion coinciden**");
    expect(report).toContain("sync apply");
  });

  it("still attaches the clip when transcription is unavailable", async () => {
    const transcribe = async () => {
      throw new TranscriptionUnavailable("WebGPU is not available: test adapter");
    };
    expect(await prepare(dir, clip, { model: "small" }, deps({ transcribe }))).toBe(0);
    expect(readJson(file("sync-proposal.json"))).toMatchObject({
      clip: { src: "talent.mov", trimStartFrames: 39 },
      sceneStarts: null,
      captionsSrc: "",
      transcribed: false,
    });
    expect(fs.existsSync(file("captions.proposed.json"))).toBe(false);
    const report = fs.readFileSync(file("sync-report.md"), "utf8");
    expect(report).toContain("Sin transcripción");
    expect(report).toContain("test adapter");
    expect(report).toContain("provisionales");
  });

  it("still attaches the clip when the audio can't be decoded", async () => {
    const decode = async () => {
      throw new Error("bad audio");
    };
    expect(await prepare(dir, clip, { model: "small" }, deps({ decode }))).toBe(0);
    expect(readJson(file("sync-proposal.json"))).toMatchObject({ transcribed: false, clip: { trimStartFrames: 0 } });
    expect(fs.readFileSync(file("sync-report.md"), "utf8")).toContain("Could not decode");
  });

  it("propagates unexpected errors", async () => {
    const transcribe = async () => {
      throw new TypeError("bug");
    };
    await expect(prepare(dir, clip, { model: "small" }, deps({ transcribe }))).rejects.toThrow("bug");
  });

  it("refuses a clip without audio", async () => {
    expect(await prepare(dir, clip, { model: "small" }, deps({ probe: async () => ({ ...INFO, hasAudio: false }) }))).toBe(1);
    expect(fs.existsSync(file("sync-proposal.json"))).toBe(false);
  });

  it("refuses an episode that isn't built yet", async () => {
    const raw = readJson(file("episode.json"));
    fs.writeFileSync(file("episode.json"), JSON.stringify({ ...raw, stage: "scripted" }));
    expect(await prepare(dir, clip, { model: "small" }, deps())).toBe(1);
  });
});

describe("sync apply", () => {
  it("applies the proposal (including hand-edited caption text)", async () => {
    await prepare(dir, clip, { model: "small" }, deps());
    const proposed = readJson(file("captions.proposed.json"));
    proposed[0].text = "¿Su";
    fs.writeFileSync(file("captions.proposed.json"), JSON.stringify(proposed));

    expect(await apply(dir, { acceptOverrun: false })).toBe(0);
    const episode = readJson(file("episode.json"));
    expect(episode).toMatchObject({
      stage: "synced",
      clip: { src: "talent.mov", trimStartFrames: 24 },
      sceneStarts: [0, 87, 234, 408, 609],
      captionsSrc: "captions.json",
    });
    expect(readJson(file("captions.json"))[0].text).toBe("¿Su");
    expect(fs.existsSync(file("talent.mov"))).toBe(true);
    expect(fs.existsSync(file("talent.proposed.mov"))).toBe(false);
    expect(fs.existsSync(file("sync-proposal.json"))).toBe(false);
    expect(await apply(dir, { acceptOverrun: false })).toBe(1);
  });

  it("refuses a voice that runs past the end unless accepted", async () => {
    const transcribe = async () => fakeTranscript(script, { per: 450 });
    await prepare(dir, clip, { model: "small" }, deps({ transcribe }));
    expect(readJson(file("sync-proposal.json")).speechOverrunSeconds).toBeGreaterThan(0);
    expect(fs.readFileSync(file("sync-report.md"), "utf8")).toContain("⚠ La voz sigue");

    expect(await apply(dir, { acceptOverrun: false })).toBe(1);
    expect(readJson(file("episode.json")).stage).toBe("built");
    expect(await apply(dir, { acceptOverrun: true })).toBe(0);
    expect(readJson(file("episode.json")).stage).toBe("synced");
  });

  it("keeps script-timed captions when there was no transcript", async () => {
    const transcribe = async () => {
      throw new TranscriptionUnavailable("no WebGPU");
    };
    await prepare(dir, clip, { model: "small" }, deps({ transcribe }));
    expect(await apply(dir, { acceptOverrun: false })).toBe(0);
    expect(readJson(file("episode.json"))).toMatchObject({ stage: "synced", sceneStarts: null, captionsSrc: "" });
    expect(fs.existsSync(file("captions.json"))).toBe(false);
  });

  it("rejects broken caption edits", async () => {
    await prepare(dir, clip, { model: "small" }, deps());
    const proposed = readJson(file("captions.proposed.json"));
    proposed[3].endMs = proposed[3].startMs - 1;
    fs.writeFileSync(file("captions.proposed.json"), JSON.stringify(proposed));
    expect(await apply(dir, { acceptOverrun: false })).toBe(1);
    expect(readJson(file("episode.json")).stage).toBe("built");
  });

  it("keeps the applied clip until the next apply", async () => {
    await prepare(dir, clip, { model: "small" }, deps());
    await apply(dir, { acceptOverrun: false });
    fs.writeFileSync(clip, "second take");
    expect(await prepare(dir, clip, { model: "small" }, deps())).toBe(0);
    expect(fs.readFileSync(file("talent.mov"), "utf8")).toBe("not really a video");
    expect(await apply(dir, { acceptOverrun: false })).toBe(0);
    expect(fs.readFileSync(file("talent.mov"), "utf8")).toBe("second take");
  });

  it("leaves no stale proposal when a later prepare fails", async () => {
    await prepare(dir, clip, { model: "small" }, deps());
    const transcribe = async () => {
      throw new TypeError("bug");
    };
    await expect(prepare(dir, clip, { model: "small" }, deps({ transcribe }))).rejects.toThrow("bug");
    expect(fs.existsSync(file("sync-proposal.json"))).toBe(false);
  });

  it("rejects malformed caption files", async () => {
    await prepare(dir, clip, { model: "small" }, deps());
    fs.writeFileSync(file("captions.proposed.json"), "{oops");
    expect(await apply(dir, { acceptOverrun: false })).toBe(1);
    expect(readJson(file("episode.json")).stage).toBe("built");
  });

  it("removes an old clip with another extension and keeps talent.json", async () => {
    fs.writeFileSync(file("talent.mp4"), "old");
    await prepare(dir, clip, { model: "small" }, deps());
    expect(await apply(dir, { acceptOverrun: false })).toBe(0);
    expect(fs.existsSync(file("talent.mp4"))).toBe(false);
    expect(fs.existsSync(file("talent.json"))).toBe(true);
    expect(fs.existsSync(file("talent.mov"))).toBe(true);
  });

  it("explains what to do without a proposal", async () => {
    expect(await apply(dir, { acceptOverrun: false })).toBe(1);
    expect(vi.mocked(console.error).mock.calls.join("\n")).toContain("sync prepare");
  });
});
