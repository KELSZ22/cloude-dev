import type { ReadingStorage } from "./reading-repository";

const unsupported = async (): Promise<never> => {
  throw new Error("Offline reading storage requires Android, iOS, or a browser.");
};

// Metro resolves the .native and .web implementations at build time.
export const readingStorage: ReadingStorage = {
  keys: unsupported, read: unsupported, write: unsupported, writeAssets: unsupported,
  readAsset: unsupported, assetSize: unsupported, remove: unsupported,
};
