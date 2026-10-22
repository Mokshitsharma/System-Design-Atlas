# Design system

## Direction

A plain technical-tutorial site: white pages, dark readable text, blue links and highlights, thin borders. The diagrams are the one place with visual emphasis: a single blue pulse moves through them when a request is sent. Everything else stays quiet.

## Color (`src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--bg` | #FFFFFF | Page and panels |
| `--bg-alt` | #F5F8FC | Control bars, footer, table headers |
| `--ink` | #172033 | Main text |
| `--ink-3` | #475569 | Body text in dense areas |
| `--ink-2` | #64748B | Secondary text |
| `--line` / `--line-strong` | #E2E8F0 / #CBD5E1 | Borders and inactive arrows |
| `--blue` / `--blue-dark` | #2563EB / #1D4ED8 | Links, buttons, active component, request pulse |
| `--blue-soft` | #EFF6FF | Highlights and notes |
| `--ok` | #15803D | Recovery steps, Public label |
| `--warn` | #B45309 | Assumption label |
| `--fail` | #DC2626 | Failed component, validation errors |

There is one light theme. State is never shown by color alone: failed components say "Failed", recovery steps are labelled, and background steps use dashed arrows.

## Type

Source Sans 3 for everything; IBM Plex Mono for formulas and field names. Sizes: `h1` (1.75 to 2.25rem), `h2` 1.5rem, `h3` 1.19rem, body 1.0625rem, `small`, `tiny`. Long text is capped at 70 characters (`prose`).

## Layout

- Compact sticky header: wordmark, Home, System Design, Architecture Patterns, Search. On phones the wordmark shrinks to its icon and Search to an icon button.
- Tutorial pages: a 220px contents column on wide screens (collapsible on small screens) and a 780px article. No right rail.
- Numbered headings only where content really is a sequence: the nine tutorial sections and workflow steps.

## Classes

Declared with Tailwind `@utility` so utilities written next to them win: `wrap`, `h1`, `h2`, `h3`, `prose`, `small`, `tiny`, `muted`, `box` (bordered panel, 6px radius), `btn`, `btn-primary`, `btn-sm`, `tabs` and `tab` (segmented control), `input`, `label`, `table`, `table-wrap`, `codeblock`, `note` (left-rule callout).

## Motion

Only the request pulse moves, and only after the user presses Send request. With reduced motion, steps advance without the moving pulse, and every step can be stepped through by hand.
