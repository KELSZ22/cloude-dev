import { Directory, DownloadTask, File, FileMode, Paths } from 'expo-file-system';
import { AppState, Platform } from 'react-native';

import { localModel } from '@/shared/constants/local-model';
import type { ModelManifest } from './contracts';
import type { ModelStorage } from './model-storage';
import {
  adaptModelDownloadTask, createResumableTask, downloadAndInstallModel,
  type SavedTransfer, type TransferSegment,
} from './download-model';
import { tryVerifyNativeModel } from './native-model-verifier';
import { verifyModelStream } from './verify-model';

const REQUIRED_FREE_BYTES = localModel.sizeBytes + 16 * 1024 * 1024;

export function createModelStorage(): ModelStorage {
  const directory = new Directory(Paths.document, 'models', localModel.revision);
  const modelFile = () => new File(directory, localModel.filename);
  const metadataFile = () => new File(directory, 'manifest.json');
  const stagingFile = () => new File(directory, 'model.gguf.part');
  const stagingMetadata = () => new File(directory, 'manifest.json.part');
  /** Pause state of an interrupted download; only meaningful next to its matching staging file. */
  const resumeFile = () => new File(directory, 'download.resume.json');

  /** Returns the saved transfer only if it still describes the exact partial file on disk. */
  const loadResume = (): SavedTransfer | null => {
    try {
      const record = resumeFile();
      const staged = stagingFile();
      if (!record.exists || !staged.exists) return null;
      const value = JSON.parse(record.textSync()) as Partial<SavedTransfer>;
      if (value.url !== localModel.downloadUrl || value.fileUri !== staged.uri
        || typeof value.resumeData !== 'string' || value.resumeData.length === 0
        || staged.size <= 0 || staged.size >= localModel.sizeBytes) return null;
      return value as SavedTransfer;
    } catch { return null; }
  };

  const readInstalled = async (): Promise<ModelManifest | null> => {
    // Provider startup/load operations are serialized; reclaim interrupted transfer/manifest files,
    // but keep a partial download that can still be resumed.
    if (loadResume()) { if (stagingMetadata().exists) stagingMetadata().delete(); }
    else cleanupStaging();
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
      throw new Error('Seekora AI on this device is incomplete or outdated. Remove it and download or import again.');
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

  const prepareDirectory = (allowResume = false) => {
    directory.create({ intermediates: true, idempotent: true });
    if (modelFile().exists || metadataFile().exists) throw new Error('Remove the installed model before replacing it.');
    const resume = allowResume ? loadResume() : null;
    if (resume) { if (stagingMetadata().exists) stagingMetadata().delete(); }
    else cleanupStaging();
    // A resumed download only needs room for the bytes it still has to fetch.
    const needed = resume ? REQUIRED_FREE_BYTES - stagingFile().size : REQUIRED_FREE_BYTES;
    if (Paths.availableDiskSpace < needed) throw new Error('Not enough free storage. Free at least 550 MB first.');
    return { staged: stagingFile(), resume };
  };

  const saveResume = (state: SavedTransfer) => {
    const record = resumeFile();
    record.create({ overwrite: true });
    record.write(JSON.stringify(state));
  };

  const cleanupStaging = () => {
    for (const file of [stagingFile(), stagingMetadata(), resumeFile()]) {
      if (file.exists) file.delete();
    }
  };

  const verifyStaged = async (staged: File, signal: AbortSignal, onProgress: (fraction: number) => void) => {
    if (signal.aborted) throw new Error('Model verification cancelled.');
    if (await tryVerifyNativeModel(staged.uri, localModel, signal, onProgress)) return;
    // Older native builds and iOS keep the bounded streaming verifier as a compatibility fallback.
    const input = staged.open(FileMode.ReadOnly);
    try {
      await verifyModelStream({ expected: localModel, read: (length) => input.readBytes(length), signal, onProgress });
    } finally { input.close(); }
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
      for (const file of [modelFile(), metadataFile(), stagingMetadata()]) {
        if (file.exists) file.delete();
      }
      throw error;
    }
  };

  return {
    readInstalled,
    async downloadModel(signal, onProgress) {
      let staged = stagingFile();
      let resume: SavedTransfer | null = null;
      const android = Platform.OS === 'android';
      return downloadAndInstallModel({
        prepare() { ({ staged, resume } = prepareDirectory(true)); },
        createTask(_taskSignal, onBytes) {
          // The workflow owns abort handling: Expo's automatic signal handler calls the unsafe
          // Android cancel path instead of our pause-and-discard adapter.
          const start = (saved: SavedTransfer | null): TransferSegment => {
            let adapted: ReturnType<typeof adaptModelDownloadTask> | null = null;
            const options = {
              // iOS keeps the transfer going after the app is suspended; Android ignores the option
              // and is paused/resumed by the resumable task instead.
              sessionType: android ? 'foreground' as const : 'background' as const,
              onProgress: ({ bytesWritten }: { bytesWritten: number }) => {
                adapted?.onProgress();
                onBytes(bytesWritten);
              },
            };
            const task = saved
              ? DownloadTask.fromSavable(saved, options)
              : File.createDownloadTask(localModel.downloadUrl, staged, options);
            // A restored task continues with resumeAsync; a new one starts with downloadAsync.
            adapted = adaptModelDownloadTask({
              get state() { return task.state; },
              downloadAsync: () => (saved ? task.resumeAsync() : task.downloadAsync()),
              pause: () => task.pause(),
              cancel: () => task.cancel(),
              release: () => task.release(),
            }, android);
            const segment = adapted;
            return {
              get state() { return task.state; },
              run: () => segment.downloadAsync(),
              pause: () => task.pause(),
              cancel: () => segment.cancel(),
              release: () => segment.release(),
              savable: () => task.savable(),
            };
          };
          return createResumableTask({
            start,
            save: saveResume,
            clear: () => { if (resumeFile().exists) resumeFile().delete(); },
            isActive: () => AppState.currentState === 'active',
            onVisibility: (listener) => {
              const subscription = AppState.addEventListener('change', (next) => listener(next === 'active'));
              return () => subscription.remove();
            },
            pauseInBackground: android,
          }, resume);
        },
        size: () => staged.size,
        verify: (taskSignal, update) => verifyStaged(staged, taskSignal, update),
        install: () => finishInstall(staged, staged.md5 ?? undefined),
        cleanup: cleanupStaging,
      }, { sizeBytes: localModel.sizeBytes, signal, onProgress });
    },
    async importFile(sourceUri, signal, onProgress) {
      if (signal.aborted) throw new Error('Model import cancelled.');
      if (!sourceUri.startsWith('file://') && !sourceUri.startsWith('content://')) throw new Error('Choose a local file on your device.');
      const { staged } = prepareDirectory();
      const source = new File(sourceUri);
      try {
        if (source.size !== localModel.sizeBytes) throw new Error('Choose the correct Seekora AI file from your downloads.');
        // Do not read a picked file through a handle: on Android its descriptor can be closed partway
        // through a long read ("Bad file descriptor"). The platform copies it; the app-owned copy is verified.
        await source.copy(staged);
        if (signal.aborted) throw new Error('Model verification cancelled.');
        await verifyStaged(staged, signal, onProgress);
        if (signal.aborted) throw new Error('Model import cancelled.');
        return finishInstall(staged, staged.md5 ?? undefined);
      } catch (error) {
        cleanupStaging();
        throw error;
      }
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
      for (const file of [metadataFile(), modelFile(), stagingFile(), stagingMetadata(), resumeFile()]) {
        if (file.exists) file.delete();
      }
    },
  };
}
