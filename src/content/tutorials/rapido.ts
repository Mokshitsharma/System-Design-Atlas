import type { TutorialInput } from "@/lib/schema";

/*
 * Rapido: a beginner tutorial on designing a bike-taxi app.
 * The reader is the rider throughout. Everything not marked "public" is a proposed design,
 * not a description of Rapido's internal systems.
 */

// Public, self-reported in Rapido's App Store listing (source "rapido-app").
const CAPTAINS = 1_000_000;

// Illustrative assumptions. Rapido does not publish daily ride counts.
const RIDES_PER_DAY = 2_000_000;
const PEAK = 4;
const REQ_PER_RIDE = 30;
const OFFERS_PER_RIDE = 3;
const ONLINE_SHARE = 0.3;
const UPDATE_SEC = 4;
const RIDE_KB = 3;

const avgRides = RIDES_PER_DAY / 86_400;
const peakRides = avgRides * PEAK;
const offersPerSec = peakRides * OFFERS_PER_RIDE;
const reqPerSec = peakRides * REQ_PER_RIDE;
const online = CAPTAINS * ONLINE_SHARE;
const locPerSec = online / UPDATE_SEC;
const rideGb = (RIDES_PER_DAY * RIDE_KB) / 1_000_000;

const r = (n: number, d = 0) => Number(n.toFixed(d));

// Plain-English explanations, written with you as the rider.
const X = {
  you: {
    what: "You, booking a ride on the Rapido app.",
    why: "Every ride starts with you choosing where to go and what to ride, and ends with you paying the captain.",
    input: "Your taps: destination, Bike, Book.",
    inside: "The app knows your location, shows fares for bike, auto and cab, and sends your requests.",
    output: "Requests to Rapido's servers, with your pickup spot.",
    risks: ["Your phone's data is weak in a crowded area, so requests are slow.", "Your pickup pin is on the wrong side of a busy road."],
  },
  api: {
    what: "The API gateway: the front door for every request from rider and captain apps.",
    why: "Checks that apply to every request, such as sign-in and limits, are done once in one place.",
    input: "Requests from apps.",
    inside: "Checks who is asking and sends the request to the right service.",
    output: "Checked requests to fare, matching and ride services.",
    risks: ["If it goes down, nobody can book or accept rides."],
  },
  fare: {
    what: "The fare service works out what your ride will cost.",
    why: "You want to see the price before you book, for bike, auto and cab side by side.",
    input: "Your pickup, drop point and vehicle type.",
    inside: "Estimates distance and time on real roads and applies the rates for that city and vehicle.",
    output: "A fare for each vehicle type.",
    risks: ["Road estimates can be off in heavy traffic."],
  },
  match: {
    what: "The matching service finds a captain for your ride.",
    why: "Bike rides are short and cheap, so the wait must be short too. Finding a captain quickly is the whole point.",
    input: "Your pickup spot and vehicle type.",
    inside: "Finds free, eligible captains nearby and sends your request to a few of them at once. The first one to accept gets the ride.",
    output: "One confirmed captain for your ride.",
    risks: ["Two captains accept at the same moment.", "Nobody nearby accepts."],
  },
  geo: {
    what: "The captain location index: an in-memory map of where every online captain is, organised by small map cells.",
    why: "'Which bike captains are near you?' must be answered in milliseconds.",
    input: "Location updates from captains' phones every few seconds.",
    inside: "Files each captain under the map cell they are in, so finding nearby captains means checking your cell and the cells around it.",
    output: "Lists of nearby captains with their vehicle type.",
    risks: ["GPS is less accurate in narrow lanes and between tall buildings."],
  },
  captain: {
    what: "A captain: the person riding the bike (or driving the auto or cab), using the captain app.",
    why: "Captains receive ride requests, accept them, pick you up and take you to your destination.",
    input: "Ride requests and navigation.",
    inside: "Shows each request with pickup distance and fare; the captain taps Accept or ignores it.",
    output: "Accepts, ride start and ride end.",
    risks: ["The captain's phone has a weak connection.", "The captain accepts and then cancels."],
  },
  trips: {
    what: "The ride service keeps track of each ride from booking to payment.",
    why: "A ride goes through steps in order: booked, captain arriving, started, ended, paid. One service makes sure it never skips or repeats a step.",
    input: "Accepts, PIN checks, start and end from the captain, and your actions.",
    inside: "Moves the ride to its next step only if that step is allowed, and saves each change.",
    output: "The current state of your ride.",
    risks: ["You cancel at the same moment the captain arrives."],
  },
  tripdb: {
    what: "The ride database stores every ride and every change to it.",
    why: "Rides are needed for payment, support, safety checks and insurance. They must never be lost.",
    input: "New rides and their changes.",
    inside: "Saves each change in a transaction, so a ride is never half-updated.",
    output: "Your ride history and receipts.",
    risks: ["If it is slow, starting and ending rides is slow."],
  },
};

export const rapido: TutorialInput = {
  slug: "rapido",
  title: "Design a bike-taxi app like Rapido",
  summary:
    "How to get you a bike ride within a couple of minutes in heavy city traffic: sending your request to several nearby captains at once, making sure only one of them gets it, and starting the ride safely with a PIN.",
  lastVerifiedAt: "2026-10-22",
  patterns: ["idempotency", "retry-with-jitter", "rate-limiting", "cache-aside", "transactional-outbox", "reconciliation", "backpressure"],
  sources: [
    {
      id: "rapido-app",
      title: "Rapido: Bike-Taxi, Auto & Cabs (App Store listing)",
      publisher: "Roppen Transportation Services Private Limited (Rapido)",
      url: "https://apps.apple.com/app/id1198464606",
      kind: "official",
      publishedAt: null,
      accessedAt: "2026-10-22",
      note: "Rapido's own description of its app. The figures are self-reported.",
    },
    {
      id: "rapido-zero-commission",
      title: "Rapido launches lifetime zero per ride commission for auto drivers",
      publisher: "CommercialVehicle.in",
      url: "https://commercialvehicle.in/rapido-launches-lifetime-zero-per-ride-commission-for-auto-drivers/",
      kind: "press",
      publishedAt: "2024-02-15",
      accessedAt: "2026-10-22",
      note: "About auto captains. Terms for bike captains may differ.",
    },
  ],

  intro: {
    paragraphs: [
      "Rapido is best known for bike taxis: you ride as a passenger (the pillion) on a motorbike, which can move through city traffic faster and more cheaply than a car. It also offers autos and cabs from the same app.",
      "A bike-taxi app looks a lot like any ride-hailing app, but the details change the design. Rides are short and cheap, so even a five-minute wait feels long. Many riders and captains use budget phones on patchy mobile data. Many people pay the captain directly by UPI or cash. And because you are getting on someone's bike, making sure it is the right bike, and that you are safe, matters a great deal.",
      "In this tutorial we design a system that finds you a captain quickly, guarantees only one captain gets your ride, starts the ride safely, and handles payments that go straight to the captain.",
      {
        text: "This is a proposed design based on public information. Rapido has not published how its systems are built, so the components and most numbers here are our own reasoning, labelled as such.",
        evidence: "inferred",
        sources: [],
      },
    ],
    known: [
      {
        text: "Rapido describes itself as India's first and largest bike-taxi service, present in 500+ cities, with over 75 million customers and a fleet of over 1 million captains (bike-taxi riders, auto and cab drivers).",
        evidence: "public",
        sources: ["rapido-app"],
      },
      {
        text: "Rapido says every auto, bike or cab ride is insured with Acko Insurance at no extra cost, that a helmet is provided for the pillion rider on every bike ride, and that riders can pay cashless with Paytm, UPI or the Rapido Wallet.",
        evidence: "public",
        sources: ["rapido-app"],
      },
      {
        text: "In February 2024, Rapido announced a lifetime zero per-ride commission for auto captains: they pay a nominal access fee instead of a commission per ride, and receive payments directly from customers.",
        evidence: "public",
        sources: ["rapido-zero-commission"],
      },
    ],
    story: {
      title: "Imagine you are the rider",
      steps: [
        "It is 9:10 AM in Bengaluru. You are late for work and the main road is jammed with cars.",
        "You open Rapido, type your office address and choose Bike. It shows a fare much lower than a cab.",
        "You tap Book. In about ten seconds a captain two minutes away accepts. You see their name, bike number and photo, and a 4-digit ride PIN.",
        "The captain arrives and hands you a helmet. You tell them your PIN, they enter it, and the ride starts. You share the ride with a friend so they can follow it on a map.",
        "The bike weaves through the traffic and you reach your office in 18 minutes.",
        "You pay by scanning the captain's UPI QR code, then rate the ride.",
        "In this tutorial we follow each of those moments through the system. How did a captain accept so fast? What stops two captains both coming for you? Why the PIN? And how does a payment that goes straight to the captain get recorded?",
      ],
    },
  },

  requirements: {
    functional: [
      "You can see fares for bike, auto and cab before booking.",
      "You can book a ride and get a nearby captain within a short time.",
      "Exactly one captain gets each ride.",
      "The ride starts only after the captain enters your ride PIN.",
      "You can share your live ride with someone you trust.",
      "You can pay by UPI, cash or Rapido Wallet, and the ride is marked paid.",
      "Only captains with an active access pass receive ride requests.",
    ],
    nonFunctional: [
      { name: "Fast matching", meaning: "Little waiting after you tap Book.", target: "Most rides get a captain within a minute in busy areas." },
      { name: "Correctness", meaning: "The right answer even when things happen at once.", target: "A ride is never given to two captains; a ride is never marked paid twice." },
      { name: "Safety", meaning: "You get on the right bike and someone can follow your ride.", target: "PIN check before every ride; live sharing always available." },
      { name: "Works on weak networks", meaning: "The apps cope with slow or patchy mobile data.", target: "Small messages; every request safe to retry." },
      { name: "Availability", meaning: "The app keeps working instead of showing errors.", target: "Morning and evening office rush handled without failures." },
    ],
    outOfScope: ["Captain sign-up and document checks", "Food and parcel delivery", "How fares are set"],
    terms: [
      { term: "Captain", meaning: "Rapido's name for the person who gives you the ride: a bike rider, auto driver or cab driver." },
      { term: "Pillion", meaning: "The passenger seat on a motorbike, behind the rider. On a bike taxi, that is you." },
      { term: "Ride PIN", meaning: "A short code shown on your phone that the captain must enter to start the ride. It proves the captain picked up the right person." },
      { term: "Broadcast offer", meaning: "Sending one ride request to several captains at the same time; whoever accepts first gets it." },
      { term: "UPI", meaning: "India's instant bank-to-bank payment system. You scan a QR code and the money goes straight to the other person's bank." },
      { term: "Access pass", meaning: "A small fee a captain pays to receive rides, instead of the platform taking a share of each fare." },
    ],
  },

  capacity: {
    intro:
      "Rapido publishes the size of its captain fleet but not how many rides it handles each day. So we start from the public captain number and label every other figure as an assumption. As with any ride app, the biggest load comes from captains' phones, not from bookings.",
    assumptions: [
      { label: "Captains in the fleet (bike, auto and cab)", value: CAPTAINS, unit: "captains", evidence: "public", sources: ["rapido-app"] },
      { label: "Rides per day", value: RIDES_PER_DAY, unit: "rides", note: "Illustrative; Rapido does not publish this" },
      { label: "Busiest hour compared with the average", value: PEAK, unit: "times", note: "Office rush in the morning and evening" },
      { label: "Requests one ride causes", value: REQ_PER_RIDE, unit: "requests", note: "Fares, booking, status, map updates, PIN, payment" },
      { label: "Captains offered each ride at once", value: OFFERS_PER_RIDE, unit: "captains" },
      { label: "Share of captains online at the busiest time", value: ONLINE_SHARE * 100, unit: "%" },
      { label: "How often a captain's phone sends its location", value: UPDATE_SEC, unit: "seconds" },
      { label: "Size of one saved ride", value: RIDE_KB, unit: "KB" },
    ],
    steps: [
      { label: "Average rides per second", formula: "rides per day ÷ seconds in a day", working: "2,000,000 ÷ 86,400", result: r(avgRides, 1), unit: "rides/s" },
      { label: "Rides per second in the office rush", formula: "average × peak multiplier", working: "23.1 × 4", result: r(peakRides, 1), unit: "rides/s" },
      { label: "Ride offers sent per second", formula: "rides per second × captains per offer", working: "92.6 × 3", result: r(offersPerSec), unit: "offers/s" },
      { label: "App requests per second from rides", formula: "rides per second × requests per ride", working: "92.6 × 30", result: r(reqPerSec), unit: "req/s" },
      { label: "Location updates per second", formula: "captains online ÷ update interval", working: "300,000 ÷ 4", result: r(locPerSec), unit: "updates/s" },
      { label: "Storage for one day of rides", formula: "rides × size of one ride", working: "2,000,000 × 3 KB", result: r(rideGb, 1), unit: "GB" },
    ],
    takeaways: [
      "Captains' location updates (about 75,000 a second here) are roughly 27 times more than all ride-related requests. Keeping only the latest position of each captain in memory is essential.",
      "Sending each ride to three captains triples the offers. That is cheap compared with location updates, and it makes matching much faster.",
      "Ride data is small, a few gigabytes a day. The hard parts are speed (short waits) and correctness (one captain per ride), not size.",
    ],
    calculator: { avgRps: 700, peakMultiplier: 4, rpsPerServer: 500, utilization: 0.6 },
  },

  architecture: {
    intro:
      "Here is the whole system for one bike ride, from fare to payment. Start with the simple view, then switch to the detailed view. Press Send request to follow your ride, and select any box to learn what it does.",
    workflow: {
      id: "overview",
      title: "One bike ride, end to end",
      summary: "Your ride from checking the fare to paying the captain.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "fare", label: "Fare service", kind: "service", col: 2, row: 0, explain: X.fare },
        { id: "match", label: "Matching service", kind: "service", col: 3, row: 0, explain: X.match },
        { id: "geo", label: "Captain location index", kind: "cache", col: 2, row: 1, tags: ["cache"], explain: X.geo },
        { id: "captain", label: "Captain", kind: "user", col: 3, row: 1, explain: X.captain },
        { id: "trips", label: "Ride service", kind: "service", col: 2, row: 2, tags: ["retry"], explain: X.trips },
        { id: "tripdb", label: "Ride database", kind: "database", col: 3, row: 2, tags: ["transaction"], explain: X.tripdb },
        { id: "insure", label: "Insurance partner", kind: "external", col: 1, row: 2, explain: {
          what: "An outside insurance company that covers each ride.",
          why: "Rapido says every ride is insured at no extra cost. Each ride has to be registered with the insurer.",
          input: "Ride details: who, when, from where to where.",
          inside: "Records the ride as covered.",
          output: "Confirmation that the ride is insured.",
          risks: ["The partner's system is slow or unavailable for a while."],
        } },
        { id: "pay", label: "Payment", kind: "external", col: 0, row: 2, explain: {
          what: "How you pay at the end: your UPI app, cash, or your Rapido wallet.",
          why: "Many riders pay the captain directly. The ride still has to be marked as paid.",
          input: "The final fare.",
          inside: "For UPI, your bank sends money to the captain's bank. For wallet, the fare is taken from your balance.",
          output: "Payment done, and a record of how.",
          risks: ["A UPI payment can fail or be delayed."],
        } },
      ],
      simple: [
        { node: "you", text: "You choose Bike and see the fare." },
        { node: "fare", text: "The fare service works out the price for bike, auto and cab." },
        { node: "match", text: "You tap Book, and the app looks for captains near you." },
        { node: "captain", text: "A nearby captain accepts and comes to pick you up." },
        { node: "you", text: "You ride to your destination." },
        { node: "pay", text: "You pay the captain at the end." },
      ],
      detailed: [
        { node: "you", text: "You type your office address and choose Bike." },
        { node: "api", text: "Your request reaches the API gateway, which checks you are signed in." },
        { node: "fare", text: "The fare service works out the price from distance and time. Bike fares are lower than auto or cab." },
        { node: "match", from: "api", text: "You tap Book. The matching service starts looking for a captain." },
        { node: "geo", text: "It asks the location index which free bike captains are close to you." },
        { node: "captain", from: "match", text: "Your request goes to a few nearby captains at once. The first to accept gets your ride." },
        { node: "trips", text: "The ride service creates your ride with a 4-digit ride PIN." },
        { node: "tripdb", text: "The ride and every later change are saved." },
        { node: "insure", from: "trips", async: true, text: "In the background, the ride is registered with the insurance partner." },
        { node: "you", from: "trips", text: "You see your captain's name, bike number and your PIN. The captain arrives, you share the PIN, and the ride starts." },
        { node: "pay", text: "At your office you pay: by UPI straight to the captain, in cash, or from your Rapido wallet." },
      ],
      failures: [
        {
          id: "no-captain",
          title: "No captain accepts your ride",
          node: "captain",
          what: "The captains who received your request all ignore it, perhaps because the pickup is in a jammed area.",
          userSees: "'Looking for captains' lasts longer. If nobody is found, you are offered an auto or cab instead.",
          detect: "No accept arrives before the offer's time limit.",
          steps: [
            { node: "match", from: "captain", text: "The offer expires after a short time without an accept." },
            { node: "geo", from: "match", text: "The matching service looks again in a slightly wider area." },
            { node: "captain", from: "match", text: "The request goes to the next group of captains." },
            { node: "you", from: "match", text: "If still nobody accepts, you see 'No bike captains nearby' and can try an auto or cab. You are never shown a captain who has not accepted." },
          ],
        },
        {
          id: "upi-fails",
          title: "Your UPI payment does not go through",
          node: "pay",
          what: "Your UPI app shows the payment as failed.",
          userSees: "You pay by cash or wallet instead. Your ride is marked paid once.",
          detect: "Your UPI app reports failure; the captain does not see the money arrive.",
          steps: [
            { node: "you", from: "pay", text: "You see the failure in your UPI app. No money has left your account." },
            { node: "trips", from: "you", text: "You choose cash. The captain marks the ride as paid in cash." },
            { node: "tripdb", from: "trips", text: "The ride is closed as paid, once, with the method recorded." },
          ],
        },
      ],
    },
  },

  workflows: [
    {
      id: "booking",
      title: "Finding you a captain: first to accept wins",
      summary: "How your request is sent to several captains at once, and how the system makes sure only one of them gets it.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, tags: ["retry"], explain: X.api },
        { id: "match", label: "Matching service", kind: "service", col: 2, row: 0, explain: X.match },
        { id: "geo", label: "Captain location index", kind: "cache", col: 3, row: 0, tags: ["cache"], explain: X.geo },
        { id: "pass", label: "Access pass check", kind: "service", col: 1, row: 1, explain: {
          what: "A check that each captain has an active access pass.",
          why: "In this design captains pay a small access fee instead of a commission on each ride, as Rapido has described for autos. Only captains with an active pass receive rides.",
          input: "The list of nearby captains.",
          inside: "Looks up each captain's pass and removes those whose pass has expired.",
          output: "Nearby captains who can receive rides.",
          risks: ["If the pass lookup is slow, matching is slow, so passes are cached."],
        } },
        { id: "cap-a", label: "Captain A", kind: "user", col: 2, row: 1, explain: X.captain },
        { id: "cap-b", label: "Captain B", kind: "user", col: 3, row: 1, explain: X.captain },
        { id: "claim", label: "Ride claim record", kind: "database", col: 2, row: 2, tags: ["transaction"], explain: {
          what: "The record of which captain owns your ride.",
          why: "Several captains see your request. Exactly one must get it, even if two tap Accept in the same instant.",
          input: "Accept taps from captains.",
          inside: "Sets the ride's captain only if no captain is set yet, as one single operation.",
          output: "'You got the ride' for the first captain; 'ride taken' for anyone else.",
          risks: ["Without the 'only if not set' rule, two captains could both think they got the ride."],
        } },
      ],
      simple: [
        { node: "you", text: "You tap Book." },
        { node: "match", text: "The matching service sends your request to a few nearby captains at once." },
        { node: "cap-a", text: "Captain A accepts first and gets your ride." },
        { node: "you", from: "match", text: "You see Captain A's details. The other captains' screens clear." },
      ],
      detailed: [
        { node: "you", text: "You tap Book for a bike ride. The app sends your pickup spot and a unique request ID, so a second tap cannot book twice." },
        { node: "api", text: "The gateway checks you are signed in." },
        { node: "match", text: "The matching service starts." },
        { node: "geo", text: "It asks the location index for free bike captains close to you, starting with a small area." },
        { node: "pass", from: "match", text: "It keeps only captains whose access pass is active." },
        { node: "cap-a", from: "match", text: "Your request is sent to the three closest captains at the same moment. Captain A sees it." },
        { node: "cap-b", from: "match", text: "Captain B sees it too." },
        { node: "claim", from: "cap-a", text: "Captain A taps Accept first. One operation sets Captain A as your captain, because no captain was set yet." },
        { node: "cap-b", from: "claim", text: "Captain B taps Accept a moment later. The operation finds a captain is already set, so Captain B sees 'ride taken'." },
        { node: "you", from: "match", text: "You see Captain A's name, bike number and photo." },
      ],
      failures: [
        {
          id: "both-accept",
          title: "Two captains tap Accept at the same instant",
          node: "claim",
          what: "Captain A and Captain B accept within the same millisecond.",
          userSees: "Nothing unusual. You get exactly one captain.",
          detect: "The second 'set captain' operation finds a captain already set.",
          steps: [
            { node: "claim", from: "cap-b", text: "Both accepts reach the claim record together. It runs them one after the other." },
            { node: "cap-b", from: "claim", text: "Only the first succeeds. The second captain sees 'ride taken' and is free for the next request." },
            { node: "you", from: "match", text: "You get exactly one captain. No second bike turns up." },
          ],
        },
        {
          id: "pass-expired",
          title: "A nearby captain's access pass has expired",
          node: "pass",
          what: "The closest captain forgot to renew their pass.",
          userSees: "Nothing. Your request goes to other captains.",
          detect: "The pass check finds the pass's end date has passed.",
          steps: [
            { node: "pass", from: "match", text: "The captain is removed from the list before any offer is sent." },
            { node: "cap-a", from: "pass", text: "The offer goes to the next eligible captain instead." },
            { node: "you", from: "match", text: "You get a captain as usual and never notice." },
          ],
        },
      ],
    },
    {
      id: "ride",
      title: "Starting the ride safely",
      summary: "Why the ride starts with a PIN, and how someone you trust can follow your ride.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "captain", label: "Your captain", kind: "user", col: 1, row: 0, explain: X.captain },
        { id: "trips", label: "Ride service", kind: "service", col: 2, row: 0, explain: X.trips },
        { id: "tripdb", label: "Ride database", kind: "database", col: 3, row: 0, tags: ["transaction"], explain: X.tripdb },
        { id: "share", label: "Ride-sharing link", kind: "service", col: 2, row: 1, explain: {
          what: "A private link that shows your ride live on a map to someone you choose.",
          why: "If something feels wrong, someone you trust can see where you are.",
          input: "Your request to share, and the captain's live location.",
          inside: "Creates a link that only works for this ride, and stops working when the ride ends.",
          output: "A live map for the person you shared with.",
          risks: ["The map freezes if the captain's phone loses signal."],
        } },
        { id: "friend", label: "Someone you trust", kind: "user", col: 1, row: 1, explain: {
          what: "A friend or family member you shared your ride with.",
          why: "They can see your ride live and know when you have arrived.",
          input: "The shared link.",
          inside: "They open the link in any browser.",
          output: "Peace of mind, or a quick call if something looks wrong.",
          risks: ["They only see the last known position if the captain's phone is offline."],
        } },
        { id: "safety", label: "Safety team", kind: "service", col: 3, row: 1, failureOnly: true, explain: {
          what: "People and automatic checks that watch for rides that look wrong.",
          why: "A ride that stops for a long time or goes far off route may need someone to check in.",
          input: "Alerts from the ride service.",
          inside: "Calls the rider or captain and escalates if needed.",
          output: "Help when it is needed.",
          risks: ["Too many false alarms make real ones easy to miss."],
        } },
      ],
      simple: [
        { node: "you", text: "Your captain arrives and you tell them your 4-digit ride PIN." },
        { node: "captain", text: "The captain enters the PIN in their app." },
        { node: "trips", text: "The ride service checks it and starts the ride." },
        { node: "you", from: "trips", text: "At the end, you see the final fare and pay." },
      ],
      detailed: [
        { node: "you", text: "Your captain arrives and hands you a helmet." },
        { node: "captain", text: "You tell the captain your 4-digit ride PIN." },
        { node: "trips", text: "The captain enters the PIN. The ride service checks it matches your ride and starts it. This proves you got on the right bike and the captain picked up the right person." },
        { node: "tripdb", text: "The ride start is saved with the time and place." },
        { node: "share", from: "you", text: "You tap Share ride. A private link is created for this ride only." },
        { node: "friend", text: "Your friend follows the ride live on a map." },
        { node: "trips", from: "captain", text: "At your office, the captain taps End ride and the fare is finalised." },
        { node: "you", from: "trips", text: "You see the final fare and choose how to pay." },
      ],
      failures: [
        {
          id: "wrong-pin",
          title: "The PIN does not match",
          node: "trips",
          what: "The captain enters a PIN that does not match your ride, for example because they stopped for the wrong person.",
          userSees: "The ride does not start. You and the captain check you have the right bike.",
          detect: "The entered PIN is different from your ride's PIN.",
          steps: [
            { node: "trips", from: "captain", text: "The PIN does not match, so the ride does not start." },
            { node: "captain", from: "trips", text: "The captain is told to check they picked up the right person." },
            { node: "you", from: "captain", text: "You confirm the bike number before getting on. Nobody rides off with the wrong person." },
          ],
        },
        {
          id: "offline",
          title: "The captain's phone loses signal mid-ride",
          node: "captain",
          what: "No location updates arrive from the captain's phone for a while.",
          userSees: "The shared map shows the last known position and time, instead of a moving bike.",
          detect: "No updates from the captain's phone for longer than usual.",
          steps: [
            { node: "trips", from: "captain", text: "The ride stays in progress. Nothing is cancelled automatically." },
            { node: "share", from: "trips", text: "The shared link shows the last known position and how long ago it was." },
            { node: "safety", from: "trips", text: "If the ride takes much longer than expected, the safety team is alerted to check in." },
          ],
        },
      ],
    },
    {
      id: "payment",
      title: "Paying the captain",
      summary: "How a payment that goes straight from you to the captain is still recorded correctly.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "trips", label: "Ride service", kind: "service", col: 1, row: 0, tags: ["retry"], explain: X.trips },
        { id: "ledger", label: "Ride payments record", kind: "database", col: 2, row: 0, tags: ["transaction"], explain: {
          what: "The record of how and whether each ride was paid.",
          why: "Even when money goes straight to the captain, Rapido needs to know the ride is settled, for receipts, support and disputes.",
          input: "Payment confirmations.",
          inside: "Marks each ride paid exactly once, with the method (UPI, cash or wallet).",
          output: "Paid or unpaid status for each ride.",
          risks: ["A ride could be marked paid twice if confirmations are not checked."],
        } },
        { id: "wallet", label: "Rapido wallet", kind: "database", col: 3, row: 0, failureOnly: true, tags: ["transaction"], explain: {
          what: "Your prepaid balance inside the Rapido app.",
          why: "A backup way to pay when UPI or cash is not convenient.",
          input: "Top-ups, and ride payments.",
          inside: "Takes the fare from your balance in one transaction, only if you have enough.",
          output: "A paid ride and your new balance.",
          risks: ["Your balance must never go below zero."],
        } },
        { id: "upi", label: "Your UPI app", kind: "external", col: 1, row: 1, explain: {
          what: "Your UPI app, such as PhonePe, Google Pay or Paytm.",
          why: "UPI sends money instantly from your bank to the captain's bank.",
          input: "The captain's QR code and the amount.",
          inside: "Asks your bank to send the money and shows you the result.",
          output: "Money in the captain's account, and a reference number.",
          risks: ["Banks are sometimes slow, so the result can arrive late."],
        } },
        { id: "captain", label: "Your captain", kind: "user", col: 2, row: 1, explain: X.captain },
      ],
      simple: [
        { node: "you", text: "Your ride ends and you see the fare." },
        { node: "upi", text: "You scan the captain's QR code and pay with your UPI app." },
        { node: "captain", text: "The captain sees the money arrive." },
        { node: "ledger", text: "The ride is marked as paid." },
      ],
      detailed: [
        { node: "you", text: "Your ride ends and the app shows the final fare." },
        { node: "trips", text: "The ride service fixes the fare and asks how you will pay." },
        { node: "upi", from: "you", text: "You choose UPI and scan your captain's QR code. Your UPI app sends the money straight to the captain's bank." },
        { node: "captain", text: "Your captain's phone shows the money has arrived." },
        { node: "ledger", text: "The captain taps 'Payment received'. The ride is marked paid, once, with UPI as the method." },
        { node: "you", from: "trips", text: "You get a receipt and rate your captain." },
      ],
      failures: [
        {
          id: "upi-failed",
          title: "The UPI payment fails",
          node: "upi",
          what: "Your UPI app shows 'failed'.",
          userSees: "You pay from your Rapido wallet instead, and the ride is marked paid.",
          detect: "Your UPI app reports failure.",
          steps: [
            { node: "you", from: "upi", text: "You see the failure. No money has left your account." },
            { node: "wallet", from: "you", text: "You choose Rapido wallet. One transaction takes the fare from your balance, only if you have enough." },
            { node: "ledger", from: "wallet", text: "The ride is marked paid by wallet, once." },
          ],
        },
        {
          id: "upi-delayed",
          title: "Your money left, but the captain has not received it yet",
          node: "captain",
          what: "Your bank shows the payment as sent, but it has not reached the captain's account yet.",
          userSees: "The ride is shown as 'payment pending', not as unpaid. You keep your UPI reference number.",
          detect: "The captain does not confirm receipt after you report paying.",
          steps: [
            { node: "ledger", from: "captain", text: "The ride is marked 'payment pending' with your UPI reference, not 'unpaid'." },
            { node: "trips", from: "ledger", text: "When the money arrives, the captain confirms it and the ride is closed. If it never arrives, support uses the reference to sort it out with the banks." },
            { node: "you", from: "trips", text: "You are not asked to pay again while the payment is pending." },
          ],
        },
      ],
    },
  ],

  database: {
    intro:
      "Rides and payment records go in a database with transactions, because each must change exactly once. Captain positions change every few seconds, so only the latest position lives in memory.",
    entities: [
      { name: "Rider", purpose: "Your account.", fields: [
        { name: "rider_id", type: "id", note: "primary key" }, { name: "phone", type: "text" }, { name: "wallet_balance", type: "money", note: "never below zero" },
      ], relations: ["Has many Rides"] },
      { name: "Captain", purpose: "A captain and their vehicle.", fields: [
        { name: "captain_id", type: "id", note: "primary key" }, { name: "vehicle", type: "bike, auto or cab" }, { name: "plate", type: "text" }, { name: "pass_valid_until", type: "date and time" },
      ], relations: ["Has many Rides", "Gets many Ride offers"] },
      { name: "Ride", purpose: "One ride from booking to payment.", fields: [
        { name: "ride_id", type: "id", note: "primary key" }, { name: "request_id", type: "text", note: "unique, stops double bookings" }, { name: "captain_id", type: "id", note: "set once, by the first accept" }, { name: "pin", type: "4 digits" }, { name: "state", type: "booked, arriving, started, ended, paid or cancelled" },
      ], relations: ["Belongs to a Rider and a Captain", "Has many Ride offers", "Has one Payment record"] },
      { name: "Ride offer", purpose: "Each time a ride was shown to a captain.", fields: [
        { name: "ride_id, captain_id", type: "ids" }, { name: "sent_at", type: "date and time" }, { name: "response", type: "accepted, too late, ignored" },
      ], relations: ["Links Rides and Captains"] },
      { name: "Payment record", purpose: "How a ride was paid.", fields: [
        { name: "ride_id", type: "id", note: "unique: one record per ride" }, { name: "method", type: "UPI, cash or wallet" }, { name: "status", type: "pending or paid" }, { name: "reference", type: "UPI reference, if any" },
      ], relations: ["Belongs to a Ride"] },
      { name: "Insurance record", purpose: "The ride's registration with the insurance partner.", fields: [
        { name: "ride_id", type: "id", note: "unique" }, { name: "status", type: "sent or confirmed" }, { name: "partner_ref", type: "text" },
      ], relations: ["Belongs to a Ride"] },
    ],
    why: [
      "Ride.captain_id is set with 'only if empty'. That one rule is what guarantees one captain per ride.",
      "Payment records allow one row per ride, so a ride can never be recorded as paid twice.",
      "Ride offers are kept so we can see how fast captains respond in each area and tune how many captains get each request.",
    ],
  },

  decisions: [
    {
      id: "broadcast",
      title: "Send each ride to a few captains at once",
      problem: "Bike rides are short. If we offer your ride to one captain, wait for them to ignore it, then try the next, you could wait minutes for a ten-minute ride.",
      solution: "Send your request to a small group of the nearest eligible captains at the same moment. The first to accept gets the ride.",
      how: "The matching service picks the closest few captains and sends them all the offer. As soon as one accepts, the others' screens clear.",
      where: "The matching service and the captain apps.",
      tradeoff: "Captains race each other, and some see offers they cannot win. A ride app that offers one driver at a time, like the Uber tutorial's design, avoids that, but riders wait longer when drivers ignore offers.",
    },
    {
      id: "claim-once",
      title: "Give the ride to the first accept with a single 'only if empty' write",
      problem: "When several captains see the same ride, two can tap Accept in the same instant. Both must not get it.",
      solution: "Store the ride's captain in one place and set it only if it is still empty, in one single operation.",
      how: "The first accept sets the captain. Any later accept finds it already set and is told 'ride taken'. The database runs competing operations one after the other, so there is no gap between checking and setting.",
      where: "The ride claim record in the ride database.",
      tradeoff: "Every accept needs a quick database operation. That is small compared with the cost of two bikes arriving for one rider.",
    },
    {
      id: "small-radius",
      title: "Search a small area first, then widen",
      problem: "A captain 3 km away in city traffic may take longer to reach you than the ride itself.",
      solution: "Look for captains in a small area around you first, and only widen the search if nobody accepts.",
      how: "The location index is split into small map cells. Matching checks your cell and its neighbours first; after a short timeout, it adds the next ring of cells.",
      where: "Matching service and captain location index.",
      tradeoff: "In quiet areas the first round may find nobody, adding a few seconds before the wider search.",
    },
    {
      id: "ride-pin",
      title: "Start every ride with a PIN",
      problem: "At a busy pickup spot, many bikes stop. You could get on the wrong bike, or a captain could pick up the wrong person.",
      solution: "Show you a short PIN. The ride starts only when the captain enters the matching PIN.",
      how: "The PIN is created with the ride and shown only in your app. The ride service checks it before moving the ride to 'started'.",
      where: "Ride service, rider app and captain app.",
      tradeoff: "It adds a few seconds at pickup. In return, the system knows the right person is on the right bike.",
    },
    {
      id: "access-pass",
      title: "Use a captain access pass instead of a cut of each fare",
      problem: "Captains want to keep more of what they earn. Taking a percentage of each ride also means tracking every fare closely.",
      solution: "Captains pay a small access fee to receive rides, and riders pay captains directly. Rapido described this model for autos in 2024.",
      how: "Before sending offers, matching checks each captain's pass is active. Payments go from riders to captains; the platform records that each ride was paid.",
      where: "Access pass check in matching; payment records.",
      tradeoff: "The platform earns from passes rather than rides, and it must still track payments for support and disputes even though the money does not pass through it.",
    },
    {
      id: "insurance-async",
      title: "Register insurance in the background, and retry until confirmed",
      problem: "Every ride is registered with an outside insurer. If the ride had to wait for the insurer's system, a slow insurer would delay every ride.",
      solution: "Save the ride and an 'insure this ride' job together, and let a background worker send it to the insurer, retrying until it is confirmed.",
      how: "The job sits in a queue. If the insurer is slow or down, the worker waits a little and tries again, using the ride ID so the same ride is never registered twice.",
      where: "Ride service, message queue and insurance partner.",
      tradeoff: "Confirmation arrives a little after the ride starts. The saved job makes sure it is never forgotten.",
    },
    {
      id: "weak-networks",
      title: "Design for weak phones and patchy data",
      problem: "Many riders and captains use budget phones on crowded mobile networks. Big screens and many round trips make the apps slow.",
      solution: "Keep messages small, send fewer requests, and make every request safe to repeat.",
      how: "Each booking and payment carries a unique ID. If the app retries after a timeout, the server returns the earlier result instead of doing the work again.",
      where: "Rider and captain apps, API gateway, ride service.",
      tradeoff: "Every action needs an ID and the server must remember them for a while.",
    },
  ],

  failures: [
    {
      title: "No captain accepts",
      what: "The captains offered your ride all ignore it.",
      userSees: "A slightly longer search, then a wider one, then an option to book an auto or cab.",
      detect: "No accept before the offer time limit.",
      recover: "Widen the search area and offer the next group of captains.",
      prevent: "Track accept rates per area and time, and offer to more captains where they are low.",
    },
    {
      title: "Two captains accept at once",
      what: "Two captains tap Accept for the same ride in the same instant.",
      userSees: "Nothing unusual. Only one captain comes.",
      detect: "The second 'set captain' finds one already set.",
      recover: "The second captain sees 'ride taken' and is free for the next ride.",
      prevent: "Set the captain only with 'only if empty'. Test by sending many accepts for one ride at once.",
    },
    {
      title: "You get on the wrong bike",
      what: "At a busy spot, a captain stops for the wrong person.",
      userSees: "The ride does not start until the right PIN is entered.",
      detect: "The PIN entered does not match the ride.",
      recover: "The captain and rider check the bike number and names.",
      prevent: "Always require the PIN to start a ride.",
    },
    {
      title: "The UPI payment fails or is delayed",
      what: "Your bank does not complete the transfer, or completes it late.",
      userSees: "You can pay another way; a delayed payment shows as pending, not unpaid.",
      detect: "Your UPI app shows failure, or the captain does not confirm receipt.",
      recover: "Switch to cash or wallet; for delayed payments, keep the reference and close the ride when it arrives.",
      prevent: "One payment record per ride, so it can never be marked paid twice.",
    },
    {
      title: "The insurance partner is unavailable",
      what: "The insurer's system does not accept ride registrations for a while.",
      userSees: "Nothing. Rides start as normal.",
      detect: "Registration requests fail and the job queue grows.",
      recover: "Jobs are retried until each ride is confirmed.",
      prevent: "Save the job with the ride, so no ride is forgotten. Alert if confirmations fall behind.",
      evidence: "inferred",
    },
    {
      title: "The morning rush overwhelms matching",
      what: "At 9 AM requests jump several times above normal in office areas.",
      userSees: "Slightly longer searches; the app keeps working.",
      detect: "Requests per second and searches without an accept both rise.",
      recover: "Matching works through requests in order and limits how often one app can retry.",
      prevent: "Add capacity before the daily rush rather than waiting for it, and limit repeated taps.",
    },
  ],

  recap: {
    decisions: [
      { decision: "Offer to a few captains at once", why: "Short waits for short rides.", cost: "Captains race and some offers are wasted." },
      { decision: "'Only if empty' captain claim", why: "One captain per ride, always.", cost: "A database operation on every accept." },
      { decision: "Small search area first", why: "Captains who can actually reach you quickly.", cost: "A few extra seconds in quiet areas." },
      { decision: "Ride PIN", why: "Right rider, right bike.", cost: "A few seconds at pickup." },
      { decision: "Access pass and direct payment", why: "Captains keep the fare; simple money flow.", cost: "Payments must still be recorded for support." },
      { decision: "Insurance in the background", why: "Rides are not delayed by the insurer.", cost: "Confirmation arrives slightly later." },
    ],
    questions: [
      { q: "Why send a ride to several captains instead of one at a time?", a: "Bike rides are short, so waiting for one captain to ignore an offer before trying the next makes the wait long compared with the ride. Sending to a few at once and taking the first accept cuts the wait; a single 'only if empty' write keeps it correct." },
      { q: "How do you guarantee only one captain gets the ride?", a: "Store the ride's captain in one place and set it only if it is empty, as one atomic operation. The database runs competing accepts one after the other; the second sees it is taken." },
      { q: "What is the ride PIN for?", a: "It proves the captain picked up the person who booked, and that the rider got on the right bike. The ride cannot start without it." },
      { q: "If riders pay captains directly, why does the platform need payment records?", a: "For receipts, support and disputes. The platform must know each ride was settled, and how, even though the money did not pass through it." },
      { q: "How is a bike-taxi app different from Uber?", a: "Rides are shorter and cheaper, so wait time matters even more; many users are on budget phones and weak networks; payment often goes straight to the captain; and safety at pickup gets extra attention with helmets and ride PINs." },
    ],
  },
};
