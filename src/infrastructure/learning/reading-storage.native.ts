import { Directory, File, Paths } from "expo-file-system";

import { isFigureFileName, isReadingId, ReadingError } from "../../shared/types/offline-reading";
import type { ReadingStorage } from "./reading-repository";

function root() {
  return new Directory(Paths.document, "offline-reading-v1");
}

function file(id: string) {
  if (!isReadingId(id)) throw new ReadingError("storage");
  return new File(root(), `${id}.json`);
}

function media(id: string) {
  if (!isReadingId(id)) throw new ReadingError("storage");
  return new Directory(root(), `${id}-media`);
}

function assetFile(id: string, name: string) {
  if (!isFigureFileName(name)) throw new ReadingError("storage");
  return new File(media(id), name);
}

export const readingStorage: ReadingStorage = {
  async keys() {
    const directory = root();
    if (!directory.exists) return [];
    return directory.list().filter((entry) => entry instanceof File && entry.name.endsWith(".json"))
      .map((entry) => entry.name.slice(0, -5));
  },
  async read(id) {
    const source = file(id);
    return source.exists ? source.text() : null;
  },
  async write(id, content) {
    const destination = file(id);
    root().create({ intermediates: true, idempotent: true });
    const staging = new File(root(), `${id}.part`);
    try {
      staging.write(content);
      if (await staging.text() !== content) throw new ReadingError("storage");
      await staging.move(destination, { overwrite: true });
    } finally {
      // move updates the File URI; do not delete the committed destination.
      const leftover = new File(root(), `${id}.part`);
      if (leftover.exists) leftover.delete();
    }
  },
  async writeAssets(id, assets) {
    const directory = media(id);
    if (directory.exists) directory.delete();
    if (!assets.length) return;
    directory.create({ intermediates: true, idempotent: true });
    for (const asset of assets) {
      const destination = assetFile(id, asset.name);
      const staging = new File(directory, `${asset.name}.part`);
      try {
        staging.write(asset.bytes);
        if (staging.size !== asset.bytes.byteLength) throw new ReadingError("storage");
        await staging.move(destination, { overwrite: true });
      } finally {
        const leftover = new File(directory, `${asset.name}.part`);
        if (leftover.exists) leftover.delete();
      }
    }
  },
  async readAsset(id, name) {
    const source = assetFile(id, name);
    return source.exists ? source.uri : null;
  },
  async assetSize(id, name) {
    if (!isReadingId(id) || !isFigureFileName(name)) return 0;
    const source = new File(media(id), name);
    return source.exists ? source.size : 0;
  },
  async remove(id) {
    const source = file(id);
    if (source.exists) source.delete();
    const directory = media(id);
    if (directory.exists) directory.delete();
  },
};
