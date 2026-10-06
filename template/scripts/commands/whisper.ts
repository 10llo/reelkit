import { flagString, type Args } from "../lib/args";
import { DEFAULT_MODEL, downloadModel, isModel, MODEL_SIZES_MB, MODELS, whisperStatus } from "../lib/transcribe";

const USAGE = "Usage: reelkit whisper check|download [--model=large-v3-turbo]";

export const run = async (args: Args): Promise<number> => {
  const [action] = args.positional;
  const model = flagString(args, "model", DEFAULT_MODEL);
  if (!isModel(model)) {
    console.error(`Unknown model "${model}". Use one of: ${MODELS.join(", ")}`);
    return 2;
  }
  if (action === "check") {
    const status = await whisperStatus(model);
    console.log(status.webgpu ? `✗ WebGPU: ${status.webgpu}` : "✓ WebGPU available");
    console.log(
      status.cached
        ? `✓ Model ${model} is downloaded (${status.cacheDir})`
        : `• Model ${model} is not downloaded yet (${MODEL_SIZES_MB[model]} MB). Run: npm run reelkit -- whisper download --model=${model}`,
    );
    return status.webgpu ? 1 : 0;
  }
  if (action === "download") {
    console.log(`Downloading ${model} (${MODEL_SIZES_MB[model]} MB)…`);
    let shown = -1;
    const result = await downloadModel(model, (fraction) => {
      const pct = Math.floor(fraction * 10) * 10;
      if (pct !== shown) {
        shown = pct;
        process.stdout.write(`\r  ${pct} %`);
      }
    });
    process.stdout.write("\n");
    console.log(result.alreadyDownloaded ? `✓ ${model} was already downloaded` : `✓ ${model} downloaded`);
    return 0;
  }
  console.error(USAGE);
  return 2;
};
