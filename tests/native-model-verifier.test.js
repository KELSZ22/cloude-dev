import { expect, test } from 'bun:test';
import { spawnSync } from 'bun';
import { fileURLToPath, pathToFileURL } from 'node:url';

const helper = pathToFileURL(fileURLToPath(new URL('../src/infrastructure/llm/native-model-verifier.native.ts', import.meta.url))).href;

// Expo's native module is mocked in an isolated runtime, so the other tests keep their real imports.
function verifyBridge(body, available = true) {
  const script = `
    import assert from 'node:assert/strict';
    import { mock } from 'bun:test';
    const calls = [];
    const cancelled = [];
    let listener;
    let removed = 0;
    let resolveVerification;
    let rejectVerification;
    const work = new Promise((resolve, reject) => {
      resolveVerification = resolve;
      rejectVerification = reject;
    });
    const native = {
      addListener(event, callback) {
        assert.equal(event, 'onVerificationProgress');
        listener = callback;
        return { remove() { removed++; listener = undefined; } };
      },
      verifyModel(...args) { calls.push(args); return work; },
      cancelVerification(id) { cancelled.push(id); },
    };
    mock.module('expo', () => ({ requireOptionalNativeModule: () => ${available ? 'native' : 'null'} }));
    const { tryVerifyNativeModel } = await import(${JSON.stringify(helper)});
    const expected = { sizeBytes: 529297312, sha256: 'a'.repeat(64) };
    const uri = 'file:///data/user/0/com.seekora/files/model.gguf.part';
    ${body}
  `;
  const result = spawnSync([process.execPath, '-e', script], { stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
  expect(result.exitCode).toBe(0);
}

test('native verification forwards integrity requirements and isolates concurrent progress', () => {
  verifyBridge(`
    const controller = new AbortController();
    const progress = [];
    const pending = tryVerifyNativeModel(uri, expected, controller.signal, (fraction) => progress.push(fraction));
    const id = calls[0][0];
    assert.deepEqual(calls[0].slice(1), [uri, expected.sizeBytes, expected.sha256]);
    listener({ requestId: 'another-request', fraction: 0.7 });
    listener({ requestId: id, fraction: NaN });
    listener({ requestId: id, fraction: 0.4 });
    resolveVerification(true);
    assert.equal(await pending, true);
    assert.deepEqual(progress, [0.4]);
    assert.equal(removed, 1);
    controller.abort();
    assert.deepEqual(cancelled, []);
  `);
});

test('aborting native verification cancels only its request and rejects a late success', () => {
  verifyBridge(`
    const controller = new AbortController();
    const progress = [];
    const pending = tryVerifyNativeModel(uri, expected, controller.signal, (fraction) => progress.push(fraction));
    const id = calls[0][0];
    controller.abort();
    listener({ requestId: id, fraction: 1 });
    resolveVerification(true);
    await assert.rejects(pending, /cancelled/);
    assert.deepEqual(cancelled, [id]);
    assert.deepEqual(progress, []);
    assert.equal(removed, 1);
  `);
});

test('an already aborted verification never creates a native task or subscription', () => {
  verifyBridge(`
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(tryVerifyNativeModel(uri, expected, controller.signal, () => {}), /cancelled/);
    assert.deepEqual(calls, []);
    assert.equal(listener, undefined);
    assert.equal(removed, 0);
  `);
});

test('a native integrity failure rejects without falling back and releases listeners', () => {
  verifyBridge(`
    const controller = new AbortController();
    const pending = tryVerifyNativeModel(uri, expected, controller.signal, () => {});
    rejectVerification(new Error('SHA-256 mismatch'));
    await assert.rejects(pending, /SHA-256 mismatch/);
    assert.equal(removed, 1);
    controller.abort();
    assert.deepEqual(cancelled, []);
  `);
});

test('false from an available native module is an error', () => {
  verifyBridge(`
    const pending = tryVerifyNativeModel(uri, expected, new AbortController().signal, () => {});
    resolveVerification(false);
    await assert.rejects(pending, /could not be verified/);
    assert.equal(removed, 1);
  `);
});

test('a build without the native module permits the existing stream verifier', () => {
  verifyBridge(`
    assert.equal(await tryVerifyNativeModel(uri, expected, new AbortController().signal, () => {}), false);
    assert.deepEqual(calls, []);
    assert.equal(listener, undefined);
  `, false);
});
