// eslint-disable-next-line import/no-unresolved
import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';

import { adaptModelDownloadTask, downloadAndInstallModel } from '../src/infrastructure/llm/download-model';
import { verifyModelStream } from '../src/infrastructure/llm/verify-model';

const fixture = Uint8Array.from([71, 71, 85, 70, 3, 0, 0, 0, 42, 43, 44, 45]);
const expected = { sizeBytes: fixture.length, sha256: createHash('sha256').update(fixture).digest('hex') };

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve: (value) => resolve(value), reject: (error) => reject(error) };
}

/** Simulates native file writes while running the real GGUF/SHA verifier against those bytes. */
function harness({ bytes = fixture, transfer, installed = null, installFailure } = {}) {
  const state = { staged: null, installed, writing: false, cleanup: 0, released: 0, cancelled: 0, verified: false };
  const events = [];
  const progress = [];
  const controller = new AbortController();
  const manifest = {
    id: 'test-model', version: 'pinned', localUri: 'file:///models/pinned/model.gguf',
    sizeBytes: expected.sizeBytes, sha256: expected.sha256, license: 'Apache-2.0', sourceUrl: null,
  };
  const ports = {
    prepare() {
      events.push('prepare');
      if (state.installed) throw new Error('Remove the installed model before replacing it.');
      state.staged = null;
    },
    createTask(signal, onBytes) {
      events.push('create-task');
      return {
        async downloadAsync() {
          state.writing = true;
          events.push('download');
          try {
            if (transfer) return await transfer({
              signal, onBytes, write: (value) => { state.staged = value.slice(); },
            });
            state.staged = bytes.slice();
            onBytes(Math.floor(bytes.length / 2));
            onBytes(bytes.length);
            return { uri: 'file:///models/pinned/model.gguf.part' };
          } finally {
            state.writing = false;
            events.push('writer-settled');
          }
        },
        cancel() { state.cancelled++; events.push('cancel'); },
        release() { state.released++; events.push('release'); },
      };
    },
    size: () => state.staged?.length ?? 0,
    async verify(signal, update) {
      events.push('verify');
      let offset = 0;
      await verifyModelStream({
        expected, signal, onProgress: update,
        read(length) {
          const part = state.staged.slice(offset, offset + length);
          offset += part.length;
          return part;
        },
      });
      state.verified = true;
    },
    install() {
      events.push('install');
      if (installFailure) throw new Error(installFailure);
      state.installed = { manifest, bytes: state.staged };
      state.staged = null;
      return manifest;
    },
    cleanup() {
      if (state.writing) throw new Error('Staging was removed before the native writer settled.');
      state.cleanup++;
      events.push('cleanup');
      state.staged = null;
    },
  };
  const run = (onProgress = (update) => progress.push(update)) => downloadAndInstallModel(ports, {
    sizeBytes: expected.sizeBytes, signal: controller.signal, onProgress,
  });
  return { state, events, progress, controller, run, manifest };
}

describe('explicit model download and installation', () => {
  test('installs verified bytes, records the manifest, reports each stage and releases the native task', async () => {
    const setup = harness();
    expect(await setup.run()).toEqual(setup.manifest);
    expect(setup.state.installed.bytes).toEqual(fixture);
    expect(setup.state.installed.manifest).toEqual(setup.manifest);
    expect(setup.state.verified).toBe(true);
    expect(setup.state.staged).toBeNull();
    expect(setup.state.cleanup).toBe(0);
    expect(setup.state.released).toBe(1);
    expect(setup.events).toEqual(['prepare', 'create-task', 'download', 'writer-settled', 'verify', 'install', 'release']);
    expect(setup.progress[0]).toEqual({ stage: 'downloading', fraction: 0 });
    expect(setup.progress).toContainEqual({ stage: 'downloading', fraction: 0.5 });
    expect(setup.progress).toContainEqual({ stage: 'verifying', fraction: 0 });
    expect(setup.progress.at(-1)).toEqual({ stage: 'verifying', fraction: 1 });
  });

  test('does nothing for an already-cancelled request', async () => {
    const setup = harness();
    setup.controller.abort();
    await expect(setup.run()).rejects.toThrow('cancelled');
    expect(setup.events).toEqual([]);
  });

  test('preserves an existing installation and never starts the download', async () => {
    const installed = { manifest: { id: 'existing' }, bytes: fixture };
    const setup = harness({ installed });
    await expect(setup.run()).rejects.toThrow('Remove');
    expect(setup.state.installed).toBe(installed);
    expect(setup.events).toEqual(['prepare']);
  });

  test('cleans partial bytes after network errors and allows an explicit retry', async () => {
    let attempts = 0;
    const setup = harness({ transfer: async ({ write }) => {
      attempts++;
      write(attempts === 1 ? fixture.slice(0, 8) : fixture);
      if (attempts === 1) throw new Error('HTTP 503: network unavailable');
      return {};
    } });
    await expect(setup.run()).rejects.toThrow('HTTP 503');
    expect(setup.state.staged).toBeNull();
    expect(setup.state.installed).toBeNull();
    expect(setup.state.released).toBe(1);
    expect(await setup.run()).toEqual(setup.manifest);
    expect(setup.state.released).toBe(2);
  });

  test('rejects truncated and oversized downloads without verification or installation', async () => {
    for (const bytes of [fixture.slice(0, 10), Uint8Array.from([...fixture, 1])]) {
      const setup = harness({ bytes });
      await expect(setup.run()).rejects.toThrow('wrong size');
      expect(setup.events).not.toContain('verify');
      expect(setup.state.installed).toBeNull();
      expect(setup.state.staged).toBeNull();
      expect(setup.state.released).toBe(1);
    }
  });

  test('rejects altered weights and invalid GGUF files before promotion', async () => {
    const altered = fixture.slice(); altered[10] = 99;
    for (const [bytes, reason] of [[altered, 'SHA-256'], [new Uint8Array(fixture.length), 'GGUF']]) {
      const setup = harness({ bytes });
      await expect(setup.run()).rejects.toThrow(reason);
      expect(setup.events).not.toContain('install');
      expect(setup.state.installed).toBeNull();
      expect(setup.state.staged).toBeNull();
      expect(setup.state.released).toBe(1);
    }
  });

  test('cancels the task and waits for its writer to settle before deleting staging', async () => {
    const begun = deferred();
    const settling = deferred();
    const setup = harness({ transfer: async ({ write }) => {
      write(fixture.slice(0, 8));
      begun.resolve();
      await settling.promise;
      throw new Error('Native download cancelled');
    } });
    const result = setup.run().catch((error) => error);
    await begun.promise;
    setup.controller.abort();
    expect(setup.state.cancelled).toBe(1);
    expect(setup.state.cleanup).toBe(0);
    expect(setup.state.released).toBe(0);
    settling.resolve();
    expect((await result).message).toContain('cancelled');
    expect(setup.state.staged).toBeNull();
    expect(setup.events.slice(-3)).toEqual(['writer-settled', 'cleanup', 'release']);
  });

  test('never promotes a download that finishes after cancellation', async () => {
    const setup = harness({ transfer: async ({ write }) => {
      write(fixture);
      setup.controller.abort();
      return {};
    } });
    await expect(setup.run()).rejects.toThrow('cancelled');
    expect(setup.events).not.toContain('verify');
    expect(setup.state.installed).toBeNull();
    expect(setup.state.staged).toBeNull();
  });

  test('cancellation during checksum verification removes staging and never installs', async () => {
    const setup = harness();
    await expect(setup.run((update) => {
      if (update.stage === 'verifying' && update.fraction > 0) setup.controller.abort();
    })).rejects.toThrow('cancelled');
    expect(setup.events).not.toContain('install');
    expect(setup.state.staged).toBeNull();
    expect(setup.state.released).toBe(1);
  });

  test('treats an unexpectedly paused task as an incomplete download', async () => {
    const setup = harness({ transfer: async () => null });
    await expect(setup.run()).rejects.toThrow('did not finish');
    expect(setup.state.installed).toBeNull();
    expect(setup.state.cleanup).toBe(1);
    expect(setup.state.released).toBe(1);
  });

  test('cleans staging if manifest installation fails', async () => {
    const setup = harness({ installFailure: 'Cannot write the model manifest.' });
    await expect(setup.run()).rejects.toThrow('manifest');
    expect(setup.state.installed).toBeNull();
    expect(setup.state.staged).toBeNull();
    expect(setup.state.released).toBe(1);
  });

  test('Android stop uses the settling pause path, then discards bytes without installing', async () => {
    const begun = deferred();
    const settled = deferred();
    const controller = new AbortController();
    let state = 'idle';
    let paused = 0, cancelled = 0, released = 0, cleaned = 0, installed = false;
    const nativeTask = {
      get state() { return state; },
      async downloadAsync() {
        state = 'active';
        begun.resolve();
        await settled.promise;
        state = 'paused';
        return null;
      },
      pause() { paused++; settled.resolve(); },
      cancel() { cancelled++; /* SDK 57's faulty branch would never settle. */ },
      release() { released++; },
    };
    const result = downloadAndInstallModel({
      prepare() {},
      createTask: () => adaptModelDownloadTask(nativeTask, true),
      size: () => 8,
      verify: async () => { throw new Error('A stopped download must not be verified.'); },
      install() { installed = true; return {}; },
      cleanup() { expect(state).toBe('paused'); cleaned++; },
    }, { sizeBytes: fixture.length, signal: controller.signal, onProgress() {} }).catch((error) => error);
    await begun.promise;
    controller.abort();
    expect((await result).message).toContain('cancelled');
    expect(paused).toBe(1);
    expect(cancelled).toBe(0);
    expect(released).toBe(1);
    expect(cleaned).toBe(1);
    expect(installed).toBe(false);
  });

  test('other platforms keep native cancellation and an idle Android task never pauses', () => {
    let pauses = 0, cancels = 0;
    const nativeTask = {
      state: 'idle', downloadAsync: async () => null,
      pause() { pauses++; }, cancel() { cancels++; }, release() {},
    };
    adaptModelDownloadTask(nativeTask, true).cancel();
    expect(pauses).toBe(0);
    adaptModelDownloadTask(nativeTask, false).cancel();
    expect(cancels).toBe(1);
  });

  test('retries an Android pause lost during native startup and clears its retry after settlement', async () => {
    const settling = deferred();
    let state = 'idle', pauses = 0, cancelled = 0;
    const task = adaptModelDownloadTask({
      get state() { return state; },
      async downloadAsync() {
        state = 'active';
        // The first pause occurs before the native coroutine registers its call and gets reset.
        await Promise.resolve();
        return settling.promise;
      },
      pause() {
        pauses++;
        if (pauses >= 2) { state = 'paused'; settling.resolve(null); }
      },
      cancel() { cancelled++; },
      release() {},
    }, true);
    const download = task.downloadAsync();
    task.cancel();
    expect(pauses).toBe(1);
    expect(await download).toBeNull();
    expect(pauses).toBe(2);
    expect(cancelled).toBe(0);
    task.release();
    // A stale progress delivery cannot restart cancellation after the native writer settles.
    task.onProgress();
    expect(pauses).toBe(2);
  });

  test('cancelled Android progress retries a lost pause without waiting for the retry timer', async () => {
    const settling = deferred();
    let state = 'idle', pauses = 0;
    const task = adaptModelDownloadTask({
      get state() { return state; },
      async downloadAsync() { state = 'active'; return settling.promise; },
      pause() {
        pauses++;
        if (pauses === 2) { state = 'paused'; settling.resolve(null); }
      },
      cancel() { throw new Error('The unsafe Android cancellation must not run.'); },
      release() {},
    }, true);
    const download = task.downloadAsync();
    task.cancel();
    task.onProgress();
    expect(await download).toBeNull();
    expect(pauses).toBe(2);
    task.onProgress();
    expect(pauses).toBe(2);
    task.release();
  });
});
