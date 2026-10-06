import { openMedia, SAMPLE_RATE } from "./audio";

export type ClipInfo = {
  durationSeconds: number;
  width: number;
  height: number;
  rotation: number;
  fps: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
};

export const probeMedia = async (file: string): Promise<ClipInfo> => {
  const input = openMedia(file);
  try {
    const video = await input.getPrimaryVideoTrack();
    const audio = await input.getPrimaryAudioTrack();
    if (!video && !audio) {
      throw new Error(`${file} has no audio or video track`);
    }
    const stats = video ? await video.computePacketStats(100) : null;
    return {
      durationSeconds: await input.computeDuration(),
      width: video?.displayWidth ?? 0,
      height: video?.displayHeight ?? 0,
      rotation: video?.rotation ?? 0,
      fps: stats ? Math.round(stats.averagePacketRate * 100) / 100 : null,
      hasVideo: video !== null,
      hasAudio: audio !== null,
      videoCodec: video?.codec ?? null,
      audioCodec: audio?.codec ?? null,
    };
  } finally {
    input.dispose();
  }
};

const WINDOW_SECONDS = 0.02;
const FLOOR = 0.003;
const RELATIVE = 0.1;

/** First and last 20 ms window louder than 10 % of the loudest one (and above a noise floor). */
export const speechBounds = (
  wave: Float32Array,
  sampleRate = SAMPLE_RATE,
): { startSeconds: number; endSeconds: number } | null => {
  const size = Math.round(sampleRate * WINDOW_SECONDS);
  const rms: number[] = [];
  for (let i = 0; i + size <= wave.length; i += size) {
    let sum = 0;
    for (let j = i; j < i + size; j++) {
      sum += wave[j] * wave[j];
    }
    rms.push(Math.sqrt(sum / size));
  }
  const peak = rms.reduce((max, v) => Math.max(max, v), 0);
  const threshold = Math.max(FLOOR, peak * RELATIVE);
  const first = rms.findIndex((v) => v >= threshold);
  if (peak < FLOOR || first < 0) {
    return null;
  }
  let last = rms.length - 1;
  while (rms[last] < threshold) {
    last--;
  }
  return { startSeconds: (first * size) / sampleRate, endSeconds: ((last + 1) * size) / sampleRate };
};
