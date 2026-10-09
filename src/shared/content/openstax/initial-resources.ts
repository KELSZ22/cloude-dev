import type { OpenStaxBookRecord, OpenStaxInitialResources, OpenStaxPackRecord } from "./types";

import bundled from "./initial-resources.json";

const data = bundled as OpenStaxInitialResources;

export const openStaxInitialResources = data;

export const openStaxPacks: readonly OpenStaxPackRecord[] = data.packs;

export const openStaxBooks: readonly OpenStaxBookRecord[] = data.books;

export function openStaxPackById(id: string) {
  return openStaxPacks.find((pack) => pack.id === id);
}

export function openStaxBookById(id: string) {
  return openStaxBooks.find((book) => book.id === id);
}

export function openStaxBooksForPack(packId: string) {
  return openStaxBooks.filter((book) => book.packId === packId);
}
