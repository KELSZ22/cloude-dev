import { isFigureFileName, mimeForFigureFile } from "../../shared/types/offline-reading";
import type { ReadingStorage } from "./reading-repository";

const DATABASE = "aralsearch-reading-v1";
const STORE = "articles";
const ASSETS = "assets";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local reading storage is unavailable."));
      return;
    }
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Local reading storage is blocked."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = run(tx.objectStore(storeName));
      tx.oncomplete = () => resolve((request ? request.result : undefined) as T);
      tx.onabort = () => reject(tx.error ?? new Error("Local storage transaction aborted."));
      tx.onerror = () => reject(tx.error ?? request?.error);
    });
  } finally {
    db.close();
  }
}

function dataUrl(bytes: Uint8Array, mime: string) {
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return `data:${mime};base64,${btoa(binary)}`;
}

function asBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}

function assetKey(id: string, name: string) {
  return `${id}/${name}`;
}

function clearPrefix(store: IDBObjectStore, id: string) {
  const range = IDBKeyRange.bound(`${id}/`, `${id}/\uffff`);
  const request = store.openCursor(range);
  request.onsuccess = () => {
    const cursor = request.result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };
}

export const readingStorage: ReadingStorage = {
  async keys() {
    return (await withStore(STORE, "readonly", (store) => store.getAllKeys())).map(String);
  },
  async read(id) {
    const value: unknown = await withStore(STORE, "readonly", (store) => store.get(id));
    return typeof value === "string" ? value : null;
  },
  async write(id, content) {
    await withStore(STORE, "readwrite", (store) => store.put(content, id));
  },
  async writeAssets(id, assets) {
    await withStore(ASSETS, "readwrite", (store) => {
      clearPrefix(store, id);
      for (const asset of assets) store.put(asset.bytes, assetKey(id, asset.name));
    });
  },
  async readAsset(id, name) {
    if (!isFigureFileName(name)) return null;
    const mime = mimeForFigureFile(name);
    const bytes = asBytes(await withStore(ASSETS, "readonly", (store) => store.get(assetKey(id, name))));
    return bytes && mime ? dataUrl(bytes, mime) : null;
  },
  async assetSize(id, name) {
    if (!isFigureFileName(name)) return 0;
    return asBytes(await withStore(ASSETS, "readonly", (store) => store.get(assetKey(id, name))))?.byteLength ?? 0;
  },
  async remove(id) {
    await withStore(STORE, "readwrite", (store) => store.delete(id));
    await withStore(ASSETS, "readwrite", (store) => { clearPrefix(store, id); });
  },
};
