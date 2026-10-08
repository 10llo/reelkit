// Node-safe: the synthesizer, the cue registry and tests import this; only Sfx.tsx touches audio.
export const SFX_NAMES = ["whoosh", "pop", "boing", "ding", "chime", "bonk", "tick"] as const;
export type SfxName = (typeof SFX_NAMES)[number];

/** Seconds; the synthesizer renders exactly this long. */
export const SFX_DURATION: Record<SfxName, number> = {
  whoosh: 0.4,
  pop: 0.06,
  boing: 0.3,
  ding: 0.5,
  chime: 0.45,
  bonk: 0.2,
  tick: 0.025,
};

/** A sound at a frame of the enclosing Sequence (scene-local inside a scene). */
export type Cue = { readonly name: SfxName; readonly at: number };

export const MERGE_FRAMES = 4;

/** Sorted cues, without a same-name cue closer than MERGE_FRAMES to the last one kept. */
export const mergeCues = (cues: readonly Cue[]): Cue[] => {
  const last = new Map<SfxName, number>();
  return [...cues]
    .sort((a, b) => a.at - b.at)
    .filter((cue) => {
      const prev = last.get(cue.name);
      if (prev !== undefined && cue.at - prev < MERGE_FRAMES) {
        return false;
      }
      last.set(cue.name, cue.at);
      return true;
    });
};

export const activeCues = (cues: readonly Cue[], enabled: boolean): Cue[] => (enabled ? mergeCues(cues) : []);

// Subtle: files peak at -3 dBFS; the master keeps SFX ~20 dB under the voice. One knob to tune presence.
export const SFX_MASTER = 0.1;
export const SFX_GAIN: Record<SfxName, number> = {
  whoosh: 0.8,
  pop: 1,
  boing: 0.9,
  ding: 0.8,
  chime: 0.8,
  bonk: 1,
  tick: 0.5,
};

export const sfxVolume = (name: SfxName) => SFX_MASTER * SFX_GAIN[name];
