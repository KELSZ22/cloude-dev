/**
 * Search can offer a catalog pack, but this build has no file to fetch for it.
 * The call fails so the download-failed screen can explain what to check.
 */
export function downloadSearchPack(_id: string): { ok: boolean } {
  return { ok: false };
}
