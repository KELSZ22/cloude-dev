import { Directory, DownloadTask, File, Paths } from "expo-file-system";

import { openStaxPackAssets } from "@/shared/content/openstax/pack-assets";
import type { OpenStaxPackAsset } from "@/shared/content/openstax/types";

import type {
  PackInstallControls,
  PackInstallProgress,
} from "./pack-install-types";
import { packAssetList } from "./pack-manifest";

let openStaxRootDir: Directory | null = null;

function packRoot(packId: string) {
  if (!openStaxRootDir)
    openStaxRootDir = new Directory(Paths.document, "openstax");
  return new Directory(openStaxRootDir, packId);
}

function assetFile(packId: string, relativePath: string) {
  const parts = relativePath.split("/").filter(Boolean);
  return new File(packRoot(packId), ...parts);
}

function packInstallMarker(packId: string) {
  return new File(packRoot(packId), ".installed.json");
}

export type {
  PackInstallControls,
  PackInstallProgress,
} from "./pack-install-types";
export { packAssetList, packDownloadBytes } from "./pack-manifest";

let activeTask: DownloadTask | null = null;

export function pauseActivePackDownload() {
  activeTask?.pause();
}

export function resumeActivePackDownload() {
  void activeTask?.resumeAsync();
}

export function cancelActivePackDownload() {
  activeTask?.cancel();
  activeTask = null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitWhilePaused(controls: PackInstallControls) {
  while (controls.isPaused() && !controls.signal.aborted) {
    await sleep(150);
  }
}

function assetIsComplete(
  file: ReturnType<typeof assetFile>,
  expectedBytes: number,
) {
  if (!file.exists) return false;
  if (expectedBytes > 0 && file.size !== expectedBytes) return false;
  return true;
}

export async function isPackOnDevice(packId: string) {
  const marker = packInstallMarker(packId);
  if (!marker.exists) return false;
  const assets = packAssetList(packId);
  return assets.every((asset) =>
    assetIsComplete(assetFile(packId, asset.path), asset.bytes),
  );
}

export async function discoverInstalledPackIds() {
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
  const destination = assetFile(packId, asset.path);
  destination.parentDirectory.create({ intermediates: true, idempotent: true });

  if (assetIsComplete(destination, asset.bytes)) {
    onFileProgress(asset.bytes);
    return;
  }
  if (destination.exists) destination.delete();

  const reserve = asset.bytes + 32 * 1024 * 1024;
  if (Paths.availableDiskSpace < reserve) {
    throw new Error(
      "Not enough free storage for this download. Free space and try again.",
    );
  }

  const task = new DownloadTask(asset.url, destination, {
    headers: { "User-Agent": "AralSearch/1.0" },
    onProgress: ({ bytesWritten }) => onFileProgress(bytesWritten),
    signal: controls.signal,
  });
  activeTask = task;

  let file = await task.downloadAsync();
  while (file === null && !controls.signal.aborted) {
    await waitWhilePaused(controls);
    if (controls.isPaused()) continue;
    file = await task.resumeAsync();
  }

  activeTask = null;
  if (controls.signal.aborted) {
    throw new Error("Download cancelled");
  }
  if (!file || !assetIsComplete(destination, asset.bytes)) {
    throw new Error(`Download incomplete: ${asset.path}`);
  }
}

export async function installOpenStaxPack(
  packId: string,
  controls: PackInstallControls,
  onProgress: (progress: PackInstallProgress) => void,
) {
  const assets = packAssetList(packId);
  const totalBytes =
    assets.reduce((sum, asset) => sum + Math.max(asset.bytes, 0), 0) || 1;
  let downloadedBytes = 0;
  let lastTick = Date.now();
  let lastBytes = 0;
  let speedBps = 0;

  packRoot(packId).create({ intermediates: true, idempotent: true });

  for (const asset of assets) {
    if (controls.signal.aborted) {
      throw new Error("Download cancelled");
    }
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

  const marker = packInstallMarker(packId);
  marker.create({ overwrite: true });
  marker.write(
    JSON.stringify({
      packId,
      installedAt: new Date().toISOString(),
      assetCount: assets.length,
      totalBytes,
    }),
  );
}
