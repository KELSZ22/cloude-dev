import type { OpenStaxPackAssetsFile } from "./types";

import bundled from "./pack-assets.json";

export const openStaxPackAssets = bundled as OpenStaxPackAssetsFile;

export function openStaxPackDownloadManifest(packId: string) {
  return openStaxPackAssets.packs[packId];
}
