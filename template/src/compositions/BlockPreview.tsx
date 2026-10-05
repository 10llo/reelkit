import { AbsoluteFill, type CalculateMetadataFunction } from "remotion";
import type { Accented } from "../blocks/schema-parts";
import { fetchJson } from "../episode/fetchJson";
import type { Talent } from "../episode/talent";
import { validateBeat, validateBeatColors, validateTalent } from "../episode/validate";
import { Background } from "../frame/Background";
import { LayoutContext, PaletteContext, TalentContext } from "../frame/contexts";
import { LAYOUTS, type LayoutName } from "../frame/layout";
import { TalentSlot } from "../frame/TalentSlot";
import { useFontsReady } from "../frame/theme";
import { SceneRenderer } from "./SceneRenderer";

export type BlockPreviewProps = {
  layoutName: LayoutName;
  block: string;
  props: Record<string, unknown>;
  title: Accented | null;
  durationInFrames: number;
  talent: Talent | null;
};

export const calculateBlockPreviewMetadata: CalculateMetadataFunction<BlockPreviewProps> = async ({ props }) => {
  const talent = validateTalent(props.talent ?? (await fetchJson("talent.json")));
  const beat = validateBeat({ block: props.block, props: props.props }, "preview");
  validateBeatColors(beat, "preview", talent);
  const { width, height } = LAYOUTS[props.layoutName].canvas;
  return {
    durationInFrames: props.durationInFrames,
    width,
    height,
    props: { ...props, talent, props: beat.props },
  };
};

/** One block on the real frame, for developing and reviewing blocks. */
export const BlockPreview: React.FC<BlockPreviewProps> = ({ layoutName, block, props, title, durationInFrames, talent }) => {
  const ready = useFontsReady();
  if (!talent) {
    throw new Error("Talent was not loaded; calculateMetadata must run first.");
  }
  return (
    <LayoutContext.Provider value={LAYOUTS[layoutName]}>
      <PaletteContext.Provider value={talent.colors}>
        <TalentContext.Provider value={talent}>
          <AbsoluteFill>
            <Background total={durationInFrames} />
            {ready ? (
              <SceneRenderer
                name={`preview-${block}`}
                scene={{ title: title ?? undefined, beats: [{ block, props }], split: 0.5 }}
                duration={durationInFrames}
                fadeOutAtEnd={false}
              />
            ) : null}
            <TalentSlot pillName={talent.pillName} clipSrc="" trimStartFrames={0} />
          </AbsoluteFill>
        </TalentContext.Provider>
      </PaletteContext.Provider>
    </LayoutContext.Provider>
  );
};
