import { LlamaRnEngine, UnsupportedRuntimeError } from './llama-engine';

export function createEngine() {
  return new LlamaRnEngine(async () => {
    throw new UnsupportedRuntimeError('On-device inference requires Android or iOS. It is unavailable in the web preview.');
  });
}
