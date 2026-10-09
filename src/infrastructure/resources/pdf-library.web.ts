import {
  pdfStorageKey,
  type PdfLibrary,
  type SavedPdfRecord,
} from "./pdf-record";

const DATABASE = "aralsearch-pdfs-v1";
const STORE = "pdfs";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("PDF storage is unavailable."));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error ?? request.error);
        tx.onabort = () => reject(tx.error ?? request.error);
      }),
  );
}

export const pdfLibrary: PdfLibrary = {
  async listIds() {
    const records = await withStore<SavedPdfRecord[]>("readonly", (store) =>
      store.getAll(),
    );
    return (records ?? []).map((record) => record.id);
  },
  async read(id) {
    const key = pdfStorageKey(id);
    return withStore<SavedPdfRecord | undefined>("readonly", (store) =>
      store.get(key),
    ).then((record) => record ?? null);
  },
  async save(record) {
    const stored = { ...record, id: pdfStorageKey(record.id) };
    await withStore("readwrite", (store) => store.put(stored, stored.id));
  },
};

export { isPdfBytes, pdfStorageKey } from "./pdf-record";
