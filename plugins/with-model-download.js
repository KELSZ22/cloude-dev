/** Keep GGUF weights out of Android builds; provision them through in-app setup. */
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const legacyModelFilename = 'qwen3.5-0.8b-Q4_K_M.gguf';
const exclusion = "ignoreAssetsPatterns.add('!*.gguf')";

module.exports = function withModelDownload(config) {
  config = withDangerousMod(config, ['android', async (modConfig) => {
    // Remove only the old generated asset. The developer's original model stays untouched.
    const target = path.resolve(modConfig.modRequest.platformProjectRoot,
      'app', 'src', 'main', 'assets', 'models', legacyModelFilename);
    fs.rmSync(target, { force: true });
    return modConfig;
  }]);

  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents
      .replace(/^[ \t]*noCompress\s+['"]gguf['"][ \t]*\r?\n/gm, '')
      .replace(/^[ \t]*ignoreAssetsPatterns\.add\('!\*\.gguf'\)[ \t]*\r?\n/gm, '');
    const resourceBlock = /androidResources\s*\{([^{}]*)\}/;
    if (!resourceBlock.test(contents)) {
      throw new Error('[with-model-download] Cannot configure GGUF asset exclusion: androidResources is missing or unsupported.');
    }
    // Append after ignoreAssetsPattern: that legacy setter replaces the patterns collection.
    // In AAPT asset patterns, ! suppresses warnings; it still excludes matching files.
    contents = contents.replace(resourceBlock, (_block, body) =>
      `androidResources {${body.trimEnd()}\n        ${exclusion}\n    }`);
    modConfig.modResults.contents = contents;
    return modConfig;
  });
};
