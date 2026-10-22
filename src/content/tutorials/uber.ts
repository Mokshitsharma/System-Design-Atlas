import type { TutorialInput } from "@/lib/schema";

/*
 * Uber: a beginner tutorial on designing a ride-hailing system.
 * The reader is the rider throughout. Everything not marked "public" is a proposed design,
 * not a description of Uber's internal systems.
 */

// Public: "an average of nearly 26 million daily trips" in 2023 (source "uber-q4-2023").
const DAILY_TRIPS = 26_000_000;

// Illustrative assumptions.
const PEAK = 3;
const REQ_PER_TRIP = 20;
const DRIVERS_ONLINE = 1_500_000;
const UPDATE_SEC = 4;
const UPDATE_BYTES = 100;

const avgTrips = DAILY_TRIPS / 86_400;
const peakTrips = avgTrips * PEAK;
const tripReq = peakTrips * REQ_PER_TRIP;
const locUpdates = DRIVERS_ONLINE / UPDATE_SEC;
const locMbps = (locUpdates * UPDATE_BYTES) / 1_000_000;
const locTbDay = (locMbps * 86_400) / 1_000_000;

const r = (n: number, d = 0) => Number(n.toFixed(d));

// Plain-English explanations, written with you as the rider.
const X = {
  you: {
    what: "You, holding the Uber app on your phone.",
    why: "Every ride starts with you asking for one and ends with you arriving and paying.",
    input: "Your taps: where to, which car type, Request.",
    inside: "The app knows your location from GPS, shows prices and the map, and sends your requests.",
    output: "Requests to Uber's servers, with your pickup spot.",
    risks: ["Your GPS is a little off, so the pickup pin is on the wrong side of the road.", "Your network drops just after you tap Request."],
  },
  api: {
    what: "The API gateway: the front door for every request from the rider and driver apps.",
    why: "Some checks apply to every request: are you signed in, are you sending too many requests? Doing them in one place keeps every service simpler.",
    input: "Requests from apps.",
    inside: "Checks who is asking, applies limits, then sends the request to the right service.",
    output: "Checked requests passed to pricing, matching or trips.",
    risks: ["If it goes down, nobody can request or accept rides."],
  },
  pricing: {
    what: "The pricing service works out what your ride will cost before you request it.",
    why: "You want to know the price up front, and the price has to reflect distance, time and how busy it is right now.",
    input: "Your pickup, destination and car type.",
    inside: "Estimates distance and time on real roads, applies the city's rates, and reads the current surge level for your area.",
    output: "A fare you can accept or not.",
    risks: ["If the surge information is out of date, the price can be too high or too low."],
  },
  match: {
    what: "The matching service picks which driver gets your ride.",
    why: "Choosing well means you wait less and drivers waste less time driving to pick-ups.",
    input: "Your pickup spot, and the list of free drivers near you.",
    inside: "Finds free drivers in your area, estimates how long each would take to reach you, and offers your trip to the best one.",
    output: "An offer sent to one driver at a time.",
    risks: ["Two riders could be matched to the same driver if offers are not handled carefully.", "There may simply be no free drivers nearby."],
  },
  driver: {
    what: "The driver app on the driver's phone.",
    why: "Drivers go online, share where they are, accept trips and start and end rides from it.",
    input: "Trip offers, navigation, and the driver's taps.",
    inside: "Sends the driver's GPS position every few seconds while online and shows offers to accept or decline.",
    output: "Location updates and the driver's choices.",
    risks: ["The phone loses signal in a tunnel or basement.", "GPS jumps to the wrong street for a moment."],
  },
  location: {
    what: "The location service receives the stream of driver positions.",
    why: "Matching and your live map both need to know where every online driver is, right now.",
    input: "A small message from each online driver's phone every few seconds.",
    inside: "Checks each position makes sense, then updates the driver's latest spot.",
    output: "Fresh positions for the location index and for your map.",
    risks: ["It gets a very large number of tiny updates every second.", "Bad GPS points can place a driver in the wrong place."],
  },
  geo: {
    what: "The driver location index: an in-memory map of where every online driver is, organised by map cell.",
    why: "'Which free drivers are near you?' must be answered in milliseconds, out of a very large number of drivers.",
    input: "Latest driver positions.",
    inside: "The map is cut into small hexagon cells. Each driver is filed under the cell they are in, so finding nearby drivers means looking in your cell and the cells around it.",
    output: "Lists of drivers per cell.",
    risks: ["If it is lost, it has to be rebuilt from the next round of location updates."],
  },
  trips: {
    what: "The trip service keeps track of each trip from request to drop-off.",
    why: "A trip goes through steps in a fixed order: requested, driver on the way, on trip, completed. Someone has to make sure it never jumps to the wrong step.",
    input: "Accept, start, end and cancel actions from you and the driver.",
    inside: "Moves the trip to its next step only if that step is allowed, and saves every change.",
    output: "The current state of your trip.",
    risks: ["Two actions arrive together, for example you cancel just as the driver accepts."],
  },
  tripdb: {
    what: "The trip database stores every trip and every change to it.",
    why: "Trips are used for payment, receipts, support and safety. They must never be lost.",
    input: "New trips and state changes.",
    inside: "Saves each change in a transaction, so a trip is never half-updated.",
    output: "Your trip history and receipts.",
    risks: ["If it is slow, starting and ending trips is slow."],
  },
  payment: {
    what: "The payment provider: an outside company that charges your card or wallet.",
    why: "Charging cards needs banks and card networks; a provider handles that.",
    input: "The final fare and a unique payment ID.",
    inside: "Asks your bank to approve the charge.",
    output: "Success, failure, or sometimes no clear answer.",
    risks: ["Your card is declined.", "The bank does not answer in time."],
  },
};

export const uber: TutorialInput = {
  slug: "uber",
  title: "Design a ride-hailing app like Uber",
  summary:
    "How to find you a nearby driver within seconds, show the car moving on your map, set a fair price when everyone wants a ride at once, and charge you exactly once at the end.",
  lastVerifiedAt: "2026-10-22",
  patterns: ["consistent-hashing", "cache-aside", "idempotency", "reconciliation", "retry-with-jitter", "rate-limiting", "backpressure", "transactional-outbox"],
  sources: [
    {
      id: "uber-q4-2023",
      title: "Uber Announces Results for Fourth Quarter and Full Year 2023",
      publisher: "Uber Technologies (investor relations)",
      url: "https://investor.uber.com/news-events/news/press-release-details/2024/Uber-Announces-Results-for-Fourth-Quarter-and-Full-Year-2023/default.aspx",
      kind: "official",
      publishedAt: "2024-02-07",
      accessedAt: "2026-10-22",
      note: "Trips include rides and deliveries. Later results exist; this tutorial uses the 2023 full-year figure.",
    },
    {
      id: "uber-h3",
      title: "H3: Uber's Hexagonal Hierarchical Spatial Index",
      publisher: "Uber Engineering Blog",
      url: "https://www.uber.com/blog/h3/",
      kind: "official",
      publishedAt: "2018-06-27",
      accessedAt: "2026-10-22",
      note: "A 2018 post. It describes how H3 was used then; current internal use may differ.",
    },
    {
      id: "uber-surge",
      title: "How surge pricing works",
      publisher: "Uber",
      url: "https://www.uber.com/au/en/drive/driver-app/how-surge-works/",
      kind: "official",
      publishedAt: null,
      accessedAt: "2026-10-22",
      note: "Uber's explanation for drivers (Australia page). Details can vary by city.",
    },
  ],

  intro: {
    paragraphs: [
      "Uber connects people who need a ride with nearby drivers. It looks simple from the outside: you tap a button and a car appears. Behind that button, the system has to know where a very large number of drivers are, every few seconds, and choose one for you in moments.",
      "Ride-hailing is different from a ticket sale. There is no single big moment. Instead, demand moves around the city all day: offices at 6 PM, a stadium after a match, the whole city when it starts to rain. The system has to follow that demand in every neighbourhood at once.",
      "In this tutorial we design a system that finds you a driver quickly, shows the car coming to you, prices the ride fairly when cars are scarce, and charges you exactly once.",
      {
        text: "This is a proposed design based on public information. Uber has published some parts of its approach, such as its hexagon map grid, but not its full internal system, so the components and most numbers here are our own reasoning, labelled as such.",
        evidence: "inferred",
        sources: [],
      },
    ],
    known: [
      {
        text: "Uber reported an average of nearly 26 million daily trips in 2023, and 150 million monthly active platform consumers in the fourth quarter of 2023. Trips include both rides and deliveries.",
        evidence: "public",
        sources: ["uber-q4-2023"],
      },
      {
        text: "In 2018 Uber described H3, a grid that divides the world into hexagon cells, as its system for optimising ride pricing and dispatch, and wrote that it calculated surge pricing by measuring supply and demand in hexagons in each city. Uber released H3 as open source.",
        evidence: "public",
        sources: ["uber-h3"],
      },
      {
        text: "Uber says surge happens when so many people request rides that there are not enough cars, for example in bad weather, rush hour or special events; that surge rates update in real time based on demand; that surge is specific to areas of a city; and that the app tells riders when surge is on.",
        evidence: "public",
        sources: ["uber-surge"],
      },
    ],
    story: {
      title: "Imagine you are the rider",
      steps: [
        "It is 11 PM, it has started raining, and you are leaving a concert with thousands of other people.",
        "You open the Uber app. It already knows where you are, and you type your home address.",
        "The app shows a price that is higher than usual, with a note that it is busy right now. You decide it is worth it and tap Request.",
        "Within a few seconds a driver four minutes away accepts. You see their name, car and number plate.",
        "You watch the little car move towards you on the map, get in, and ride home.",
        "When you arrive, your card is charged automatically, you get a receipt, and you rate the driver.",
        "In this tutorial we follow each of those moments through the system. How did it find that driver so fast? Why was the price higher? How does the car move on your map? And how do we make sure you are charged only once?",
      ],
    },
  },

  requirements: {
    functional: [
      "You can see the price for a ride before you request it.",
      "You can request a ride and be matched with a nearby driver.",
      "You can watch your driver's position on a map, live.",
      "Drivers can go online, share their location, and accept or decline ride offers.",
      "The trip moves through clear steps: requested, driver on the way, on trip, completed or cancelled.",
      "You are charged automatically at the end and get a receipt.",
    ],
    nonFunctional: [
      { name: "Low latency", meaning: "Responses come back quickly.", target: "Finding a driver starts within a second of you tapping Request." },
      { name: "Freshness", meaning: "Information is up to date.", target: "Driver positions on your map are only a few seconds old." },
      { name: "Correctness", meaning: "The answer is right even when many things happen at once.", target: "A driver is never assigned two trips at the same time; you are charged once." },
      { name: "Availability", meaning: "The app keeps working instead of showing errors.", target: "Requests keep working when demand jumps in one part of the city." },
      { name: "Scalability", meaning: "The system can grow by adding servers.", target: "Handles a very large stream of location updates from every online driver." },
    ],
    outOfScope: ["Food delivery", "Driver sign-up and background checks", "Calculating driver earnings"],
    terms: [
      { term: "ETA", meaning: "Estimated time of arrival: how long the driver needs to reach you." },
      { term: "Surge", meaning: "A temporary higher price in an area where many people want rides and few drivers are free." },
      { term: "Hexagon cell", meaning: "One small six-sided piece of the map. The whole city is covered with them, like a honeycomb." },
      { term: "Geospatial index", meaning: "A way of storing locations so that 'what is near this point?' can be answered very quickly." },
      { term: "Trip state", meaning: "The step a trip is at, such as 'driver on the way' or 'on trip'." },
      { term: "Idempotent", meaning: "Safe to repeat: doing it twice has the same effect as doing it once." },
    ],
  },

  capacity: {
    intro:
      "Let us estimate the work. Uber has published its average daily trips, so we start there and label everything else as an assumption. The surprising result is that the biggest load is not ride requests at all.",
    assumptions: [
      { label: "Average trips per day (2023, rides and deliveries)", value: DAILY_TRIPS, unit: "trips", evidence: "public", sources: ["uber-q4-2023"] },
      { label: "Busiest hour compared with the average", value: PEAK, unit: "times" },
      { label: "Requests one trip causes (price checks, request, status, map updates, payment)", value: REQ_PER_TRIP, unit: "requests" },
      { label: "Drivers online at the busiest time", value: DRIVERS_ONLINE, unit: "drivers", note: "Illustrative; not an Uber figure" },
      { label: "How often a driver's phone sends its location", value: UPDATE_SEC, unit: "seconds" },
      { label: "Size of one location update", value: UPDATE_BYTES, unit: "bytes" },
    ],
    steps: [
      { label: "Average trips per second", formula: "trips per day ÷ seconds in a day", working: "26,000,000 ÷ 86,400", result: r(avgTrips), unit: "trips/s" },
      { label: "Trips per second at the busiest time", formula: "average × peak multiplier", working: "301 × 3", result: r(peakTrips), unit: "trips/s" },
      { label: "Trip requests per second at the peak", formula: "trips per second × requests per trip", working: "903 × 20", result: r(tripReq), unit: "req/s" },
      { label: "Location updates per second", formula: "drivers online ÷ update interval", working: "1,500,000 ÷ 4", result: r(locUpdates), unit: "updates/s" },
      { label: "Location data per second", formula: "updates per second × size", working: "375,000 × 100 bytes", result: r(locMbps, 1), unit: "MB/s" },
      { label: "Location data per day, if all of it were kept", formula: "MB per second × seconds in a day", working: "37.5 MB × 86,400", result: r(locTbDay, 2), unit: "TB" },
    ],
    takeaways: [
      "Drivers' location updates are about 20 times more than all trip requests. The location service, not the booking flow, is the busiest part of the system.",
      "Most location updates only matter for a few seconds. We keep the latest position of each driver in memory for matching, and store the history more cheaply for trip records.",
      "Finding nearby drivers among so many is a geography problem. We need an index that answers 'who is near this point?' without checking every driver.",
    ],
    calculator: { avgRps: 6000, peakMultiplier: 3, rpsPerServer: 500, utilization: 0.6 },
  },

  architecture: {
    intro:
      "Here is the whole system, following one ride from price to receipt. Start with the simple view, then switch to the detailed view. Press Send request to watch your ride travel through it, and select any box to read what it does.",
    workflow: {
      id: "overview",
      title: "One ride, end to end",
      summary: "Your ride from checking the price to rating the driver.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "pricing", label: "Pricing service", kind: "service", col: 2, row: 0, explain: X.pricing },
        { id: "match", label: "Matching service", kind: "service", col: 3, row: 0, explain: X.match },
        { id: "driver", label: "Driver app", kind: "user", col: 3, row: 1, explain: X.driver },
        { id: "location", label: "Location service", kind: "service", col: 2, row: 1, explain: X.location },
        { id: "geo", label: "Driver location index", kind: "cache", col: 1, row: 1, tags: ["cache"], explain: X.geo },
        { id: "trips", label: "Trip service", kind: "service", col: 2, row: 2, explain: X.trips },
        { id: "tripdb", label: "Trip database", kind: "database", col: 1, row: 2, tags: ["transaction"], explain: X.tripdb },
        { id: "payment", label: "Payment provider", kind: "external", col: 0, row: 2, explain: X.payment },
      ],
      simple: [
        { node: "you", text: "You type where you want to go." },
        { node: "pricing", text: "The app shows you the price." },
        { node: "match", text: "You tap Request, and the matching service looks for a driver near you." },
        { node: "driver", text: "A nearby driver accepts and drives to you." },
        { node: "payment", text: "After the ride, your card is charged automatically." },
        { node: "you", text: "You get a receipt and rate the driver." },
      ],
      detailed: [
        { node: "you", text: "You type your destination." },
        { node: "api", text: "Your request reaches the API gateway, which checks you are signed in." },
        { node: "pricing", text: "The pricing service works out the fare. It is raining and many people near you want rides, so surge is on for your area." },
        { node: "match", from: "api", text: "You tap Request. The matching service starts looking for a driver." },
        { node: "geo", text: "It asks the driver location index: which free drivers are in your map cell and the cells around it?" },
        { node: "driver", from: "match", text: "The best driver gets an offer on their phone and taps Accept." },
        { node: "trips", text: "The trip service creates your trip and moves it to 'driver on the way'." },
        { node: "tripdb", text: "The trip and each later change are saved in the trip database." },
        { node: "location", from: "driver", async: true, text: "All the while, the driver's phone sends its position every few seconds to the location service." },
        { node: "geo", async: true, text: "The location index is kept up to date, so matching always sees where drivers really are." },
        { node: "you", from: "geo", text: "Your app reads your driver's latest position, so you watch the car move towards you on the map." },
        { node: "payment", from: "trips", text: "When the driver ends the trip, your card is charged using a unique payment ID." },
        { node: "you", text: "You get a receipt and rate the driver." },
      ],
      failures: [
        {
          id: "no-drivers",
          title: "Not enough drivers near you",
          node: "match",
          what: "Many people around the concert want rides, and only a few drivers are free nearby.",
          userSees: "A higher price, or 'no cars available, try again shortly'. You choose whether to pay more or wait.",
          detect: "Ride requests in one area are far higher than the number of free drivers there.",
          steps: [
            { node: "pricing", from: "match", text: "Demand is much higher than supply in your area, so the surge level for that area goes up." },
            { node: "driver", from: "pricing", text: "Drivers see that this area is busy, and some drive towards it." },
            { node: "you", from: "pricing", text: "You see the higher price or a short wait. Nobody is shown a driver who is not really free." },
          ],
        },
        {
          id: "payment-fails",
          title: "Your card is declined at the end",
          node: "payment",
          what: "The ride is finished but the charge does not go through.",
          userSees: "Your trip is complete. The app asks you to update your payment method.",
          detect: "The payment provider returns 'declined'.",
          steps: [
            { node: "tripdb", from: "payment", text: "The trip is saved as 'completed, payment pending', so nothing is lost." },
            { node: "trips", from: "tripdb", text: "The charge will be retried later with the same payment ID, so it can never go through twice." },
            { node: "you", from: "trips", text: "You are asked to update your card before your next ride." },
          ],
        },
      ],
    },
  },

  workflows: [
    {
      id: "location",
      title: "Drivers sharing their location",
      summary: "The busiest stream in the system: every online driver's phone reporting where it is, every few seconds.",
      nodes: [
        { id: "driver", label: "Driver app", kind: "user", col: 0, row: 0, explain: X.driver },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "location", label: "Location service", kind: "service", col: 2, row: 0, explain: X.location },
        { id: "geo", label: "Driver location index", kind: "cache", col: 3, row: 0, tags: ["cache"], explain: X.geo },
        { id: "queue", label: "Message queue", kind: "queue", col: 2, row: 1, tags: ["queue"], explain: {
          what: "A message queue: a to-do list for work that can happen a little later.",
          why: "Saving every position forever is slow work. Putting a copy in a queue lets the location service move on to the next update immediately.",
          input: "Copies of location updates.",
          inside: "Holds them until the history writer takes them.",
          output: "Batches of updates for storage.",
          risks: ["Updates pile up if the writer is slow, but the live map does not depend on it."],
        } },
        { id: "history", label: "Location history", kind: "database", col: 3, row: 1, explain: {
          what: "Long-term storage of where drivers went.",
          why: "Trip routes, receipts, fare disputes and improving ETAs all need past positions. They do not need them within the same second.",
          input: "Batches of location updates.",
          inside: "Stores them compactly, grouped by trip and time, and deletes old data after a set time.",
          output: "Routes for receipts and analysis.",
          risks: ["It grows by terabytes a day if everything is kept, so it needs a deletion policy."],
        } },
      ],
      simple: [
        { node: "driver", text: "A driver is online. Every few seconds the phone sends its position." },
        { node: "location", text: "The location service receives the update." },
        { node: "geo", text: "The driver's latest spot is updated in the location index." },
      ],
      detailed: [
        { node: "driver", text: "The driver is online. Every few seconds the phone sends a tiny message: driver ID, position, time." },
        { node: "api", text: "The gateway checks the message really comes from that driver's app." },
        { node: "location", text: "The location service checks the position makes sense. A jump of 50 km in four seconds is ignored." },
        { node: "geo", text: "The driver's latest spot is updated in memory, filed under the hexagon cell they are in now. Only the newest position is kept here." },
        { node: "queue", from: "location", async: true, text: "A copy of the update goes into the message queue." },
        { node: "history", async: true, text: "In the background, updates are stored in batches for trip routes and receipts." },
      ],
      failures: [
        {
          id: "tunnel",
          title: "The driver drives into a tunnel",
          node: "driver",
          what: "The phone loses signal and stops sending updates.",
          userSees: "If this is your driver, the car stops moving on your map for a moment, then jumps forward when the signal returns.",
          detect: "No update from this driver for longer than usual.",
          steps: [
            { node: "geo", from: "location", text: "After a short time with no update, the driver is marked 'position unknown' and is not offered new trips." },
            { node: "driver", from: "location", text: "When the signal returns, the phone sends its saved positions and the driver becomes available again." },
          ],
        },
        {
          id: "gps-jump",
          title: "The phone reports a wrong position",
          node: "location",
          what: "GPS bounces off tall buildings and puts the driver on the wrong street for a moment.",
          userSees: "Nothing, if it is filtered. Otherwise your driver might seem to jump around.",
          detect: "A position that is impossible given the last one and the time between them.",
          steps: [
            { node: "location", from: "api", text: "The update is compared with the last good one. A speed that no car could reach means the point is ignored." },
            { node: "geo", from: "location", text: "The index keeps the last good position, so matching is not misled." },
          ],
        },
      ],
    },
    {
      id: "matching",
      title: "Finding you a driver",
      summary: "What happens in the few seconds between you tapping Request and seeing your driver's name.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, tags: ["retry"], explain: X.api },
        { id: "match", label: "Matching service", kind: "service", col: 2, row: 0, explain: X.match },
        { id: "geo", label: "Driver location index", kind: "cache", col: 3, row: 0, tags: ["cache"], explain: X.geo },
        { id: "eta", label: "ETA service", kind: "service", col: 3, row: 1, explain: {
          what: "The ETA service estimates how long a driver needs to reach you along real roads.",
          why: "The nearest driver in a straight line is not always the fastest. A river, a one-way street or a traffic jam can make a close driver slow.",
          input: "A driver's position and your pickup spot.",
          inside: "Finds a route on the road map and estimates travel time using current traffic.",
          output: "Minutes to reach you, for each candidate driver.",
          risks: ["Traffic changes quickly, so estimates can be off by a few minutes."],
        } },
        { id: "driver", label: "Nearest driver", kind: "user", col: 2, row: 1, explain: X.driver },
        { id: "status", label: "Driver status store", kind: "database", col: 1, row: 1, tags: ["transaction"], explain: {
          what: "A fast store of each driver's status: free, offered a trip, or on a trip.",
          why: "A driver must never be offered two trips at once. One place must hold the truth about who is free.",
          input: "Requests to change a driver's status.",
          inside: "Changes status only if it is still what we expect, for example 'mark as offered only if still free', in one step.",
          output: "Yes, the driver is now offered your trip, or no, someone else got there first.",
          risks: ["If it is slow, every match waits."],
        } },
        { id: "driver2", label: "Next driver", kind: "user", col: 3, row: 2, failureOnly: true, explain: X.driver },
      ],
      simple: [
        { node: "you", text: "You tap Request." },
        { node: "match", text: "The matching service finds the best free driver near you." },
        { node: "driver", text: "That driver gets the offer and taps Accept." },
        { node: "you", from: "match", text: "You see your driver's name, car and how many minutes away they are." },
      ],
      detailed: [
        { node: "you", text: "You tap Request. The app sends your pickup spot and a unique request ID, so tapping twice cannot order two cars." },
        { node: "api", text: "The gateway checks you are signed in." },
        { node: "match", text: "The matching service starts looking for a driver." },
        { node: "geo", text: "It asks the location index for free drivers in your hexagon cell and the cells right around it. This avoids checking every driver in the city." },
        { node: "eta", from: "match", text: "For the closest few drivers, the ETA service estimates how long each needs to reach you by road." },
        { node: "status", from: "match", text: "The best driver is marked 'offered your trip' in one step that only works if they are still free. No other rider can be offered this driver now." },
        { node: "driver", from: "match", text: "The driver sees your pickup spot and taps Accept." },
        { node: "you", from: "match", text: "You see your driver's name, car and how far away they are." },
      ],
      failures: [
        {
          id: "declines",
          title: "The driver does not accept",
          node: "driver",
          what: "The driver ignores or declines the offer.",
          userSees: "'Finding your driver' lasts a few seconds longer, then you see a different driver.",
          detect: "No answer before the offer's time limit runs out.",
          steps: [
            { node: "match", from: "driver", text: "The offer expires after a few seconds without an answer." },
            { node: "status", from: "match", text: "The first driver is marked free again, so they can get other trips." },
            { node: "driver2", from: "match", text: "The next-best driver gets the offer." },
            { node: "you", from: "match", text: "You see 'Finding your driver' a little longer, then your new driver. You never had to tap again." },
          ],
        },
        {
          id: "same-driver",
          title: "Two riders are matched to the same driver",
          node: "status",
          what: "Two matching attempts choose the same driver at the same moment.",
          userSees: "Nothing unusual. Each rider gets a different driver.",
          detect: "The second attempt's status change finds the driver is no longer free.",
          steps: [
            { node: "status", from: "match", text: "Both attempts try 'mark as offered only if still free'. The store runs them one after the other, so only the first succeeds." },
            { node: "match", from: "status", text: "The second attempt sees the driver is taken and moves on to the next driver." },
            { node: "you", from: "match", text: "Both riders get a driver, and no driver is sent to two pick-ups." },
          ],
        },
      ],
    },
    {
      id: "surge",
      title: "Pricing your ride, and surge",
      summary: "How the price you see is worked out, and why it goes up when many people want rides in your area.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "pricing", label: "Pricing service", kind: "service", col: 2, row: 0, explain: X.pricing },
        { id: "demand", label: "Demand counter", kind: "cache", col: 3, row: 0, tags: ["cache"], explain: {
          what: "A running count of how many people are asking for rides in each map cell.",
          why: "To know whether an area is busy, we need to know how many people want rides there right now.",
          input: "Every price check and ride request, with its map cell.",
          inside: "Keeps a count per cell for the last few minutes and lets old counts fade out.",
          output: "Demand per cell.",
          risks: ["A sudden crowd changes counts very quickly."],
        } },
        { id: "surgecalc", label: "Surge calculator", kind: "service", col: 2, row: 1, explain: {
          what: "A background job that compares demand and free drivers in every map cell.",
          why: "When many people want rides and few drivers are free, a higher price helps: some riders wait, and more drivers come to the area.",
          input: "Demand per cell and free drivers per cell.",
          inside: "Every short while, works out a surge level for each cell from the balance of riders and drivers.",
          output: "A surge level per cell.",
          risks: ["If it stops running, the surge levels become out of date."],
        } },
        { id: "supply", label: "Free-driver counter", kind: "cache", col: 3, row: 1, tags: ["cache"], explain: {
          what: "A count of free drivers in each map cell.",
          why: "Demand alone is not enough. We need to compare it with how many drivers are actually available.",
          input: "Driver positions and statuses from the location index.",
          inside: "Counts free drivers per cell and keeps the count fresh.",
          output: "Supply per cell.",
          risks: ["Drivers on the edge of two cells can be counted in the wrong one."],
        } },
        { id: "geo", label: "Driver location index", kind: "cache", col: 3, row: 2, explain: X.geo },
        { id: "surgemap", label: "Surge map", kind: "cache", col: 1, row: 1, tags: ["cache"], explain: {
          what: "The current surge level for every map cell, kept in memory.",
          why: "Every price check needs the surge level for one cell. Reading it from memory takes about a millisecond.",
          input: "New surge levels from the calculator.",
          inside: "Stores the latest level per cell, with the time it was calculated.",
          output: "The surge level for your cell.",
          risks: ["If it is not updated, prices are based on old information."],
        } },
      ],
      simple: [
        { node: "you", text: "You type your destination." },
        { node: "pricing", text: "The pricing service works out the normal fare for the distance and time." },
        { node: "surgecalc", from: "pricing", text: "It checks whether many people and few drivers are in your area right now." },
        { node: "you", from: "pricing", text: "You see the price. If your area is busy, it is higher, and the app tells you why." },
      ],
      detailed: [
        { node: "you", text: "You type your destination, and the app asks for a price." },
        { node: "api", text: "The request reaches the API gateway." },
        { node: "demand", from: "api", async: true, text: "Your price check is counted as demand in your map cell." },
        { node: "supply", from: "geo", async: true, text: "Free drivers in each cell are counted from the location index." },
        { node: "surgecalc", from: "demand", async: true, text: "Every short while, the surge calculator compares demand with free drivers in each cell." },
        { node: "surgemap", async: true, text: "It writes a surge level for each cell into the surge map. Your cell, outside the concert, is busy." },
        { node: "pricing", from: "api", text: "The pricing service works out the normal fare from distance and expected time on the roads." },
        { node: "surgemap", from: "pricing", text: "It reads the surge level for your cell from the surge map." },
        { node: "you", from: "pricing", text: "You see the final price, with a note that prices are higher right now. You decide whether to request or wait." },
      ],
      failures: [
        {
          id: "calc-stops",
          title: "The surge calculator stops updating",
          node: "surgecalc",
          what: "The background job fails, so surge levels are not refreshed.",
          userSees: "Normal prices, even in busy areas, until it is fixed. Requests still work.",
          detect: "The time since the surge map was last updated grows beyond a few minutes.",
          steps: [
            { node: "surgemap", from: "surgecalc", text: "The surge map keeps its last values, each with the time it was calculated." },
            { node: "pricing", from: "surgemap", text: "Pricing sees the levels are too old and ignores them, using normal fares instead of guessing." },
            { node: "you", from: "pricing", text: "You get a normal price. Matching and rides carry on." },
          ],
        },
        {
          id: "crowd",
          title: "A huge crowd leaves the stadium at once",
          node: "demand",
          what: "Requests in the cells around the stadium jump within a minute.",
          userSees: "Riders near the stadium see a higher price. Riders across town do not.",
          detect: "Demand in a few cells rises sharply while the rest of the city is normal.",
          steps: [
            { node: "surgecalc", from: "demand", text: "The calculator sees the jump and raises surge only for those cells." },
            { node: "surgemap", from: "surgecalc", text: "The new levels are written to the surge map within a short while." },
            { node: "pricing", from: "surgemap", text: "Price checks from the stadium area now include surge." },
            { node: "you", from: "pricing", text: "You see the higher price and can choose to walk a few streets away or wait for it to drop." },
          ],
        },
      ],
    },
    {
      id: "trip",
      title: "The ride and the payment",
      summary: "How your trip moves through its steps, and how you are charged exactly once at the end.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "driver", label: "Driver app", kind: "user", col: 1, row: 0, explain: X.driver },
        { id: "trips", label: "Trip service", kind: "service", col: 2, row: 0, tags: ["retry"], explain: X.trips },
        { id: "tripdb", label: "Trip database", kind: "database", col: 3, row: 0, tags: ["transaction"], explain: X.tripdb },
        { id: "payment", label: "Payment provider", kind: "external", col: 3, row: 1, explain: X.payment },
        { id: "queue", label: "Message queue", kind: "queue", col: 2, row: 1, tags: ["queue"], explain: {
          what: "A message queue: a to-do list for things that can happen a few seconds later.",
          why: "Receipts and rating requests should not slow down ending the trip.",
          input: "'Trip completed' messages.",
          inside: "Keeps each job until it is done, and retries if a worker fails.",
          output: "Jobs for receipts and ratings.",
          risks: ["A job can run twice, so the receipt sender checks before sending."],
        } },
        { id: "receipt", label: "Receipts and ratings", kind: "service", col: 1, row: 1, explain: {
          what: "Sends your receipt and asks you to rate the trip.",
          why: "You need a record of what you paid, and ratings help keep rides safe and pleasant.",
          input: "'Trip completed' jobs.",
          inside: "Builds the receipt with the route and fare, sends it, and opens the rating screen.",
          output: "A receipt in the app and by email.",
          risks: ["The email is delayed if the email provider is slow."],
        } },
        { id: "retry", label: "Payment retry job", kind: "service", col: 2, row: 2, failureOnly: true, explain: {
          what: "A background job that retries payments that did not go through.",
          why: "Cards are sometimes declined or banks do not reply. The ride still happened, so the fare must be collected later, and only once.",
          input: "Trips marked 'payment pending'.",
          inside: "Retries the charge with the same payment ID, a few times, with waits in between.",
          output: "Paid trips, or a request to update your card.",
          risks: ["Retrying too often annoys banks and riders."],
        } },
      ],
      simple: [
        { node: "you", text: "You get into the car." },
        { node: "driver", text: "The driver starts the trip in their app." },
        { node: "trips", text: "The trip service records that you are on your way." },
        { node: "payment", text: "At the end, your card is charged automatically." },
        { node: "you", from: "trips", text: "You get a receipt." },
      ],
      detailed: [
        { node: "you", text: "Your driver arrives and you get in." },
        { node: "driver", text: "The driver checks your name and taps Start trip." },
        { node: "trips", text: "The trip service moves your trip from 'driver on the way' to 'on trip'. It only allows steps in the right order." },
        { node: "tripdb", text: "Each change is saved, so a crash cannot lose where your trip is." },
        { node: "trips", from: "driver", text: "At your door, the driver taps End trip. Your trip becomes 'completed' and the final fare is worked out." },
        { node: "payment", text: "Your card is charged with a unique payment ID, so a retry can never charge you twice." },
        { node: "queue", from: "trips", async: true, text: "A 'trip completed' job goes into the message queue." },
        { node: "receipt", async: true, text: "In the background, your receipt is sent and the rating screen opens." },
        { node: "you", from: "receipt", text: "You see your receipt and give the driver five stars." },
      ],
      failures: [
        {
          id: "phone-offline",
          title: "The driver's phone goes offline during the ride",
          node: "driver",
          what: "The driver's phone loses signal between Start trip and End trip.",
          userSees: "Your trip still shows as in progress. The route fills in once the phone reconnects.",
          detect: "No location updates or actions from the driver's phone for a while.",
          steps: [
            { node: "trips", from: "driver", text: "Nothing is cancelled automatically. The trip simply stays 'on trip'." },
            { node: "you", from: "trips", text: "You still see your trip in your app, and the route appears when the driver's phone sends its saved positions." },
          ],
        },
        {
          id: "declined",
          title: "The payment does not go through",
          node: "payment",
          what: "Your card is declined, or the bank does not reply in time.",
          userSees: "Your trip is complete. You may be asked to update your card.",
          detect: "The provider returns 'declined', or no reply arrives in time.",
          steps: [
            { node: "tripdb", from: "payment", text: "The trip is saved as 'completed, payment pending'." },
            { node: "retry", from: "tripdb", text: "The payment retry job tries again later, with the same payment ID, so it can only succeed once." },
            { node: "you", from: "trips", text: "If retries still fail, you are asked to update your card before your next ride." },
          ],
        },
      ],
    },
  ],

  database: {
    intro:
      "Different data needs different storage. Trips and payments must never be lost, so they go in a database with transactions. Driver positions change every few seconds and only the latest matters for matching, so they live in memory, with history kept separately.",
    entities: [
      { name: "Rider", purpose: "Your account.", fields: [
        { name: "rider_id", type: "id", note: "primary key" }, { name: "name and phone", type: "text" }, { name: "payment_method", type: "token", note: "never the card number itself" },
      ], relations: ["Has many Trips"] },
      { name: "Driver", purpose: "A driver's account and car.", fields: [
        { name: "driver_id", type: "id", note: "primary key" }, { name: "car and plate", type: "text" }, { name: "status", type: "offline, free, offered or on trip" },
      ], relations: ["Has many Trips"] },
      { name: "Trip", purpose: "One ride from request to drop-off.", fields: [
        { name: "trip_id", type: "id", note: "primary key" }, { name: "rider_id, driver_id", type: "ids" }, { name: "request_id", type: "text", note: "unique, stops double requests" }, { name: "state", type: "requested, accepted, on trip, completed or cancelled" }, { name: "fare", type: "money" },
      ], relations: ["Belongs to a Rider and a Driver", "Has many Trip events", "Has one or more Payments"] },
      { name: "Trip event", purpose: "Every change to a trip, in order.", fields: [
        { name: "trip_id", type: "id" }, { name: "from_state, to_state", type: "text" }, { name: "at", type: "date and time" },
      ], relations: ["Belongs to a Trip"] },
      { name: "Location point", purpose: "One past position of a driver, kept for routes and receipts.", fields: [
        { name: "driver_id, trip_id", type: "ids" }, { name: "lat, lng", type: "numbers" }, { name: "at", type: "date and time" },
      ], relations: ["Belongs to a Driver and, during a ride, a Trip"] },
      { name: "Payment", purpose: "One attempt to charge for a trip.", fields: [
        { name: "payment_id", type: "id", note: "unique, sent to the provider" }, { name: "trip_id", type: "id" }, { name: "amount", type: "money" }, { name: "result", type: "paid, declined, pending" },
      ], relations: ["Belongs to a Trip"] },
    ],
    why: [
      "Trips are split by city, so most work for one trip stays in one place, close to where the ride happens.",
      "Location points are written in batches and deleted after a set time. Only the latest position of each driver is kept in memory for matching.",
      "Every state change is stored as a Trip event. If there is ever a dispute, we can see exactly what happened and when.",
    ],
  },

  decisions: [
    {
      id: "hexagons",
      title: "Cut the map into hexagon cells to find nearby drivers",
      problem: "To find drivers near you, checking the distance to every online driver in the city would take far too long, every time anyone taps Request.",
      solution: "Divide the map into small cells and file each driver under the cell they are in. Uber has described using hexagon cells (its H3 grid) for pricing and dispatch.",
      how: "Each position is turned into a cell ID. To find drivers near you, we look only in your cell and the ring of cells around it. If that is not enough, we look one ring further out.",
      where: "In the driver location index, used by matching and by surge.",
      tradeoff: "The cell size matters. Cells that are too big return too many drivers to compare; cells that are too small mean searching many rings. Hexagons have the same distance to all their neighbours, which keeps 'the cells around you' simple. Square grids (such as geohash) or other cell systems also work.",
    },
    {
      id: "latest-in-memory",
      title: "Keep only the latest driver positions in memory",
      problem: "Location updates arrive hundreds of thousands of times a second. Writing every one into a normal database and reading it back for matching would be slow and expensive.",
      solution: "Keep each driver's latest position in a fast in-memory index, and send the full history to cheaper storage in the background.",
      how: "Each new update replaces the driver's previous position in memory. A copy goes into a queue and is written to history storage in batches.",
      where: "Location service, location index, message queue and history storage.",
      tradeoff: "If an in-memory server fails, those positions are lost, but they are rebuilt within seconds from the next round of updates. History may lag a little, which does not matter for live matching.",
    },
    {
      id: "eta-not-distance",
      title: "Choose drivers by time on the road, not straight-line distance",
      problem: "A driver 500 metres away across a river may need 15 minutes. A driver 2 km away on a main road may need four.",
      solution: "Take the closest few drivers from the index, then ask the ETA service how long each needs on real roads, and pick the fastest.",
      how: "The index gives a short list cheaply; the more expensive road calculation runs only for that short list.",
      where: "Inside the matching step.",
      tradeoff: "Road estimates take a little longer than straight lines, so we only run them for a handful of drivers.",
    },
    {
      id: "one-offer",
      title: "Offer each driver only one trip at a time",
      problem: "Many riders are being matched at the same moment. Without care, two riders could be sent the same driver.",
      solution: "Before offering a driver your trip, change their status from 'free' to 'offered' in one step that only works if they are still free.",
      how: "The status store runs competing changes one after the other. The loser sees the driver is taken and moves to the next one. If the driver does not answer within a few seconds, the offer expires and they are free again.",
      where: "Between the matching service and the driver status store.",
      tradeoff: "A driver who ignores offers is locked for a few seconds each time. A short time limit keeps that small.",
    },
    {
      id: "surge-per-area",
      title: "Set surge per small area, and update it often",
      problem: "When it rains or an event ends, demand jumps in some places and not others. One price for the whole city would be unfair to most riders and useless where it is busy.",
      solution: "Measure demand and free drivers in each map cell and set a surge level per cell, updated every short while. Uber says surge is area-specific and changes in real time.",
      how: "Counters keep demand and supply per cell. A background job turns the balance into a surge level, and pricing reads your cell's level when you check a price.",
      where: "Demand and supply counters, surge calculator, surge map, pricing service.",
      tradeoff: "Prices can change between two checks a minute apart, which can surprise riders. Showing the reason in the app helps.",
    },
    {
      id: "trip-steps",
      title: "Treat a trip as a series of allowed steps",
      problem: "You might cancel at the very moment the driver taps Start trip. Without rules, the trip could end up both cancelled and on trip.",
      solution: "Define the allowed steps (requested, accepted, on trip, completed, cancelled) and only allow moves between them that make sense.",
      how: "Each action says which step it expects the trip to be in. The trip service applies it only if the trip is still in that step, and records every change.",
      where: "The trip service and trip database.",
      tradeoff: "When two actions collide, one of them is refused and the person has to see the new situation. That is better than a trip in two states at once.",
    },
    {
      id: "pay-once",
      title: "Charge exactly once, even when retrying",
      problem: "Networks fail. If the charge request times out, retrying could charge you twice; not retrying could mean the ride is never paid for.",
      solution: "Give every charge a unique payment ID, send the same ID on every retry, and keep a retry job for payments that did not finish.",
      how: "The payment provider remembers the ID. A repeat with the same ID returns the first result instead of charging again.",
      where: "Between the trip service and the payment provider.",
      tradeoff: "We must store payment IDs and run a retry job. In return, double charges become impossible.",
    },
  ],

  failures: [
    {
      title: "Not enough drivers in your area",
      what: "Many people want rides in one area, for example in rain or after an event, and few drivers are free there.",
      userSees: "A higher price, or a short wait. Uber says the app tells riders when surge is on.",
      detect: "Demand in a cell is far higher than free drivers in that cell.",
      recover: "Surge rises in that area only; drivers see busy areas and move towards them.",
      prevent: "Show drivers where demand is building early. Test with a simulated crowd in one cell.",
      evidence: "public",
      sources: ["uber-surge"],
    },
    {
      title: "Location updates stop arriving",
      what: "A driver's phone loses signal, or the location service falls behind.",
      userSees: "Your driver's car stops moving on the map for a moment.",
      detect: "Time since a driver's last update grows; queue of unprocessed updates grows.",
      recover: "Drivers without fresh positions are not offered new trips; positions are refreshed as soon as updates resume.",
      prevent: "Keep only the newest update per driver when behind, so the service catches up quickly. Test by stopping updates for a group of drivers.",
    },
    {
      title: "Two riders get the same driver",
      what: "Two matching attempts choose the same free driver at the same moment.",
      userSees: "Nothing, with the design above. Each rider gets a different driver.",
      detect: "A status change finds the driver is no longer free.",
      recover: "The second attempt moves on to the next driver.",
      prevent: "Change driver status only with 'if still free' in one step. Test by matching many riders at once against one driver.",
    },
    {
      title: "You tap Request twice",
      what: "The app seems slow, so you tap Request again.",
      userSees: "One driver and one trip.",
      detect: "A repeated request ID.",
      recover: "The second request returns the trip that was already created.",
      prevent: "Create the request ID once per request screen. Test by sending the same request many times at once.",
    },
    {
      title: "You cancel just as the driver arrives",
      what: "Your cancel and the driver's Start trip happen at the same moment.",
      userSees: "Either the cancel works, or you are told the trip has already started. Never both.",
      detect: "An action arrives for a trip that is no longer in the step it expected.",
      recover: "The first action wins; the second person sees the updated trip.",
      prevent: "Every action names the step it expects. Test by sending cancel and start together.",
    },
    {
      title: "The payment does not go through",
      what: "Your card is declined, or the bank does not reply in time.",
      userSees: "Your trip is complete; you may be asked to update your card.",
      detect: "The provider replies 'declined', or no reply arrives in time.",
      recover: "The trip is saved as 'payment pending' and the retry job tries again with the same payment ID.",
      prevent: "Save the payment before calling the provider. Test with a fake provider that times out.",
    },
  ],

  recap: {
    decisions: [
      { decision: "Hexagon cells for 'nearby'", why: "Finding drivers near you checks a few cells, not the whole city.", cost: "Choosing the right cell size takes care." },
      { decision: "Latest positions in memory", why: "Handles a huge stream of updates and answers matching instantly.", cost: "Memory is lost on a crash, but refills within seconds." },
      { decision: "Road time, not straight-line distance", why: "You get the driver who can actually reach you fastest.", cost: "Extra calculation for each candidate." },
      { decision: "One offer per driver at a time", why: "No driver is sent to two pick-ups.", cost: "Ignored offers lock a driver for a few seconds." },
      { decision: "Surge per area", why: "Prices react where it is busy and nowhere else.", cost: "Prices can change between checks." },
      { decision: "Trip steps and unique payment IDs", why: "No trip in two states; no double charges.", cost: "More rules and a retry job." },
    ],
    questions: [
      { q: "How do you find the nearest drivers quickly?", a: "Store each driver's latest position in memory, filed under a map cell (for example an H3 hexagon). Search your cell and the ring around it to get a short list, then rank that list by estimated time on the road." },
      { q: "Driver apps send a huge number of location updates. How do you handle them?", a: "Keep only the latest position per driver in memory for matching, process updates without waiting on a database, and send history to cheaper storage in batches through a queue. If behind, drop older updates for the same driver." },
      { q: "How do you stop one driver being assigned to two riders?", a: "Change the driver's status from free to offered with a single 'only if still free' operation. The second attempt fails and moves on. Offers expire after a few seconds if the driver does not answer." },
      { q: "How does surge work in your design?", a: "Count demand and free drivers in each map cell, compute a surge level per cell on a short schedule, and read your cell's level when pricing your ride. If the calculator stops, fall back to normal prices instead of using stale values." },
      { q: "How is ride-hailing different from selling concert tickets?", a: "There is no single sale moment; demand moves around the city all day. The resource (a driver) is moving and is free again after each trip. And the biggest load is a constant stream of location updates, not purchases." },
    ],
  },
};
