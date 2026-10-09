# Implementation status

## Current milestone: selected local model

The user chose `diodel/Qwen3.5-0.8B-Q4_K_M-GGUF` after the React Native structure milestone. Repository and all four Cursor rule files were followed. See [LOCAL-MODEL.md](LOCAL-MODEL.md) for provisioning, exact source revision/checksum, and device acceptance.

## Implemented

- Five-tab Expo Router foundation with feature-owned pages, thin routes, shared tokens, and typed domain/repository contracts.
- Selected model catalog pinned to Hugging Face revision `dfdaeea1fdbef1d8900313cf5bed689abff3feec`, 529297312 bytes, SHA-256 `fb89581c3863314f6e6e1810f11b0bbb30a07315e7b1229a5c7db10fb0100ca6`, declared Apache-2.0.
- Exact `llama.rn 0.13.0-rc.7` dependency, Expo plugin, SDK-compatible FileSystem/DocumentPicker/BuildProperties/DevClient, and incremental SHA-256 library. Bun trusts llama.rn lifecycle installation.
- Native artifacts installed; Android archive marker matches `de870c027009edb59fc27ee668442cedbd4cd1a2c49818b398024e0a714e228f`. JNI libraries exist for arm64-v8a and x86_64. Installed vendor source contains Qwen3.5 support. This is source-level evidence, not model/device validation.
- CPU baseline configured through app.json, with Android targets restricted to those 64-bit ABIs. Native directories generated with Expo prebuild; no native source edited by hand.
- Local GGUF picker, chunked staged copy, GGUF v3/size/SHA checks, persisted manifest, restart discovery, revalidation before load, explicit removal confirmation, external original preservation, storage/error states.
- One root-owned injected LLM engine with bounded context, formatted-prompt token budgeting, streaming diagnostic, cancellation, load/unload ownership, and background cleanup. Unavailable adapters for web; lazy native import for missing runtimes.
- Model/Assistant/Setup pages show real model lifecycle status. A user-initiated pinned download link opens the online source; there is no background model download or remote inference.
- Fixed `READY` diagnostic uses actual local inference when loaded. Research answers remain disabled until SQLite retrieval and citation validation exist.

## Verified commands

- `bunx expo install llama.rn expo-file-system expo-document-picker expo-build-properties expo-dev-client` — installed SDK-compatible dependencies. The initial sandbox installation failed; authorized execution succeeded.
- `bunx expo install @noble/hashes` — installed and ran trusted llama.rn lifecycle artifact downloads.
- `bunx expo lint` — passed.
- `bunx tsc --noEmit` — passed.
- `bun test tests` — 15 passed, 0 failed. Integrity tests use fixtures and Node crypto; native lifecycle tests inject controlled contexts. They do not execute llama.cpp.
- `bunx expo config --type prebuild` — passed.
- `bunx expo prebuild --platform android --no-install` — passed, including the 64-bit build architecture configuration.
- `bunx expo export --platform android --output-dir /tmp/aralsearch-model-android` — passed before final lifecycle/UI refinements.
- `bunx expo export --platform web --output-dir /tmp/aralsearch-model-web` — passed before final refinements; 17 static routes.
- `git diff --check` — passed.

Final exports and APK result will be recorded after completion.

## Device status and remaining work

Authorized `adb devices` succeeds but lists no connected devices. `/dev/kvm` is absent, so hardware-accelerated Android emulator validation is unavailable here. No actual model load, generated token, restart persistence, native picker, airplane-mode inference, or benchmark is claimed as verified.

No GGUF was downloaded to the development workspace or bundled in the app. The user must intentionally download/import the pinned file on the target device, then load it and run the diagnostic. A compatible native development build is required; Expo Go and web cannot run inference.

SQLite FTS5, knowledge content, reader, document import, saves/history, grounded research, citations, and packs remain pending. The model subsystem is implemented independently so unsupported inference cannot block those future features.

## Next step

Connect a supported 64-bit Android device and run `bunx expo run:android`; provision the exact GGUF and use Settings → On-device model status → Import → Verify and load → Run local test. Record actual hardware/ABI/RAM, load time, output, cancellation, and errors. Then implement the SQLite FTS5 + starter pack + reader vertical slice and grounded citation flow. Read this file before resuming; preserve the current project.
