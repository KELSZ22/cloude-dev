# AralSearch AI

Knowledge for Everyone. Anytime. Offline.

Android-first React Native using Expo SDK 57, Expo Router, Bun, and strict TypeScript. This milestone implements app structure and a navigable shell. SQLite search, persistence, imports, packs, and GGUF inference are not implemented yet; screens explicitly show setup pending.

## Run the foundation

```bash
bun install --frozen-lockfile
bunx expo start
```

Use an Android emulator or Expo Go for the current shell. Press `a` in Expo CLI for a connected emulator or `w` for web preview. The planned llama.rn integration requires a native development build and cannot run in Expo Go.

```bash
bunx expo lint
bunx tsc --noEmit
```

Equivalent scripts: `bun run lint` and `bun run typecheck`.

## Native development

Install a matching JDK and Android SDK, set `ANDROID_HOME`, start an emulator, confirm `adb devices` lists it, then run `bunx expo run:android`. An `android/` directory already exists locally; do not hand-edit generated native files. Use Expo config plugins for native changes. iOS builds require macOS or EAS.

Before integrating llama.rn, validate SDK 57 / React Native 0.86 compatibility, its Expo plugin, supported ABIs, Bun trusted dependencies, and native artifacts. Do not bundle a large model in the APK. Manual GGUF and pack imports are planned; no provisioning commands are available yet.

## Navigation and structure

Five tabs: Home, Search, Library, Assistant, Settings. Nested screens cover optional offline setup, model requirements, pack status, and import status. Every displayed navigation action has a destination. Existing template modules and assets remain preserved.

See [architecture](docs/ARCHITECTURE.md) for ownership and next milestones, [implementation status](docs/IMPLEMENTATION_STATUS.md) for verified commands, [limitations](docs/KNOWN-LIMITATIONS.md), and [offline verification](docs/OFFLINE-TEST.md) for device acceptance steps. The [master document](ARALSEARCH_AI_MASTER_BUILD_PROMPT.md) describes the complete product; it does not mean that MVP is delivered.
