import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export interface ModelIntegrity { sizeBytes: number; sha256: string }

/** Incremental reads keep the 529 MB model out of JS heap. The caller owns handles. */
export async function verifyModelStream(options: {
  expected: ModelIntegrity;
  read: (length: number) => Uint8Array;
  write?: (bytes: Uint8Array) => void;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}) {
  const hash = sha256.create();
  let total = 0;
  let reportedPercent = -1;
  try {
    while (total < options.expected.sizeBytes) {
      if (options.signal?.aborted) throw new Error('Model verification cancelled.');
      const bytes = options.read(Math.min(256 * 1024, options.expected.sizeBytes - total));
      if (!bytes.length) throw new Error('The model file is truncated.');
      if (total === 0) {
        if (bytes.length < 8 || bytes[0] !== 71 || bytes[1] !== 71 || bytes[2] !== 85 || bytes[3] !== 70) {
          throw new Error('This file is not a valid Seekora AI download.');
        }
        const version = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true);
        if (version !== 3) throw new Error('This Seekora AI file is not supported.');
      }
      total += bytes.length;
      hash.update(bytes);
      options.write?.(bytes);
      const percent = Math.floor(total * 100 / options.expected.sizeBytes);
      if (percent !== reportedPercent) {
        reportedPercent = percent;
        options.onProgress?.(total / options.expected.sizeBytes);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    if (options.signal?.aborted) throw new Error('Model verification cancelled.');
    if (total !== options.expected.sizeBytes || options.read(1).length) throw new Error('The model file size does not match.');
    if (bytesToHex(hash.digest()) !== options.expected.sha256) {
      throw new Error('This file does not match the expected Seekora AI download. It may be damaged or from a different source.');
    }
  } finally {
    hash.destroy();
  }
}
