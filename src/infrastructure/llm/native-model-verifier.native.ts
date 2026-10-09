import { requireOptionalNativeModule } from 'expo';

import type { ModelIntegrity } from './verify-model';

interface VerificationProgress { requestId: string; fraction: number }
interface Subscription { remove(): void }
interface NativeModelFiles {
  verifyModel(requestId: string, uri: string, expectedSize: number, expectedSha256: string): Promise<boolean>;
  cancelVerification(requestId: string): void;
  addListener(event: 'onVerificationProgress', listener: (event: VerificationProgress) => void): Subscription;
}

const native = requireOptionalNativeModule<NativeModelFiles>('SeekoraModelFiles');
let sequence = 0;

/** True after native verification; false only when this build has no Android verifier. */
export async function tryVerifyNativeModel(
  uri: string,
  expected: ModelIntegrity,
  signal: AbortSignal,
  onProgress: (fraction: number) => void,
): Promise<boolean> {
  if (signal.aborted) throw new Error('Model verification cancelled.');
  if (!native) return false;
  const module = native;
  const requestId = `${Date.now().toString(36)}-${++sequence}-${Math.random().toString(36).slice(2)}`;
  const progress = module.addListener('onVerificationProgress', (event) => {
    if (event.requestId === requestId && !signal.aborted && Number.isFinite(event.fraction)) {
      onProgress(Math.min(1, Math.max(0, event.fraction)));
    }
  });
  const cancel = () => {
    try { module.cancelVerification(requestId); }
    catch { /* The runtime may already be tearing down; the aborted signal still wins. */ }
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    if (signal.aborted) throw new Error('Model verification cancelled.');
    const verified = await module.verifyModel(requestId, uri, expected.sizeBytes, expected.sha256);
    if (signal.aborted) throw new Error('Model verification cancelled.');
    if (!verified) throw new Error('The model could not be verified.');
    return true;
  } finally {
    signal.removeEventListener('abort', cancel);
    progress.remove();
  }
}
