/** WhatsApp rejects (or re-compresses) videos above 16 MB. */
export const WHATSAPP_LIMIT_BYTES = 16_000_000;
const TARGET_BYTES = 15_500_000;
const HEADROOM = 0.97;
const AUDIO_KBPS = 96;
const MAX_VIDEO_KBPS = 6000;
const CRF = 18;

/**
 * Full-size (1080×1920) CRF 18 encode with a video bitrate cap sized so the
 * whole file stays under the WhatsApp limit.
 */
export const whatsappSettings = (
  durationSeconds: number,
): { crf: number; encodingMaxRate: `${number}k`; encodingBufferSize: `${number}k`; audioBitrate: `${number}k` } => {
  const totalKbps = ((TARGET_BYTES * 8) / 1000 / durationSeconds) * HEADROOM;
  const cap = Math.min(MAX_VIDEO_KBPS, Math.floor(totalKbps - AUDIO_KBPS));
  return {
    crf: CRF,
    encodingMaxRate: `${cap}k`,
    encodingBufferSize: `${cap * 2}k`,
    audioBitrate: `${AUDIO_KBPS}k`,
  };
};
