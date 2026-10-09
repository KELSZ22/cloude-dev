// eslint-disable-next-line import/no-unresolved
import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';

import { LlamaRnEngine, UnsupportedRuntimeError } from '../src/infrastructure/llm/llama-engine';
import { verifyModelStream } from '../src/infrastructure/llm/verify-model';

const fixture = Uint8Array.from([71, 71, 85, 70, 3, 0, 0, 0, 42, 43, 44, 45]);
const expected = { sizeBytes: fixture.length, sha256: createHash('sha256').update(fixture).digest('hex') };
function reader(bytes) {
  let offset = 0;
  return (length) => { const chunk = bytes.slice(offset, offset + length); offset += chunk.length; return chunk; };
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve: (value) => resolve(value) };
}
function context(overrides = {}) {
  return {
    getFormattedChat: async () => ({ prompt: 'formatted local prompt', type: 'jinja', has_media: false }),
    tokenize: async () => ({ tokens: [1, 2, 3] }),
    completion: async (_, callback) => { callback?.({ token: 'READY' }); return { text: 'READY' }; },
    stopCompletion: async () => {},
    release: async () => {},
    ...overrides,
  };
}

describe('pinned model integrity', () => {
  test('streams verified bytes without changing them', async () => {
    const copied = [];
    await verifyModelStream({ expected, read: reader(fixture), write: (bytes) => copied.push(...bytes) });
    expect(copied).toEqual([...fixture]);
  });
  test('rejects a non-GGUF header', async () => {
    await expect(verifyModelStream({ expected, read: reader(new Uint8Array(12)) })).rejects.toThrow('not a GGUF');
  });
  test('validates multiple chunks and reports bounded reads', async () => {
    const bytes = new Uint8Array(700000).fill(42); bytes.set(fixture);
    const digest = createHash('sha256').update(bytes).digest('hex');
    const read = reader(bytes); let reads = 0; let progress = 0;
    await verifyModelStream({ expected: { sizeBytes: bytes.length, sha256: digest }, read: (length) => {
      expect(length).toBeLessThanOrEqual(256 * 1024); reads++; return read(length);
    }, onProgress: (fraction) => { progress = fraction; } });
    expect(reads).toBe(4); expect(progress).toBe(1);
  });
  test('rejects unsupported GGUF versions', async () => {
    const bytes = fixture.slice(); bytes[4] = 2;
    await expect(verifyModelStream({ expected, read: reader(bytes) })).rejects.toThrow('version 3');
  });
  test('rejects truncated and oversized files', async () => {
    await expect(verifyModelStream({ expected, read: reader(fixture.slice(0, 10)) })).rejects.toThrow('truncated');
    await expect(verifyModelStream({ expected, read: reader(Uint8Array.from([...fixture, 1])) })).rejects.toThrow('size');
  });
  test('rejects changed content under a valid GGUF header', async () => {
    const bytes = fixture.slice(); bytes[10] = 99;
    await expect(verifyModelStream({ expected, read: reader(bytes) })).rejects.toThrow('SHA-256');
  });
  test('cancelled validation never reads or writes', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(verifyModelStream({ expected, signal: controller.signal,
      read: () => { throw new Error('should not read'); } })).rejects.toThrow('cancelled');
  });
});

describe('native context lifecycle', () => {
  test('rejects generation without a model and rejects remote model paths', async () => {
    const engine = new LlamaRnEngine(async () => context());
    await expect(engine.generate({ prompt: 'test', maxTokens: 10 })).rejects.toThrow('Load');
    await expect(engine.load('https://example.com/model.gguf')).rejects.toThrow('local');
  });
  test('loads one bounded CPU context, streams, and releases it', async () => {
    let released = 0;
    const engine = new LlamaRnEngine(async (params) => {
      expect(params.n_ctx).toBe(2048); expect(params.n_gpu_layers).toBe(0); expect(params.n_parallel).toBe(1);
      return context({ release: async () => { released++; } });
    });
    await engine.load('file:///model.gguf');
    await expect(engine.load('file:///another.gguf')).rejects.toThrow('Unload');
    const tokens = [];
    expect(await engine.generate({ prompt: 'Reply READY', maxTokens: 32, onToken: (token) => tokens.push(token) })).toBe('READY');
    expect(tokens).toEqual(['READY']);
    await engine.unload(); await engine.unload();
    expect(released).toBe(1); expect(engine.getState().status).toBe('unloaded');
  });
  test('reports unavailable native runtime honestly', async () => {
    const engine = new LlamaRnEngine(async () => { throw new UnsupportedRuntimeError('Development build required'); });
    await expect(engine.load('file:///model.gguf')).rejects.toThrow('Development build');
    expect(engine.getState().status).toBe('unsupported');
  });
  test('reports native initialization failures without generating', async () => {
    const engine = new LlamaRnEngine(async () => { throw new Error('out of memory'); });
    await expect(engine.load('file:///model.gguf')).rejects.toThrow('memory');
    expect(engine.getState().status).toBe('error');
  });
  test('retains context ownership if native release fails', async () => {
    const engine = new LlamaRnEngine(async () => context({ release: async () => { throw new Error('release failed'); } }));
    await engine.load('file:///model.gguf');
    await expect(engine.unload()).rejects.toThrow('release failed');
    await expect(engine.load('file:///second.gguf')).rejects.toThrow('Unload');
    await expect(engine.generate({ prompt: 'test', maxTokens: 32 })).rejects.toThrow('Load');
  });
  test('unloading during initialization waits for the context and releases once', async () => {
    const loading = deferred(); let released = 0;
    const engine = new LlamaRnEngine(() => loading.promise);
    const load = engine.load('file:///model.gguf'); const unload = engine.unload();
    await expect(engine.load('file:///another.gguf')).rejects.toThrow('Unload');
    loading.resolve(context({ release: async () => { released++; } }));
    await load; await unload;
    expect(released).toBe(1); expect(engine.getState().status).toBe('unloaded');
  });
  test('rejects prompts larger than the token context without invoking completion', async () => {
    const engine = new LlamaRnEngine(async () => context({ tokenize: async () => ({ tokens: Array(2048).fill(1) }),
      completion: async () => { throw new Error('should not complete'); } }));
    await engine.load('file:///model.gguf');
    await expect(engine.generate({ prompt: 'test', maxTokens: 32 })).rejects.toThrow('context budget');
    expect(engine.getState().status).toBe('ready'); await engine.unload();
  });
  test('cancels active generation before releasing the context; rejects concurrent generation', async () => {
    const pending = deferred(); const started = deferred(); let released = 0;
    const engine = new LlamaRnEngine(async () => context({
      completion: () => { started.resolve(); return pending.promise; },
      stopCompletion: async () => { pending.resolve({ text: 'partial' }); },
      release: async () => { released++; },
    }));
    await engine.load('file:///model.gguf');
    const generation = engine.generate({ prompt: 'test', maxTokens: 32 });
    const rejected = generation.catch((error) => error);
    await started.promise;
    await expect(engine.generate({ prompt: 'another', maxTokens: 32 })).rejects.toThrow('Load');
    await engine.unload();
    expect((await rejected).message).toContain('cancelled');
    expect(released).toBe(1); expect(engine.getState().status).toBe('unloaded');
  });
});
