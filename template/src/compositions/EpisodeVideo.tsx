import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, Series, interpolate, useVideoConfig } from "remotion";
import { floodCues } from "../brand/flood";
import { SfxContext, SfxCues } from "../brand/SfxCues";
import { applyBrand } from "../brand/tokens";
import type { EpisodeProps } from "../episode/load";
import { Background } from "../frame/Background";
import { Captions } from "../frame/Captions";
import { LayoutContext, PaletteContext, TalentContext } from "../frame/contexts";
import { Disclaimer } from "../frame/Disclaimer";
import { Guides } from "../frame/Guides";
import { LAYOUTS } from "../frame/layout";
import { resolveSrc } from "../frame/resolveSrc";
import { StepTracker } from "../frame/StepTracker";
import { TalentSlot } from "../frame/TalentSlot";
import { useFontsReady } from "../frame/theme";
import { CLAMP, sceneDurations, totalFrames } from "../frame/timing";
import { SceneRenderer } from "./SceneRenderer";

const MUSIC_VOLUME = 0.08;
const MUSIC_FADE_FRAMES = 20;

export const EpisodeVideo: React.FC<EpisodeProps & { readonly hideCaptions?: boolean }> = ({
  layoutName,
  showGuides,
  checkMode,
  episode,
  talent,
  sceneStarts,
  hideCaptions,
}) => {
  const { fps } = useVideoConfig();
  const fontsReady = useFontsReady();
  const palette = useMemo(() => (talent ? applyBrand(talent.colors) : null), [talent]);
  if (!episode || !talent || !sceneStarts) {
    throw new Error("Episode props were not loaded; calculateMetadata must run first.");
  }
  const total = totalFrames(episode.durationSeconds);
  const d = sceneDurations(sceneStarts, total);
  const s = episode.scenes;

  return (
    <LayoutContext.Provider value={LAYOUTS[layoutName]}>
      <PaletteContext.Provider value={palette!}>
        <TalentContext.Provider value={talent}>
          <SfxContext.Provider value={{ enabled: !checkMode && episode.sfx }}>
          <AbsoluteFill>
            <Background total={total} sceneStarts={sceneStarts} />
            <SfxCues cues={floodCues(sceneStarts)} />
            {fontsReady ? (
              <>
                <Series>
                  <Series.Sequence name="1 · Hook" durationInFrames={d[0]} premountFor={fps}>
                    <SceneRenderer name="hook" scene={s.hook} duration={d[0]} fadeOutAtEnd />
                  </Series.Sequence>
                  <Series.Sequence name="2 · Step 1" durationInFrames={d[1]} premountFor={fps}>
                    <SceneRenderer name="step1" scene={s.step1} duration={d[1]} fadeOutAtEnd />
                  </Series.Sequence>
                  <Series.Sequence name="3 · Step 2" durationInFrames={d[2]} premountFor={fps}>
                    <SceneRenderer name="step2" scene={s.step2} duration={d[2]} fadeOutAtEnd />
                  </Series.Sequence>
                  <Series.Sequence name="4 · Step 3" durationInFrames={d[3]} premountFor={fps}>
                    <SceneRenderer name="step3" scene={s.step3} duration={d[3]} fadeOutAtEnd />
                  </Series.Sequence>
                  <Series.Sequence name="5 · Close" durationInFrames={d[4]} premountFor={fps}>
                    {/* No fade: the last frames hold still so the loop is clean. */}
                    <SceneRenderer name="close" scene={s.close} duration={d[4]} fadeOutAtEnd={false} />
                  </Series.Sequence>
                </Series>
                <StepTracker labels={episode.frame.steps} sceneStarts={sceneStarts} total={total} />
                {hideCaptions ? null : (
                  <Captions
                    script={episode.script}
                    sceneStarts={sceneStarts}
                    total={total}
                    captionsSrc={episode.captionsSrc}
                  />
                )}
                <Disclaimer lines={talent.disclaimer} />
              </>
            ) : null}
            <TalentSlot
              pillName={talent.pillName}
              clipSrc={checkMode ? "" : episode.clip.src}
              trimStartFrames={episode.clip.trimStartFrames}
            />
            {episode.musicSrc && !checkMode ? (
              <Audio
                name="Music"
                src={resolveSrc(episode.musicSrc)}
                premountFor={fps}
                volume={(f) => interpolate(f, [total - MUSIC_FADE_FRAMES, total], [MUSIC_VOLUME, 0], CLAMP)}
              />
            ) : null}
            {showGuides ? <Guides /> : null}
          </AbsoluteFill>
          </SfxContext.Provider>
        </TalentContext.Provider>
      </PaletteContext.Provider>
    </LayoutContext.Provider>
  );
};
