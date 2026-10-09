import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import type { ModelManifest, ModelState } from '@/infrastructure/llm';
import { createEngine } from '@/infrastructure/llm/create-engine';
import { createModelStorage } from '@/infrastructure/llm/model-storage';

type Operation = 'restoring' | 'choosing' | 'importing' | 'verifying' | 'loading' | 'testing' | 'unloading' | 'removing' | null;

interface ModelContextValue {
  installed: ModelManifest | null;
  state: ModelState;
  operation: Operation;
  progress: number;
  output: string;
  error: string | null;
  native: boolean;
  importModel(): Promise<void>;
  loadModel(): Promise<void>;
  unloadModel(): Promise<void>;
  testModel(): Promise<void>;
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
  const native = Platform.OS === 'android' || Platform.OS === 'ios';

  const updateOperation = (next: Operation) => { phase.current = next; setOperation(next); };

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    void storage.readInstalled().then((manifest) => {
      if (!disposed) setInstalled(manifest);
    }).catch((failure: unknown) => {
      if (!disposed) setError(failure instanceof Error ? failure.message : 'Cannot read the installed model.');
    }).finally(() => {
      if (!disposed) { phase.current = null; setOperation(null); }
    });
    const subscription = AppState.addEventListener('change', (next) => {
      // The system picker backgrounds Android while selection is open; no model is loaded then.
      if (next !== 'active' && phase.current !== 'choosing') {
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
    importModel, loadModel, unloadModel, testModel, cancel, removeModel }}>{children}</ModelContext.Provider>;
}

export function useModel() {
  const model = useContext(ModelContext);
  if (!model) throw new Error('useModel must be used within ModelProvider.');
  return model;
}
