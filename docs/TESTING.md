# Testing

| Command | Runs |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` and `tsc --noEmit` |
| `npm run validate:content` | Catalog, reference, tutorial and workflow checks, plus the privacy check |
| `npm test` | Vitest unit tests |
| `npm run check` | All four |
| `npm run build` | Validation, then the production build |
| `npm run test:e2e` | Playwright against `next start` on port 3200 (build first) |

Playwright browsers can live off the system drive with `PLAYWRIGHT_BROWSERS_PATH=E:\ms-playwright`.

## Unit tests (`tests/unit/logic.test.ts`, 18)

Workflow arrows follow `from` or the previous step; failure view stops at the failing component and continues only with recovery steps; every animated step has a drawable arrow in every view and scenario; simple-view layout; failure-only nodes; pulse endpoints. Capacity formula, spike curve, queue backlog. Validation passes on shipped content and catches a missing platform, an unknown node, an unreachable failure, overlapping grid cells and an uncited public failure. The search index covers all platforms and contains no planning information.

## End-to-end tests (`tests/e2e/site.spec.ts`, 13 runs on desktop, tablet and mobile)

Homepage search to tutorial; no planning information on public pages or in the search index; catalog filter and empty state; Send request follows fan, then seat service, then seat database, then back to the fan, with pause, completion, no lingering pulse, and reset; failure view marks the failing component and never reports success; component explanation by click and keyboard; capacity calculator recalculation and invalid input; queue demo updates; keyboard search; redirects and 404; no horizontal scroll at 1440, 768 and 390 px; phones get the text workflow; reduced motion advances without a moving pulse. Several tests fail on any console error.

IRCTC: the story is shown, the booking animation starts on the you-to-queue arrow, and the failure view marks the ticket database as failed and continues with the payment check job.

Uber: the story is shown, the matching animation follows you, then the API gateway, then matching, and the "same driver" failure marks the driver status store as failed.

Netflix: the story is shown, and the adaptive-quality failure marks the video server as failed and ends with recovery. A page for a platform without a tutorial (Zomato) loads with status 200, contains no planning words, and links to a finished tutorial. The 404 page shows search and tutorial links.

Rapido: the story is shown, and stepping through booking shows Captain A claiming the ride, then Captain B getting "ride taken".

Ola: the story is shown, and stepping through the outstation booking shows the scheduler picking the ride up from the scheduled-rides list before matching.

## Last results (22 Oct 2026)

Lint 0 problems; typecheck 0 errors; validation 0 errors and 0 warnings; unit 18 passed; build 177 pages; end-to-end 20 passed; animation and search tests also passed three repeated runs.
