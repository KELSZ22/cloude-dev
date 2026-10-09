# Local model reference

This directory may hold a developer's local copy of `qwen3.5-0.8b-Q4_K_M.gguf` for manual import or desktop testing. The weights are git-ignored and are never packaged into the APK.

Users download Qwen directly from **Set up your offline assistant** during onboarding, or from **Settings → AI Model** later. The app verifies and stores the file on the device; it can then answer offline.

The Android config plugin removes the old generated model asset during prebuild and excludes GGUF files from APK assets. It preserves any original file here. Run `bunx expo prebuild --platform android --no-install --no-clean` before building an existing generated Android project.

See [local model provisioning](../docs/LOCAL-MODEL.md) for the pinned download, checksum, and runtime checks.
