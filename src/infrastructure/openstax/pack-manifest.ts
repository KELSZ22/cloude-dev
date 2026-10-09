import { openStaxPackAssets } from "@/shared/content/openstax/pack-assets";
import type { OpenStaxPackAsset } from "@/shared/content/openstax/types";

export function packAssetList(packId: string): readonly OpenStaxPackAsset[] {
  const manifest = openStaxPackAssets.packs[packId];
  if (!manifest) throw new Error("This pack is not available for download.");
  return manifest.assets;
}

export function packDownloadBytes(packId: string) {
  const manifest = openStaxPackAssets.packs[packId];
  return manifest?.totalBytes ?? 0;
}
