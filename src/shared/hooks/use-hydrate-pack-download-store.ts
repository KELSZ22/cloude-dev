import { useEffect } from "react";

import { usePackDownloadStore } from "@/shared/stores/pack-download-store";
import { contentSources } from "@/shared/constants/content-sources";

export function useHydratePackDownloadStore() {
  useEffect(() => {
    if (!contentSources.openStax) return;
    const finish = () => {
      void usePackDownloadStore.getState().syncFromDisk();
    };
    const unsub = usePackDownloadStore.persist.onFinishHydration(finish);
    if (usePackDownloadStore.persist.hasHydrated()) finish();
    else void usePackDownloadStore.persist.rehydrate();
    return unsub;
  }, []);
}
