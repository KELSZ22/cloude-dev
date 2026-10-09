import type { CompletionParams, ContextParams, FormattedChatResult, TokenData, RNLlamaOAICompatibleMessage } from 'llama.rn';

import type { GenerationRequest, LLMEngine, ModelState } from './contracts';

export interface NativeContext {
  getFormattedChat(messages: RNLlamaOAICompatibleMessage[], template?: string | null, params?: {
    jinja?: boolean; enable_thinking?: boolean; chat_template_kwargs?: Record<string, string | number | boolean>;
  }): Promise<FormattedChatResult>;
  tokenize(text: string): Promise<{ tokens: number[] }>;
  completion(params: CompletionParams, onToken?: (data: TokenData) => void): Promise<{ text: string }>;
  stopCompletion(): Promise<void>;
  release(): Promise<void>;
}

export type ContextFactory = (params: ContextParams) => Promise<NativeContext>;

export class UnsupportedRuntimeError extends Error {}

const DEFAULT_SYSTEM = 'Follow the user instruction. Be brief. Do not invent citations.';

/** Every character the model will read, so a long history cannot slip past the prompt limit. */
function requestChars(request: GenerationRequest): number {
  return request.prompt.length + (request.system?.length ?? 0)
    + (request.history ?? []).reduce((total, turn) => total + turn.content.length, 0);
}

/** System instruction, then earlier turns with their real roles, then the latest user message last. */
export function chatMessages(request: GenerationRequest): RNLlamaOAICompatibleMessage[] {
  return [
    { role: 'system', content: request.system ?? DEFAULT_SYSTEM },
    ...(request.history ?? []).map((turn) => ({ role: turn.role, content: turn.content })),
    { role: 'user', content: request.prompt },
  ];
}

/** Native calls are injected so lifecycle logic can be tested without loading RN. */
export class LlamaRnEngine implements LLMEngine {
  private state: ModelState = { status: 'not-installed' };
  private context: NativeContext | null = null;
  private contextUri = '';
  private loading: Promise<void> | null = null;
  private generation: Promise<string> | null = null;
  private releasing: Promise<void> | null = null;
  private stopping: Promise<void> | null = null;
  private cancelled = false;

  constructor(private readonly createContext: ContextFactory) {}

  getState(): ModelState { return this.state; }

  load(modelUri: string): Promise<void> {
    if (this.loading || this.generation || this.releasing || this.context) {
      return Promise.reject(new Error('Unload the current model before loading another.'));
    }
    if (!modelUri.startsWith('file://')) return Promise.reject(new Error('A local model file is required.'));
    this.state = { status: 'loading', modelUri };
    this.loading = this.initialize(modelUri).finally(() => { this.loading = null; });
    return this.loading;
  }

  private async initialize(modelUri: string) {
    try {
      this.context = await this.createContext({
        model: modelUri,
        n_ctx: 2048,
        n_batch: 128,
        n_ubatch: 128,
        n_parallel: 1,
        n_threads: 2,
        n_gpu_layers: 0,
        use_mmap: true,
        use_mlock: false,
      });
      this.contextUri = modelUri;
      this.state = { status: 'ready', modelUri };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Local runtime initialization failed.';
      this.state = error instanceof UnsupportedRuntimeError
        ? { status: 'unsupported', reason: message }
        : { status: 'error', message: `Cannot load this model. Check device memory and runtime compatibility. ${message}` };
      throw error;
    }
  }

  generate(request: GenerationRequest): Promise<string> {
    if (!this.context || this.state.status !== 'ready' || this.releasing || this.generation) {
      return Promise.reject(new Error('Load the model before generating.'));
    }
    if (!request.prompt.trim() || requestChars(request) > 4000 || !Number.isInteger(request.maxTokens)
      || request.maxTokens < 1 || request.maxTokens > 256) {
      return Promise.reject(new Error('Use a prompt of 1–4000 characters and 1–256 output tokens.'));
    }
    if (request.signal?.aborted) return Promise.reject(new Error('Generation cancelled.'));
    this.cancelled = false;
    const context = this.context;
    const modelUri = this.state.modelUri;
    this.state = { status: 'generating', modelUri };
    this.generation = this.complete(context, modelUri, request).finally(() => { this.generation = null; });
    return this.generation;
  }

  private async complete(context: NativeContext, modelUri: string, request: GenerationRequest) {
    const onAbort = () => { void this.cancel().catch(() => undefined); };
    request.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const messages = chatMessages(request);
      const formatted = await context.getFormattedChat(messages, undefined, {
        jinja: true, enable_thinking: false, chat_template_kwargs: { enable_thinking: false },
      });
      const { tokens } = await context.tokenize(formatted.prompt);
      if (tokens.length + request.maxTokens + 32 > 2048) throw new Error('The prompt exceeds the model context budget.');
      if (this.cancelled || request.signal?.aborted) throw new Error('Generation cancelled.');
      const result = await context.completion({
        messages,
        jinja: true,
        enable_thinking: false,
        chat_template_kwargs: { enable_thinking: false },
        n_predict: request.maxTokens,
        temperature: 0,
        ...(request.repeatPenalty ? { penalty_repeat: request.repeatPenalty, penalty_last_n: 64 } : {}),
        stop: ['<|im_end|>', '<|endoftext|>'],
      }, (data) => {
        if (!this.cancelled && !request.signal?.aborted) request.onToken?.(data.token);
      });
      if (this.cancelled || request.signal?.aborted) throw new Error('Generation cancelled.');
      return result.text;
    } finally {
      request.signal?.removeEventListener('abort', onAbort);
      this.state = { status: 'ready', modelUri };
    }
  }

  async cancel(): Promise<void> {
    if (this.stopping) return this.stopping;
    if (!this.generation || !this.context) return;
    this.cancelled = true;
    this.stopping = this.context.stopCompletion().finally(() => { this.stopping = null; });
    await this.stopping;
  }

  unload(): Promise<void> {
    if (this.releasing) return this.releasing;
    this.releasing = this.releaseContext().finally(() => { this.releasing = null; });
    return this.releasing;
  }

  private async releaseContext() {
    if (this.loading) await this.loading.catch(() => undefined);
    if (this.generation) {
      const generation = this.generation;
      await this.cancel();
      await generation.catch(() => undefined);
    }
    if (!this.context) {
      if (this.state.status !== 'unloaded') this.state = { status: 'not-installed' };
      return;
    }
    const modelUri = this.contextUri;
    // Retain ownership on release failure so another context cannot be allocated.
    try { await this.context.release(); }
    catch (error) {
      this.state = { status: 'error', message: 'Native model release failed. Retry unloading or restart the app before using inference.' };
      throw error;
    }
    this.context = null;
    this.state = { status: 'unloaded', modelUri };
  }
}
