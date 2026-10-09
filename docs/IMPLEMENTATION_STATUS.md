# Implementation status

## Current milestone: offline RAG proof of concept (2026-10-09)

Goal: a user asks an algebra question, Seekora retrieves a relevant passage from its local knowledge pack, the on-device Qwen model writes an explanation, and a citation opens the stored passage.

**Status: the first RAG milestone runs on an Android phone.** On a Redmi Note 13 (Android 15, arm64, Snapdragon 685, 8 GB RAM), in airplane mode, the development build built its local library, imported and loaded the pinned model, answered a question from the sample pack, and refused a question the pack does not cover. Not yet checked on the phone: opening a citation, search from the Search tab, and a standalone release build.

### Measured on the phone (development build, generic llama.rn library, 2 threads)

| Step | Result |
| --- | --- |
| First launch | Database created with schema version 1, the FTS5 index, 1 pack, 12 documents, 32 passages |
| Model import | Copy of 529,297,312 bytes: seconds. SHA-256 check in JavaScript: about 18 minutes (0.5 MB/s) |
| Model load | Fast MD5 check, then about 1.6 s to initialise the context (llama.cpp reports 1.21 s load time) |
| `READY` diagnostic | Printed `READY`; 37 prompt tokens at 9.9 tokens/s, 3.9 s in total |
| Grounded answer | 255 prompt tokens at 9.5 tokens/s (26.8 s to first token), then 124 tokens at 5.2 tokens/s (23.9 s); 51.1 s in total. Generation stopped at the end of the paragraph, as designed |
| Unsupported question | "Not enough evidence", no sources, model not called |
| Leaving the app | Model unloads; Ask Seekora falls back to "Find supporting passages" |

llama.rn logs `no usable state checkpoint (recurrent/hybrid/SWA model), doing full cache clear` for this model, so a prompt is evaluated from the start each time. A partial-coverage question therefore pays for prompt evaluation twice: once for the yes/no check and once for the answer.

The first model import on the phone failed with `Unable to read from a file handle 'Bad file descriptor'`. Cause: `expo-file-system` 57.0.7 opens a picked `content://` file without keeping its `ParcelFileDescriptor` referenced, so Android closes the descriptor during a long read. The import now copies the picked file into app storage with `File.copy()` and verifies that copy. It also uses `moveSync` where two `move()` calls were previously not awaited. With the fix, the copy of all 529,297,312 bytes completed in seconds.

How the phone run was done: `adb install` was refused with `INSTALL_FAILED_USER_RESTRICTED` (Xiaomi's **Install via USB** was off), so the APK was copied to the phone's Download folder and installed by tapping it. The phone also blocks injected input (**USB debugging (Security settings)** off), so the app could be launched by intent and inspected, but not tapped or typed into from the PC. The phone's USB connection re-initialised often, which clears `adb reverse`; the forward had to be re-applied each time before the app could reach `localhost:8081`. The emulator on the development machine has no hypervisor driver.

## What was verified, and where

| Item | Desktop | Android device |
| --- | --- | --- |
| Unit tests (`bun test tests`): 103 pass, 0 fail | Yes | n/a |
| `bunx tsc --noEmit`; `bunx expo lint` (0 errors) | Yes | n/a |
| Metro bundle for Android (`bunx expo export --platform android`) | Yes; bundle contains the pack and the SQLite adapter | n/a |
| Web preview export (`bunx expo export --platform web`) | Yes; 18 static routes | n/a |
| Debug APK builds (`:app:assembleDebug`, arm64-v8a) | Yes, with the llama.rn variant restriction; see "Android build" | **Yes**: installed by sideload, launches, loads the bundle from Metro with no JS errors logged |
| SQLite FTS5 available | Yes, on Bun's SQLite 3.53.2 | **Yes**: the app passed its startup FTS5 check and created the `fts5` table on the phone |
| Migrations and first pack install | Yes | **Yes**: `user_version` 1; 1 pack, 12 documents, 32 chunks, 32 index rows in the phone's database |
| Pack re-install, update, removal | Yes | **Not run** |
| Keyword retrieval and ranking over the sample pack | Yes, 12 questions with an expected top passage | **Partly**: a copy of the phone's database, queried on the PC, ranks "quadratic formula" the same as the tests. Search through the app's UI was not run |
| Insufficient-evidence handling | Yes | **Yes** for a no-match question; the model's yes/no check was not observed |
| Citation integrity (only supplied sources; each resolves to a stored passage) | Yes | **Not run** (no citation was opened) |
| RAG prompt fits `LlamaRnEngine` limits | Yes, with an injected native context | **Yes**: a 255-token prompt was accepted and answered |
| Pinned GGUF: size, SHA-256, architecture | Yes; see "Model" | **Yes**: the app's own SHA-256 check passed during import, and the installed copy's MD5 matches the PC copy |
| Real model output for grounded answers | Yes, through Ollama; see "Desktop model check" | **Yes**: one answer generated; its text was not recorded |
| Model import, load, and streaming in the app | No (tests inject a fake native context) | **Yes**, after fixing the import; see the measurements above. Cancelling an answer was not tried |
| Home, model, and Ask Seekora screens | No | **Yes**, seen on the phone |
| Search tab and passage reader | No | **Not run** |

## Implemented in this milestone

- `expo-sqlite ~57.0.4`, with its config plugin and `enableFTS` set explicitly in `app.json`.
- Versioned migrations (`PRAGMA user_version`), schema v1: `knowledge_packs`, `documents`, `document_chunks`, and the `chunks_fts` FTS5 index with sync triggers.
- `SqliteKnowledgeRepository` implementing the existing `KnowledgeRepository` contract, plus pack install/remove. It is written against a small `SqlDriver` port with an expo-sqlite adapter for devices and a Bun SQLite adapter for tests.
- Knowledge-pack format `seekora-pack/1` with validation, a sentence-aware chunker, and one bundled pack: 32 originally written algebra passages.
- Retrieval with term-coverage ranking over bm25, an evidence check by retrieval and a yes/no evidence check by the model, a bounded prompt builder, one-paragraph generation with early stop, citation checking, and the `answerQuestion` flow. It uses the existing `LLMEngine.generate` unchanged; `ModelProvider` gained a `generate` method so features can reach the engine.
- Screens: Search (live results), Ask Seekora (streamed answer, sources, not-enough-evidence state, passages-only mode when the model is not loaded), passage reader at `/passage/[chunkId]`, installed packs.
- Branding changed from AralSearch AI to Seekora in the UI, app name, and blue theme tokens. The Android package identifier is unchanged.
- A development-only script, `scripts/rag-desktop-check.mjs`, that runs the same retrieval and prompt code against a local Ollama model. The app never contacts Ollama.

See [KNOWLEDGE-PACKS.md](KNOWLEDGE-PACKS.md) for the design and [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md) for what it does not do.

## Development machine setup (Windows 11)

- Bun 1.4.2 installed with the official installer; `bun install --frozen-lockfile` reported no changes.
- Gradle 9.3.1 runs on the existing Microsoft OpenJDK 17.0.20.1 (`JAVA_HOME` was already set at user level; terminals opened before that need a restart).
- Gradle installed Android SDK Platform 36, NDK 27.1.12297006 (and 27.0.12077973, requested by a dependency), and CMake 3.22.1 on the first build. Build-Tools 36.0.0 was already present.
- `emulator -accel-check` reports that no hypervisor driver is installed, so the emulator is not usable.
- The connected phone's CPU reports no `dotprod`, `i8mm`, or `fphp` features. It will load llama.rn's generic library (or `rnllama_v8` from a full build), not the `dotprod_i8mm` variant.

## Android build

Built on Windows from `android\` after `bunx expo prebuild --platform android --no-install`.

| Attempt | Command | Result |
| --- | --- | --- |
| 1 | `gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2` | **Failed after 29 min 26 s** in `:llama.rn:buildCMakeDebug[arm64-v8a]`: the Hexagon/OpenCL variant's object directory exceeded the Windows path limit |
| 2 | Same, from a `subst` drive mapped to the repository | **Failed in 9 s**: Expo autolinking cannot find `package.json` at a drive root. Mapped one level up, autolinking still resolves packages to the real path, so this approach was dropped |
| 3 | Attempt 1 plus `-PrnllamaVariants=rnllama,rnllama_v8_2_dotprod_i8mm` | **BUILD SUCCESSFUL in 5 min 41 s** (other native modules were already compiled by attempt 1) |

| 4 | `gradlew :app:assembleRelease` with the same two flags | **Failed after about 14 min** at the last step: `lintVitalAnalyzeRelease` ran out of JVM memory (`Metaspace`). Compiling, bundling, and packaging had succeeded |
| 5 | Attempt 4 plus `-x lintVitalAnalyzeRelease -x lintVitalReportRelease -x lintVitalRelease "-Dorg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1g"` | **BUILD SUCCESSFUL in 3 min 58 s** |

Debug result: `android/app/build/outputs/apk/debug/app-debug.apk`, 115 MB, label `Seekora`, package `com.kelsz09.myapp`, minSdk 24, targetSdk 36, arm64-v8a only. It is a debug build, so it loads JavaScript from Metro and has no embedded bundle.

Release result: `android/app/build/outputs/apk/release/app-release.apk`, 69.7 MB, same package and label, with the JavaScript bundle embedded (3.2 MB), so it runs without Metro or a PC. It is signed with the template's debug keystore, the same certificate as the debug build, so it installs over the development build; that key is not suitable for publishing. The release lint check was skipped for this build because it crashed, not because it reported a problem; it has not been run to completion. **This APK has not been installed or run yet.**

Checked inside the APK: `libexpo-sqlite.so` is SQLite 3.50.3 and contains the FTS5 module, the porter tokenizer, `bm25`, and `snippet`; `librnllama.so`, compiled from source, contains the `qwen35` architecture. This is evidence about the binaries, not a run.

Not done: running the release APK, an x86_64 build, and a build with all six non-Hexagon CPU variants.

## Model

The pinned file was downloaded to the development machine, outside the repository, and checked:

| Check | Result |
| --- | --- |
| Size | 529,297,312 bytes, as pinned |
| SHA-256 | `fb89581c3863314f6e6e1810f11b0bbb30a07315e7b1229a5c7db10fb0100ca6`, as pinned (computed twice, by Node and by `Get-FileHash`) |
| GGUF header | version 3, 320 tensors, `general.architecture = qwen35`, size label 0.8B, 24 blocks, embedding length 1024, context length 262144, `file_type = 15` (Q4_K_M), license apache-2.0 |
| Chat template | Present, 7755 characters, handles `enable_thinking`, which the engine sets to false |
| Runtime support | `qwen35` is present in llama.rn's vendored llama.cpp source and in the `librnllama.so` built from it |
| Engine settings | 2048-token context, 2 threads, CPU only, mmap on, temperature 0; unchanged from the earlier milestone |

Loading this file with llama.rn on a phone is still untested.

## Desktop model check

Run with `bun scripts/rag-desktop-check.mjs seekora-qwen3.5-0.8b-q4km`: the app's retrieval, prompt, and citation code, with the pinned GGUF served by local Ollama 0.40.1.

- The app's diagnostic prompt returned `READY`.
- Supported questions, all answered in line with the retrieved passage: solving a quadratic by factoring, the quadratic formula, slope through two points, negative exponents, the domain of a function, the elimination method, multiplying powers with the same base. Six of the seven answers carried source numbers; for the other one the supplied passages were listed.
- Unsupported questions, all refused with no citations: "Who invented the quadratic formula?", "Who discovered the slope of a line?", and "What is the derivative of a quadratic function?" by the model's yes/no check, and "What is the capital of France?" by retrieval alone without calling the model.
- Faults seen: two answers attached a source number to a sentence that came from a different supplied passage; one answer wrote a formula in LaTeX.

Two earlier prompt versions failed this check and were replaced: one refused the factoring question, and one invented an inventor for the quadratic formula. [KNOWLEDGE-PACKS.md](KNOWLEDGE-PACKS.md) explains the changes.

This is one small set of questions at temperature 0 on a desktop runtime. It shows the pipeline works with the real weights; it does not measure quality, and it says nothing about speed or memory on a phone.

## Next step

1. On the phone, by hand: check the Home, Search, and passage screens, then import the model from Downloads (the pinned GGUF was copied there and its SHA-256 matches), load it, and ask a question. These are steps 2 to 9 of "First RAG milestone" in [OFFLINE-TEST.md](OFFLINE-TEST.md).
2. Record the load time, time to first token, tokens per second, and each step's result in this file.
3. Optional: turn on **Install via USB** and **USB debugging (Security settings)** in the phone's Developer options so installs and scripted checks work over USB.

## Earlier milestone: selected local model

The user chose `diodel/Qwen3.5-0.8B-Q4_K_M-GGUF` after the React Native structure milestone. See [LOCAL-MODEL.md](LOCAL-MODEL.md) for provisioning, exact source revision/checksum, and device acceptance.

- Five-tab Expo Router foundation with feature-owned pages, thin routes, shared tokens, and typed domain/repository contracts.
- Selected model catalog pinned to Hugging Face revision `dfdaeea1fdbef1d8900313cf5bed689abff3feec`, 529297312 bytes, SHA-256 `fb89581c3863314f6e6e1810f11b0bbb30a07315e7b1229a5c7db10fb0100ca6`, declared Apache-2.0.
- Exact `llama.rn 0.13.0-rc.7` dependency, Expo plugin, SDK-compatible FileSystem/DocumentPicker/BuildProperties/DevClient, and incremental SHA-256 library. Bun trusts llama.rn lifecycle installation.
- Local GGUF picker, chunked staged copy, GGUF v3/size/SHA checks, persisted manifest, restart discovery, revalidation before load, explicit removal confirmation, external original preservation, storage/error states.
- One root-owned injected LLM engine with bounded context, formatted-prompt token budgeting, streaming diagnostic, cancellation, load/unload ownership, and background cleanup. Unavailable adapters for web; lazy native import for missing runtimes.
- Model/Assistant/Setup pages show real model lifecycle status. A user-initiated pinned download link opens the online source; there is no background model download or remote inference.

Correction to the earlier record: it listed the prebuilt llama.rn JNI libraries as the native runtime. This release candidate does not use them; it compiles llama.cpp from source during the Gradle build. See "Building llama.rn 0.13.0-rc.7" in [LOCAL-MODEL.md](LOCAL-MODEL.md).

Commands recorded as passing at that milestone, on a Linux workstation: `bunx expo lint`, `bunx tsc --noEmit`, `bun test tests` (15 tests), `bunx expo config --type prebuild`, `bunx expo prebuild --platform android --no-install`, and Android and web exports. No APK build or device run was recorded.
