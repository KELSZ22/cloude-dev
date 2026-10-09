export type PackInstallProgress = {
  fraction: number;
  downloadedBytes: number;
  totalBytes: number;
  currentPath: string;
  speedBps: number;
};

export type PackInstallControls = {
  isPaused: () => boolean;
  waitUntilResumed: () => Promise<void>;
  signal: AbortSignal;
};
