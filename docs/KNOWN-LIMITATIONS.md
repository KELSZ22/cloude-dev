# Known limitations

- This milestone is app structure and a mobile shell, not the complete offline MVP.
- SQLite, FTS5, persistence, search results, reader, saves, histories, collections, imports, and packs are pending.
- Local-model provisioning/lifecycle code is implemented, but actual Qwen3.5 loading, native streaming, memory handling, and performance require device validation. llama.rn is pinned to a release candidate.
- Source-grounded retrieval and citation validation are pending. The fixed local test is a diagnostic, not a research assistant answer.
- Onboarding is an optional checklist; first-run persistence is pending.
- Model readiness follows installed metadata and native-engine state; search/import readiness still shows unconfigured services.
- No PDF parsing, in-app download manager, remote search, analytics, or cloud inference is installed. The model download link opens the pinned source only on user action.
- Existing Expo starter assets and `/explore` are preserved.
- Native builds, device navigation, offline behavior, accessibility, and performance require Android verification.
