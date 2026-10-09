import type {
  PackInstallControls,
  PackInstallProgress,
} from "./pack-install-types";
import { packAssetList, packDownloadBytes } from "./pack-manifest";

export type {
  PackInstallControls,
  PackInstallProgress,
} from "./pack-install-types";
export { packAssetList, packDownloadBytes };

const unsupported = () => {
  throw new Error(
    "Pack downloads are not available on this platform. Use the app in a browser, or on iOS/Android.",
  );
};

export function pauseActivePackDownload() {}

export function resumeActivePackDownload() {}

export function cancelActivePackDownload() {}

export async function isPackOnDevice(_packId: string) {
  return false;
}

export async function discoverInstalledPackIds() {
  return [];
}

export async function installOpenStaxPack(
  _packId: string,
  _controls: PackInstallControls,
  _onProgress: (progress: PackInstallProgress) => void,
) {
  unsupported();
}
