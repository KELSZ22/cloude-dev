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

## Building llama.rn 0.13.0-rc.7

This release candidate compiles llama.cpp from source on every clean build. Its own `node_modules/llama.rn/android/gradle.properties` sets `rnllamaBuildFromSource=true`, and the prebuilt libraries under `jniLibs` are excluded from the build. Do not switch it back to the prebuilt libraries: the package notes that they predate changes the JNI wrapper needs.

Consequences:

- A clean arm64 build compiles one full copy of llama.cpp per CPU variant, seven in all. On an 8-core desktop the first attempt ran for 29 minutes.
- **On Windows the build fails** when the repository path is long. The Hexagon/OpenCL variant's object directory exceeded the path limit at `C:\Project\Programming\Hackathon\Seekora\cloude-dev` (262 characters), with `ninja: error: mkdir(...rnllama_v8_2_dotprod_i8mm_hexagon_opencl.dir...): No such file or directory`. A `subst` drive does not help, because Expo autolinking resolves packages back to the real path.
- llama.rn accepts a list of variants to build. Skipping the Hexagon/OpenCL variant avoids the long path, and `app.json` already sets `enableOpenCLAndHexagon` to `false`. At runtime llama.rn tries the best variant for the CPU and falls back to the generic library, so a subset still runs.

Set the list for one shell session before `bun run android`, or pass it to Gradle as `-PrnllamaVariants=...`:

```powershell
# Windows PowerShell: quick development build. Verified: the debug APK builds in under 6 minutes.
$env:ORG_GRADLE_PROJECT_rnllamaVariants = 'rnllama,rnllama_v8_2_dotprod_i8mm'
```

```bash
# Every CPU variant except Hexagon/OpenCL. Not yet tried on Windows.
export ORG_GRADLE_PROJECT_rnllamaVariants=rnllama,rnllama_v8,rnllama_v8_2,rnllama_v8_2_dotprod,rnllama_v8_2_i8mm,rnllama_v8_2_dotprod_i8mm
```

Use the full list for anything shared with testers; the two-variant list only saves build time. A phone without the `dotprod` and `i8mm` CPU features runs the generic library from the two-variant build. For an x86_64 emulator, add `rnllama_x86_64`.

## Building an APK without model weights

Model weights are downloaded after installation. The config plugin [`plugins/with-model-download.js`](../plugins/with-model-download.js) removes the old generated Qwen asset and excludes all GGUF assets from Android packaging. A developer's original file in `bundled-model/` is preserved and no longer affects the build.

Run `bunx expo prebuild --platform android --no-install --no-clean` before invoking Gradle directly on an existing generated project. `bun run android` applies this automatically. SDK 57's installed CLI cleans native directories by default; `--no-clean` applies the plugin to the existing project and keeps build caches. Generate fresh projects normally when changing SDKs or removing native dependencies.

The APK includes llama.rn and Seekora's native file verifier. It starts without an installed model on a new device. Existing verified model installations are restored after app upgrades, so those users do not need to download again. If the pinned artifact changes, update `src/shared/constants/local-model.ts` and repeat download/integrity/device validation.

## In-app model setup

Onboarding's **Set up your offline assistant** step offers **Download Qwen (529 MB)**. Users can skip it and return through **Settings → AI Model**. The app downloads the exact pinned Hugging Face revision directly into app-owned staging storage using SDK 57's native File download task. Transfer progress, verification progress, cancellation, retry, and errors are shown in setup and the model manager.

Before installation, Seekora checks available disk space, exact byte size, GGUF version 3, and the pinned SHA-256. Android computes the checksum in a bounded native stream on an IO dispatcher; other supported native platforms use the bounded JavaScript stream fallback. Only verified bytes are promoted to the final model file and persistent manifest. Failed or cancelled setup removes partial files, preserves any existing installed model, and can be retried. An existing local GGUF can still be imported through the file picker.

Allow at least 550 MB free for the installed file; downloading does not retain a second external copy. Internet is needed for this one-time transfer. Keep Seekora open during setup; leaving the foreground cancels provisioning and removes its partial file. The model source and declared Apache-2.0 license are displayed. After installation, model loading and inference run offline.

## Desktop development with Ollama (optional)

Ollama is a development aid only. The app never contacts it, and nothing in the Android build depends on it.

Ollama's library has `qwen3.5:0.8b` but no Q4_K_M build of it, so register the pinned file itself. That way the desktop runs the same weights as the phone:

```bash
# In the folder that holds qwen3.5-0.8b-Q4_K_M.gguf, with a file named Modelfile containing:
#   FROM ./qwen3.5-0.8b-Q4_K_M.gguf
ollama create seekora-qwen3.5-0.8b-q4km -f Modelfile
bun scripts/rag-desktop-check.mjs seekora-qwen3.5-0.8b-q4km
```

Verified with Ollama 0.40.1 on Windows: it reports architecture `qwen35`, 752.39M parameters, Q4_K_M, and stores the layer under the pinned SHA-256. The script sends the app's system prompt with temperature 0, a 2048-token context, and thinking disabled, to mirror `llama-engine.ts`. Ollama applies its own chat-template handling, so output on the phone can differ.

## Provision and run

1. Install dependencies with `bun install --frozen-lockfile`. `llama.rn` is trusted so Bun runs the documented artifact installer; it verifies downloaded Android/iOS archives. If artifacts are missing, run `node node_modules/llama.rn/install/download-native-artifacts.js`.
2. Connect a compatible 64-bit Android device or supported emulator. Build with `bun run android`. Expo Go and web cannot run this native runtime. For CNG config updates, use `bunx expo prebuild --platform android --no-install --no-clean`; never hand-edit native files.
3. During onboarding, tap **Download Qwen (529 MB)** and keep the app open while transfer and verification finish. Alternatively, open **Settings → AI Model** later and download there. No download occurs without user action.
4. For manual import, download the [pinned GGUF](https://huggingface.co/diodel/Qwen3.5-0.8B-Q4_K_M-GGUF/resolve/dfdaeea1fdbef1d8900313cf5bed689abff3feec/qwen3.5-0.8b-Q4_K_M.gguf) separately, then choose **Import local GGUF**. Bytes are copied into an app-owned staging file and verified without changing the original. Allow at least 550 MB free for the app copy, in addition to the external original.
5. Tap **Verify and load model**. The saved manifest and file MD5 are rechecked before loading. No automatic loading happens on restart. Existing app-managed content survives unloading/restarting.
6. Tap Run local test. The fixed instruction requests `READY` from the real model and streams its actual output. A model may fail to follow the instruction; inspect the output. This diagnostic is not a research response and has no citations.
7. Cancel, unload, or remove when needed. Removal asks for confirmation, deletes only fixed app-owned paths, and retains the original picked file. Backgrounding cancels ongoing work and unloads the context; return to the Model screen to load it again.

## Runtime boundaries

- CPU baseline: 2 threads, 2048-token context, batch/ubatch 128, one parallel sequence, zero GPU layers, mmap enabled, mlock disabled. These are bounded defaults, not measured performance claims.
- The engine formats the model's chat template, disables thinking, tokenizes the formatted prompt, and checks the full input/output budget before generation. Output is capped at 256 tokens; the diagnostic requests only 32.
- Load, generate, and release operations preserve one-context ownership. Unload waits for initialization or cancellation to settle before release.
- Model import uses modern Expo File/Directory/Paths APIs. It does not read the whole model into JS memory or modify the external original.
- SDK 57's Android DownloadTask has a cancellation branch that can leave its promise pending. Seekora stops it through the supported pause path, retries the pause across native startup races, waits for the writer to settle, then deletes staging. It never offers the paused transfer for resume. Recheck this workaround when upgrading expo-file-system.
- Model weights are excluded from the APK and provisioned only by explicit in-app download or manual import. No vision/audio projector or embeddings are provisioned.
- Research Q&A is still disabled: SQLite search, retrieval, and validated citations are the next implementation. Do not wire general model answers into the source-grounded assistant until those exist.

## Required Android validation

Desktop/build checks on 2026-10-10: typecheck passed; lint passed with one existing LibraryPage hook warning; Bun tests passed (197 passed, 2 live-API tests skipped). The ARM64 standalone release build passed with its release lint checks enabled. `android/app/build/outputs/apk/release/app-release.apk` was 103,461,112 bytes (103.5 MB); ZIP inspection confirmed zero GGUF entries, an embedded JavaScript bundle, llama.rn libraries, and the native model verifier. The original local GGUF was preserved. A JPEG incorrectly named `dashboard.png` was renamed to `.jpg` with identical image bytes to fix Android resource compilation.

With a device, verify import, load, actual token streaming, cancellation, background release, unload/reload, restart recovery, corrupted-file rejection, and low-memory errors. Repeat using a release build with an embedded JS bundle in airplane mode. Record RAM, ABI, model revision, load duration, generation timings, and failures. Unit tests exercise orchestration using injected native contexts; they do not execute llama.cpp.

For the download flow, also check a fresh installation without a model, network failure followed by retry, Cancel immediately after tapping Download and during transfer/verification, background interruption, force-closing midway through transfer, and insufficient storage. Confirm partial files are reclaimed, an installed model survives app upgrades, skipped onboarding can download from Settings, and inference works in airplane mode after setup. These physical-device checks remain pending; desktop tests and native compilation cannot establish phone performance or Android lifecycle behavior.

## Documentation

- [llama.rn at the installed tag](https://github.com/mybigday/llama.rn/tree/v0.13.0-rc.7)
- [SDK 57 FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/)
- [SDK 57 DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/)
- [SDK 57 BuildProperties](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/)
