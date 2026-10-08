import { Sequence } from "remotion";
import type { EpisodeProps } from "../episode/load";
import { EpisodeVideo } from "./EpisodeVideo";

/**
 * The episode frozen at `coverFrame`, with the talent's video frame in the slot (a Still has no audio).
 * A Still has one frame, so shift the timeline instead of <Freeze>.
 */
export const CoverFrame: React.FC<EpisodeProps> = (props) => (
  <Sequence from={-(props.episode?.coverFrame ?? 0)} layout="none">
    <EpisodeVideo {...props} checkMode={false} hideCaptions />
  </Sequence>
);
