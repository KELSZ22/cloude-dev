# AralSearch AI architecture

The master build document describes the complete product. This milestone establishes a navigable React Native foundation, not the offline MVP.

## Decisions

- Expo SDK 57, React Native 0.86, React 19, Expo Router, Bun, strict TypeScript.
- Follow `AGENTS.md` and all four `.cursor/rules/*.mdc` files. Use `StyleSheet.create`, `ThemedView`, `ThemedText`, and `src/shared/constants/theme`. The build document allows a typed style system; Cursor rules explicitly favor existing styling.
- Existing template modules/assets, Android identifiers, and the master document are preserved. The original Home UI remains in `src/features/home/HomePage.tsx`; the active public export selects `AralHomePage.tsx`. `/explore` remains as a starter route outside the product tabs.
- Add feature directories as implementation starts. No empty directories or unused native dependencies.

## Current structure

```text
src/
  app/
    _layout.tsx                 Root stack, theme, status bar
    (tabs)/                    Home / Search / Library / Assistant / Settings
    onboarding.tsx             Optional setup checklist
    import.tsx                 Import availability
    model.tsx                  Model availability
    packs/index.tsx            Pack availability
    explore.tsx                Preserved starter route
  features/
    home/                      Active Home and preserved starter UI
    search/                    Local search entry
    library/                   Library entry
    assistant/                 Grounded AI entry
    settings/                  Readiness/privacy entry
    onboarding/                Optional setup
    model-manager/             Model requirements
    document-import/           Import requirements
    knowledge-packs/           Pack requirements
    explore/                   Preserved template feature
  infrastructure/
    database/                  Repository contracts; no SQL adapter yet
    llm/                       Engine lifecycle / model manifest contracts
    files/                     Import lifecycle contract
  shared/
    components/                Reusable mobile UI and themed primitives
    constants/                 Theme / explicit foundation readiness
    types/knowledge.ts         Documents / chunks / packs / citations
    hooks/                     Existing shared hooks
docs/
```

## Dependencies

Routes import public feature `index.ts` exports. Features must not import other features, per Cursor rules. Shared entities and reusable UI live in `shared`. Feature hooks/services will receive repository and engine contracts. Native adapters implement those contracts under `infrastructure`; SQL and native inference do not belong in screens.

When the database implementation exists, add a shared services provider at the root for dependency injection. A single model manager will own load/unload, cancellation, and background cleanup; do not store a mutable LLM context in a module global. Add Zustand when ephemeral UI state needs it; persisted records belong in SQLite.

Database/importer contracts remain type-only. Local inference now has a real adapter: `shared/providers/model-provider.tsx` owns one injected engine and storage instance; native adapters under `infrastructure/llm` manage the context and model files. Web uses unavailable adapters. See `LOCAL-MODEL.md`. No simulated search repository or generated response is supplied. Search/import readiness is still explicitly unconfigured; model status reflects actual storage and native-engine state.

## Next vertical slice

1. Read SDK 57 SQLite docs and run `bunx expo install expo-sqlite`. Configure supported FTS plugin options. Inspect the existing generated Android project before rebuilding; never hand-edit it.
2. Implement numbered migrations, foreign keys, transactions, FTS synchronization triggers, parameterized token handling, and typed repositories. Verify FTS on Android.
3. Add originally authored starter content with license/provenance metadata, checksums, and a reproducible builder.
4. Connect Search to debounced, bounded FTS queries. Add a real document-reader feature and `reader/[documentId].tsx` once stored content exists. Test passage links and restart persistence.
5. Add saves/history and TXT/Markdown imports using current Expo File/Directory/Paths APIs. Add collections/chat tables when relevant features start. Bound ingestion, deduplicate by hash, and import atomically.
6. Validate llama.rn against SDK 57 / New Architecture, Bun lifecycle trust/native artifacts, its config plugin, and supported ABIs. Provision a licensed GGUF with checksum, size, and memory requirements. Implement bounded retrieval, streaming, and citation validation.
7. Add pack details/removal and research routes when their services exist. Remove stale FTS hits and safely handle citations/bookmarks on deletion.

## Mobile and offline boundaries

Use safe areas, scalable text, minimum 44-point touch targets, system back navigation, and native controls. Shared buttons have a 48-point minimum height. Tokens support system light/dark themes. JavaScript Expo Router tabs share navigation across platforms; Android is the primary acceptance target. Use virtualized lists for future result sets and long libraries.

Offline search, import, reading, and inference must use local adapters. Optional network downloads require intentional user action. The preserved starter `src/shared/services/apiClient.ts` is unused by product pages; do not connect it to offline search or inference. Development bundler connectivity differs from a shipped offline app.

## References checked

- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/llms.txt
- https://docs.expo.dev/router/basics/navigation-layouts/
- https://docs.expo.dev/router/advanced/tabs/
- https://docs.expo.dev/versions/v57.0.0/sdk/symbols/

Recheck version-specific SQLite, FileSystem, DocumentPicker, and llama.rn docs before implementing native adapters.
