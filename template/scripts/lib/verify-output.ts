import fs from "node:fs";
import { probeMedia, type ClipInfo } from "./probe";

export type VideoExpectation = { durationSeconds: number; width: number; height: number; maxBytes?: number };
export type Size = { width: number; height: number };

const DURATION_TOLERANCE_S = 0.1;
const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);

export const checkVideo = (info: ClipInfo, bytes: number, want: VideoExpectation): string[] => {
  const problems: string[] = [];
  if (Math.abs(info.durationSeconds - want.durationSeconds) > DURATION_TOLERANCE_S) {
    problems.push(`duration ${info.durationSeconds.toFixed(2)} s, expected ${want.durationSeconds} s`);
  }
  if (info.width !== want.width || info.height !== want.height) {
    problems.push(`size ${info.width}×${info.height}, expected ${want.width}×${want.height}`);
  }
  if (info.videoCodec !== "avc") {
    problems.push(`video codec ${info.videoCodec ?? "none"}, expected H.264 (avc)`);
  }
  if (!info.hasAudio) {
    problems.push("no audio track");
  }
  if (want.maxBytes !== undefined && bytes > want.maxBytes) {
    problems.push(`${mb(bytes)} MB is over the ${mb(want.maxBytes)} MB limit`);
  }
  return problems;
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Width and height from the PNG header (IHDR). */
export const pngSize = (file: string): Size => {
  const head = Buffer.alloc(24);
  const fd = fs.openSync(file, "r");
  try {
    fs.readSync(fd, head, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (!head.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${file} is not a PNG`);
  }
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
};

export const checkImage = (size: Size, want: Size): string[] =>
  size.width === want.width && size.height === want.height
    ? []
    : [`size ${size.width}×${size.height}, expected ${want.width}×${want.height}`];

export const verifyVideoFile = async (file: string, want: VideoExpectation) =>
  checkVideo(await probeMedia(file), fs.statSync(file).size, want);

export const verifyPngFile = (file: string, want: Size) => checkImage(pngSize(file), want);
