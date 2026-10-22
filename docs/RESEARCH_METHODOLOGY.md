# Research methodology

## Evidence labels

| Label | Meaning | Requirement |
|---|---|---|
| [Public] | Supported by a reliable public source | Cites at least one source id; validation enforces this |
| [Inferred] | Reasoned interpretation of public information, or a design recommendation | Wording must not claim it describes the company's systems |
| [Assumption] | Illustrative number or design choice | Shown with its working where it feeds a calculation |

Every tutorial states that it is a proposed design based on public information.

## Source rules

- Prefer official engineering posts, documentation, government records, papers, talks and postmortems.
- Record title, publisher, https URL, publication date (or null with a note), and the date last checked.
- Company statements are reported as the company's own account, not as independently verified fact.
- Separate current from historical information.
- If a claim cannot be verified, say so. Do not cite a source that does not support it.
- Never invent company DAU, QPS, infrastructure counts, revenue or performance numbers.

## Ticketmaster tutorial: what is public and what is not

Public, cited:

- Eras Tour presale: 3.5 billion total system requests, four times the previous peak; over 3.5 million Verified Fan registrations; about 1.5 million invited; over 2 million tickets sold on 15 Nov 2022; about 15 percent of interactions had issues, including passcode validation errors; some sales slowed or pushed back. Source: Ticketmaster statement of 19 Nov 2022.
- Bot traffic three times anything previously experienced, and Verified Fan password servers targeted for the first time in 400 onsales; sales slowed and paused. Source: Senate hearing record S. Hrg. 118-31, 24 Jan 2023.
- The waiting room opens about 30 minutes before the sale, join time does not set queue position, and an admitted fan's spot is held for 10 minutes. Source: Ticketmaster Australia Smart Queue guide, 28 Oct 2024.

Not public, so labelled Inferred or Assumption: all components, data stores, workflows, database design, capacity numbers and admission rates.

Checked on 22 Oct 2026. The Stripe idempotency documentation is cited as a public example of the technique, not as a claim about which provider Ticketmaster uses.

## IRCTC tutorial: what is public and what is not

Public, cited (checked 22 Oct 2026):

- NGeT since 28 Apr 2014; capacity of more than 30,000 bookings a minute; record 30,155 bookings at 10:01 AM on 12 Mar 2025; 16.17 lakh e-tickets on 6 Mar 2025; 86.38 percent of reserved tickets booked online in 2024-25. Source: IRCTC Internet Ticketing page.
- Tatkal opens one day before the journey, 10:00 AM for AC and 11:00 AM for non-AC; IRCTC said in April 2025 that no change was proposed. Source: Business Today, 13 Apr 2025.
- Aadhaar-authenticated users only from 1 Jul 2025, Aadhaar OTP from 15 Jul 2025, and no agents in the first 30 minutes. Source: The Tribune (PTI), 11 Jun 2025, reporting a circular of 10 Jun 2025.
- Advance reservation period of 60 days from 1 Nov 2024. Source: Onmanorama, 17 Oct 2024.

Inferred: that the 10:01 AM record minute reflects the AC Tatkal opening. Proposed, not public: the booking queue, the hold-while-paying step, the cache, the payment check job and the database design. Press sources report official notices; re-check the official IRCTC or Railway Board text before relying on exact wording.

## Uber tutorial: what is public and what is not

Public, cited (checked 22 Oct 2026):

- Nearly 26 million average daily trips in 2023 (rides and deliveries) and 150 million monthly active platform consumers in Q4 2023. Source: Uber's Q4 and full-year 2023 results, 7 Feb 2024.
- H3, a hexagon grid, described in 2018 as Uber's system for optimising pricing and dispatch, with surge calculated from supply and demand in hexagons; released as open source. Source: Uber Engineering, 27 Jun 2018. Historical: current internal use may differ.
- Surge happens when requests outnumber available cars, updates in real time, is specific to areas of a city, and riders are told in the app. Source: Uber's "How surge pricing works" page.

Assumptions, not public: drivers online, the location update interval (4 seconds is a common illustrative figure, not an Uber number), peak multiplier and requests per trip. Proposed, not public: every service, store and workflow in the tutorial.

## Netflix tutorial: what is public and what is not

Public, cited (checked 22 Oct 2026):

- 302 million memberships at the end of 2024 (301.63 million in the table), and no more quarterly membership reporting from 2025. Source: Netflix Q4 2024 letter to shareholders, 21 Jan 2025.
- Open Connect appliances embedded in ISP networks or at data centres and exchanges; over a thousand ISP partners; 60+ data centres; nightly content fills. Source: openconnect.netflix.com.
- Chaos Monkey randomly terminates instances in production so that services are resilient to instance failures. Source: Netflix's Chaos Monkey documentation.

Not cited: the 2015 per-title encoding post blocked automated access, so adaptive quality is explained as a general technique without that citation. Assumptions: share watching at peak, bitrates, session length and report interval. Proposed: every service and workflow.

## Rapido tutorial: what is public and what is not

Public, cited (checked 22 Oct 2026):

- Self-described as India's first and largest bike-taxi service; 500+ cities; 75+ million customers; 1 million+ captains; every ride insured with Acko at no extra cost; a helmet for the pillion rider; Paytm, UPI and Rapido Wallet payments. Source: Rapido's App Store listing (self-reported).
- Lifetime zero per-ride commission for auto captains, who pay a nominal access fee and receive payments directly from customers. Source: CommercialVehicle.in, 15 Feb 2024. Bike-captain terms not confirmed.

Assumptions: rides per day (not published), peak, captains online, captains per offer, update interval. Proposed: broadcast offers with a first-accept claim, the ride PIN, access-pass check, background insurance registration and every other component.

## Ola tutorial: what is public and what is not

Public, cited (checked 22 Oct 2026):

- Bike taxis, autos, cabs such as Mini, hourly Rentals and Outstation trips in more than 200 cities; an OTP for every cab ride; an emergency call option; ride tracking shared with up to 5 emergency contacts by SMS; cash, UPI, card and wallet payments. Source: Ola's App Store listing (self-reported).
- Zero per cent commission model across autos, bikes and cabs, June 2025. Source: The Week (PTI), 17 Jun 2025.
- Switch from Google Maps to in-house Ola Maps in 2024. Source: Outlook Business.

Assumptions: rides per day (not published), peak, ride length, arrival-time refresh interval, drivers online, share booked ahead. Proposed: the scheduler, road graph and live traffic design, rental map matching and every other component.

## Review before publishing

1. Re-check every Public claim against its source.
2. Confirm that time-sensitive facts (rules, timings, vendor features) are current.
3. Run `npm run validate:content`.
4. Register the tutorial in `src/content/tutorials/index.ts`.
