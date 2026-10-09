import { useEffect, useState } from "react";

import { readingRepository } from "@/shared/stores/offline-reading-store";
import type { DisplayFigure } from "@/shared/types/offline-reading";

export interface QuestionImage {
  uri: string;
  /** Whether the picture can fill the banner, or has to be fitted inside it instead. */
  fills: boolean;
  caption: string;
}

const BANNER_RATIO = 16 / 9;

/**
 * Only a picture shaped roughly like the banner can fill it without losing its subject. A tall
 * portrait or a wide panorama is shown whole against the banner's own colour instead.
 */
function fillsBanner(width: number, height: number) {
  if (!width || !height) return false;
  const ratio = width / height;
  return ratio >= BANNER_RATIO * 0.75 && ratio <= BANNER_RATIO * 1.25;
}

/**
 * On web a figure uri is the picture itself as a data url, so the cache is held to roughly one
 * deck and old entries are dropped rather than kept for the life of the app.
 */
const CACHE_LIMIT = 12;
const cache = new Map<string, QuestionImage | null>();

function remember(key: string, image: QuestionImage | null) {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, image);
}

function toImage(figure: DisplayFigure): QuestionImage {
  return {
    uri: figure.uri,
    fills: fillsBanner(figure.width, figure.height),
    caption: figure.caption.trim(),
  };
}

/** Reads one saved article's illustration. Returns null until it is there, or if it is missing. */
export function useQuestionImage(
  readingId: string,
  imageId: string | undefined,
): QuestionImage | null {
  const key = imageId ? `${readingId}/${imageId}` : "";
  const [loaded, setLoaded] = useState<{ key: string; image: QuestionImage | null }>({
    key: "",
    image: null,
  });

  useEffect(() => {
    if (!key || cache.has(key)) return;
    let live = true;
    void readingRepository
      .get(readingId)
      .catch(() => null)
      .then((reading) => {
        const figure = reading?.figures.find((item) => item.id === imageId);
        const image = figure ? toImage(figure) : null;
        remember(key, image);
        if (live) setLoaded({ key, image });
      });
    return () => {
      live = false;
    };
  }, [key, readingId, imageId]);

  if (!key) return null;
  const known = cache.get(key);
  if (known !== undefined) return known;
  // Only reachable if the cache dropped this entry since it was read.
  return loaded.key === key ? loaded.image : null;
}
