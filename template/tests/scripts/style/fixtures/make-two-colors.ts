import fs from "node:fs";
import { registerMediabunnyServer } from "@mediabunny/server";
import { AudioSample, AudioSampleSource, BufferTarget, Mp4OutputFormat, Output, VideoSample, VideoSampleSource } from "mediabunny";

// 2 s, 30 fps, 320x568: 1 s red then 1 s blue, 440 Hz tone at 0.3 amplitude, no speech.
const W = 320;
const H = 568;
const FPS = 30;
const SECONDS = 2;
const RATE = 48_000;

void (async () => {
  registerMediabunnyServer();
  const out = process.argv[2];
  if (!out) throw new Error("usage: make-two-colors.ts <out.mp4>");
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const video = new VideoSampleSource({ codec: "avc", bitrate: 200_000 });
  const audio = new AudioSampleSource({ codec: "aac", bitrate: 32_000 });
  output.addVideoTrack(video, { frameRate: FPS });
  output.addAudioTrack(audio);
  await output.start();

  for (let i = 0; i < FPS * SECONDS; i++) {
    const data = new Uint8Array(W * H * 4);
    const red = i < FPS;
    for (let p = 0; p < W * H; p++) data.set(red ? [255, 0, 0, 255] : [0, 0, 255, 255], p * 4);
    const sample = new VideoSample(data, { format: "RGBA", codedWidth: W, codedHeight: H, timestamp: i / FPS, duration: 1 / FPS });
    await video.add(sample);
    sample.close();
  }

  const chunk = 1024;
  for (let start = 0; start < RATE * SECONDS; start += chunk) {
    const data = new Float32Array(chunk);
    for (let n = 0; n < chunk; n++) data[n] = 0.3 * Math.sin((2 * Math.PI * 440 * (start + n)) / RATE);
    const sample = new AudioSample({ data, format: "f32", numberOfChannels: 1, sampleRate: RATE, timestamp: start / RATE });
    await audio.add(sample);
    sample.close();
  }

  await output.finalize();
  fs.writeFileSync(out, Buffer.from((output.target as BufferTarget).buffer as ArrayBuffer));
})();
