/**
 * Packs the pinned GGUF model into the Android app when the file is present at build time.
 *
 * The model is not in git. Put it at the `file` path (see bundled-model/README.md) before running
 * `expo prebuild`, and the APK will carry it under assets/models/. Without the file, the app is built
 * as before and asks the user to import the model.
 */
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (chunk) => hash.update(chunk)).on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

module.exports = function withBundledModel(config, { file, sha256: expected, sizeBytes }) {
  config = withDangerousMod(config, ['android', async (modConfig) => {
    const source = path.resolve(modConfig.modRequest.projectRoot, file);
    const target = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets', 'models', path.basename(file));
    fs.rmSync(target, { force: true });
    if (!fs.existsSync(source)) {
      console.log(`[with-bundled-model] ${file} not found: building without a built-in model.`);
      return modConfig;
    }
    // Only the exact pinned file may ship inside the app.
    if (fs.statSync(source).size !== sizeBytes || await sha256(source) !== expected) {
      throw new Error(`[with-bundled-model] ${file} is not the pinned model (size or SHA-256 differs). Replace or remove it.`);
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // A hard link avoids a second 529 MB copy on disk; fall back to copying across drives.
    try { fs.linkSync(source, target); } catch { fs.copyFileSync(source, target); }
    console.log(`[with-bundled-model] Packed ${path.basename(file)} into the app.`);
    return modConfig;
  }]);

  // Stored uncompressed, so the first-launch copy is a plain read and the build does not spend time deflating weights.
  return withAppBuildGradle(config, (modConfig) => {
    if (!modConfig.modResults.contents.includes("noCompress 'gguf'")) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /androidResources\s*\{/, "androidResources {\n        noCompress 'gguf'");
    }
    return modConfig;
  });
};
