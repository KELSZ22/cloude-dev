import type { ModelManifest } from './contracts';

export interface ModelStorage {
  readInstalled(): Promise<ModelManifest | null>;
  importFile(sourceUri: string, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<ModelManifest>;
  verifyInstalled(manifest: ModelManifest, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<void>;
  remove(): Promise<void>;
}

export function createModelStorage(): ModelStorage {
  const unsupported = async (): Promise<never> => { throw new Error('Model files require an Android or iOS development build.'); };
  return { readInstalled: async () => null, importFile: unsupported, verifyInstalled: unsupported, remove: unsupported };
}
