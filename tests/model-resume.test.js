// eslint-disable-next-line import/no-unresolved
import { describe, expect, test } from 'bun:test';

import { createResumableTask } from '../src/infrastructure/llm/download-model';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve: (value) => resolve(value) };
}

/** A fake native transfer: `run` waits until the test finishes it or pauses it. */
function rig({ pauseInBackground = true, active = true, initial = null } = {}) {
  const log = { starts: [], saved: [], cleared: 0, released: 0, cancelled: 0 };
  let foreground = active;
  const listeners = new Set();
  const segments = [];
  const ports = {
    start(saved) {
      log.starts.push(saved);
      const gate = deferred();
      let state = 'idle';
      const segment = {
        get state() { return state; },
        run() { state = 'active'; return gate.promise; },
        pause() { state = 'paused'; gate.resolve(null); },
        cancel() { log.cancelled++; state = 'cancelled'; gate.resolve(null); },
        release() { log.released++; },
        savable() { return { url: 'u', fileUri: 'f', isDirectory: false, resumeData: `r${log.starts.length}` }; },
        finish() { state = 'completed'; gate.resolve({ uri: 'done' }); },
      };
      segments.push(segment);
      return segment;
    },
    save(state) { log.saved.push(state); },
    clear() { log.cleared++; },
    isActive: () => foreground,
    onVisibility(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    pauseInBackground,
  };
  const setForeground = (value) => { foreground = value; listeners.forEach((listener) => listener(value)); };
  return { ports, log, segments, setForeground, task: createResumableTask(ports, initial) };
}

const tick = () => new Promise((done) => setTimeout(done, 20));

describe('createResumableTask', () => {
  test('finishes a single segment and clears resume state', async () => {
    const { task, segments, log } = rig();
    const run = task.downloadAsync();
    await tick();
    segments[0].finish();
    expect(await run).toEqual({ uri: 'done' });
    expect(log.cleared).toBe(1);
    expect(log.saved).toHaveLength(0);
  });

  test('pauses in the background, persists state, and resumes from it in the foreground', async () => {
    const { task, segments, log, setForeground } = rig();
    const run = task.downloadAsync();
    await tick();
    setForeground(false);
    await tick();
    expect(log.saved).toHaveLength(1);
    expect(log.released).toBe(1);
    expect(segments).toHaveLength(1); // stays paused while hidden
    setForeground(true);
    await tick();
    expect(segments).toHaveLength(2);
    expect(log.starts[1]).toEqual(log.saved[0]);
    segments[1].finish();
    await run;
    expect(log.cleared).toBe(1);
  });

  test('starts from saved state left by an earlier launch', async () => {
    const saved = { url: 'u', fileUri: 'f', isDirectory: false, resumeData: 'old' };
    const { task, segments, log } = rig({ initial: saved });
    const run = task.downloadAsync();
    await tick();
    expect(log.starts[0]).toBe(saved);
    segments[0].finish();
    await run;
  });

  test('never pauses when the platform keeps transferring in the background', async () => {
    const { task, segments, log, setForeground } = rig({ pauseInBackground: false });
    const run = task.downloadAsync();
    await tick();
    setForeground(false);
    await tick();
    expect(log.saved).toHaveLength(0);
    segments[0].finish();
    await run;
  });

  test('cancelling while running stops the segment and rejects', async () => {
    const { task, log } = rig();
    const run = task.downloadAsync();
    await tick();
    task.cancel();
    await expect(run).rejects.toThrow('cancelled');
    expect(log.cancelled).toBe(1);
    expect(log.cleared).toBe(0);
  });

  test('cancelling while paused in the background rejects without starting again', async () => {
    const { task, segments, setForeground } = rig();
    const run = task.downloadAsync();
    await tick();
    setForeground(false);
    await tick();
    task.cancel();
    await expect(run).rejects.toThrow('cancelled');
    expect(segments).toHaveLength(1);
  });

  test('does not start a transfer while the app is hidden', async () => {
    const { task, segments, setForeground } = rig({ active: false });
    const run = task.downloadAsync();
    await tick();
    expect(segments).toHaveLength(0);
    setForeground(true);
    await tick();
    expect(segments).toHaveLength(1);
    segments[0].finish();
    await run;
  });
});
