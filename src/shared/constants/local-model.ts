/** Pinned Hugging Face LFS metadata; never resolve a moving main branch at runtime. */
export const localModel = {
  id: 'diodel/Qwen3.5-0.8B-Q4_K_M-GGUF',
  /** Shown in Settings and setup; not the pinned Hugging Face repo id. */
  name: 'Seekora AI',
  filename: 'qwen3.5-0.8b-Q4_K_M.gguf',
  revision: 'dfdaeea1fdbef1d8900313cf5bed689abff3feec',
  sizeBytes: 529297312,
  sha256: 'fb89581c3863314f6e6e1810f11b0bbb30a07315e7b1229a5c7db10fb0100ca6',
  /** MD5 of the same file. The platform computes it natively, so it is the quick check for copies made on the device. */
  md5: 'f1c74709ebde32840d23454e38eafda5',
  license: 'Apache-2.0',
  sourceUrl: 'https://huggingface.co/diodel/Qwen3.5-0.8B-Q4_K_M-GGUF',
  /** Team mirror (Cloudflare R2 public dev URL); same bytes as the pinned Hugging Face revision. */
  downloadUrl: 'https://pub-6fe7720fb0974858a0a09acfd37e866e.r2.dev/models/qwen3.5-0.8b-Q4_K_M.gguf',
} as const;
