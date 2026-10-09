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
  const onAbort = () => task?.cancel();
  try {
    checkCancelled(signal);
    onProgress({ stage: 'downloading', fraction: 0 });
    task = ports.createTask(signal, (bytesWritten) => {
      if (signal.aborted || !Number.isFinite(bytesWritten)) return;
      // The pinned size is known even when a redirect/CDN omits Content-Length.
      const fraction = Math.max(0, Math.min(1, bytesWritten / request.sizeBytes));
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
