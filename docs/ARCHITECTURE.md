# Seekora architecture

Seekora was first developed as AralSearch AI; the master build document and some file names keep that name. The master document describes the complete product. The app now has local search and source-grounded answers over one sample pack, not the offline MVP.

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
    packs/index.tsx            Installed packs
    passage/[chunkId].tsx      Stored passage opened from a result or citation
    explore.tsx                Preserved starter route
  features/
    home/                      Active Home and preserved starter UI
    search/                    Keyword search over the local library
    library/                   Library entry
    assistant/                 Ask Seekora: grounded answers with citations
    reader/                    Passage reader with source details
    settings/                  Readiness/privacy entry
    onboarding/                Optional setup
    model-manager/             Model requirements
    document-import/           Import requirements
    knowledge-packs/           Installed packs and attribution
    explore/                   Preserved template feature
  infrastructure/
    database/                  Migrations, FTS5 queries, SQLite repository, expo-sqlite driver
    knowledge/                 Pack format, validation, chunking, bundled packs
    llm/                       Engine lifecycle / model manifest contracts
    files/                     Import lifecycle contract
  shared/
    components/                Reusable mobile UI and themed primitives
    constants/                 Theme / remaining foundation readiness
    providers/                 Model and knowledge-library providers
    services/rag/              Evidence check, prompt builder, citation check
    types/knowledge.ts         Documents / chunks / packs / citations
    hooks/                     Existing shared hooks
assets/knowledge-packs/        Bundled sample pack
plugins/                       Config plugins; with-bundled-model.js packs the model into the APK when present
bundled-model/                 Optional, git-ignored location of the model file for such builds
tests/                         Bun tests; SQL runs on Bun's SQLite through tests/support
docs/
```

## Dependencies

Routes import public feature `index.ts` exports. Features must not import other features, per Cursor rules. Shared entities and reusable UI live in `shared`. Feature hooks/services will receive repository and engine contracts. Native adapters implement those contracts under `infrastructure`; SQL and native inference do not belong in screens.

When the database implementation exists, add a shared services provider at the root for dependency injection. A single model manager will own load/unload, cancellation, and background cleanup; do not store a mutable LLM context in a module global. Add Zustand when ephemeral UI state needs it; persisted records belong in SQLite.

The importer contract remains type-only. Local inference has a real adapter: `shared/providers/model-provider.tsx` owns one injected engine and storage instance; native adapters under `infrastructure/llm` manage the context and model files. Web uses unavailable adapters. See `LOCAL-MODEL.md`. Import readiness is still explicitly unconfigured; model and library status reflect actual storage, native-engine, and database state.

## Local knowledge and grounded answers

`shared/providers/knowledge-provider.tsx` opens one SQLite connection at the root, checks FTS5, runs migrations, installs the bundled pack, and hands a `KnowledgeRepository` to features. Repositories are written against the small `SqlDriver` port in `infrastructure/database/sql-driver.ts`. The device implements it with expo-sqlite (`create-database.native.ts`), web reports it as unavailable (`create-database.ts`), and tests implement it with Bun's SQLite, so tests execute the same SQL as the device.

`shared/services/rag` is shared because the assistant uses it now and the Companion will later. It depends only on the repository and on the `generate` signature of `LLMEngine`; `ModelProvider.generate` exposes the existing engine to features. See [KNOWLEDGE-PACKS.md](KNOWLEDGE-PACKS.md) for the pack format, ranking, evidence check, and citation rules.

## Next vertical slice

1. Validate on an Android device: build, first-run migration and pack install, FTS5, search, model load, a grounded answer, and opening its citation. Record results in `IMPLEMENTATION_STATUS.md`.
2. Add saves/history and TXT/Markdown imports using current Expo File/Directory/Paths APIs, reusing `chunker.ts` and the repository. Add collections/chat tables as new numbered migrations when those features start. Bound ingestion, deduplicate by hash, and import atomically.
3. Add pack import from a file, pack removal in the UI, and virtualized lists once result sets or libraries grow. Handle citations and bookmarks that point at removed content.
4. Improve retrieval where device testing shows gaps: synonyms, phrase proximity, and an evidence check that looks at more than shared words.
5. Seekora Companion (floating assistant) stays deferred until the steps above are stable. It needs a local Expo module in Kotlin and a different model-lifecycle policy, because the model currently unloads whenever the app leaves the foreground.

## Mobile and offline boundaries

Use safe areas, scalable text, minimum 44-point touch targets, system back navigation, and native controls. Shared buttons have a 48-point minimum height. Tokens support system light/dark themes. JavaScript Expo Router tabs share navigation across platforms; Android is the primary acceptance target. Use virtualized lists for future result sets and long libraries.

Offline search, import, reading, and inference must use local adapters. Optional network downloads require intentional user action. The preserved starter `src/shared/services/apiClient.ts` is unused by product pages; do not connect it to offline search or inference. Development bundler connectivity differs from a shipped offline app.

## References checked

- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/llms.txt
- https://docs.expo.dev/router/basics/navigation-layouts/
- https://docs.expo.dev/router/advanced/tabs/
- https://docs.expo.dev/versions/v57.0.0/sdk/symbols/

- https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/

Recheck version-specific FileSystem, DocumentPicker, and llama.rn docs before implementing further native adapters.
