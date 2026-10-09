# AralSearch AI

Knowledge for Everyone. Anytime. Offline.

Android-first React Native using Expo SDK 57, Expo Router, Bun, and strict TypeScript. The shell now includes native local-model import, SHA-256 verification, persistent model metadata, load/unload, cancellation, and a real inference diagnostic. SQLite search, content persistence, document imports, packs, and grounded research are still pending. Actual GGUF loading/generation requires device validation.

## Run the foundation

```bash
bun install --frozen-lockfile
bun run android
```

Use `bunx expo run:android` with a compatible connected device/emulator for inference. Start an installed development build with `bunx expo start --dev-client`. Web is a shell preview with model actions unavailable. Expo Go cannot run llama.rn.

If opening Android reports `No development build (com.kelsz09.myapp) ... is installed`, stop Metro with Ctrl+C and run `bun run android` with the target device connected. This compiles and installs the development build before launching it. `expo start` only serves JavaScript; it cannot install the missing native app. After the first successful installation, use `bunx expo start --dev-client` for daily development. Rebuild after adding or changing native dependencies or config plugins.

```bash
bunx expo lint
bunx tsc --noEmit
bun test tests
```

Equivalent scripts: `bun run lint` and `bun run typecheck`.

## Native development

Use JDK 17 and the Android SDK, set `JAVA_HOME` and `ANDROID_HOME`, connect a phone or start an emulator, confirm `adb devices` lists it, then run `bunx expo run:android`. An `android/` directory already exists locally; do not hand-edit generated native files. Use Expo config plugins for native changes. iOS builds require macOS or EAS.

On this Linux workstation, use the installed JDK 17 and limit build parallelism to fit available memory:

```bash
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 CMAKE_BUILD_PARALLEL_LEVEL=2 GRADLE_OPTS='-Dorg.gradle.workers.max=2' bun run android
```

Java 25 can fail native configuration with `WARNING: A restricted method in java.lang.System has been called`; use JDK 17 if this occurs.

The selected model is `diodel/Qwen3.5-0.8B-Q4_K_M-GGUF` (529 MB, declared Apache-2.0). `llama.rn 0.13.0-rc.7` is pinned, its Expo plugin is configured, Bun lifecycle scripts are trusted, and Android build targets are limited to its 64-bit ABIs. No model is bundled or automatically downloaded. Follow [local model provisioning](docs/LOCAL-MODEL.md) for the pinned file, checksum, import, and runtime test.

## Navigation and structure

Five tabs: Home, Search, Library, Assistant, Settings. Nested screens cover optional offline setup, model requirements, pack status, and import status. Every displayed navigation action has a destination. Existing template modules and assets remain preserved.

See [architecture](docs/ARCHITECTURE.md) for ownership and next milestones, [implementation status](docs/IMPLEMENTATION_STATUS.md) for verified commands, [limitations](docs/KNOWN-LIMITATIONS.md), and [offline verification](docs/OFFLINE-TEST.md) for device acceptance steps. The [master document](ARALSEARCH_AI_MASTER_BUILD_PROMPT.md) describes the complete product; it does not mean that MVP is delivered.
