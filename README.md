# Seekora

Explore more. Understand better. Anywhere.

Seekora is an offline-first Android knowledge search and AI assistant, first developed as AralSearch AI. It is built with React Native on Expo SDK 57, Expo Router, Bun, and strict TypeScript. The app includes Wikipedia article downloads and an offline text reader, plus native local-model import, SHA-256 verification, persistent model metadata, load/unload, cancellation, and a real inference diagnostic. Actual GGUF loading/generation requires device validation.

## Offline learning library

Open **Search** to browse online Wikipedia articles available to download. Science results load initially; choose a suggested topic, search your own topic, or switch between English and Tagalog. Download an article, then open it from **Library → Reading** to browse its sections offline. Downloads remain in the Library after restarting and can be removed to free space.

Articles are text editions with source revision, contributor history, and CC BY-SA 4.0 attribution. Images, tables, and some formulas are omitted. Android/iOS use app-owned document files; web uses IndexedDB. The web app must already be loaded to read while disconnected; offline browser reloads are not supported. OpenStax content is hidden from the app, with its source code and data preserved. It can be restored through `src/shared/constants/content-sources.ts`. See [offline reading](docs/OFFLINE-READING.md) for architecture, limits, and device checks.

What works today:

- **Local search.** SQLite FTS5 over a bundled sample knowledge pack, with ranked passages.
- **Ask Seekora.** Retrieves supporting passages, writes an answer with the on-device Qwen3.5 model, and links each citation to the stored passage. When the library has no support for a question, it says so and cites nothing.
- **On-device model.** Local GGUF import with SHA-256 verification, load/unload, streaming, and cancellation through llama.rn.

Not built yet: document import, bookmarks and history, pack import from files, and the floating Seekora Companion. Search, answers, and model loading are covered by desktop tests but still need validation on an Android device; see [implementation status](docs/IMPLEMENTATION_STATUS.md).

## Run the app

```bash
bun install --frozen-lockfile
bun run android
```

`bun run android` compiles and installs a development build on a connected 64-bit Android device or emulator. Expo Go cannot run llama.rn, so on-device answers need this development build. After the first installation, use `bunx expo start --dev-client` for daily work. Rebuild after adding or changing native dependencies or config plugins. Web is a shell preview: the library and the model are unavailable there.

If Android reports `No development build (com.kelsz09.myapp) ... is installed`, stop Metro with Ctrl+C and run `bun run android` with the device connected.

## Checks

```bash
bunx expo lint
bunx tsc --noEmit
bun test tests
```

After adding a route file, run `bunx expo customize tsconfig.json` (or start the dev server) so the typed-route declarations in `.expo/types` include it; otherwise `tsc` rejects links to the new route.

## Native build requirements

- **JDK 17.** Newer JDKs can fail native configuration; Android Studio's bundled JDK 25 is one of them.
- **Android SDK** with Platform 36, Build-Tools 36.0.0, NDK 27.1.12297006, and CMake 3.22.1. With the SDK license accepted, Gradle installs missing ones on the first build.
- `JAVA_HOME` and `ANDROID_HOME` set, and `adb devices` listing the target.

The `android/` directory is generated and git-ignored. Do not edit it by hand; change `app.json` or a config plugin and run `bunx expo prebuild --platform android --no-install`. iOS builds require macOS or EAS.

The first build compiles native code for every library and takes a long time. To build one ABI and limit memory use:

```bash
# Linux / macOS
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 GRADLE_OPTS='-Dorg.gradle.workers.max=2' bun run android
```

```powershell
# Windows PowerShell, from android\
.\gradlew.bat :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2
```

On Windows, open a new terminal after installing Bun or setting `JAVA_HOME`, so the updated environment is picked up.

### Standalone APK (no PC needed)

A development build loads its JavaScript from Metro on the PC. For an APK that runs by itself, build the release variant:

```powershell
# Windows PowerShell, from android\
.\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a -PrnllamaVariants=rnllama,rnllama_v8_2_dotprod_i8mm "-Dorg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1g"
```

The result is `android/app/build/outputs/apk/release/app-release.apk`. It is signed with the template's debug keystore: fine for teammates and demos, not for a store. If the final `lintVitalAnalyzeRelease` step still fails with `Metaspace`, add `-x lintVitalAnalyzeRelease -x lintVitalReportRelease -x lintVitalRelease`.

When a phone reaches the dev server over USB, run `adb reverse tcp:8081 tcp:8081` again whenever the cable or USB mode changes; the forward is lost each time and the app then reports that it cannot connect to `localhost:8081`.

## On-device model

The selected model is `diodel/Qwen3.5-0.8B-Q4_K_M-GGUF` (529 MB, declared Apache-2.0). `llama.rn 0.13.0-rc.7` is pinned, its Expo plugin is configured, Bun lifecycle scripts are trusted, and Android build targets are limited to its 64-bit ABIs. No model is downloaded automatically, and none is in git. By default users import the model; to build an APK that carries it, place the pinned file in `bundled-model/` before prebuild. Follow [local model provisioning](docs/LOCAL-MODEL.md) for the pinned file, checksum, import, bundling, and runtime test.

## Navigation and structure

Five tabs: Home, Search, Library, AI, Settings, behind a first-run onboarding flow. Nested screens cover offline setup, the model, installed packs, import status, sample articles, and the passage reader that search results and citations open. Search lists passages from the local full-text index first, followed by the sample catalog; Home and Library still show sample data. Existing template modules and assets remain preserved. The Android package identifier is still `com.kelsz09.myapp`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): ownership, layers, and next milestones.
- [Knowledge packs and grounded answers](docs/KNOWLEDGE-PACKS.md): pack format, storage, ranking, evidence and citation rules.
- [Floating AI assistant](docs/FLOATING-ASSISTANT.md): the bubble over other apps, screen analysis, permissions, privacy, and device test steps.
- [Implementation status](docs/IMPLEMENTATION_STATUS.md): what has been verified, and how.
- [Known limitations](docs/KNOWN-LIMITATIONS.md) and [offline verification](docs/OFFLINE-TEST.md) for device acceptance steps.
- [Content and model licenses](docs/CONTENT-LICENSES.md).
- The [master document](ARALSEARCH_AI_MASTER_BUILD_PROMPT.md) describes the complete product under its earlier name; it does not mean that MVP is delivered.
