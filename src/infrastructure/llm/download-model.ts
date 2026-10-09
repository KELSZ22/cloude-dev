import type { ModelManifest } from './contracts';
import type { ModelDownloadProgress } from './model-storage';

/** The native task writes directly to app-owned staging storage. */
export interface ModelDownloadTask {
  downloadAsync(): Promise<unknown>;
  cancel(): void;
  release(): void;
}

interface PausableDownloadTask extends ModelDownloadTask {
  readonly state: string;
  pause(): void;
}

/**
 * SDK 57's Android cancel loop can leave its native promise pending. Pausing stops the same
 * writer through a path that settles the download promise. The workflow then rejects the aborted
 * request and deletes staging; no paused download is retained or offered for resume.
 */
export function adaptModelDownloadTask(
  task: PausableDownloadTask, pauseOnCancel: boolean,
): ModelDownloadTask & { onProgress(): void } {
  let cancelling = false;
  let running = false;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const clearRetry = () => {
    if (retry !== null) clearTimeout(retry);
    retry = null;
  };
  const requestPause = () => {
    if (!cancelling || !running || task.state !== 'active') return;
    try { task.pause(); }
    catch { /* Native startup/teardown may race this call; retry while the writer is active. */ }
    // Native start is queued and can reset an early pause or not yet own its HTTP call. Keep the
    // cancellation latched until a later pause reaches that call and the writer actually settles.
    if (retry === null) retry = setTimeout(() => { retry = null; requestPause(); }, 100);
  };
  return {
    async downloadAsync() {
      if (cancelling) throw new Error('Model download cancelled.');
      running = true;
      try { return await task.downloadAsync(); }
      finally { running = false; clearRetry(); }
    },
    cancel() {
      if (pauseOnCancel) {
        cancelling = true;
        requestPause();
      } else task.cancel();
    },
    onProgress: requestPause,
    release() { running = false; clearRetry(); task.release(); },
  };
}

/** Serializable pause state; shaped like Expo's `DownloadPauseState` so it can be passed straight through. */
export interface SavedTransfer {
  url: string;
  fileUri: string;
  isDirectory: boolean;
  headers?: Record<string, string>;
  resumeData?: string;
}

/** One continuous native transfer. A resumed model download is a chain of these. */
export interface TransferSegment {
  readonly state: string;
  /** Resolves with the file when finished, or null when the segment was paused. */
  run(): Promise<unknown>;
  pause(): void;
  cancel(): void;
  release(): void;
  savable(): SavedTransfer;
}

export interface ResumableTransferPorts {
  /** Creates the next segment; `saved` is null for a fresh transfer. */
  start(saved: SavedTransfer | null): TransferSegment;
  save(state: SavedTransfer): void;
  clear(): void;
  isActive(): boolean;
  /** Reports whether the app is in the foreground. Returns an unsubscribe function. */
  onVisibility(listener: (active: boolean) => void): () => void;
  /** Android stops a transfer when it leaves the foreground, so a process kill can never lose resume data. */
  pauseInBackground: boolean;
}

/**
 * Runs the model transfer as pause/resume segments. Leaving the foreground pauses and persists the
 * resume state (when the platform needs it); coming back continues from the same byte. Cancelling
 * stops the current segment and rejects, leaving cleanup to the caller.
 */
export function createResumableTask(
  ports: ResumableTransferPorts, initial: SavedTransfer | null,
): ModelDownloadTask {
  let cancelled = false;
  let current: TransferSegment | null = null;
  let wake: (() => void) | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const clearRetry = () => {
    if (retry !== null) clearTimeout(retry);
    retry = null;
  };
  const requestPause = () => {
    retry = null;
    if (!ports.pauseInBackground || ports.isActive() || cancelled) return;
    if (!current || current.state !== 'active') return;
    try { current.pause(); }
    catch { /* Native startup can race this call; retry while the writer is still active. */ }
    retry = setTimeout(requestPause, 150);
  };
  const waitForeground = () => new Promise<void>((resolve) => {
    if (cancelled || ports.isActive()) return resolve();
    wake = () => { wake = null; resolve(); };
  });
  const guard = () => { if (cancelled) throw new Error('Model download cancelled.'); };

  return {
    async downloadAsync() {
      let saved = initial;
      const unsubscribe = ports.onVisibility((active) => {
        if (active) wake?.();
        else if (retry === null) requestPause();
      });
      try {
        for (;;) {
          guard();
          if (ports.pauseInBackground) await waitForeground();
          guard();
          const segment = ports.start(saved);
          current = segment;
          let result: unknown;
          try { result = await segment.run(); }
          finally { clearRetry(); }
          if (result) { ports.clear(); return result; }
          guard();
          saved = segment.savable();
          ports.save(saved);
          segment.release();
          current = null;
          await waitForeground();
        }
      } finally {
        unsubscribe(); clearRetry();
      }
    },
    cancel() {
      cancelled = true;
      clearRetry();
      wake?.();
      current?.cancel();
    },
    release() {
      clearRetry();
      current?.release();
      current = null;
    },
  };
}

export interface ModelDownloadPorts {
  prepare(): void;
  createTask(signal: AbortSignal, onBytes: (bytesWritten: number) => void): ModelDownloadTask;
  size(): number;
  verify(signal: AbortSignal, onProgress: (fraction: number) => void): Promise<void>;
  /** Atomically promotes the verified file and records its manifest; rolls back on failure. */
  install(): ModelManifest;
  /** Deletes only fixed staging paths, never an existing installation or external file. */
  cleanup(): void;
}

function checkCancelled(signal: AbortSignal) {
  if (signal.aborted) throw new Error('Model download cancelled.');
}

/** Cancellation waits for the native writer to settle before any staging file is removed. */
export async function downloadAndInstallModel(
  ports: ModelDownloadPorts,
  request: {
    sizeBytes: number;
    signal: AbortSignal;
    onProgress: (progress: ModelDownloadProgress) => void;
  },
): Promise<ModelManifest> {
  const { signal, onProgress } = request;
  checkCancelled(signal);
  ports.prepare();
  let task: ModelDownloadTask | null = null;
  let lastPercent = -1;
  let highest = 0; // A resumed transfer can report from zero again; progress never moves backwards.
  const onAbort = () => task?.cancel();
  try {
    checkCancelled(signal);
    onProgress({ stage: 'downloading', fraction: 0 });
    task = ports.createTask(signal, (bytesWritten) => {
      if (signal.aborted || !Number.isFinite(bytesWritten)) return;
      // The pinned size is known even when a redirect/CDN omits Content-Length.
      highest = Math.max(highest, bytesWritten);
      const fraction = Math.max(0, Math.min(1, highest / request.sizeBytes));
      const percent = Math.floor(fraction * 100);
      if (percent !== lastPercent) {
        lastPercent = percent;
        onProgress({ stage: 'downloading', fraction });
      }
    });
    signal.addEventListener('abort', onAbort, { once: true });
    checkCancelled(signal);
    const downloaded = await task.downloadAsync();
    checkCancelled(signal);
    if (!downloaded) throw new Error('The model download did not finish. Try downloading again.');
    if (ports.size() !== request.sizeBytes) {
      throw new Error('The downloaded model is incomplete or has the wrong size. Try downloading again.');
    }
    onProgress({ stage: 'downloading', fraction: 1 });
    onProgress({ stage: 'verifying', fraction: 0 });
    await ports.verify(signal, (fraction) => {
      if (!signal.aborted) onProgress({ stage: 'verifying', fraction });
    });
    checkCancelled(signal);
    const manifest = ports.install();
    onProgress({ stage: 'verifying', fraction: 1 });
    return manifest;
  } catch (error) {
    // downloadAsync has settled before this branch; no native writer can recreate the partial file.
    ports.cleanup();
    throw error;
  } finally {
    signal.removeEventListener('abort', onAbort);
    task?.release();
  }
}
