# AralSearch AI — Content API manifest

This manifest maps the app's eight knowledge categories to API-discoverable documents and books. It is **not** a collection of existing PDF URLs. Discovery, PDF link resolution, rights checks, downloading and offline indexing still have to be implemented.

## Providers

| Provider | Discovery | Native PDFs? | Notes |
|---|---|---|---|
| Wikipedia | MediaWiki categorymembers + REST page HTML | No | Cache HTML; PDF conversion is your own step. Honor CC BY-SA and attribution. |
| Internet Archive | Advanced Search + Item Metadata | Yes, when files list an accessible PDF | Per-item copyright/access review. |
| OpenAlex | Works API | When best OA location contains a `pdf_url` | Free API key advisable in production; OA does not imply redistribution rights. |
| arXiv | Atom search API | Yes | 1 legacy API request every 3 seconds; e-print copyright often restricts redistribution. |
| Gutendex/Project Gutenberg | Gutendex books API | Uncommon; mostly HTML/EPUB/TXT | Public domain varies by jurisdiction. |
| Europe PMC | REST search + OA fullTextXML | Sometimes via external link / OA collection | REST search does not itself supply a universal PDF endpoint. |
| OpenStax | Curated publisher catalog, not an unrestricted download API | Yes | Link PDFs found on official book pages; review each edition's license. |

## Import from React Native

`import sourceManifest from './content/content-sources.manifest.json';`

`const providers = sourceManifest.categories.find(c => c.id === 'science')?.providers;`

React Native downloads should use a persistent app-private filesystem API and verify returned MIME/bytes. For source-specific query placeholders, substitute *encoded* values rather than using URL string concatenation without escaping. This file intentionally contains no API keys.

## Rights reminder

Free-to-read is not necessarily free-to-redistribute. PDFs downloaded individually by users and PDFs bundled into a distributed APK can have **different rights implications**. Show creator, title, source and license in the reader.

## Official documentation

- https://www.mediawiki.org/wiki/API:REST_API/Reference
- https://archive.org/developers/metadata.html
- https://help.openalex.org/api/
- https://info.arxiv.org/help/api/user-manual.html
- https://github.com/garethbjohnson/gutendex
- https://europepmc.org/RestfulWebService
- https://openstax.org/subjects
