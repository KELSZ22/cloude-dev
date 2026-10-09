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

## Building an APK with the model inside (optional)

By default the model is not in the APK and each user imports it. To ship it inside the app instead:

1. Put the pinned file at `bundled-model/qwen3.5-0.8b-Q4_K_M.gguf`. It is git-ignored.
2. Run `bunx expo prebuild --platform android --no-install`. The config plugin [`plugins/with-bundled-model.js`](../plugins/with-bundled-model.js) checks the file's size and SHA-256 against the values in `app.json`, stops if they differ, and packs the file into the app's assets, stored uncompressed.
3. Build as usual.

On first launch the app sees the built-in model, copies it into its own storage, and checks the copy's size and MD5 (`localModel.md5`). The user then only taps "Load the on-device model". No picker and no 18-minute JavaScript checksum are involved: the pinned SHA-256 was enforced at build time and the APK signature covers the packed file.

Costs: the APK grows to about 600 MB, and the device needs a further 529 MB for the working copy, because llama.cpp must open a regular file. If you change the pinned model, update the values in both `src/shared/constants/local-model.ts` and the plugin entry in `app.json`. The model is Apache-2.0; include its licence notice when you distribute an APK that contains it.

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
2. Connect a compatible 64-bit Android device or supported emulator. Build with `bunx expo run:android`. Expo Go and web cannot run this native runtime. For CNG config updates, use `bunx expo prebuild --platform android --no-install`; never hand-edit native files.
3. Download the [pinned GGUF](https://huggingface.co/diodel/Qwen3.5-0.8B-Q4_K_M-GGUF/resolve/dfdaeea1fdbef1d8900313cf5bed689abff3feec/qwen3.5-0.8b-Q4_K_M.gguf) using your browser, or use the explicitly online download link on the Model screen. Keep the file in device-accessible local storage. No download occurs on app startup.
4. Open Settings → On-device model status → Import local GGUF. The picker accepts local files; bytes are copied into an app-owned staging file and verified in 256 KiB chunks. Other models, altered bytes, incorrect versions, and partial files are rejected. Allow at least 550 MB free for the app copy, in addition to your original file.
5. Tap Verify and load model. The saved manifest is rechecked, and the file's MD5 is compared with the one recorded when its SHA-256 was verified at import. This quick check replaced a full SHA-256 pass before every load, which took about 18 minutes on a phone. No automatic loading happens on restart. Existing app-managed content survives unloading/restarting.
6. Tap Run local test. The fixed instruction requests `READY` from the real model and streams its actual output. A model may fail to follow the instruction; inspect the output. This diagnostic is not a research response and has no citations.
7. Cancel, unload, or remove when needed. Removal asks for confirmation, deletes only fixed app-owned paths, and retains the original picked file. Backgrounding cancels ongoing work and unloads the context; return to the Model screen to load it again.

## Runtime boundaries

- CPU baseline: 2 threads, 2048-token context, batch/ubatch 128, one parallel sequence, zero GPU layers, mmap enabled, mlock disabled. These are bounded defaults, not measured performance claims.
- The engine formats the model's chat template, disables thinking, tokenizes the formatted prompt, and checks the full input/output budget before generation. Output is capped at 256 tokens; the diagnostic requests only 32.
- Load, generate, and release operations preserve one-context ownership. Unload waits for initialization or cancellation to settle before release.
- Model import uses modern Expo File/Directory/Paths APIs. It does not read the whole model into JS memory or modify the external original.
- The model file is bundled in the APK only when it is present in `bundled-model/` at build time. No vision/audio projector or embeddings are provisioned.
- Research Q&A is still disabled: SQLite search, retrieval, and validated citations are the next implementation. Do not wire general model answers into the source-grounded assistant until those exist.

## Required Android validation

With a device, verify import, load, actual token streaming, cancellation, background release, unload/reload, restart recovery, corrupted-file rejection, and low-memory errors. Repeat using a release build with an embedded JS bundle in airplane mode. Record RAM, ABI, model revision, load duration, generation timings, and failures. Unit tests exercise orchestration using injected native contexts; they do not execute llama.cpp.

## Documentation

- [llama.rn at the installed tag](https://github.com/mybigday/llama.rn/tree/v0.13.0-rc.7)
- [SDK 57 FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/)
- [SDK 57 DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/)
- [SDK 57 BuildProperties](https://docs.expo.dev/versions/v57.0.0/sdk/build-properties/)
