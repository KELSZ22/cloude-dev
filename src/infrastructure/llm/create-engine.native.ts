import { LlamaRnEngine, UnsupportedRuntimeError } from './llama-engine';

export function createEngine() {
  return new LlamaRnEngine(async (params) => {
    let runtime: typeof import('llama.rn');
    try {
      // Lazy import keeps the shell usable in Expo Go when the native module is absent.
      runtime = await import('llama.rn');
    } catch {
      throw new UnsupportedRuntimeError('The native runtime is unavailable. Install a rebuilt Android development build; Expo Go cannot run this model.');
    }
    return runtime.initLlama(params);
  });
}
