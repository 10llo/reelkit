import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { slap } from "../brand/motion";
import { stickerStyle } from "../brand/sticker";
import { SfxCues } from "../brand/SfxCues";
import { cuesFor } from "../blocks/cues";
import { BLOCKS } from "../blocks/registry";
import { isBlockName } from "../blocks/schemas";
import type { Beat, Scene } from "../episode/schema";
import { AccentText } from "../frame/AccentText";
import { usePalette, useTalent } from "../frame/contexts";
import { FitStage } from "../frame/FitStage";
import { headStyle } from "../frame/theme";
import { ENTER_FRAMES, enter, fadeOut, splitBeats, type BeatTiming } from "../frame/timing";

const BlockView: React.FC<{ readonly beat: Beat; readonly timing: BeatTiming }> = ({ beat, timing }) => {
  if (!isBlockName(beat.block)) {
    throw new Error(`Unknown block "${beat.block}"`);
  }
  const Component = BLOCKS[beat.block] as React.FC<{ props: unknown; timing: BeatTiming }>;
  const talent = useTalent();
  return (
    <>
      <Component props={beat.props} timing={timing} />
      <SfxCues cues={cuesFor(beat.block, beat.props, timing, talent)} />
    </>
  );
};

/**
 * One scene: optional title (persists across beats), then 1–2 beats stacked in the
 * same grid cell. Beat A slides up and out as beat B starts; beat B enters 12 frames later.
 */
export const SceneRenderer: React.FC<{
  readonly name: string;
  readonly scene: Scene;
  readonly duration: number;
  readonly fadeOutAtEnd: boolean;
}> = ({ name, scene, duration, fadeOutAtEnd }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = usePalette();
  const beats = splitBeats(duration, scene.beats.length, scene.split);
  const second = beats[1];
  const aOut = second ? enter(frame, fps, second.from) : 0;
  const bIn = second ? enter(frame, fps, second.from + ENTER_FRAMES) : 0;

  const beatStyle = (i: number): React.CSSProperties => {
    if (!second) {
      return {};
    }
    return i === 0
      ? { opacity: 1 - aOut, translate: `0px ${interpolate(aOut, [0, 1], [0, -80])}px` }
      : { opacity: bIn, translate: `0px ${interpolate(bIn, [0, 1], [60, 0])}px` };
  };

  return (
    <FitStage name={name} style={{ opacity: fadeOutAtEnd ? fadeOut(frame, duration) : 1 }}>
      {scene.title ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 14 /* tilted title corner would be clipped by the stage */ }}>
          <div
            style={{
              ...headStyle(72),
              ...stickerStyle(c),
              padding: "14px 32px 8px",
              textAlign: "center",
              whiteSpace: "nowrap",
              ...slap(frame, fps, 0),
            }}
          >
            <AccentText value={scene.title} />
          </div>
        </div>
      ) : null}
      {scene.title ? <SfxCues cues={[{ name: "pop", at: 0 }]} /> : null}
      <div style={{ display: "grid", marginTop: scene.title ? 20 : 0 }}>
        {scene.beats.map((beat, i) => (
          <div key={i} style={{ gridArea: "1 / 1", ...beatStyle(i) }}>
            <BlockView beat={beat} timing={beats[i]} />
          </div>
        ))}
      </div>
    </FitStage>
  );
};
