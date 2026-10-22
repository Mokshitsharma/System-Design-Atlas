# API

The site has no write APIs and handles no user data.

## `GET /search-index.json`

Static JSON built from public content only: platforms (linking to their tutorial, or to a filtered list if there is none), categories, patterns, concepts, glossary terms and sections of published tutorials.

```ts
{ kind: "tutorial" | "platform" | "category" | "pattern" | "concept" | "glossary" | "section",
  title: string, href: string, detail: string, text: string }[]
```

Contains no dates, schedule, day numbers or preparation status; an end-to-end test checks this. Cached at the edge for a day; each deployment replaces it. If it fails to load, the search dialog says so and offers a retry.

## Metadata routes

`/sitemap.xml`, `/robots.txt`, `/opengraph-image`.
