import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import type { CalculateMetadataFunction } from "remotion";
import { LAYOUTS, type LayoutName } from "../frame/layout";
import { resolveSrc } from "../frame/resolveSrc";
import { FPS, resolveSceneStarts, totalFrames } from "../frame/timing";
import { fetchJson } from "./fetchJson";
import type { Episode } from "./schema";
import type { Talent } from "./talent";
import { validateColors, validateEpisode, validateTalent } from "./validate";

export type EpisodeProps = {
  layoutName: LayoutName;
  showGuides: boolean;
  /** Renders without the talent clip and music (used by `npm run check` and covers). */
  checkMode: boolean;
  episode: Episode | null;
  talent: Talent | null;
  sceneStarts: number[] | null;
};

const warnIfClipOverruns = async (episode: Episode, total: number) => {
  try {
    const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(resolveSrc(episode.clip.src)) });
    const used = (await input.computeDuration()) - episode.clip.trimStartFrames / FPS;
    const max = total / FPS;
    if (used > max) {
      console.warn(
        `[reelkit] The talent clip runs ${(used - max).toFixed(2)} s past the ${max} s video. ` +
          `The video stays at ${total} frames; trim or re-record the clip.`,
      );
    }
  } catch (err) {
    console.warn(`[reelkit] Could not read the duration of ${episode.clip.src}`, err);
  }
};

const loadEpisode = async (props: EpisodeProps) => {
  const episode = validateEpisode(props.episode ?? (await fetchJson("episode.json")));
  const talent = validateTalent(props.talent ?? (await fetchJson("talent.json")));
  validateColors(episode, talent);
  const total = totalFrames(episode.durationSeconds);
  const { starts, warning } = resolveSceneStarts(episode.sceneStarts, total);
  if (warning) {
    console.warn(`[reelkit] ${warning}`);
  }
  if (episode.clip.src && !props.checkMode) {
    await warnIfClipOverruns(episode, total);
  }
  const { width, height } = LAYOUTS[props.layoutName].canvas;
  return { total, width, height, props: { ...props, episode, talent, sceneStarts: starts } };
};

export const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const { total, width, height, props: resolved } = await loadEpisode(props);
  return { durationInFrames: total, fps: FPS, width, height, props: resolved };
};

export const calculateCoverMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const { width, height, props: resolved } = await loadEpisode(props);
  return { width, height, props: resolved };
};
