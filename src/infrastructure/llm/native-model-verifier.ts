import type { ModelIntegrity } from './verify-model';

/** Other platforms use the existing bounded JavaScript stream verifier. */
export async function tryVerifyNativeModel(
  _uri: string,
  _expected: ModelIntegrity,
  signal: AbortSignal,
  _onProgress: (fraction: number) => void,
): Promise<boolean> {
  if (signal.aborted) throw new Error('Model verification cancelled.');
  return false;
}
