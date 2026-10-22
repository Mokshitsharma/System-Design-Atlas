# System Design Atlas

**Learn system design step by step, with interactive diagrams of real-world apps.**

System Design Atlas is a free learning site that explains how apps like Uber, Netflix, IRCTC and Rapido could be designed, in plain language for beginners. Every tutorial starts with a short story where *you* are the user, then builds the design one piece at a time: requirements, capacity math, architecture, workflows, database, trade-offs and failure handling.

The core feature is the **interactive workflow diagram**. Switch between a simple, detailed and failure view, press **Send request** to watch a request travel through the system as a moving pulse, and click any component for a plain-English explanation of what it does and what can go wrong.

## Tutorials

| Tutorial | What it teaches |
|---|---|
| Design a bike-taxi app like Rapido | Offering a ride to several drivers at once, first-accept-wins, ride PINs |
| Design a ride-hailing app like Ola | Many ride types in one system, rides booked days ahead, routing on your own maps |
| Design a ride-hailing app like Uber | Hexagon map cells, live location at scale, surge pricing per area |
| Design a ticket booking system like Ticketmaster | Waiting rooms, seat holds, never selling a seat twice |
| Design a train ticket booking system like IRCTC | The 10 AM Tatkal rush, quotas, waiting lists, refunds when payment fails |
| Design a video streaming service like Netflix | Video servers near viewers, adaptive quality, staying up when parts fail |

Plus 121 platforms across 20 categories, 25 architecture patterns, 15 fundamentals and a glossary.

## Features

- Nine-section tutorials, the same structure every time
- Interactive diagrams with a Send request animation, failure and recovery paths, and a text version for phones and screen readers
- Traffic-spike chart and server capacity calculator that update as you type
- Waiting-room queue demo
- Every factual claim labelled **Public** (with a cited source), **Inferred** or **Assumption**
- Site-wide search (Ctrl K), responsive layout, keyboard accessible, respects reduced motion
- No accounts, cookies or tracking

The tutorials describe proposed designs based on public information, not the companies' internal systems.

## Tech stack

Next.js 16 (App Router, static generation), React 19, TypeScript, Tailwind CSS 4, Zod for content validation, Recharts, a custom SVG diagram engine, Vitest and Playwright.

## Run locally

```bash
npm install
npm run dev               # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run check` | Lint, type check, content validation and unit tests |
| `npm run build` | Validates content, then builds the production site |
| `npm run test:e2e` | Browser tests with Playwright (run after a build) |

## Adding a tutorial

Write a typed content file in `src/content/tutorials/`, register it in `src/content/tutorials/index.ts`, and run `npm run validate:content`. The validator checks diagram references, sources and the tutorial structure before anything can build. See `docs/CONTENT_MODEL.md`.

## Documentation

Design, architecture decisions, content model, testing and deployment notes are in [`docs/`](docs/).

## License

All rights reserved unless a license file is added.
