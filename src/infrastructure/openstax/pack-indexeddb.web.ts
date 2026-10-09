const DB_NAME = "aralsearch-openstax-v1";
const STORE = "blobs";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open pack storage."));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () =>
          reject(
            request.error ?? new Error("Pack storage transaction failed."),
          );
        tx.onerror = () =>
          reject(tx.error ?? new Error("Pack storage transaction failed."));
      }),
  );
}

export function packBlobKey(packId: string, relativePath: string) {
  return `${packId}::${relativePath}`;
}

export function packMarkerKey(packId: string) {
  return `__marker__::${packId}`;
}

export async function readPackBlob(key: string) {
  if (typeof indexedDB === "undefined") return undefined;
  try {
    return await runTransaction("readonly", (store) => store.get(key));
  } catch {
    return undefined;
  }
}

export async function writePackBlob(key: string, blob: Blob) {
  await runTransaction("readwrite", (store) => store.put(blob, key));
}

export async function writePackMarker(packId: string, payload: object) {
  const body = JSON.stringify(payload);
  await runTransaction("readwrite", (store) =>
    store.put(
      new Blob([body], { type: "application/json" }),
      packMarkerKey(packId),
    ),
  );
}

export async function readPackMarker(packId: string) {
  const blob = (await readPackBlob(packMarkerKey(packId))) as Blob | undefined;
  if (!blob) return null;
  const text = await blob.text();
  return JSON.parse(text) as {
    packId: string;
    installedAt: string;
    assetCount: number;
    totalBytes: number;
  };
}
