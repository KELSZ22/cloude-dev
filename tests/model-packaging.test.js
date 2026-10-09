// eslint-disable-next-line import/no-unresolved
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, linkSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import withModelDownload from '../plugins/with-model-download';

describe('download-only model packaging', () => {
  test('removes the legacy generated hard link while preserving the original model and other assets', async () => {
    const projectRoot = mkdtempSync(path.join(tmpdir(), 'seekora-packaging-'));
    try {
      const platformProjectRoot = path.join(projectRoot, 'android');
      const assets = path.join(platformProjectRoot, 'app', 'src', 'main', 'assets', 'models');
      mkdirSync(assets, { recursive: true });
      const original = path.join(projectRoot, 'qwen3.5-0.8b-Q4_K_M.gguf');
      const generated = path.join(assets, path.basename(original));
      const otherAsset = path.join(assets, 'notice.txt');
      writeFileSync(original, 'test model');
      linkSync(original, generated);
      writeFileSync(otherAsset, 'keep me');
      const config = withModelDownload({});
      const input = { modRequest: { projectRoot, platformProjectRoot } };
      await config.mods.android.dangerous(input);
      await config.mods.android.dangerous(input);
      expect(existsSync(generated)).toBe(false);
      expect(readFileSync(original, 'utf8')).toBe('test model');
      expect(readFileSync(otherAsset, 'utf8')).toBe('keep me');
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  test('excludes all GGUF assets on both fresh and reused native projects without duplicating policy', async () => {
    const config = withModelDownload({});
    const template = "android {\n    androidResources {\n        noCompress 'gguf'\n        ignoreAssetsPattern '!.git'\n    }\n}";
    let input = { modRequest: {}, modResults: { contents: template } };
    input = await config.mods.android.appBuildGradle(input);
    input = await config.mods.android.appBuildGradle(input);
    expect(input.modResults.contents).not.toContain('noCompress');
    expect(input.modResults.contents.match(/ignoreAssetsPatterns\.add\('!\*\.gguf'\)/g)).toHaveLength(1);
    expect(input.modResults.contents).toContain("ignoreAssetsPattern '!.git'");
    expect(input.modResults.contents.indexOf("ignoreAssetsPatterns.add('!*.gguf')"))
      .toBeGreaterThan(input.modResults.contents.indexOf("ignoreAssetsPattern '!.git'"));
    const fresh = await config.mods.android.appBuildGradle({ modRequest: {}, modResults: { contents: "android { androidResources { } }" } });
    expect(fresh.modResults.contents).toContain("ignoreAssetsPatterns.add('!*.gguf')");
  });

  test('fails explicitly if a future native template cannot enforce the asset exclusion', async () => {
    const config = withModelDownload({});
    await expect(config.mods.android.appBuildGradle({ modRequest: {}, modResults: { contents: 'android {}' } })).rejects.toThrow('asset exclusion');
  });
});
