# Product requirements

## Goal

A simple, credible system design tutorial site. Someone with almost no system design knowledge should be able to read one tutorial and understand how a system like a real platform could be designed, step by step. Interactive workflow diagrams are the main feature.

## Audience

Beginners, interview candidates and working engineers who want clear explanations rather than jargon.

## In this release

| Area | Status |
|---|---|
| Homepage: heading, purpose, search box, tutorial list, categories, how tutorials work | Done |
| System Design page: 121 platforms (the original 120 plus IRCTC) by category, search, category filter, "with tutorial" filter | Done |
| Tutorial template with nine fixed sections | Done |
| Tutorials: Ticketmaster (concert onsale), IRCTC (Tatkal train booking), Uber (ride-hailing), Netflix (video streaming), Rapido (bike taxi) and Ola (multi-service ride app), each with a "you are the user" story | Done, published |
| Interactive workflow diagrams: simple, detailed and failure views; Send request animation; component explanations; text version | Done |
| Traffic chart with capacity calculator | Done |
| Queue demo for the waiting room | Done |
| Architecture patterns (25), concepts (15), glossary (44) | Done, restyled |
| Search across tutorials, platforms, patterns, concepts and glossary | Done |
| A page for every platform: the tutorial, or a short "not written yet" page with the design challenge (no dates, kept out of search engines) | Done |
| Custom 404 page with search and tutorial links | Done |

## Removed in the redesign

Post generation, the public roadmap and calendar, publication statuses, progress tracking and bookmarks, the Practice Lab, the dark theme, the degradation-ladder, cache and failure-propagation simulators, and the API explorer. Old URLs redirect.

## Not part of the website

Personal planning notes are kept in a git-ignored `planning/` folder and are never imported by the app.

## Rules

- Proposed designs only; never claim a company's internal architecture.
- Facts are labelled Public with a source; reasoning is Inferred; example numbers are Assumption.
- No invented company metrics, fake activity, testimonials or statistics.
- Every control changes what it says it changes.
