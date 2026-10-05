import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BLOCKS } from "../blocks/registry";
import { isBlockName } from "../blocks/schemas";
import type { Beat, Scene } from "../episode/schema";
import { AccentText } from "../frame/AccentText";
import { usePalette } from "../frame/contexts";
import { FitStage } from "../frame/FitStage";
import { headStyle } from "../frame/theme";
import { ENTER_FRAMES, enter, fadeOut, splitBeats, type BeatTiming } from "../frame/timing";

const BlockView: React.FC<{ readonly beat: Beat; readonly timing: BeatTiming }> = ({ beat, timing }) => {
  if (!isBlockName(beat.block)) {
    throw new Error(`Unknown block "${beat.block}"`);
  }
  const Component = BLOCKS[beat.block] as React.FC<{ props: unknown; timing: BeatTiming }>;
  return <Component props={beat.props} timing={timing} />;
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
  const title = enter(frame, fps, 0);
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
        <div
          style={{
            ...headStyle(88),
            color: c.text,
            textAlign: "center",
            whiteSpace: "nowrap",
            opacity: title,
            translate: `0px ${interpolate(title, [0, 1], [30, 0])}px`,
          }}
        >
          <AccentText value={scene.title} />
        </div>
      ) : null}
      <div style={{ display: "grid", marginTop: scene.title ? 30 : 0 }}>
        {scene.beats.map((beat, i) => (
          <div key={i} style={{ gridArea: "1 / 1", ...beatStyle(i) }}>
            <BlockView beat={beat} timing={beats[i]} />
          </div>
        ))}
      </div>
    </FitStage>
  );
};
