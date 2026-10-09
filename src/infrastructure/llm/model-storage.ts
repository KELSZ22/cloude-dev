import type { ModelManifest } from './contracts';

export interface ModelDownloadProgress {
  stage: 'downloading' | 'verifying';
  fraction: number;
}

export interface ModelStorage {
  readInstalled(): Promise<ModelManifest | null>;
  /** Downloads the pinned model only when the user asks, then verifies and installs it. */
  downloadModel(signal: AbortSignal, onProgress: (progress: ModelDownloadProgress) => void): Promise<ModelManifest>;
  importFile(sourceUri: string, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<ModelManifest>;
  verifyInstalled(manifest: ModelManifest, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<void>;
  remove(): Promise<void>;
}

export function createModelStorage(): ModelStorage {
  const unsupported = async (): Promise<never> => { throw new Error('Model files require an Android or iOS development build.'); };
  return {
    readInstalled: async () => null, downloadModel: unsupported,
    importFile: unsupported, verifyInstalled: unsupported, remove: unsupported,
  };
}
