# Architecture

A content-driven Next.js 16 App Router site. Tutorials and reference pages are TypeScript data validated with Zod and prerendered at build time. Interactivity (diagrams, charts, search) runs in the browser. There is no database, backend API with user data, or authentication.

## Directory map

| Path | Purpose |
|---|---|
| `src/content/catalog.ts` | 20 categories and 120 platforms (name, category, difficulty, signature challenge, tags). No dates or status |
| `src/content/tutorials/` | Published tutorials. `index.ts` registers them; only registered tutorials exist on the site |
| `src/content/patterns.ts`, `concepts.ts`, `glossary.ts` | Reference pages |
| `src/lib/schema.ts` | Zod schemas: Platform, Tutorial, Workflow, steps, failures, sources, claims |
| `src/lib/workflow.ts` | Pure diagram logic: node placement, path sequences per view, arrow geometry, pulse position |
| `src/lib/sim/` | Capacity and queue models |
| `src/lib/validate.ts` | Content checks, including the privacy check |
| `src/lib/search.ts`, `search-core.ts` | Search index builder (build time) and matcher (browser) |
| `src/components/WorkflowDiagram.tsx` | The interactive diagram |
| `src/components/TutorialView.tsx` | The nine-section tutorial template |
| `src/components/charts/` | Traffic and capacity, queue demo; loaded lazily |
| `planning/` | Personal notes; git-ignored and never imported by the app |

## Routes

| Route | Rendering |
|---|---|
| `/` | Static |
| `/system-design` | Static shell; filters read from the URL in the browser |
| `/system-design/[slug]` | Static for every platform: the tutorial, or a "not written yet" page (`noindex`); unknown slugs return the custom 404 |
| `/patterns`, `/patterns/[slug]`, `/concepts`, `/concepts/[slug]`, `/glossary`, `/about` | Static |
| `/search-index.json` | Static JSON, fetched when search opens |
| `/sitemap.xml`, `/robots.txt`, `/opengraph-image` | Static |

Redirects in `next.config.ts` keep old URLs working: `/platforms/*` to `/system-design/*`, `/categories/:slug` to a filtered list, `/sources` to `/about`, and the removed planning pages to the homepage.

## How the diagram works

1. A tutorial workflow lists nodes (with grid positions and plain-English explanations), a `simple` step list, a `detailed` step list, and failure scenarios with recovery steps.
2. `buildSequence` turns the steps for the chosen view into arrows: each step's arrow comes from its `from` node or the previous step. In the failure view, the path runs to the failing component, marks it failed, then follows the scenario's recovery steps only.
3. `edgesFor` computes arrow geometry: straight for neighbours, curved when a straight line would cross a box or the reverse arrow exists.
4. `WorkflowDiagram` runs one `requestAnimationFrame` loop while playing. Each step travels (900 ms, pulse moves along the arrow) then dwells (1.7 s, component highlighted, step explained). Pause, resume, reset and manual steps share the same state, so runs cannot overlap.
5. On phones, and on request elsewhere, the same state drives a numbered text list.

## Privacy boundary

Public build inputs: catalog, published tutorials, reference content. Personal notes in the git-ignored `planning/` folder are outside `src/`, and `npm run validate:content` fails if any file in `src/` imports from them. The search index and pages are tested for dates, day numbers and status words.
