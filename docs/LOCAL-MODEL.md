# Selected local model

The app is configured for text inference with [diodel/Qwen3.5-0.8B-Q4_K_M-GGUF](https://huggingface.co/diodel/Qwen3.5-0.8B-Q4_K_M-GGUF). It runs through llama.rn on the device, with no remote inference endpoint.

## Pinned artifact

| Field | Value |
| --- | --- |
| File | `qwen3.5-0.8b-Q4_K_M.gguf` |
| Repository revision | `dfdaeea1fdbef1d8900313cf5bed689abff3feec` |
| Bytes | `529297312` |
| SHA-256 | `fb89581c3863314f6e6e1810f11b0bbb30a07315e7b1229a5c7db10fb0100ca6` |
| Declared license | Apache-2.0 |
| Native runtime | `llama.rn 0.13.0-rc.7`, pinned exactly |
| Android targets | `arm64-v8a`, `x86_64` |

Metadata came from the repository's Hugging Face API with `blobs=true`. The installed llama.rn vendor source includes `LLM_ARCH_QWEN35` / `qwen35`. This establishes source-level support, not proof that this particular GGUF loads on the target device. The runtime is a release candidate; upgrade it deliberately and repeat device validation.

## Provision and run

1. Install dependencies with `bun install --frozen-lockfile`. `llama.rn` is trusted so Bun runs the documented artifact installer; it verifies downloaded Android/iOS archives. If artifacts are missing, run `node node_modules/llama.rn/install/download-native-artifacts.js`.
2. Connect a compatible 64-bit Android device or supported emulator. Build with `bunx expo run:android`. Expo Go and web cannot run this native runtime. For CNG config updates, use `bunx expo prebuild --platform android --no-install`; never hand-edit native files.
3. Download the [pinned GGUF](https://huggingface.co/diodel/Qwen3.5-0.8B-Q4_K_M-GGUF/resolve/dfdaeea1fdbef1d8900313cf5bed689abff3feec/qwen3.5-0.8b-Q4_K_M.gguf) using your browser, or use the explicitly online download link on the Model screen. Keep the file in device-accessible local storage. No download occurs on app startup.
4. Open Settings → On-device model status → Import local GGUF. The picker accepts local files; bytes are copied into an app-owned staging file and verified in 256 KiB chunks. Other models, altered bytes, incorrect versions, and partial files are rejected. Allow at least 550 MB free for the app copy, in addition to your original file.
5. Tap Verify and load model. The saved manifest and SHA-256 are rechecked before native initialization. No automatic loading happens on restart. Existing app-managed content survives unloading/restarting.
6. Tap Run local test. The fixed instruction requests `READY` from the real model and streams its actual output. A model may fail to follow the instruction; inspect the output. This diagnostic is not a research response and has no citations.
7. Cancel, unload, or remove when needed. Removal asks for confirmation, deletes only fixed app-owned paths, and retains the original picked file. Backgrounding cancels ongoing work and unloads the context; return to the Model screen to load it again.

## Runtime boundaries

- CPU baseline: 2 threads, 2048-token context, batch/ubatch 128, one parallel sequence, zero GPU layers, mmap enabled, mlock disabled. These are bounded defaults, not measured performance claims.
- The engine formats the model's chat template, disables thinking, tokenizes the formatted prompt, and checks the full input/output budget before generation. Output is capped at 256 tokens; the diagnostic requests only 32.
- Load, generate, and release operations preserve one-context ownership. Unload waits for initialization or cancellation to settle before release.
- Model import uses modern Expo File/Directory/Paths APIs. It does not read the whole model into JS memory or modify the external original.
- The model file is not bundled in the APK. No vision/audio projector or embeddings are provisioned.
- Research Q&A is still disabled: SQLite search, retrieval, and validated citations are the next implementation. Do not wire general model answers into the source-grounded assistant until those exist.

## Required Android validation

With a device, verify import, load, actual token streaming, cancellation, background release, unload/reload, restart recovery, corrupted-file rejection, and low-memory errors. Repeat using a release build with an embedded JS bundle in airplane mode. Record RAM, ABI, model revision, load duration, generation timings, and failures. Unit tests exercise orchestration using injected native contexts; they do not execute llama.cpp.

## Documentation

- [llama.rn at the installed tag](https://github.com/mybigday/llama.rn/tree/v0.13.0-rc.7)
- [SDK 57 FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/)
- [SDK 57 DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/)
- [SDK 57 BuildProperties](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/)
