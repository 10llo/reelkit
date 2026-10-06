/** WhatsApp rejects (or re-compresses) videos above 16 MB. */
export const WHATSAPP_LIMIT_BYTES = 16_000_000;
const TARGET_BYTES = 15_500_000;
const HEADROOM = 0.97;
const AUDIO_KBPS = 96;
const MAX_VIDEO_KBPS = 6000;
const MIN_FULL_SIZE_KBPS = 2500;

export const whatsappSettings = (
  durationSeconds: number,
): { videoBitrate: `${number}k`; audioBitrate: `${number}k`; scale: number } => {
  const totalKbps = ((TARGET_BYTES * 8) / 1000 / durationSeconds) * HEADROOM;
  const video = Math.min(MAX_VIDEO_KBPS, Math.floor(totalKbps - AUDIO_KBPS));
  return {
    videoBitrate: `${video}k`,
    audioBitrate: `${AUDIO_KBPS}k`,
    scale: video < MIN_FULL_SIZE_KBPS ? 2 / 3 : 1,
  };
};
