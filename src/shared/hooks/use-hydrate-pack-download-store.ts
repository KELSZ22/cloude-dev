import { useEffect } from "react";

import { usePackDownloadStore } from "@/shared/stores/pack-download-store";

export function useHydratePackDownloadStore() {
  useEffect(() => {
    const finish = () => {
      void usePackDownloadStore.getState().syncFromDisk();
    };
    const unsub = usePackDownloadStore.persist.onFinishHydration(finish);
    if (usePackDownloadStore.persist.hasHydrated()) finish();
    else void usePackDownloadStore.persist.rehydrate();
    return unsub;
  }, []);
}
