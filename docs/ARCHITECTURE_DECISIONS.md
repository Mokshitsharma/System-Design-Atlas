# Architecture decisions

## ADR-1: Static, content-driven site with no backend

No implemented feature needs user data on a server, so there is no database, API or authentication. This keeps hosting on Vercel's free plan and removes a privacy surface. Revisit only if accounts become a real need.

## ADR-2: Tutorials as typed TypeScript data

Most of a tutorial feeds interactive components (diagram nodes, steps, failures, calculator defaults), so structured data with Zod validation is checked at build time: unknown nodes, failures that never happen on the path, overlapping grid cells and uncited public claims all fail the build. Numbers in the capacity section are computed from named constants, so the arithmetic shown is the arithmetic run.

## ADR-3: Custom SVG diagram instead of React Flow (changed in the redesign)

The first version used React Flow with an 18-node graph. It was hard to read at article width and pulled a large dependency. Workflows are now small (at most 14 nodes) on a fixed 4-column grid, drawn as plain SVG. That gives readable labels at normal size, an exact path for the request pulse, and a simple text fallback. React Flow was removed.

## ADR-4: Recharts for the two charts

Kept from the first version for the traffic chart and the queue demo. Animations are off so values update immediately; both charts load lazily and have written summaries.

## ADR-5: Personal notes stay outside the app and the repository

Personal planning notes are kept in a git-ignored `planning/` folder. Platform records carry no dates or status, and tutorials appear only when registered in `src/content/tutorials/index.ts`. A validator rule blocks any import from `planning/` inside `src/`, so nothing private can reach the build even locally.

## ADR-6: Every platform has a page; unwritten ones are marked noindex (changed)

Originally only published tutorials had pages. Visitors following a platform link then hit a 404, so every platform now has a page. Without a tutorial, the page shows the design challenge, the nine-section format and links to finished tutorials, with no dates or status. Those pages are `noindex` so search engines do not index thin content.

## ADR-7: One light theme

The site is for reading. One carefully tuned light theme is simpler to keep accessible than two.

## ADR-8: Component classes via Tailwind `@utility`

Plain classes inside `@layer components` were emitted unlayered by this build pipeline and overrode utilities. `@utility` keeps them in the utilities layer so variants such as `sm:hidden` win.
