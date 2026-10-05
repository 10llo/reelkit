import { staticFile } from "remotion";

export const missingFileMessage = (file: string, status: number) =>
  `Could not load ${file} (HTTP ${status}). Start Studio or render with --public-dir pointing at an episode folder, e.g. --public-dir examples/smoke.`;

/** Loads a JSON file from the public dir, which is the episode folder. */
export const fetchJson = async (file: string): Promise<unknown> => {
  const res = await fetch(staticFile(file));
  if (!res.ok) {
    throw new Error(missingFileMessage(file, res.status));
  }
  return res.json();
};
