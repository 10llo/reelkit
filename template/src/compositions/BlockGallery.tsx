import { useMemo } from "react";
import { AbsoluteFill, Series, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { SfxContext } from "../brand/SfxCues";
import { INK, SCENE_BG, applyBrand } from "../brand/tokens";
import type { Accented } from "../blocks/schema-parts";
import { fetchJson } from "../episode/fetchJson";
import type { Talent } from "../episode/talent";
import { validateBeat, validateBeatColors, validateTalent } from "../episode/validate";
import { Background } from "../frame/Background";
import { LayoutContext, PaletteContext, TalentContext } from "../frame/contexts";
import { LAYOUTS, type LayoutName } from "../frame/layout";
import { TalentSlot } from "../frame/TalentSlot";
import { bodyStyle, useFontsReady } from "../frame/theme";
import samples from "../gallery/samples.json";
import { SceneRenderer } from "./SceneRenderer";

type Sample = { block: string; title: Accented | null; durationInFrames: number; props: Record<string, unknown> };
const SAMPLES = samples as Sample[];
const TOTAL = SAMPLES.reduce((sum, s) => sum + s.durationInFrames, 0);

export type GalleryProps = { layoutName: LayoutName; talent: Talent | null };

export const calculateGalleryMetadata: CalculateMetadataFunction<GalleryProps> = async ({ props }) => {
  const talent = validateTalent(props.talent ?? (await fetchJson("talent.json")));
  SAMPLES.forEach((sample, i) => {
    const beat = validateBeat({ block: sample.block, props: sample.props }, `gallery[${i}]`);
    validateBeatColors(beat, `gallery[${i}]`, talent);
  });
  const { width, height } = LAYOUTS[props.layoutName].canvas;
  return { durationInFrames: TOTAL, width, height, props: { ...props, talent } };
};

/** Every block's maximum-content sample, back to back. Studio only (one template, generated on purpose). */
export const BlockGallery: React.FC<GalleryProps> = ({ layoutName, talent }) => {
  const { fps } = useVideoConfig();
  const ready = useFontsReady();
  const beats = useMemo(
    () => SAMPLES.map((s, i) => validateBeat({ block: s.block, props: s.props }, `gallery[${i}]`)),
    [],
  );
  const palette = useMemo(() => (talent ? applyBrand(talent.colors) : null), [talent]);
  if (!talent) {
    throw new Error("Talent was not loaded; calculateMetadata must run first.");
  }
  return (
    <LayoutContext.Provider value={LAYOUTS[layoutName]}>
      <PaletteContext.Provider value={palette!}>
        <TalentContext.Provider value={talent}>
          <SfxContext.Provider value={{ enabled: true }}>
          <AbsoluteFill>
            <Background total={TOTAL} />
            {ready ? (
              <Series>
                {SAMPLES.map((sample, i) => (
                  <Series.Sequence key={i} name={sample.block} durationInFrames={sample.durationInFrames} premountFor={fps}>
                    {sample.block === "Close" ? <AbsoluteFill style={{ backgroundColor: SCENE_BG[4] }} /> : null}
                    <SceneRenderer
                      name={`gallery-${sample.block}`}
                      scene={{ title: sample.title ?? undefined, beats: [beats[i]], split: 0.5 }}
                      duration={sample.durationInFrames}
                      fadeOutAtEnd={false}
                    />
                    <div style={{ position: "absolute", left: 60, top: 40, ...bodyStyle(32), color: INK, opacity: 0.6 }}>
                      {i + 1}/{SAMPLES.length} · {sample.block}
                    </div>
                  </Series.Sequence>
                ))}
              </Series>
            ) : null}
            <TalentSlot pillName={talent.pillName} clipSrc="" trimStartFrames={0} />
          </AbsoluteFill>
          </SfxContext.Provider>
        </TalentContext.Provider>
      </PaletteContext.Provider>
    </LayoutContext.Provider>
  );
};
