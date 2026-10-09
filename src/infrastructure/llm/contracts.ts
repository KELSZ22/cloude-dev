export type ModelState =
  | { status: 'not-installed' }
  | { status: 'loading'; modelUri: string }
  | { status: 'ready'; modelUri: string }
  | { status: 'generating'; modelUri: string }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; message: string };

export interface GenerationRequest {
  prompt: string;
  maxTokens: number;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

/** One injected instance owns the context; serialize load/generate/unload operations. */
export interface LLMEngine {
  getState(): ModelState;
  load(modelUri: string): Promise<void>;
  generate(request: GenerationRequest): Promise<string>;
  cancel(): Promise<void>;
  unload(): Promise<void>;
}

export interface ModelManifest {
  id: string;
  version: string;
  localUri: string;
  sizeBytes: number;
  sha256: string;
  license: string;
  sourceUrl: string | null;
}
