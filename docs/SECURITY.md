# Security and privacy

| Risk | Control |
|---|---|
| Leaking personal notes | Notes live in git-ignored `planning/`; validation fails on any import from it in `src/`; tests check pages and the search index for dates and status words |
| XSS through content | Content renders as React text; no `dangerouslySetInnerHTML`; search highlighting splits strings |
| Executable input | Calculator inputs are bounded numbers; nothing is evaluated |
| External links | `rel="noopener noreferrer"` |
| Secrets | None used. `.env.example` has only the public site URL |
| Error leakage | Error page shows a digest only |
| Dependencies | `npm audit` before deploys |

No cookies, analytics, accounts or browser storage.

`planning/` is listed in `.gitignore`, so personal notes are never committed or pushed.
