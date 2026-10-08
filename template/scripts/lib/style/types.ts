export type Network = "tiktok" | "instagram";
export type AccountRef = { network: Network; handle: string };
export type AccountStatus = "ok" | "failed" | "needs-login";

export type Median = {
  durationSec: number | null;
  cutsPerMinute: number | null;
  wordsPerMinute: number | null;
  firstWordSec: number | null;
  gapDb: number | null;
  brightness: number | null;
  saturation: number | null;
};

export type AccountEntry = {
  id: string;
  network: Network;
  handle: string;
  own: boolean;
  status: AccountStatus;
  reason: string | null;
  profileUrl: string;
  videos: string[];
  median: Median | null;
};

export type AccountsFile = { createdAt: string; accounts: AccountEntry[] };

export type PaletteColor = { hex: string; share: number };

export type VideoMetrics = {
  id: string;
  durationSec: number;
  width: number;
  height: number;
  fps: number | null;
  truncated: boolean;
  cuts: number[];
  cutsPerMinute: number;
  avgShotSec: number;
  firstCutSec: number | null;
  speech: {
    wordsPerMinute: number | null;
    firstWordSec: number | null;
    hookText: string | null;
    coverage: number | null;
    unavailable: string | null;
  };
  audio: { speechDb: number | null; gapDb: number | null; peakDb: number | null };
  palette: PaletteColor[];
  brightness: number;
  saturation: number;
  post: {
    url: string | null;
    caption: string | null;
    hashtags: string[];
    views: number | null;
    likes: number | null;
    comments: number | null;
    uploadDate: string | null;
  };
};
