# Offline reading

## User flow

1. Open Search to browse online articles available to download. Science results load initially, with topic shortcuts for science, history, mathematics, and technology. Home and Library's discovery button lead to Search too.
2. Choose English or Tagalog and search while connected. Queries go directly to the selected Wikipedia edition; no API key or app backend is required. Search shows online discovery results, including a page thumbnail when Wikipedia provides one; saved offline content lives in Library → Reading.
3. Download an article. The app saves the article text and, when Wikipedia provides them, a bounded set of article figures. It appears as available offline only after local storage commits successfully. Failed or cancelled requests leave no installed entry. Downloads continue while navigating within the running app, but are not background OS jobs.
4. Open the saved article from Library → Reading. The reader loads only local content, provides a contents list, previous/next sections, selectable text, a larger text option, and locally stored figures in the introduction.
5. Remove a saved article from its Library card to release its local storage, including saved images. Confirmation is shown inline and works on native and web.

## Source and format

The service uses the [MediaWiki search API](https://www.mediawiki.org/wiki/API:Search), [TextExtracts](https://www.mediawiki.org/wiki/Extension:TextExtracts#API), [page images](https://www.mediawiki.org/wiki/Extension:PageImages), and [embedded file metadata](https://www.mediawiki.org/wiki/API:Imageinfo). Downloads omit `exintro`, `exchars`, and `exsentences` so they include available text beyond the introduction. Search is limited to 12 main-namespace results and uses an identifying `Api-User-Agent`, CORS `origin=*`, cancellation, and a 25-second request timeout.

This is an illustrated text edition, not a complete HTML/PDF reproduction. TextExtracts omits tables and some formulas and may not produce text for every page. Formatting is adapted into sections and paragraphs. Up to eight JPEG, PNG, WebP, or GIF figures are copied from Wikimedia (`upload.wikimedia.org` or rasterized SVG thumbs from `thumb.wikimedia.org`) after license metadata is present; icons, logos, and files hosted off Wikimedia are skipped. Image failures do not block saving the text. The local copy includes a source revision URL, revision timestamp, contributor history URL, download timestamp, CC BY-SA 4.0 license link for text, and each figure's file page, creator, and license. See [Wikimedia reuse terms](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content).

The implementation rejects missing/empty responses, extraction warnings, invalid metadata, extracts over one million characters, serialized article JSON over two million bytes, and text-plus-images packages over six million bytes. It does not silently save a truncated article. Downloads do not update automatically.

## Storage and boundaries

- `src/infrastructure/learning/wikipedia.ts`: network access, text conversion, and figure downloads.
- `reading-repository.ts`: versioned record validation, summaries, local reads, and deletion. Source URLs must match their Wikipedia IDs; figure file pages must be on Wikipedia or Wikimedia Commons. Corrupt or mismatched records are excluded from the shelf.
- `reading-storage.native.ts`: JSON files under `Paths.document/offline-reading-v1`, with figures in `{id}-media`. A staging file is written and verified before an awaited move commits it. Leftover partial files never appear as downloaded.
- `reading-storage.web.ts`: IndexedDB (`articles` and `assets` stores), with writes resolved after transaction completion rather than request success. Closing/reloading the page retains committed data; clearing browser site data removes it. There is no service worker to boot the web app offline.
- `src/shared/stores/offline-reading-store.ts`: lightweight article summaries, hydration, one active download/removal, cancellation, and localized failure states.
- `src/features/offline-reading`: discovery, reading shelf, and local reader. The reader renders one section at a time and virtualizes its paragraphs and figures.

No new native dependencies are needed. OpenStax is hidden through `contentSources.openStax` in `src/shared/constants/content-sources.ts`. Its catalog, fixtures, download implementation, and existing downloaded files are preserved. Pack and legacy article routes redirect to online discovery while disabled; the app also hides OpenStax search results, sample documents, bookmarks, and history, and skips pack discovery/download starts. Set the flag to `true` to restore the provider. This does not add PDF rendering. AI grounding, full-text indexing, automatic updates, and restoring reading position are outside this feature.

## Verification

```sh
bunx expo lint
bunx tsc --noEmit
bun test tests
```

The unit suite covers API parameters, complete text requests, language selection, section parsing, source attribution, figure downloads, skipped decorative or unsafe image URLs, failed downloads, cancellation, durable commits, reopening through a fresh repository, corrupted records, and removal.

Device acceptance: download an illustrated article, force-close the installed app, enable airplane mode, reopen Library, confirm images still render, navigate multiple sections, and remove the download. Also test insufficient storage and cancellation during a slow request. Native device behavior must be checked on an installed build; successful typechecking or browser tests alone do not validate the native filesystem.
