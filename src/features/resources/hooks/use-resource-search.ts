import { useCallback, useState } from "react";

import { searchResources } from "../services/resource-search.service";
import type { FederatedSearchResult, ResourceSearchOptions } from "../types/resource.types";

/** Optional hook for a future screen. It is not mounted by the current navigation. */
export function useResourceSearch() {
  const [result, setResult] = useState<FederatedSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (
    options: ResourceSearchOptions,
    enabledProviders?: readonly string[],
  ) => {
    setLoading(true);
    setError(null);
    try {
      const next = await searchResources(options, enabledProviders);
      setResult(next);
      return next;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Search failed.";
      setError(message);
      throw caught;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, search };
}
