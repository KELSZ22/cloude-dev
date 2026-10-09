import { openStaxPackAssets } from "@/shared/content/openstax/pack-assets";
import type { OpenStaxPackAsset } from "@/shared/content/openstax/types";

import {
  packBlobKey,
  readPackBlob,
  readPackMarker,
  writePackBlob,
  writePackMarker,
} from "./pack-indexeddb.web";
import type {
  PackInstallControls,
  PackInstallProgress,
} from "./pack-install-types";
import { packAssetList } from "./pack-manifest";

export type {
  PackInstallControls,
  PackInstallProgress,
} from "./pack-install-types";
export { packAssetList, packDownloadBytes } from "./pack-manifest";

export function pauseActivePackDownload() {}

export function resumeActivePackDownload() {}

export function cancelActivePackDownload() {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitWhilePaused(controls: PackInstallControls) {
  while (controls.isPaused() && !controls.signal.aborted) {
    await sleep(150);
  }
}

async function assetOnDevice(packId: string, asset: OpenStaxPackAsset) {
  const blob = (await readPackBlob(packBlobKey(packId, asset.path))) as
    Blob | undefined;
  if (!blob) return false;
  if (asset.bytes > 0 && blob.size !== asset.bytes) return false;
  return true;
}

export async function isPackOnDevice(packId: string) {
  if (typeof indexedDB === "undefined") return false;
  const marker = await readPackMarker(packId);
  if (!marker) return false;
  const assets = packAssetList(packId);
  for (const asset of assets) {
    if (!(await assetOnDevice(packId, asset))) return false;
  }
  return true;
}

export async function discoverInstalledPackIds() {
  if (typeof indexedDB === "undefined") return [];
  const installed: string[] = [];
  for (const packId of Object.keys(openStaxPackAssets.packs)) {
    if (await isPackOnDevice(packId)) installed.push(packId);
  }
  return installed;
}

async function downloadOneAsset(
  packId: string,
  asset: OpenStaxPackAsset,
  controls: PackInstallControls,
  onFileProgress: (written: number) => void,
) {
  if (await assetOnDevice(packId, asset)) {
    onFileProgress(asset.bytes);
    return;
  }

  await waitWhilePaused(controls);
  if (controls.signal.aborted) throw new Error("Download cancelled");

  const response = await fetch(asset.url, {
    signal: controls.signal,
    headers: { "User-Agent": "AralSearch/1.0" },
  });
  if (!response.ok) {
    throw new Error(
      `Could not download ${asset.path} (HTTP ${response.status}).`,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const blob = await response.blob();
    if (asset.bytes > 0 && blob.size !== asset.bytes) {
      throw new Error(`Download incomplete: ${asset.path}`);
    }
    await writePackBlob(packBlobKey(packId, asset.path), blob);
    onFileProgress(blob.size);
    return;
  }

  const chunks: BlobPart[] = [];
  let received = 0;
  while (true) {
    await waitWhilePaused(controls);
    if (controls.signal.aborted) throw new Error("Download cancelled");
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onFileProgress(received);
    }
  }

  const blob = new Blob(chunks);
  if (asset.bytes > 0 && blob.size !== asset.bytes) {
    throw new Error(`Download incomplete: ${asset.path}`);
  }
  await writePackBlob(packBlobKey(packId, asset.path), blob);
}

export async function installOpenStaxPack(
  packId: string,
  controls: PackInstallControls,
  onProgress: (progress: PackInstallProgress) => void,
) {
  if (typeof indexedDB === "undefined") {
    throw new Error("Pack downloads need a browser with IndexedDB support.");
  }

  const assets = packAssetList(packId);
  const totalBytes =
    assets.reduce((sum, asset) => sum + Math.max(asset.bytes, 0), 0) || 1;
  let downloadedBytes = 0;
  let lastTick = Date.now();
  let lastBytes = 0;
  let speedBps = 0;

  for (const asset of assets) {
    if (controls.signal.aborted) throw new Error("Download cancelled");
    await waitWhilePaused(controls);

    const baseBytes = downloadedBytes;
    await downloadOneAsset(packId, asset, controls, (written) => {
      const now = Date.now();
      const elapsed = (now - lastTick) / 1000;
      if (elapsed >= 0.4) {
        speedBps = Math.max(0, (baseBytes + written - lastBytes) / elapsed);
        lastTick = now;
        lastBytes = baseBytes + written;
      }
      onProgress({
        fraction: Math.min(1, (baseBytes + written) / totalBytes),
        downloadedBytes: baseBytes + written,
        totalBytes,
        currentPath: asset.path,
        speedBps,
      });
    });
    downloadedBytes += asset.bytes;
    onProgress({
      fraction: Math.min(1, downloadedBytes / totalBytes),
      downloadedBytes,
      totalBytes,
      currentPath: asset.path,
      speedBps,
    });
  }

  await writePackMarker(packId, {
    packId,
    installedAt: new Date().toISOString(),
    assetCount: assets.length,
    totalBytes,
  });
}
