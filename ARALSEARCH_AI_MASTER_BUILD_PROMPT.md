# ARALSEARCH AI — MASTER BUILD PROMPT

> **Paste this entire file into your coding agent (Codex, Cursor, Claude Code, etc.) at the root of the intended project repository.**
>
> **Assignment:** Act as the principal mobile engineer, React Native architect, on-device AI engineer, and product-minded UI/UX implementer. **Build working code** for the product described below. Do not stop after producing a plan or a mockup.

---

## 0. Mission and non-negotiable product definition

Build **AralSearch AI**, an **Android-first, general-purpose, offline-first mobile knowledge search engine and AI research assistant**. The product is for **everyone**, not exclusively students and not tied to school grades, curricula, accounts, or a learning management system.

**Tagline:** *Knowledge for Everyone. Anytime. Offline.*

People must be able to:

1. Search a **local, expandable collection of knowledge** using a familiar Google-like search experience.
2. Open, read, bookmark, and organize source documents and articles.
3. Ask an **on-device LLM** questions grounded in local content; see inspectable source citations.
4. Import their own supported documents, index them locally, and search them afterward.
5. Add or remove curated offline **Knowledge Packs** (general knowledge, science, technology, history, health, business, programming, arts, etc.).
6. Continue using the core features with **airplane mode enabled**, after the required model and knowledge content have been provisioned.

**Do not represent this as the entire live Google index stored offline.** Search only locally installed or imported resources; communicate the current corpus and its limitations clearly.

**No mandatory sign-in, cloud backend, analytics SDK, paid API, remote inference, or internet requirement for core use.** The optional online path is only for downloading/importing user-approved model files and legally distributable Knowledge Packs.

**Definition of a successful MVP:** On an Android development build, a person in airplane mode can search a genuine on-device SQLite FTS5 index, read a source, ask a local LLM a grounded question, open its actual citation, save that result, close/restart the app, and recover their content. Where the device cannot run the model, show a real and informative unsupported/not-installed state; never fabricate an AI response.

---

## 1. How you should operate as the coding agent

- First **inspect the existing repository**: package.json, `src/app` or `app`, lockfile, Expo SDK, installed dependencies, code style, native configuration, and current work. **Preserve existing code** and integrate. If the directory is empty, scaffold a new Expo + TypeScript application using Bun.
- Provide a concise implementation plan and immediately execute it. You are allowed to make reasonable engineering decisions without requesting permission for trivial details.
- Work **vertical slice first**: a working offline search end to end, then LLM grounded Q&A, then import/library, rather than designing every screen with placeholder behavior.
- Use actual installations, database migrations, storage, real navigation, and real logic. **Avoid fake API data** and buttons that do nothing. Bundled demo content is allowed only when clearly labeled and legally reusable or written originally for this project.
- Prefer **simple, modular, auditable** code to overengineered abstractions. TypeScript strict mode, correct error handling, and dependency injection for native wrappers.
- Research library APIs using the **versions actually installed**. Do not guess deprecated Expo APIs. Check native-library compatibility before adding it.
- Commit to **no network activity in the offline path**. Add a debug verification mechanism (logs or test) to demonstrate this.
- After each major milestone, **run tests/typecheck/lint**, report exact commands and outcomes, and fix failures. If native builds cannot run in this environment, describe the blocker truthfully; do not claim device tests were completed.
- Keep an evolving `README.md` with prerequisites, emulator setup, build commands, model provisioning, pack import, and airplane-mode test steps.
- Do not delete/restructure existing user work merely to match this spec. Adapt safely.

---

## 2. Technology and platform choices

**Mandatory:**

| Concern | Primary choice | Notes |
| --- | --- | --- |
| Platform | React Native + **Expo** + TypeScript | Android first; avoid iOS-only assumptions |
| Package manager | **Bun** | Use `bun` / `bunx`; respect existing lockfile if repository already initialized |
| Navigation | Expo Router | `src/app` contains route entrypoints only |
| Styling | NativeWind or an Expo-compatible typed style system | Verify exact compatibility before configuring; no hard-coded platform hacks |
| State | Zustand | Keep ephemeral UI state separate from persisted records |
| Local database | `expo-sqlite` | Migrations, foreign keys, FTS5 virtual tables |
| Offline full-text search | SQLite **FTS5** / BM25 / snippets | Keyword search first; semantic retrieval is a later enhancement |
| Local model runtime | `llama.rn` + **GGUF** | Native on-device inference; behind a reusable adapter |
| Documents/files | `expo-file-system`, `expo-document-picker` | Use current `File`, `Directory`, `Paths` APIs |
| Icons | Expo-compatible icon library | Consistent icon set |
| Tests | Jest + jest-expo / React Native Testing Library or compatible setup | Unit + integration tests for database/search/agent |

**Critical native constraints:**

- `llama.rn` requires native code: **Expo Go is not the runtime for the complete application.** Configure an **Expo development build** and build for Android with `bunx expo run:android` (or the appropriate EAS alternative).
- Current `llama.rn` versions use React Native New Architecture; verify the chosen Expo SDK's compatibility.
- **Bun does not automatically trust dependency lifecycle scripts.** When installing `llama.rn`, configure Bun's `trustedDependencies` for `llama.rn` or run the library's documented native artifact downloader manually. Validate that native artifacts were installed before building.
- Set up the `llama.rn` Expo config plugin according to the installed version's README. Do not copy old native configuration blindly.
- Configure `expo-sqlite` for FTS5 using its config plugin, for example the supported `enableFTS` setting, and verify FTS actually works in the development build.
- Android emulator native architecture, available RAM, and compute capability may limit LLM inference. Test on supported `x86_64`/`arm64-v8a` targets and handle insufficient memory gracefully. Do not promise a fixed model speed on all devices.
- Initial candidate: an appropriately licensed **small quantized 1B–3B instruct GGUF**; select by actual memory budget, tokenizer/chat template support, quality, and supported runtimes. Record license, version, file size, SHA-256 and source. Do not silently bundle gigabytes into the default APK.
- For reproducibility, implement a **manual file-import option** for a compatible locally supplied GGUF and an optional opt-in downloader. No remote LLM endpoint, ever.
- `bunx expo start --tunnel` is for **development connectivity only**; it does not make the native inference work or make the released app offline. Prefer an emulator for initial development and benchmark a supported Android device if one is available.

Before large implementation, complete a short **technical spike** proving: Android app launches; FTS5 virtual table works; GGUF file can be discovered/validated; local LLM context can initialize and generate a short answer. If a spike fails, document the exact blocker and implement search + reader as working independent functionality rather than simulating inference.

---

## 3. Target information architecture / mobile UX

**Primary navigation** (bottom tabs):

1. **Home:** search hero, search bar, recent searches, installed topics, quick access to knowledge packs.
2. **Search:** full results, snippets, filter chips (All / Articles / Books / Documents), source badges, sort by relevance.
3. **Library:** installed packs, saved sources, imported documents, collections, downloads; use top tabs where useful.
4. **AI Assistant:** search-grounded chat, follow-up questions, cited answers, research sessions.
5. **Settings:** model status, storage, offline readiness, language, theme, privacy and data tools. *An account/profile screen is not needed for the MVP.*

**Nested screens:**

- First launch / succinct onboarding / offline setup checklist.
- Knowledge Pack discovery, pack details, import/install progress, installed pack details.
- Search results, source/article detail, document reader, source passage view.
- AI answer, referenced sources list, chat history, saved research.
- Import local file, indexing state, file-specific error.
- Saved items / collections / notes / history.
- Model provisioning, model loading state, offline readiness / diagnostic screen.

**Important UX rules:**

- Users **can skip onboarding** and enter Search even without a model; provide transparent “Search ready / AI not ready” statuses rather than blocking all use.
- UI must show where a result came from (title, author/publisher where available, pack, file type, excerpt, optional date).
- Include clear states: no content installed, no search results, model missing, model downloading, loading, generation cancelled, insufficient memory, import failed, indexing in progress, storage full, unsupported format, corrupted pack, citation not available.
- AI actions should never hide that a claim is derived from a limited offline corpus. Show “Based on your offline library” and source citations; if no evidence exists, say so.
- Never place ungrounded claims under a fabricated citation. Citation taps open the exact locally stored document and passage/page.
- All major actions work: open, back, save, unsave, import, delete (with confirmation), filter, view pack status, clear history, unload model.
- Default theme: polished, calm, modern general-knowledge search product. Use **navy** `#0D1B2A`, **emerald** `#059669`, background `#F8FAFC`, white surfaces, text `#111827`, secondary text `#64748B`, borders `#E2E8F0`, error `#DC2626` and success `#16A34A`. Add dark mode if the implementation allows without delaying MVP.
- Use a consistent 4/8 px spacing scale, 44+ px touch targets, accessible contrast, text scaling, safe areas, keyboard avoidance, screen reader labels, skeleton/loading states, and small-screen Android layout support.
- Avoid school-only labels such as “Grade 8”, “Student Profile”, or “Classroom” as core navigation. Optional quizzes are generic knowledge tools, not the app's identity.

---

## 4. Feature-based clean architecture (required)

Keep `src/app` as **thin navigation route files**. Organize domain logic by feature and common platform services outside the router:

```text
aralsearch-ai/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── onboarding.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx               # Home
│   │   │   ├── search.tsx
│   │   │   ├── library.tsx
│   │   │   ├── assistant.tsx
│   │   │   └── settings.tsx
│   │   ├── result/[documentId].tsx
│   │   ├── reader/[documentId].tsx
│   │   ├── packs/[packId].tsx
│   │   ├── import.tsx
│   │   └── research/[sessionId].tsx
│   ├── features/
│   │   ├── home/{components,hooks,screens}/
│   │   ├── search/{components,hooks,screens,services,types}/
│   │   ├── assistant/{components,hooks,screens,services,tools,types}/
│   │   ├── library/{components,hooks,screens,services,types}/
│   │   ├── knowledge-packs/{components,hooks,screens,services,types}/
│   │   ├── document-reader/{components,hooks,screens,services}/
│   │   ├── document-import/{components,hooks,screens,services}/
│   │   ├── history/{components,hooks,services}/
│   │   ├── model-manager/{components,hooks,screens,services}/
│   │   └── settings/{components,hooks,screens}/
│   ├── infrastructure/
│   │   ├── database/{client,migrations,repositories}/
│   │   ├── search/
│   │   ├── llm/
│   │   ├── files/
│   │   ├── indexing/
│   │   └── knowledge-packs/
│   ├── shared/{components,constants,hooks,lib,theme,types,utils}/
│   └── assets/                       # only when needed by bundler
├── assets/                           # icons, images, light demo pack
├── scripts/                          # pack builder/validation scripts
├── tests/
├── app.json or app.config.ts
├── bun.lock
├── README.md
└── docs/
    ├── ARCHITECTURE.md
    ├── OFFLINE-TEST.md
    └── CONTENT-LICENSES.md
```

Treat the structure as a guide; **do not create empty directories for features not yet started**. Use per-feature `index.ts` for public exports and avoid imports from private internals of unrelated features. Extract shared components only after genuine reuse.

**Layers:** UI components → feature hooks/services → repository/tool contracts → SQLite/native inference/file system. Keep UI separate from SQL statements, PDF parsing, and `llama.rn` calls. Avoid global mutable LLM contexts; use one model manager with explicit load/unload/cancel lifecycle.

---

## 5. Storage and offline search — implement for real

### Database and indexing

Implement versioned SQLite migrations and typed repositories for at least:

- `knowledge_packs(id, name, version, description, language, publisher, license, source_url, installed_at, checksum, status)`
- `documents(id, pack_id NULL, title, author, source_url, license, mime_type, local_uri, indexed_at, language, content_hash, created_at)`
- `document_chunks(id, document_id, chunk_index, text, page_number NULL, heading NULL, offset_start NULL, offset_end NULL)`
- FTS5 table indexing eligible document-chunk text with a stable mapping back to `chunk_id`, plus insert/update/delete synchronization.
- `saved_items(id, document_id, chunk_id NULL, note NULL, created_at)`
- `collections`, `collection_items`, `search_history`, `chat_sessions`, `chat_messages`, and `message_citations` as the relevant features are implemented.

Enforce foreign keys, migrations, indexes, transactions for pack imports, deletes, and multi-row changes. Prefer normalized document metadata. Prevent duplicate imports using stable hashes. Sanitize and safely transform user search input into parameterized FTS queries (punctuation, operators, empty text, Unicode). Use `bm25` and `snippet` appropriately. Verify the FTS5 table exists and works on Android, not only in desktop SQLite.

### Search experience

- Full-text ranked results from **real local content** with title, excerpt, type, pack, and source.
- Query debouncing, cancellation, pagination/limited batches, filter chips and empty state.
- Clicking a result opens a real local content view at the relevant chunk, not a dummy webpage.
- Initial MVP: lexical FTS5 retrieval. **Optional after MVP:** small offline embedding model and hybrid keyword/vector search; do not block working search on vectors.
- Offline content corpus should be clearly enumerated and limited; do not assert exhaustive world knowledge.

### Seed content

Provide a **small but real** starter pack with enough diverse, properly licensed or originally authored materials to demonstrate general topics (e.g. astronomy, renewable energy, computing, history). All packs must include source, attribution/license, provenance, content hash, and a reproducible generation script. **Never scrape copyrighted Google Books previews or assume “free to view” permits redistribution.**

---

## 6. On-device LLM and grounded research agent

Build an `LLMEngine` interface and a `LlamaRnEngine` implementation with operations conceptually like:

```ts
interface LLMEngine {
  isReady(): Promise<boolean>;
  load(modelUri: string): Promise<void>;
  generate(input: string, onToken?: (token: string) => void): Promise<string>;
  cancel(): Promise<void>;
  unload(): Promise<void>;
}
```

Adapt actual implementation to **the installed `llama.rn` API**. Manage context lifetime correctly; keep memory use bounded, permit cancellation, and clean up on errors. Handle missing/corrupt model files, incompatible architecture, out-of-memory, backgrounding, and repeat requests. Persist model manifest and status. Always indicate “not ready” when inference is impossible.

### Retrieval-augmented answers

Implement the following **real deterministic** flow:

1. Receive a user question.
2. Search locally indexed chunks via a `searchKnowledge` tool.
3. Retrieve actual document excerpts and metadata via `readDocumentChunk` / `getDocument` tools.
4. Build a **bounded** prompt with question, retrieved passages and stable citation IDs (for example `[S1]`, `[S2]`).
5. Instruct the LLM to answer **only from supplied evidence**, cite IDs, and acknowledge unsupported assertions/insufficient evidence.
6. Validate/resolve citation IDs against retrieved database records. Save links in `message_citations`.
7. Show answer tokens as they stream, with clickable citations opening the corresponding local reader passage.

**Do not allow the LLM to invent URL links, database IDs, or citations.** Reject any returned source ID not present in current retrieval. Provide useful failure responses when search has no supporting documents. Bound retrieved context for mobile memory; do not send entire books to the prompt.

### Agent tools

Implement explicit allowlisted, local-only tools (not arbitrary shell/code execution):

- `searchKnowledge(query, filters)`
- `readDocumentChunk(chunkId)`
- `getDocument(documentId)`
- `listKnowledgePacks()`
- `saveResearchNote(title, content, sourceIds)` (requires user's intentional save action)
- `summarizeSelectedDocument(documentId)` using retrieved local chunks and visible citations.

Tool calling may use the model's supported structured output or a deterministic orchestration layer, but **never trust arbitrary tool names or arguments emitted by an LLM**. Validate with a schema, enforce limits, handle cycles, and keep execution local. The minimum vertical slice can implement fixed retrieval-then-answer; add a more elaborate tool-calling agent after the baseline passes tests.

### Generic knowledge tools (later milestone)

Source-grounded summarization, comparison across documents, explain selected text, key points, follow-up questions, and optional generic quizzes. Label generated quizzes as AI-produced rather than verified examinations.

---

## 7. Files, knowledge packs, import, and permissions

**Knowledge Pack format** (example; choose an implementable archive layout):

```text
science-and-tech.pack (zip or directory)
├── manifest.json
├── knowledge.db            # optional prebuilt index; validate version/schema
└── documents/
    ├── article-a.md
    ├── article-b.txt
    └── document-c.pdf
```

Manifest minimum: `id`, `name`, `version`, `description`, `language`, `publisher`, `license`, `sourceUrls`, `createdAt`, `files[]` with checksums, size, and MIME types. Version manifest and index schema independently; verify all content paths (block path traversal), integrity and compatible index schema. Import atomically with rollback on error. Remove only app-managed files after confirmation; protect user-owned external source files.

**Document import MVP:** Start with TXT and Markdown plus PDF **when a compatible local parser is confirmed to work**. Use Expo DocumentPicker and persist a copy under the application's document directory; extract text, chunk, index, and surface progress. Scanned PDFs requiring OCR are post-MVP. For PDF, integrate a proven compatible solution or add an optional **desktop content-builder** that extracts pages and exports a pack; never pretend PDFs were indexed when only stored.

Network download is an optional feature after the offline baseline. It must be user-initiated, verify integrity, handle interruptions, and state source/license. No unsanctioned crawling of Google Search, Google Books, or arbitrary third-party sites.

---

## 8. Build phases and deliverables (execute in this order)

### Phase 0 — Inspect + compatibility spike

- Inspect existing repo or scaffold Expo + TypeScript + Bun.
- Configure Expo Router, navigation, styling, TypeScript strict mode, ESLint and tests.
- Validate native Android build setup, SQLite FTS5, and `llama.rn` installation/model proof-of-concept.
- Record machine limitations and actual verified commands.

**Acceptance:** App boots, navigation works, FTS5 query runs, inference either proves working or reports a specific authentic blocker with non-fake UI.

### Phase 1 — Polished mobile shell

- Brand splash/first-run, 5 tab navigation, reusable UI primitives and theme tokens.
- Search home, results screen, detail/reader screen, Library, AI Assistant, Settings.
- Accessible responsive layouts, all navigation wired, real states rather than placeholder buttons.

**Acceptance:** All included screens connect logically, can be navigated without errors, and show honest data/readiness states.

### Phase 2 — Offline searchable knowledge

- SQLite migrations, documents/chunks/FTS5 tables and repositories.
- Reproducible, licensed starter Knowledge Pack and importer.
- Ranked search, filtered results, excerpts, article reader, recent searches.

**Acceptance:** Search finds distinct relevant passages with airplane mode enabled, opens the correct document, persists after restart.

### Phase 3 — Real on-device assistant

- Local model file provisioning, checksum/version/compatibility checks, load/unload lifecycle.
- User question → retrieved passages → local GGUF generation → validated clickable citations.
- Loading, cancellation, unsupported model/device, no-evidence states.

**Acceptance:** At least three diverse questions produce local grounded responses with valid source jumps, **without HTTP requests**. If hardware incapable, record benchmark/blocker and preserve working app.

### Phase 4 — Personal library + document import

- Save/un-save/bookmark, collections, search and chat history, import TXT/MD and compatible PDF, reindex/deletion.
- Persist data; surface index progress, file errors, duplicate handling.

**Acceptance:** A newly imported supported document becomes searchable offline and is usable by the assistant; delete removes it from results.

### Phase 5 — Pack management, polish and optional tools

- Pack details, install/remove, disk-usage overview, integrity validation, import external packs.
- Improved reader, long-result usability, dark mode, generic summary/comparison/quiz if core passes.
- Add opt-in online downloads only after offline path is verified.

**Acceptance:** Packs add/remove search results reliably; no dangling citations or orphaned records.

### Phase 6 — QA, docs, delivery

- Tests for migrations, FTS token handling, ranking, import duplicate/deletion, citation integrity, agent no-evidence behavior, offline operation and navigation states.
- Typecheck, lint, tests, Android build when environment permits; fix real failures.
- Maintain `README.md`, `docs/ARCHITECTURE.md`, `docs/CONTENT-LICENSES.md`, `docs/OFFLINE-TEST.md`, and concise `docs/KNOWN-LIMITATIONS.md`.

**Acceptance:** A new developer can clone the repo, install with Bun, run Android development build, import model/pack, search offline and reproduce the demo.

---

## 9. Test scenarios — these define “done”

1. **Airplane-mode search:** Install content, disconnect internet, search `renewable energy`, open a result and source passage.
2. **LLM truthfulness:** Ask a question answerable by a downloaded document; the response includes only citations present in retrieved source IDs. Follow each citation to stored text.
3. **Not in library:** Ask a question unsupported by local content; app explains evidence is unavailable rather than inventing facts.
4. **Manual import:** Import a new TXT or Markdown document in airplane mode, index it, search an exact unusual phrase, then get an AI answer grounded in it.
5. **Restart persistence:** Force-close/restart; installed packs, recent searches, saved articles, chats and local documents remain.
6. **Delete propagation:** Delete an imported document; it disappears from search, saved references are handled safely, and queries never display stale excerpts.
7. **Missing model:** Do not install a GGUF; Search and Library still work while AI shows actionable provisioning instructions.
8. **Fault handling:** Corrupted pack, duplicate document, invalid query, storage full, unsupported PDF, and insufficient model RAM show accurate non-crashing outcomes.
9. **Network audit:** Inspect network use while searching/asking AI with Wi-Fi/cellular off; there must be no outgoing inference or search API dependency.
10. **Accessibility:** Large text, Android back navigation, keyboard open/close, touch targets, screen reader labels, safe-area behavior.

**Performance objectives** (targets, measure instead of claiming): fast offline FTS response on the demo corpus; smooth scrolling on midrange Android; chunked ingestion without blocking the UI; memory bounded during on-device inference. Log startup time, indexing time, approximate search latency, and generation speed on available hardware.

---

## 10. Expected output in this coding session

**Start executing now.** In your first response to me:

1. Summarize the discovered repo state and your critical technical assumptions in a few sentences.
2. Give a short milestone plan, calling out native LLM / Bun / FTS5 risks.
3. **Immediately create or modify actual project files**: don't ask me to select 10 alternatives or stop at architecture diagrams.
4. Build the smallest **working end-to-end vertical slice**, then continue into the next phase while time/context permits.
5. At the end, give the created/changed files, actual commands run, test/build status, working features, incomplete features, and **one precise next command or step** to continue.

If you reach a context/time limit, leave the repository in a runnable state and write `docs/IMPLEMENTATION_STATUS.md` with completed work, verified commands, blockers and immediate next tasks. When invoked again, **read that file and resume**, without restarting the application.

**Do not claim that the complete app, model, reader, or offline demo works unless you have verified it.** Never replace an unsupported native feature with a simulated “AI response” while presenting it as functioning inference.

---

## 11. Official documentation references (verify installed versions)

- Expo creation and project structure: https://docs.expo.dev/get-started/create-a-project/
- Expo Router `src/` layout: https://docs.expo.dev/router/reference/src-directory/
- Expo SQLite (FTS settings): https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo FileSystem: https://docs.expo.dev/versions/latest/sdk/filesystem/
- Expo development builds: https://docs.expo.dev/develop/development-builds/development-workflows/
- llama.rn installation and Expo plugin: https://github.com/mybigday/llama.rn

**Final instruction:** Deliver a **genuine, usable offline-first general-knowledge product**, not a static UI demo, a cloud-assisted chatbot, or a collection of non-functional screens. Prioritize correctness, source traceability, Android reliability, and a convincing airplane-mode hackathon demonstration.
