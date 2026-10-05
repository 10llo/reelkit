import { Composition, Folder, Still } from "remotion";
import { BlockPreview, calculateBlockPreviewMetadata } from "./compositions/BlockPreview";
import { CoverFrame } from "./compositions/Cover";
import { EpisodeVideo } from "./compositions/EpisodeVideo";
import { calculateCoverMetadata, calculateEpisodeMetadata } from "./episode/load";

// Every composition loads episode.json + talent.json from the public dir
// (start Studio / render with --public-dir pointing at an episode folder).
export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="reelkit">
      <Composition
        id="Episode"
        component={EpisodeVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ layoutName: "9x16", showGuides: false, checkMode: false, episode: null, talent: null, sceneStarts: null }}
        calculateMetadata={calculateEpisodeMetadata}
      />
      <Composition
        id="Episode45"
        component={EpisodeVideo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{ layoutName: "4x5", showGuides: false, checkMode: false, episode: null, talent: null, sceneStarts: null }}
        calculateMetadata={calculateEpisodeMetadata}
      />
      <Still
        id="Cover"
        component={CoverFrame}
        width={1080}
        height={1920}
        defaultProps={{ layoutName: "9x16", showGuides: false, checkMode: true, episode: null, talent: null, sceneStarts: null }}
        calculateMetadata={calculateCoverMetadata}
      />
      <Still
        id="Cover45"
        component={CoverFrame}
        width={1080}
        height={1350}
        defaultProps={{ layoutName: "4x5", showGuides: false, checkMode: true, episode: null, talent: null, sceneStarts: null }}
        calculateMetadata={calculateCoverMetadata}
      />
      <Composition
        id="BlockPreview"
        component={BlockPreview}
        durationInFrames={105}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          layoutName: "9x16",
          block: "BigStat",
          props: { value: 42, label: "Vista previa de bloque" },
          title: null,
          durationInFrames: 105,
          talent: null,
        }}
        calculateMetadata={calculateBlockPreviewMetadata}
      />
    </Folder>
  );
};
