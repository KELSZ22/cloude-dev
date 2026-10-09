# Knowledge packs and grounded answers

How Seekora stores offline content, finds passages, and writes answers that cite them. Everything here runs on the device; nothing calls a server.

## Pack format (`seekora-pack/1`)

A pack is one JSON file. The bundled sample is [`assets/knowledge-packs/algebra-starter-sample.json`](../assets/knowledge-packs/algebra-starter-sample.json).

```json
{
  "format": "seekora-pack/1",
  "id": "seekora-algebra-sample",
  "title": "Algebra Starter (Sample)",
  "version": "1.0.0",
  "description": "…",
  "language": "en",
  "author": "Seekora project contributors",
  "publisher": "Seekora",
  "source": "Written for Seekora. Not copied or adapted from any textbook.",
  "sourceUrls": [],
  "license": "MIT",
  "snapshotDate": "2026-10-09",
  "chapters": [
    {
      "id": "quadratic-equations", "number": "2", "title": "Quadratic Equations",
      "sections": [
        {
          "id": "quadratic-formula", "number": "2.2", "title": "The quadratic formula and the discriminant",
          "passages": [{ "id": "quad-formula", "text": "The quadratic formula solves any quadratic equation…" }]
        }
      ]
    }
  ]
}
```

| Field | Rule |
| --- | --- |
| `id`, chapter `id`, section `id`, passage `id` | Lowercase letters, digits, hyphens; at most 64 characters. Each kind is unique within the pack. |
| `title`, `author`, `publisher`, `source`, `license`, `version`, `description`, `language` | Required, non-empty. |
| `sourceUrls` | A list of `https` links. May be empty. |
| `snapshotDate` | `YYYY-MM-DD`: when the content was captured or last revised. |
| passage `text` | 1 to 8000 characters. Write math in plain text (`x^2`, `sqrt(x)`), so it is searchable and the model can read it. |

`parsePack` in [`pack-format.ts`](../src/infrastructure/knowledge/pack-format.ts) validates untrusted input and names the failing field. Unknown fields are dropped.

Keep a passage to one idea, in roughly 60 to 120 words. The passage is the unit that is retrieved, shown to the model, and cited.

## How a pack is stored

`SqliteKnowledgeRepository.installPack` writes one pack in a single transaction:

| Pack item | Table | Identifier |
| --- | --- | --- |
| Pack | `knowledge_packs` | `<pack id>` |
| Section | `documents` (chapter and section labels are columns) | `<pack id>:<section id>` |
| Passage | `document_chunks`, one row per chunk | `<pack id>:<passage id>:<part>` |

- Passages longer than 900 characters are split at sentence ends by [`chunker.ts`](../src/infrastructure/knowledge/chunker.ts). Every chunk keeps its `passage_id` and character offsets.
- The pack row stores a SHA-256 of the pack. Installing the same content again does nothing; different content with the same `id` replaces the old pack and its index entries.
- `chunks_fts` is an FTS5 table over section title, chapter title, and passage text, with the `porter unicode61` tokenizer. Triggers on `document_chunks` keep it in sync.
- The schema lives in [`migrations.ts`](../src/infrastructure/database/migrations.ts). Migrations are numbered, run once each, and record progress in `PRAGMA user_version`. Add a new numbered entry; never edit a released one.

Bundled packs are listed in [`bundled-packs.ts`](../src/infrastructure/knowledge/bundled-packs.ts) and installed when the app opens the library. They are compiled into the JavaScript bundle, which suits small samples only. Large packs should arrive as files through the import flow once it exists.

## Retrieval and ranking

1. `extractQueryTerms` lowercases the question, splits it the way the index does, and drops question words, single characters, and duplicates. At most 12 terms from the first 500 characters are used.
2. The terms are quoted and joined with `OR` into one bound `MATCH` parameter. User text never reaches SQL or FTS5 syntax.
3. SQLite returns candidates ordered by `bm25` (section title weighted 3, chapter title 2, text 1).
4. For each term, the index reports which candidates contain it. Results are ordered by number of distinct terms matched, then by `bm25`.

## Grounded answers

[`answer-question.ts`](../src/shared/services/rag/answer-question.ts) runs these steps:

1. **Evidence check by retrieval.** A passage counts as support only if it contains at least 60% of the question's terms, rounded up. If no passage qualifies, Seekora reports that it has not enough evidence and the model is not called.
2. **Prompts.** [`context-builder.ts`](../src/shared/services/rag/context-builder.ts) numbers up to three supporting passages `[1]`, `[2]`, `[3]`, then the question, then the task. Prompts stay under 3600 characters, inside the engine's 4000-character and 2048-token limits. The model sees source numbers only, never storage identifiers. The task comes last so that text inside a passage cannot override it.
3. **Evidence check by the model.** If the best passage is missing any term of the question, the model is first asked one thing: do the sources contain the information needed, YES or NO (4 output tokens). Anything other than YES ends with "not enough evidence" and no citations. When the best passage contains every term, this step is skipped.
4. **Generation.** The answer prompt goes through the existing `LLMEngine.generate` with at most 192 output tokens. Seekora asks for one paragraph and cancels generation when the model starts a second one. A final sentence cut off by the token limit is dropped. If the engine reports the context is full, the request is retried with one passage fewer.
5. **Citation check.** [`citations.ts`](../src/shared/services/rag/citations.ts) keeps a `[n]` marker only when `n` is one of the supplied sources and removes any other. Each kept source is read back from the database before it is shown. If the model names no source, the passages it was given are listed and labelled as such.

A citation opens `/passage/[chunkId]`, which shows the stored passage within its section, plus pack, author, origin, and license.

### Why the flow has this shape

These choices come from running the real Qwen3.5 0.8B model on the desktop (see [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)):

- Telling the model, inside the answer prompt, to output a fixed phrase when the sources do not answer was unreliable in both directions. Depending on small wording changes it refused questions the passages clearly answered, or invented an answer to "Who invented the quadratic formula?". A separate yes/no question was right on all seven partial-coverage questions tried.
- With the task placed before the sources the model refused the factoring question; with the task after them it answered.
- Left alone, the model sometimes repeated its paragraph until the token limit. Stopping at the first paragraph break removes that and saves generation time.

Seven questions is a small sample. Treat the yes/no check as a filter that helps, not as a guarantee.

## Known gaps

- The model sometimes attaches a source number to a sentence that came from a different supplied passage, and sometimes gives none. Every listed source is a real passage that was in the prompt, but the per-sentence attribution is the model's and is not verified. Computing attribution from word overlap between each sentence and each passage would be more dependable.
- The model occasionally writes a formula in LaTeX, which the app shows as raw text.
- Both evidence checks can be wrong. A question that shares all its words with a passage skips the yes/no check even if the passage does not answer it.
- Ranking is keyword-based. Questions phrased with synonyms that appear in no passage find nothing.
- Stopwords and stemming are English-only.
- Passage text is stored twice (table and index). That is fine for small packs and should be revisited before large ones.

## Checking changes

```bash
bun test tests                                   # 103 tests; runs the real SQL on Bun's SQLite
bun scripts/rag-desktop-check.mjs <ollama-model> # optional: real model output on the desktop
```

The desktop check uses a local Ollama model for development only. See [LOCAL-MODEL.md](LOCAL-MODEL.md) for how to register the pinned GGUF with Ollama. Rerun it whenever a prompt changes: wording that looks harmless can flip this model's behaviour. Desktop results do not replace the Android steps in [OFFLINE-TEST.md](OFFLINE-TEST.md).
