import { registerMediabunnyServer } from "@mediabunny/server";
import { ALL_FORMATS, Conversion, FilePathSource, Input, NullTarget, Output, WavOutputFormat } from "mediabunny";

/** Whisper's input rate (WHISPER_WEBGPU_SAMPLE_RATE). */
export const SAMPLE_RATE = 16_000;

let decodersRegistered = false;

/** Node has no WebCodecs; @mediabunny/server supplies the decoders (AAC, Opus, H.264, …). */
export const openMedia = (file: string): Input => {
  if (!decodersRegistered) {
    registerMediabunnyServer();
    decodersRegistered = true;
  }
  return new Input({ formats: ALL_FORMATS, source: new FilePathSource(file) });
};

export const decodeMono16k = async (file: string): Promise<Float32Array> => {
  const input = openMedia(file);
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) {
      throw new Error(`${file} has no audio track`);
    }
    const chunks: { start: number; data: Float32Array }[] = [];
    const conversion = await Conversion.init({
      input,
      output: new Output({ format: new WavOutputFormat(), target: new NullTarget() }),
      video: { discard: true },
      audio: (t) =>
        t.id !== track.id
          ? { discard: true }
          : {
              codec: "pcm-f32",
              forceTranscode: true,
              numberOfChannels: 1,
              sampleFormat: "f32",
              sampleRate: SAMPLE_RATE,
              process: (sample) => {
                const data = new Float32Array(sample.allocationSize({ format: "f32", planeIndex: 0 }) / 4);
                sample.copyTo(data, { format: "f32", planeIndex: 0 });
                chunks.push({ start: Math.round(sample.timestamp * SAMPLE_RATE), data });
                return sample;
              },
            },
    });
    await conversion.execute();
    const length = chunks.reduce((max, c) => Math.max(max, c.start + c.data.length), 0);
    const wave = new Float32Array(Math.max(0, length));
    for (const { start, data } of chunks) {
      // Encoder priming can give the first chunk a slightly negative timestamp.
      wave.set(start < 0 ? data.subarray(-start) : data, Math.max(0, start));
    }
    return wave;
  } finally {
    input.dispose();
  }
};
