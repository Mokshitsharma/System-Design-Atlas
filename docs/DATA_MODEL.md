# Data model

There is no database. All data is public content in the repository, compiled at build time.

| Entity | File | Key | Fields |
|---|---|---|---|
| Category | `src/content/catalog.ts` | `slug` | plate (1 to 20), name, signature focus |
| Platform (121: the original 120 plus IRCTC; `PLATFORM_COUNT`) | `src/content/catalog.ts` | `slug`, `id` | name, category, difficulty 1 to 5, signature challenge, tags |
| Tutorial | `src/content/tutorials/<slug>.ts` | `slug` = platform slug | see `CONTENT_MODEL.md` |
| Pattern, Concept, GlossaryTerm | `src/content/*.ts` | `slug` | cross-references checked by validation |

Whether a platform has a tutorial is derived from the tutorial registry, not stored on the platform.

## Browser storage

None. The site sets no cookies and stores nothing in local storage. Calculator inputs live only in page memory.

## Personal notes

Personal notes live in a git-ignored `planning/` folder. They are not in the repository and not part of the build.

## Database design inside tutorials

Each tutorial's section 6 describes a proposed database for that platform (for Ticketmaster: Event, Seat, Hold, Order, Payment attempt). That is teaching content, not this site's data model.
