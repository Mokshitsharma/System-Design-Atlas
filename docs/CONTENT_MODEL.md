# Content model

Schemas live in `src/lib/schema.ts`.

## Tutorial (`src/content/tutorials/<slug>.ts`)

| Section | Field | Contents |
|---|---|---|
| Header | `title`, `summary`, `lastVerifiedAt`, `sources`, `patterns` | |
| 1. Introduction | `intro.paragraphs`, `intro.known`, `intro.story` | Paragraphs; "what is publicly known" claims with sources; a 3 to 9 step story told with the reader as the user |
| 2. Requirements | `requirements` | functional (3 to 8), non-functional with plain meaning and target, out of scope, terms explained |
| 3. Capacity | `capacity` | starting numbers (each labelled Assumption or Public with a source), calculation steps (formula, working, result), takeaways, calculator defaults |
| 4. Architecture | `architecture.workflow` | One overview Workflow |
| 5. Workflows | `workflows` | 1 to 4 Workflows |
| 6. Database | `database` | 3 to 8 entities with fields and relations, plus why |
| 7. Decisions | `decisions` | problem, solution, how, where, trade-off; optional `demo: "queue"` with `demoPeople` and `demoPlace` wording |
| 8. Failures | `failures` | what goes wrong, what users see, detection, recovery, prevention and testing; evidence and sources |
| 9. Recap | `recap` | decision table, interview questions |

## Workflow

```ts
{
  id, title, summary,
  nodes: { id, label, kind, col: 0..3, row, failureOnly?, tags?: ("cache"|"queue"|"transaction"|"retry")[],
           explain: { what, why, input, inside, output, risks[] } }[],
  simple:   { node, from?, text, async? }[],   // 2 to 8 steps
  detailed: { node, from?, text, async? }[],   // 2 to 14 steps
  failures: { id, title, node, what, userSees, detect, steps: Step[] }[]
}
```

- A step's arrow comes from `from`, or from the previous step's node. A step back to the user is a response.
- `async` steps are background work, drawn dashed.
- In the failure view, the request follows `detailed` until it reaches the failure's `node`, which fails, then follows that failure's `steps` (retry, fallback, reconciliation or error response).
- `failureOnly` nodes (such as a reconciliation job) appear only in the failure view.

Validation enforces: known nodes in every step, the failing node is on the detailed path, no two nodes in one grid cell, every displayed node is on its path, failure-only nodes stay out of normal views, public claims cite existing sources.

## Adding a tutorial

1. Create `src/content/tutorials/<slug>.ts` exporting a `TutorialInput`, where the slug matches a platform in the catalog.
2. Register it in `src/content/tutorials/index.ts` only when it is ready to publish.
3. Run `npm run validate:content` and fix every error.
