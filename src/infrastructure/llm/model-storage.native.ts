import { Directory, File, FileMode, Paths } from 'expo-file-system';

import { localModel } from '@/shared/constants/local-model';
import type { ModelManifest } from './contracts';
import type { ModelStorage } from './model-storage';
import { verifyModelStream } from './verify-model';

export function createModelStorage(): ModelStorage {
  const directory = new Directory(Paths.document, 'models', localModel.revision);
  const modelFile = () => new File(directory, localModel.filename);
  const metadataFile = () => new File(directory, 'manifest.json');
  const stagingFile = () => new File(directory, 'model.gguf.part');
  const stagingMetadata = () => new File(directory, 'manifest.json.part');

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

  return {
    readInstalled,
    async importFile(sourceUri, signal, onProgress) {
      if (!sourceUri.startsWith('file://') && !sourceUri.startsWith('content://')) throw new Error('Choose a local file on your device.');
      directory.create({ intermediates: true, idempotent: true });
      if (modelFile().exists || metadataFile().exists) throw new Error('Remove the installed model before replacing it.');
      if (Paths.availableDiskSpace < localModel.sizeBytes + 16 * 1024 * 1024) throw new Error('Not enough free storage. Free at least 550 MB before importing.');
      const source = new File(sourceUri);
      if (source.size !== localModel.sizeBytes) throw new Error('Select the 529,297,312-byte Qwen3.5 GGUF file.');
      const staged = stagingFile();
      staged.create({ overwrite: true });
      const input = source.open(FileMode.ReadOnly);
      let output: ReturnType<File['open']> | undefined;
      try {
        output = staged.open(FileMode.WriteOnly);
        await verifyModelStream({ expected: localModel, read: (length) => input.readBytes(length),
          write: (bytes) => output!.writeBytes(bytes), signal, onProgress });
      } catch (error) {
        output?.close(); output = undefined;
        if (staged.exists) staged.delete();
        throw error;
      } finally {
        input.close(); output?.close();
      }
      try {
        staged.move(modelFile());
        const manifest: ModelManifest = {
          id: localModel.id, version: localModel.revision, localUri: modelFile().uri,
          sizeBytes: localModel.sizeBytes, sha256: localModel.sha256,
          license: localModel.license, sourceUrl: localModel.sourceUrl,
        };
        const temporary = stagingMetadata();
        temporary.create({ overwrite: true });
        temporary.write(JSON.stringify(manifest));
        temporary.move(metadataFile());
        return manifest;
      } catch (error) {
        if (modelFile().exists) modelFile().delete();
        throw error;
      }
    },
    async verifyInstalled(manifest, signal, onProgress) {
      const current = await readInstalled();
      if (!current || current.localUri !== manifest.localUri) throw new Error('The model is no longer installed.');
      const input = modelFile().open(FileMode.ReadOnly);
      try {
        await verifyModelStream({ expected: localModel, read: (length) => input.readBytes(length), signal, onProgress });
      } finally { input.close(); }
    },
    async remove() {
      // Only fixed app-owned paths. Never follow a manifest URI or delete the external source.
      for (const file of [metadataFile(), modelFile(), stagingFile(), stagingMetadata()]) {
        if (file.exists) file.delete();
      }
    },
  };
}
