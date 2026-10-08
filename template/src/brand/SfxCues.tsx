import { Audio } from "@remotion/media";
import { createContext, useContext } from "react";
import { Sequence, useVideoConfig } from "remotion";
import { SFX_FILES } from "./sfx-files";
import { SFX_DURATION, activeCues, sfxVolume, type Cue } from "./sfx";

/** Off by default; EpisodeVideo turns it on unless checkMode or `episode.sfx === false`. */
export const SfxContext = createContext<{ readonly enabled: boolean }>({ enabled: false });

/** Plays each cue at its frame of the enclosing Sequence. */
export const SfxCues: React.FC<{ readonly cues: readonly Cue[] }> = ({ cues }) => {
  const { enabled } = useContext(SfxContext);
  const { fps } = useVideoConfig();
  return (
    <>
      {activeCues(cues, enabled).map((cue, i) => (
        <Sequence
          key={`${i}-${cue.name}-${cue.at}`}
          name={`sfx · ${cue.name}`}
          from={Math.round(cue.at)}
          durationInFrames={Math.ceil(SFX_DURATION[cue.name] * fps) + 1}
          layout="none"
        >
          <Audio src={SFX_FILES[cue.name]} volume={sfxVolume(cue.name)} />
        </Sequence>
      ))}
    </>
  );
};
