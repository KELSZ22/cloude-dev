import { Platform } from 'react-native';
import { Directory, File, FileMode, Paths } from 'expo-file-system';

import { localModel } from '@/shared/constants/local-model';
import type { ModelManifest } from './contracts';
import type { ModelStorage } from './model-storage';
import { verifyModelStream } from './verify-model';

const REQUIRED_FREE_BYTES = localModel.sizeBytes + 16 * 1024 * 1024;

export function createModelStorage(): ModelStorage {
  const directory = new Directory(Paths.document, 'models', localModel.revision);
  const modelFile = () => new File(directory, localModel.filename);
  const metadataFile = () => new File(directory, 'manifest.json');
  const stagingFile = () => new File(directory, 'model.gguf.part');
  const stagingMetadata = () => new File(directory, 'manifest.json.part');
  /** Present only in builds made with the model in bundled-model/ (see plugins/with-bundled-model.js). */
  const bundledFile = () => new File(`asset:///models/${localModel.filename}`);

  const readInstalled = async (): Promise<ModelManifest | null> => {
    const metadata = metadataFile();
    if (!metadata.exists) {
      if (modelFile().exists) throw new Error('An incomplete installation exists. Remove it before importing again.');
      return null;
    }
    const value: unknown = JSON.parse(await metadata.text());
    if (!value || typeof value !== 'object') throw new Error('The model manifest is damaged. Remove and reimport the model.');
    const manifest = value as Partial<ModelManifest>;
    if (manifest.id !== localModel.id || manifest.version !== localModel.revision
      || manifest.sha256 !== localModel.sha256 || manifest.sizeBytes !== localModel.sizeBytes
      || manifest.localUri !== modelFile().uri || manifest.license !== localModel.license
      || manifest.sourceUrl !== localModel.sourceUrl || !modelFile().exists || modelFile().size !== localModel.sizeBytes) {
      throw new Error('The stored model is incomplete or does not match the selected Qwen3.5 revision. Remove and reimport it.');
    }
    return manifest as ModelManifest;
  };

  /** Written through a temporary file so a crash never leaves a half-written manifest. */
  const saveManifest = (manifest: ModelManifest) => {
    const temporary = stagingMetadata();
    temporary.create({ overwrite: true });
    temporary.write(JSON.stringify(manifest));
    temporary.moveSync(metadataFile(), { overwrite: true });
  };

  const prepareDirectory = () => {
    directory.create({ intermediates: true, idempotent: true });
    if (modelFile().exists || metadataFile().exists) throw new Error('Remove the installed model before replacing it.');
    if (Paths.availableDiskSpace < REQUIRED_FREE_BYTES) throw new Error('Not enough free storage. Free at least 550 MB first.');
    const staged = stagingFile();
    if (staged.exists) staged.delete();
    return staged;
  };

  /** Promotes a verified staging file to the installed model and records it. */
  const finishInstall = (staged: File, md5: string | undefined): ModelManifest => {
    try {
      staged.moveSync(modelFile());
      const manifest: ModelManifest = {
        id: localModel.id, version: localModel.revision, localUri: modelFile().uri,
        sizeBytes: localModel.sizeBytes, sha256: localModel.sha256,
        license: localModel.license, sourceUrl: localModel.sourceUrl, md5,
      };
      saveManifest(manifest);
      return manifest;
    } catch (error) {
      if (modelFile().exists) modelFile().delete();
      throw error;
    }
  };

  return {
    readInstalled,
    hasBundledModel() {
      try { return Platform.OS === 'android' && bundledFile().exists; }
      catch { return false; }
    },
    async installBundled(signal, onProgress) {
      const staged = prepareDirectory();
      try {
        await bundledFile().copy(staged);
        if (signal.aborted) throw new Error('Model setup cancelled.');
        // The build refused to pack anything but the pinned SHA-256, and the APK signature covers the packed file.
        // Only the copy needs checking here, which the platform's MD5 does in seconds.
        if (staged.size !== localModel.sizeBytes || staged.md5 !== localModel.md5) {
          throw new Error('The built-in model did not copy correctly. Free some storage and open the app again.');
        }
        onProgress(1);
      } catch (error) {
        if (staged.exists) staged.delete();
        throw error;
      }
      return finishInstall(staged, localModel.md5);
    },
    async importFile(sourceUri, signal, onProgress) {
      if (!sourceUri.startsWith('file://') && !sourceUri.startsWith('content://')) throw new Error('Choose a local file on your device.');
      const staged = prepareDirectory();
      const source = new File(sourceUri);
      if (source.size !== localModel.sizeBytes) throw new Error('Select the 529,297,312-byte Qwen3.5 GGUF file.');
      try {
        // Do not read a picked file through a handle: on Android its descriptor can be closed partway
        // through a long read ("Bad file descriptor"). The platform copies it; the app-owned copy is verified.
        await source.copy(staged);
        if (signal.aborted) throw new Error('Model verification cancelled.');
        const input = staged.open(FileMode.ReadOnly);
        try {
          await verifyModelStream({ expected: localModel, read: (length) => input.readBytes(length), signal, onProgress });
        } finally { input.close(); }
      } catch (error) {
        if (staged.exists) staged.delete();
        throw error;
      }
      return finishInstall(staged, staged.md5 ?? undefined);
    },
    async verifyInstalled(manifest, signal, onProgress) {
      const current = await readInstalled();
      if (!current || current.localUri !== manifest.localUri) throw new Error('The model is no longer installed.');
      // The pinned SHA-256 is checked once, at import. Hashing 529 MB in JavaScript took about 18 minutes on a
      // phone, so each load instead compares the platform's native MD5 with the one recorded for that verified file.
      const md5 = modelFile().md5;
      if (signal.aborted) throw new Error('Model verification cancelled.');
      if (!md5) throw new Error('The stored model cannot be read. Remove and reimport it.');
      if (!current.md5) saveManifest({ ...current, md5 }); // Imported before this check existed.
      else if (current.md5 !== md5) throw new Error('The stored model has changed since it was imported. Remove and reimport it.');
      onProgress(1);
    },
    async remove() {
      // Only fixed app-owned paths. Never follow a manifest URI or delete the external source.
      for (const file of [metadataFile(), modelFile(), stagingFile(), stagingMetadata()]) {
        if (file.exists) file.delete();
      }
    },
  };
}
