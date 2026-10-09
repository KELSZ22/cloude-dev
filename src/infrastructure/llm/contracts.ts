export type ModelState =
  | { status: 'not-installed' }
  | { status: 'unloaded'; modelUri: string }
  | { status: 'loading'; modelUri: string }
  | { status: 'ready'; modelUri: string }
  | { status: 'generating'; modelUri: string }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; message: string };

/** An earlier turn of a conversation, passed to the model with its real chat role. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerationRequest {
  /** The latest user message. It is always the last message the model reads. */
  prompt: string;
  maxTokens: number;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
  /** Replaces the engine's default system instruction. */
  system?: string;
  /** Earlier turns, oldest first, placed between the system instruction and `prompt`. */
  history?: readonly ChatTurn[];
  /** Penalises recently generated tokens (1 = off). Omitted requests keep the engine's default sampling. */
  repeatPenalty?: number;
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
  /** MD5 of the installed copy, taken after its SHA-256 was verified. Used for the quick check before each load. */
  md5?: string;
}
