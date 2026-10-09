# Offline verification

These are native acceptance steps, not passing tests. A web export, a TypeScript check, or the desktop test suite cannot prove Android FTS5 or inference. Record each result in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## First RAG milestone

1. Build and install on a 64-bit Android device: `bun run android`. On Windows, set the llama.rn variant list first (see [LOCAL-MODEL.md](LOCAL-MODEL.md)). On Xiaomi, Redmi, and POCO phones, first turn on **Install via USB** and **USB debugging (Security settings)** in Developer options, and accept the install prompt on the phone; otherwise the install fails with `INSTALL_FAILED_USER_RESTRICTED`.
2. Open Home. The library card should read "Offline library ready" with 32 passages from 1 pack. An error here means FTS5 or the migration failed on the device; note the message.
3. Open Search and type `quadratic formula`. Results appear with the quadratic formula section first. Tap one and confirm the passage reader shows the text, the highlighted passage, and the pack's author, origin, and license.
4. Follow [LOCAL-MODEL.md](LOCAL-MODEL.md) to import and load the pinned GGUF, and run the local test.
5. Open Ask Seekora and ask `How do I solve a quadratic equation by factoring?`. Confirm that text streams in, the final answer is about factoring, and at least one source is listed.
6. Tap each source. It must open a stored passage whose text supports the answer.
7. Ask `What is the capital of France?`. The app must say it has not enough evidence, show no sources, and not start the model.
8. Ask `Who invented the quadratic formula?`. The library does not say, and on the desktop the model's yes/no check refused it. The app should report not enough evidence. Record it if the phone invents an answer instead.
9. Without the model loaded, ask a supported question. The app should list supporting passages and say the model is not loaded.

## Offline and persistence

10. Test with an embedded JavaScript bundle. A Metro-connected development build depends on the development host.
11. Enable airplane mode, turn Wi-Fi off, and repeat steps 3 to 7.
12. Force-close and reopen the app. The library must be ready without reinstalling the pack.
13. Audit network traffic. Local search and inference must have no HTTP dependency. Record device, ABI, RAM, build, pack and model versions, load time, time to first token, tokens per second, and failures.

## Robustness and access

14. Test a missing or corrupt model, insufficient RAM, stopping an answer midway, and sending the app to the background while it answers.
15. Check Android back, safe areas, keyboard behavior over the question field, large text, TalkBack labels, contrast in light and dark themes, and touch targets.

## Later features

When import, saves, and history exist: import TXT/Markdown with a unique phrase, search for it, and cite it; check that documents, saves, searches, and chats persist across restarts; delete with confirmation and check results, bookmarks, and citations for stale records while the external original is kept; test duplicates, unsupported PDFs, invalid packs, and storage errors.
