import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import type { GenerationRequest, ModelManifest, ModelState } from '@/infrastructure/llm';
import { createEngine } from '@/infrastructure/llm/create-engine';
import { createModelStorage } from '@/infrastructure/llm/model-storage';

type Operation = 'restoring' | 'preparing' | 'choosing' | 'importing' | 'verifying' | 'loading' | 'testing' | 'answering' | 'unloading' | 'removing' | null;

export interface ModelContextValue {
  installed: ModelManifest | null;
  state: ModelState;
  operation: Operation;
  progress: number;
  output: string;
  error: string | null;
  native: boolean;
  /** True when this build carries the model, so setup is a copy rather than a download. */
  hasBundled: boolean;
  /** Copies the built-in model into app storage. The user asks for this; it never runs on its own. */
  setupBundledModel(): Promise<void>;
  importModel(): Promise<void>;
  loadModel(): Promise<void>;
  unloadModel(): Promise<void>;
  testModel(): Promise<void>;
  /** Runs one generation on the loaded model. Rejects if the model is busy, not loaded, or cancelled. */
  generate(request: GenerationRequest): Promise<string>;
  /** Loads the installed model if it is not loaded yet. Resolves false when there is no model or it cannot load now. */
  ensureLoaded(): Promise<boolean>;
  /**
   * While held, leaving the foreground neither cancels work nor unloads the model. The floating
   * assistant holds it, because it is used while another app is in front.
   */
  setBackgroundHold(hold: boolean): void;
  cancel(): Promise<void>;
  removeModel(): Promise<void>;
}

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: PropsWithChildren) {
  const [engine] = useState(createEngine);
  const [storage] = useState(createModelStorage);
  const [installed, setInstalled] = useState<ModelManifest | null>(null);
  const [state, setState] = useState<ModelState>(engine.getState());
  const [operation, setOperation] = useState<Operation>('restoring');
  const [progress, setProgress] = useState(0);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const phase = useRef<Operation>('restoring');
  const mounted = useRef(true);
  const backgroundHold = useRef(false);
  const native = Platform.OS === 'android' || Platform.OS === 'ios';

  const updateOperation = (next: Operation) => { phase.current = next; setOperation(next); };

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    // Only reads what is already set up. Copying the bundled model is half a gigabyte, so it waits
    // until the user asks for it in onboarding or on the model screen.
    void storage.readInstalled().then((manifest) => {
      if (!disposed) setInstalled(manifest);
    }).catch((failure: unknown) => {
      if (!disposed) setError(failure instanceof Error ? failure.message : 'Cannot read the installed model.');
    }).finally(() => {
      if (!disposed) { phase.current = null; setOperation(null); }
    });
    const subscription = AppState.addEventListener('change', (next) => {
      // The system picker backgrounds Android while selection is open; no model is loaded then.
      if (next !== 'active' && phase.current !== 'choosing' && !backgroundHold.current) {
        active.current?.abort();
        void engine.unload().then(() => {
          if (!disposed) setState(engine.getState());
        }).catch((failure: unknown) => {
          if (!disposed) setError(failure instanceof Error ? failure.message : 'Cannot release the model.');
        });
      }
    });
    return () => {
      disposed = true; mounted.current = false;
      subscription.remove(); active.current?.abort();
      void engine.unload().catch(() => undefined);
    };
  }, [engine, storage]);

  async function run(next: Operation, action: (signal: AbortSignal) => Promise<void>) {
    if (phase.current) return;
    const controller = new AbortController();
    active.current = controller;
    updateOperation(next); setProgress(0); setError(null);
    try { await action(controller.signal); }
    catch (failure) {
      if (mounted.current) setError(controller.signal.aborted ? 'Operation cancelled.'
        : failure instanceof Error ? failure.message : 'The local model operation failed.');
    } finally {
      active.current = null;
      if (mounted.current) { setState(engine.getState()); updateOperation(null); }
    }
  }

  async function setupBundledModel() {
    await run('preparing', async (signal) => {
      if (!storage.hasBundledModel()) throw new Error('This build does not carry the model.');
      if (installed) return;
      const manifest = await storage.installBundled(signal, setProgress);
      if (mounted.current) setInstalled(manifest);
    });
  }

  async function importModel() {
    await run('choosing', async (signal) => {
      if (!native) throw new Error('Model import is available on Android and iOS.');
      if (installed) throw new Error('Remove the current model before replacing it.');
      const selection = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: false });
      if (selection.canceled) return;
      if (signal.aborted) throw new Error('Import cancelled.');
      updateOperation('importing');
      const manifest = await storage.importFile(selection.assets[0].uri, signal, setProgress);
      if (mounted.current) setInstalled(manifest);
    });
  }

  async function loadModel() {
    await run('verifying', async (signal) => {
      if (!installed) throw new Error('Import the selected GGUF model first.');
      await storage.verifyInstalled(installed, signal, setProgress);
      if (signal.aborted) throw new Error('Loading cancelled.');
      updateOperation('loading');
      const task = engine.load(installed.localUri);
      setState(engine.getState());
      await task;
      if (signal.aborted) await engine.unload();
    });
  }

  async function unloadModel() { await run('unloading', () => engine.unload()); }

  async function testModel() {
    await run('testing', async (signal) => {
      setOutput('');
      const task = engine.generate({ prompt: 'Reply with only the word READY.', maxTokens: 32, signal,
        onToken: (token) => { if (mounted.current) setOutput((text) => text + token); } });
      setState(engine.getState());
      const text = await task;
      if (!text.trim()) throw new Error('The model returned no text. Try reloading and check runtime compatibility.');
      if (mounted.current) setOutput(text);
    });
  }

  async function generate(request: GenerationRequest) {
    if (phase.current) throw new Error('The local model is busy. Wait for the current task to finish.');
    const controller = new AbortController();
    const forward = () => controller.abort();
    request.signal?.addEventListener('abort', forward, { once: true });
    active.current = controller;
    updateOperation('answering'); setError(null);
    try {
      const task = engine.generate({ ...request, signal: controller.signal });
      setState(engine.getState());
      return await task;
    } finally {
      request.signal?.removeEventListener('abort', forward);
      active.current = null;
      if (mounted.current) { setState(engine.getState()); updateOperation(null); }
    }
  }

  async function ensureLoaded() {
    const status = engine.getState().status;
    if (status === 'ready' || status === 'generating') return true;
    if (!installed || phase.current) return false;
    await loadModel();
    return engine.getState().status === 'ready';
  }

  function setBackgroundHold(hold: boolean) { backgroundHold.current = hold; }

  async function cancel() {
    active.current?.abort();
    try { await engine.cancel(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Cannot cancel generation.'); }
  }

  async function removeModel() {
    await run('removing', async () => {
      await engine.unload();
      await storage.remove();
      setInstalled(null); setOutput('');
      setState({ status: 'not-installed' });
    });
  }

  return <ModelContext.Provider value={{ installed, state, operation, progress, output, error, native,
    hasBundled: storage.hasBundledModel(), setupBundledModel,
    importModel, loadModel, unloadModel, testModel, generate, ensureLoaded, setBackgroundHold, cancel, removeModel }}>{children}</ModelContext.Provider>;
}

export function useModel() {
  const model = useContext(ModelContext);
  if (!model) throw new Error('useModel must be used within ModelProvider.');
  return model;
}
