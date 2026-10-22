import type { TutorialInput } from "@/lib/schema";

/*
 * Ola: a beginner tutorial on designing a multi-service ride app with scheduled trips,
 * its own maps and rentals. The reader is the rider throughout. Everything not marked "public"
 * is a proposed design, not a description of Ola's internal systems.
 */

// Illustrative assumptions. Ola does not publish daily ride counts.
const RIDES_PER_DAY = 1_500_000;
const PEAK = 3;
const TRIP_MIN = 25;
const ETA_REFRESH_SEC = 30;
const DRIVERS_ONLINE = 200_000;
const UPDATE_SEC = 4;
const SCHEDULED_SHARE = 0.05;

const avgRides = RIDES_PER_DAY / 86_400;
const peakRides = avgRides * PEAK;
const inProgress = peakRides * TRIP_MIN * 60;
const etaPerSec = inProgress / ETA_REFRESH_SEC;
const locPerSec = DRIVERS_ONLINE / UPDATE_SEC;
const scheduled = RIDES_PER_DAY * SCHEDULED_SHARE;

const r = (n: number, d = 0) => Number(n.toFixed(d));

// Plain-English explanations, written with you as the rider.
const X = {
  you: {
    what: "You, booking on the Ola app.",
    why: "Every ride starts with you choosing a ride type and ends with you paying.",
    input: "Your taps: pickup, destination, ride type, when.",
    inside: "The app shows ride types (bike, auto, Mini, Prime, Rentals, Outstation) with fares, shows the map, and sends your requests.",
    output: "Requests to Ola's servers.",
    risks: ["Your phone loses data while you book.", "Your pickup pin is slightly off."],
  },
  api: {
    what: "The API gateway: the front door for every request from rider and driver apps.",
    why: "Sign-in checks and request limits happen once, in one place.",
    input: "Requests from the apps.",
    inside: "Checks who is asking and sends the request to the right service.",
    output: "Checked requests to fares, booking, matching and rides.",
    risks: ["If it goes down, nobody can book."],
  },
  fare: {
    what: "The fare service works out the price for each ride type.",
    why: "You see bike, auto, Mini and Prime prices side by side before choosing.",
    input: "Pickup, destination, ride type, and the route from the maps service.",
    inside: "Takes the road distance and travel time, applies the rates for each ride type in your city, and adds any extras such as tolls on outstation trips.",
    output: "A fare per ride type.",
    risks: ["If the route is wrong, the fare is wrong."],
  },
  maps: {
    what: "The routing service, built on Ola's own map data (Ola Maps).",
    why: "Fares, ETAs, driver navigation and matching all depend on knowing the real road route and how long it takes.",
    input: "A start point, an end point, and the time of day.",
    inside: "Searches a road network kept in memory for the fastest route, using live and typical traffic speeds.",
    output: "A route, its distance, and the expected travel time.",
    risks: ["Map data can be out of date when roads change.", "If it is slow, every fare check is slow."],
  },
  match: {
    what: "The matching service finds a driver of the ride type you chose.",
    why: "An auto request must go to an auto driver, a Prime request to a Prime car, and an outstation trip to a driver who does intercity trips.",
    input: "Your pickup spot, ride type and, for later bookings, the pickup time.",
    inside: "Finds free drivers of that type nearby, ordered by how quickly they can reach you, and offers them the ride.",
    output: "One confirmed driver.",
    risks: ["No driver of that type is free nearby.", "A driver accepts and then cancels."],
  },
  driver: {
    what: "The driver, using the Ola driver app.",
    why: "Drivers accept rides, navigate to you, start the ride with your OTP and end it.",
    input: "Ride requests and navigation.",
    inside: "Shows offers, navigates using Ola Maps, and sends location every few seconds while online.",
    output: "Accepts, ride start and end, and location updates.",
    risks: ["The phone loses signal.", "The driver cancels after accepting."],
  },
  trips: {
    what: "The ride service tracks each ride from booking to payment.",
    why: "Every ride type goes through steps in order: booked, driver assigned, started, ended, paid. One service makes sure it never jumps or repeats a step.",
    input: "Accepts, OTP checks, start, end and cancel actions.",
    inside: "Checks each change is allowed, saves it, and creates the OTP for starting the ride.",
    output: "The current state of your ride.",
    risks: ["Two actions arrive at once, such as you cancelling as the driver arrives."],
  },
  tripdb: {
    what: "The ride database stores every ride and every change to it.",
    why: "Rides are needed for payment, receipts, support and safety. They must never be lost.",
    input: "New rides and changes.",
    inside: "Saves each change in a transaction.",
    output: "Ride history and receipts.",
    risks: ["If it is slow, starting and ending rides is slow."],
  },
  pay: {
    what: "Payment: UPI, cards, wallets such as Ola Money, or cash.",
    why: "Different riders prefer different ways to pay, and each has to be recorded correctly.",
    input: "The final fare and a unique payment ID.",
    inside: "Online methods ask the bank or wallet provider to move the money; cash is confirmed by the driver.",
    output: "A paid ride, recorded once.",
    risks: ["A payment fails or its result is delayed."],
  },
};

export const ola: TutorialInput = {
  slug: "ola",
  title: "Design a ride-hailing app like Ola",
  summary:
    "How one app can handle bikes, autos, cabs, hourly rentals and intercity trips booked days ahead, using its own maps to price and route every ride.",
  lastVerifiedAt: "2026-10-22",
  patterns: ["idempotency", "retry-with-jitter", "cache-aside", "reservation-and-expiry", "transactional-outbox", "reconciliation", "rate-limiting"],
  sources: [
    {
      id: "ola-app",
      title: "Ola: Book Cab, Auto, Bike Taxi (App Store listing)",
      publisher: "ANI Technologies Pvt. Ltd. (Ola)",
      url: "https://apps.apple.com/in/app/ola-book-cab-auto-bike-taxi/id539179365",
      kind: "official",
      publishedAt: null,
      accessedAt: "2026-10-22",
      note: "Ola's own description of its app. City count is self-reported.",
    },
    {
      id: "ola-zero-commission",
      title: "Ola rolls out zero per cent commission model nationwide, allows drivers to retain full fare earnings",
      publisher: "The Week (PTI)",
      url: "https://www.theweek.in/wire-updates/business/2025/06/17/dcm77-biz-ola-commission.html",
      kind: "press",
      publishedAt: "2025-06-17",
      accessedAt: "2026-10-22",
      note: "Reports Ola's announcement. Pass prices may have changed since.",
    },
    {
      id: "ola-maps",
      title: "Ola Cabs exits Google Maps, transitions to in-house Ola Maps",
      publisher: "Outlook Business",
      url: "https://www.outlookbusiness.com/corporate/ola-cabs-google-maps-ola-maps",
      kind: "press",
      publishedAt: null,
      accessedAt: "2026-10-22",
      note: "Reports the 2024 switch, announced by Ola's founder.",
    },
  ],

  intro: {
    paragraphs: [
      "Ola is one of India's largest ride apps. What makes it interesting for system design is the range of things it offers from one screen: a bike taxi across town, an auto to the market, a cab to the airport, a car for a few hours of errands, or a car for a weekend trip to another city booked days in advance.",
      "Each of those behaves differently. Some need a driver in two minutes; some need a driver on Saturday at 7 AM. Some are priced before you go; some are priced by the time and distance you actually used. The design challenge is to support all of them without building five separate apps.",
      "Ola also moved its app to its own maps, which makes routing, fares and arrival times a core part of the system rather than something bought from someone else.",
      {
        text: "This is a proposed design based on public information. Ola has not published how its systems are built, so the components and most numbers here are our own reasoning, labelled as such.",
        evidence: "inferred",
        sources: [],
      },
    ],
    known: [
      {
        text: "Ola's app offers bike taxis, autos, cabs such as Mini, hourly Rentals and Outstation intercity trips, in more than 200 cities across India.",
        evidence: "public",
        sources: ["ola-app"],
      },
      {
        text: "Ola says every cab ride has a one-time password (OTP) to start, an emergency call option once the ride is confirmed, and that riders can share ride tracking and driver details with up to 5 emergency contacts by SMS. Payment options include cash, UPI, cards and wallets such as Ola Money.",
        evidence: "public",
        sources: ["ola-app"],
      },
      {
        text: "In June 2025, Ola said it had rolled out a zero per cent commission model across India for autos, bikes and cabs, so drivers keep their full fare.",
        evidence: "public",
        sources: ["ola-zero-commission"],
      },
      {
        text: "In 2024, Ola moved its app from Google Maps to its own in-house Ola Maps.",
        evidence: "public",
        sources: ["ola-maps"],
      },
    ],
    story: {
      title: "Imagine you are the rider",
      steps: [
        "It is Thursday night. You are planning a family trip from Bengaluru to Mysuru on Saturday. You open Ola and choose Outstation.",
        "You pick Saturday, 7 AM, and see an upfront fare for the trip. You book it. No driver is assigned yet, and that is fine.",
        "On Saturday at about 6 AM you get a message with your driver's name, car and number plate.",
        "The cab arrives at 6:55. You share your OTP with the driver, they enter it, and the trip starts. You share the ride with your sister so she can follow it.",
        "Your app shows the route on Ola's map and an arrival time that updates as traffic changes.",
        "On Sunday you hire an Ola Rental for four hours to run errands in Mysuru, and pay at the end for the time and distance you used.",
        "In this tutorial we follow your bookings through the system. How does a ride booked two days ahead get a driver at the right time? How does the app know the route and arrival time? And how is a rental priced by what you actually used?",
      ],
    },
  },

  requirements: {
    functional: [
      "You can see fares for several ride types side by side and book any of them.",
      "You can book a ride now, or book an Outstation trip for a later date and time.",
      "Each ride is matched to a driver of the right type.",
      "The ride starts only after the driver enters your OTP.",
      "You can share live ride tracking with up to five emergency contacts.",
      "Rentals are priced from a package plus any extra time and distance you use.",
      "You can pay by UPI, card, wallet or cash.",
    ],
    nonFunctional: [
      { name: "Accurate routes and times", meaning: "Arrival times and fares match reality.", target: "Arrival times update with traffic during the ride." },
      { name: "On-time scheduled rides", meaning: "Rides booked ahead get a driver in good time.", target: "A driver is assigned well before the pickup time, or you are told early." },
      { name: "Correctness", meaning: "Right answers when many things happen at once.", target: "One driver per ride; a ride is never charged twice." },
      { name: "Availability", meaning: "The app keeps working instead of showing errors.", target: "Office rush and festival weekends handled without failures." },
      { name: "Fair billing", meaning: "You pay for what you actually used.", target: "Rental distance is measured correctly even when GPS drops out." },
    ],
    outOfScope: ["Electric vehicle sales", "Driver sign-up and documents", "How base rates are set"],
    terms: [
      { term: "Ride type", meaning: "The kind of vehicle and service: bike, auto, Mini, Prime, Rentals or Outstation." },
      { term: "Scheduled ride", meaning: "A ride booked now for a later date and time." },
      { term: "Routing", meaning: "Finding the best route along real roads between two points, and how long it takes." },
      { term: "ETA", meaning: "Estimated time of arrival." },
      { term: "Road graph", meaning: "The road map stored as junctions connected by road segments, so a computer can search it for routes." },
      { term: "Map matching", meaning: "Snapping noisy GPS points onto the roads the car must have used." },
      { term: "OTP", meaning: "A one-time password shown to you that the driver must enter to start the ride." },
    ],
  },

  capacity: {
    intro:
      "Ola publishes how many cities it serves but not how many rides it handles, so every number below is an assumption, clearly labelled. The interesting result is how much work goes into keeping arrival times up to date.",
    assumptions: [
      { label: "Rides per day", value: RIDES_PER_DAY, unit: "rides", note: "Illustrative; Ola does not publish this" },
      { label: "Busiest hour compared with the average", value: PEAK, unit: "times" },
      { label: "Average ride length", value: TRIP_MIN, unit: "minutes" },
      { label: "How often the arrival time is recalculated during a ride", value: ETA_REFRESH_SEC, unit: "seconds" },
      { label: "Drivers online at the busiest time", value: DRIVERS_ONLINE, unit: "drivers" },
      { label: "How often a driver's phone sends its location", value: UPDATE_SEC, unit: "seconds" },
      { label: "Share of rides booked in advance", value: SCHEDULED_SHARE * 100, unit: "%" },
    ],
    steps: [
      { label: "Average rides starting per second", formula: "rides per day ÷ seconds in a day", working: "1,500,000 ÷ 86,400", result: r(avgRides, 1), unit: "rides/s" },
      { label: "Rides starting per second at the busiest hour", formula: "average × peak multiplier", working: "17.4 × 3", result: r(peakRides, 1), unit: "rides/s" },
      { label: "Rides in progress at the same time", formula: "rides starting per second × ride length in seconds", working: "52.1 × 1,500", result: r(inProgress), unit: "rides" },
      { label: "Arrival-time recalculations per second", formula: "rides in progress ÷ refresh interval", working: "78,125 ÷ 30", result: r(etaPerSec), unit: "routes/s" },
      { label: "Location updates per second", formula: "drivers online ÷ update interval", working: "200,000 ÷ 4", result: r(locPerSec), unit: "updates/s" },
      { label: "Rides booked in advance each day", formula: "rides per day × share booked ahead", working: "1,500,000 × 5%", result: r(scheduled), unit: "rides" },
    ],
    takeaways: [
      "Rides in progress, not new bookings, drive the routing load: tens of thousands of trips each need a fresh arrival time every half minute. The routing service must answer in milliseconds from a road network held in memory.",
      "Location updates are still the biggest stream, as in any ride app.",
      "Tens of thousands of rides a day are booked ahead. They need a scheduler that finds each one at the right moment, without missing any or handling one twice.",
    ],
    calculator: { avgRps: 700, peakMultiplier: 3, rpsPerServer: 500, utilization: 0.6 },
  },

  architecture: {
    intro:
      "Here is a normal city ride from fare to payment. The maps service sits at the centre, because fares, arrival times and navigation all depend on it. Start with the simple view, then the detailed view, and press Send request to follow your ride.",
    workflow: {
      id: "overview",
      title: "One city ride, end to end",
      summary: "Your ride from comparing fares to paying.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "fare", label: "Fare service", kind: "service", col: 2, row: 0, explain: X.fare },
        { id: "maps", label: "Ola Maps routing", kind: "service", col: 3, row: 0, tags: ["cache"], explain: X.maps },
        { id: "match", label: "Matching service", kind: "service", col: 1, row: 1, explain: X.match },
        { id: "driver", label: "Driver", kind: "user", col: 2, row: 1, explain: X.driver },
        { id: "trips", label: "Ride service", kind: "service", col: 3, row: 1, tags: ["retry"], explain: X.trips },
        { id: "tripdb", label: "Ride database", kind: "database", col: 3, row: 2, tags: ["transaction"], explain: X.tripdb },
        { id: "pay", label: "Payment", kind: "external", col: 2, row: 2, explain: X.pay },
        { id: "driver2", label: "Next driver", kind: "user", col: 0, row: 1, failureOnly: true, explain: X.driver },
      ],
      simple: [
        { node: "you", text: "You enter your destination and compare fares for each ride type." },
        { node: "fare", text: "The fare service prices each ride type from the real road route." },
        { node: "match", text: "You choose Mini and tap Book. Matching looks for a Mini driver near you." },
        { node: "driver", text: "A driver accepts and comes to pick you up." },
        { node: "you", text: "You share your OTP, the ride starts, and you watch the route on the map." },
        { node: "pay", text: "At the end you pay." },
      ],
      detailed: [
        { node: "you", text: "You enter your destination. The app asks for fares for every ride type." },
        { node: "api", text: "The request reaches the API gateway." },
        { node: "fare", text: "The fare service needs the road distance and travel time." },
        { node: "maps", text: "Ola Maps routing finds the fastest road route and how long it takes right now." },
        { node: "match", from: "api", text: "You choose Mini and tap Book. Matching looks only for Mini drivers near you." },
        { node: "driver", text: "The best Mini driver accepts." },
        { node: "trips", text: "The ride service creates your ride with an OTP." },
        { node: "tripdb", text: "The ride and every later change are saved." },
        { node: "you", from: "trips", text: "You see the driver, car and OTP, and a live arrival time on Ola's map. The driver enters your OTP and the ride starts." },
        { node: "pay", from: "trips", text: "At the end you pay by UPI, card, wallet or cash, and the ride is marked paid once." },
      ],
      failures: [
        {
          id: "routing-slow",
          title: "The routing service is slow",
          node: "maps",
          what: "Route requests take much longer than usual.",
          userSees: "Fares appear marked as approximate. The final fare uses the distance actually travelled.",
          detect: "Route requests start timing out.",
          steps: [
            { node: "fare", from: "maps", text: "The fare service stops waiting and estimates the distance from the straight line, multiplied by a typical road factor for the city." },
            { node: "you", from: "fare", text: "You see an approximate fare and can still book. You are not left staring at a spinner." },
          ],
        },
        {
          id: "driver-cancels",
          title: "The driver cancels after accepting",
          node: "driver",
          what: "Your driver accepts and then cancels a few minutes later.",
          userSees: "'Finding you another driver', then new details. You do not have to book again.",
          detect: "A cancel from the driver for a ride that is not yet started.",
          steps: [
            { node: "match", from: "driver", text: "The ride goes straight back to matching, keeping your booking." },
            { node: "driver2", from: "match", text: "The next suitable Mini driver gets the offer and accepts." },
            { node: "you", from: "match", text: "You see the new driver and car. Your OTP and fare stay the same." },
          ],
        },
      ],
    },
  },

  workflows: [
    {
      id: "outstation",
      title: "Booking an outstation trip for Saturday",
      summary: "How a ride booked two days ahead gets a driver at the right time.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "booking", label: "Booking service", kind: "service", col: 2, row: 0, tags: ["retry"], explain: {
          what: "The booking service accepts rides booked for later.",
          why: "A ride for Saturday cannot be matched now; drivers' plans change. It must be stored safely until the right moment.",
          input: "Your pickup, destination, date and time, and ride type.",
          inside: "Checks the time is allowed, works out an upfront fare, and saves the booking with a unique ID.",
          output: "A confirmed booking with no driver yet.",
          risks: ["Booking the same trip twice by tapping again."],
        } },
        { id: "sched", label: "Scheduled rides", kind: "database", col: 3, row: 0, tags: ["transaction"], explain: {
          what: "The database of rides booked for later, ordered by pickup time.",
          why: "This is the official list of future rides. Nothing about them lives only in a program's memory.",
          input: "New bookings and their status changes.",
          inside: "Keeps each booking with its pickup time and status: waiting, finding driver, assigned or cancelled.",
          output: "Rides that are due soon.",
          risks: ["If a ride's status is not updated, it might be assigned twice or not at all."],
        } },
        { id: "timer", label: "Scheduler", kind: "service", col: 3, row: 1, explain: {
          what: "A background job that wakes up regularly and finds rides whose pickup time is getting close.",
          why: "Someone has to start looking for your driver at the right moment, not too early and not too late.",
          input: "The scheduled rides list.",
          inside: "Every minute, finds rides due in the next hour or so that have no driver, and hands each one to matching exactly once.",
          output: "Rides sent for matching.",
          risks: ["If it stops, rides are not started; if two copies run, a ride could be handled twice."],
        } },
        { id: "match", label: "Matching service", kind: "service", col: 2, row: 1, explain: X.match },
        { id: "driver", label: "Driver", kind: "user", col: 1, row: 1, explain: X.driver },
        { id: "notify", label: "Notifications", kind: "service", col: 0, row: 1, explain: {
          what: "Sends you app notifications and SMS messages.",
          why: "You need to know who is coming, especially for an early-morning ride booked days ago.",
          input: "Messages from other services.",
          inside: "Sends each message, and retries if the provider is slow.",
          output: "A notification and SMS on your phone.",
          risks: ["SMS can arrive late during busy times."],
        } },
      ],
      simple: [
        { node: "you", text: "On Thursday you book an outstation cab for Saturday at 7 AM." },
        { node: "booking", text: "The booking is saved with an upfront fare. No driver yet." },
        { node: "timer", text: "On Saturday, about an hour before pickup, the scheduler starts finding a driver." },
        { node: "driver", text: "A driver who does outstation trips accepts." },
        { node: "you", from: "driver", text: "You get the driver's details before the pickup." },
      ],
      detailed: [
        { node: "you", text: "On Thursday night you choose Outstation, Saturday 7 AM, Bengaluru to Mysuru, and tap Book." },
        { node: "api", text: "The request reaches the API gateway with a unique booking ID, so tapping twice cannot book twice." },
        { node: "booking", text: "The booking service checks the date, works out an upfront fare, and confirms the booking." },
        { node: "sched", text: "Your ride is saved in the scheduled rides list with status 'waiting' and no driver." },
        { node: "timer", text: "On Saturday at about 6 AM, the scheduler finds your ride is due soon. It changes its status to 'finding driver' in one step, so no other copy of the scheduler can pick it up too." },
        { node: "match", text: "Matching looks for drivers near you who do outstation trips and are free for the whole trip." },
        { node: "driver", text: "A driver accepts the trip." },
        { node: "notify", from: "match", text: "You get a notification and SMS with the driver's name, car and number plate." },
        { node: "you", from: "notify", text: "You know who is coming well before 7 AM." },
      ],
      failures: [
        {
          id: "no-outstation-driver",
          title: "No driver accepts in time",
          node: "match",
          what: "An hour before pickup, no suitable driver has accepted.",
          userSees: "If it gets close to pickup time, you are told early so you can choose another option. You are never left waiting at the door with no driver.",
          detect: "The ride is still 'finding driver' as the pickup time gets close.",
          steps: [
            { node: "timer", from: "match", text: "The scheduler tries again every few minutes, looking in a wider area each time." },
            { node: "notify", from: "timer", text: "If there is still no driver some time before pickup, a message is sent to you straight away." },
            { node: "you", from: "notify", text: "You hear early, with time to choose another ride type or rebook." },
          ],
        },
        {
          id: "scheduler-restarts",
          title: "The scheduler restarts in the middle of the night",
          node: "timer",
          what: "The machine running the scheduler restarts.",
          userSees: "Nothing. Your ride is still handled on time.",
          detect: "The scheduler stops reporting it is alive; a new copy starts.",
          steps: [
            { node: "sched", from: "timer", text: "When it starts again, it reads the due rides from the database. Nothing was kept only in memory, so nothing is lost." },
            { node: "timer", from: "sched", text: "Rides already marked 'finding driver' are not picked up again, because each ride can change from 'waiting' only once." },
            { node: "match", from: "timer", text: "Matching carries on for your ride as normal." },
          ],
        },
      ],
    },
    {
      id: "maps",
      title: "Routes and arrival times from Ola's own maps",
      summary: "How road data, live traffic and a fast routing service give you a route and an arrival time.",
      nodes: [
        { id: "roads", label: "Road map data", kind: "database", col: 0, row: 0, explain: {
          what: "The map: every road, which way it goes, how fast traffic usually moves, and where turns are allowed.",
          why: "Routes can only be as good as the map underneath them.",
          input: "Survey data, satellite imagery, and corrections over time.",
          inside: "Stores roads and their properties, and keeps a history of changes.",
          output: "The latest road map, ready to process.",
          risks: ["A new flyover or a closed road is missing until the map is updated."],
        } },
        { id: "graph", label: "Road graph builder", kind: "service", col: 1, row: 0, explain: {
          what: "A job that turns the road map into a road graph: junctions connected by road segments.",
          why: "Searching a raw map for the best route is too slow. A prepared graph can be searched in milliseconds.",
          input: "The road map data.",
          inside: "Builds the graph and precomputes shortcuts so long routes can be found quickly.",
          output: "A ready-to-load road graph, built regularly.",
          risks: ["A bad build could produce wrong routes, so each build is checked before use."],
        } },
        { id: "router", label: "Routing service", kind: "service", col: 2, row: 0, tags: ["cache"], explain: X.maps },
        { id: "you", label: "You", kind: "user", col: 3, row: 0, explain: X.you },
        { id: "gps", label: "Drivers' GPS", kind: "user", col: 0, row: 1, explain: {
          what: "The location updates every online driver's phone sends every few seconds.",
          why: "Cars moving through the city show which roads are slow right now.",
          input: "Driver positions and times.",
          inside: "Each driver's phone reports where it is.",
          output: "A stream of positions and speeds.",
          risks: ["Some GPS points are wrong, so single points cannot be trusted alone."],
        } },
        { id: "traffic", label: "Live traffic", kind: "service", col: 1, row: 1, explain: {
          what: "A service that turns drivers' movement into current speeds on each road segment.",
          why: "The same route can take 20 minutes at 6 AM and an hour at 6 PM.",
          input: "Positions and speeds from many drivers.",
          inside: "Matches positions to road segments and averages speeds over the last few minutes.",
          output: "A current speed for each busy road segment.",
          risks: ["Roads with few drivers have little live data, so typical speeds are used there."],
        } },
      ],
      simple: [
        { node: "roads", text: "The map starts as road data: every road, its direction and its usual speed." },
        { node: "router", text: "The routing service loads the road network into memory." },
        { node: "you", text: "When you book, it finds your route and how long it will take." },
      ],
      detailed: [
        { node: "roads", text: "The map starts as road data: every road, its direction, its usual speed and allowed turns." },
        { node: "graph", text: "The road graph builder turns it into a network of junctions and road segments, with shortcuts precomputed so long routes are found quickly." },
        { node: "router", text: "The routing service loads this network into memory, so a route takes milliseconds to find." },
        { node: "traffic", from: "gps", async: true, text: "Drivers' phones report where they are every few seconds. Live traffic turns that into current speeds on each road." },
        { node: "router", async: true, text: "Current speeds are fed into the routing service, so travel times reflect traffic now." },
        { node: "router", from: "you", text: "You ask for a ride from your home to the bus stand." },
        { node: "you", from: "router", text: "You see the route on Ola's map and an arrival time based on today's traffic." },
      ],
      failures: [
        {
          id: "closed-road",
          title: "A road is closed but the map does not know",
          node: "router",
          what: "A road is closed for repairs, but the map still shows it open.",
          userSees: "At first the route may use it. Within minutes, routes avoid it and arrival times get more accurate.",
          detect: "Drivers on that road slow to a stop or turn back at the same place.",
          steps: [
            { node: "traffic", from: "gps", text: "Live traffic sees cars stopping or turning around at the same spot and marks that segment as extremely slow." },
            { node: "router", from: "traffic", text: "Routes now avoid the segment because it looks too slow to use." },
            { node: "you", from: "router", text: "Your route goes around it. The map itself is corrected later." },
          ],
        },
        {
          id: "traffic-stale",
          title: "Live traffic stops updating",
          node: "traffic",
          what: "The live traffic service falls behind or stops.",
          userSees: "Routes still work; arrival times are a little less accurate.",
          detect: "The age of the newest traffic data grows past a few minutes.",
          steps: [
            { node: "router", from: "traffic", text: "The routing service notices the data is too old and switches to typical speeds for this time of day." },
            { node: "you", from: "router", text: "You still get a route and a reasonable arrival time." },
          ],
        },
      ],
    },
    {
      id: "rental",
      title: "Rentals: paying for the time and distance you used",
      summary: "How a four-hour rental is measured and priced fairly at the end.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "driver", label: "Driver", kind: "user", col: 1, row: 0, explain: X.driver },
        { id: "trips", label: "Ride service", kind: "service", col: 2, row: 0, explain: X.trips },
        { id: "fare", label: "Fare service", kind: "service", col: 3, row: 0, explain: X.fare },
        { id: "meter", label: "Trip meter", kind: "service", col: 1, row: 1, explain: {
          what: "The trip meter adds up how far the rental has actually gone.",
          why: "A rental is priced by the package plus any extra distance and time, so the distance must be measured fairly.",
          input: "Location points from the driver's phone.",
          inside: "Snaps each point to the road it must be on (map matching), and adds up the distance along those roads.",
          output: "The distance travelled so far, and the cleaned route.",
          risks: ["GPS drops out in underpasses and basements."],
        } },
        { id: "route", label: "Recorded route", kind: "database", col: 2, row: 1, explain: {
          what: "The cleaned route and distance for each rental.",
          why: "The final fare and your receipt are based on it, and support uses it if you question a charge.",
          input: "Route pieces from the trip meter.",
          inside: "Stores the route and total distance for the trip.",
          output: "The distance used for billing, and a map for your receipt.",
          risks: ["If parts are missing, the distance could be wrong."],
        } },
        { id: "pay", label: "Payment", kind: "external", col: 3, row: 1, explain: X.pay },
      ],
      simple: [
        { node: "you", text: "You hire a car for 4 hours and 40 km." },
        { node: "trips", text: "The rental starts and the system measures the time and distance." },
        { node: "fare", text: "At the end, the price is the package plus any extra." },
        { node: "pay", text: "You pay and get a receipt with the route." },
      ],
      detailed: [
        { node: "you", text: "You choose Rentals, a 4-hour, 40 km package, and the car arrives." },
        { node: "driver", text: "You share your OTP and the driver enters it." },
        { node: "trips", text: "The ride service starts the rental and records the start time and package." },
        { node: "meter", from: "driver", async: true, text: "Throughout, the driver's phone sends its location. The trip meter snaps points to roads and adds up the distance." },
        { node: "route", async: true, text: "The cleaned route and running distance are saved." },
        { node: "trips", from: "driver", text: "After four and a half hours, the driver ends the rental." },
        { node: "fare", text: "The fare is worked out: the package price, plus extra kilometres beyond 40, plus extra minutes beyond 4 hours." },
        { node: "route", from: "fare", text: "The distance comes from the recorded route, not from a guess." },
        { node: "pay", from: "fare", text: "You pay the final amount." },
        { node: "you", from: "trips", text: "You get a receipt showing the route, the distance, the time and every charge." },
      ],
      failures: [
        {
          id: "gps-gap",
          title: "GPS drops out in an underpass",
          node: "meter",
          what: "For two kilometres the driver's phone sends no usable location.",
          userSees: "A fair distance on the receipt, with no jump or missing stretch.",
          detect: "A gap in location points longer than a few seconds.",
          steps: [
            { node: "meter", from: "driver", text: "The trip meter sees the gap between the last point before and the first point after." },
            { node: "route", from: "meter", text: "It fills the gap with the most likely road route between the two points, not a straight line, so you are neither over- nor under-charged." },
            { node: "fare", from: "route", text: "The fare uses the completed distance." },
          ],
        },
        {
          id: "rental-payment",
          title: "The payment at the end fails",
          node: "pay",
          what: "Your UPI or card payment for the rental does not go through.",
          userSees: "The rental is complete and shown as 'payment pending'. You pay another way, once.",
          detect: "The payment provider returns a failure.",
          steps: [
            { node: "trips", from: "pay", text: "The ride is saved as 'payment pending', with the full fare breakdown kept." },
            { node: "you", from: "trips", text: "You choose another method, such as cash or wallet. The ride is marked paid once." },
          ],
        },
      ],
    },
  ],

  database: {
    intro:
      "One set of tables serves every ride type. The ride type and booking time decide which rules apply, so adding a new ride type means adding rules, not a new system.",
    entities: [
      { name: "Ride", purpose: "One ride of any type.", fields: [
        { name: "ride_id", type: "id", note: "primary key" }, { name: "ride_type", type: "bike, auto, mini, prime, rental or outstation" }, { name: "request_id", type: "text", note: "unique, stops double bookings" }, { name: "pickup_at", type: "date and time", note: "now, or later for scheduled rides" }, { name: "state", type: "waiting, finding driver, assigned, started, ended, paid or cancelled" }, { name: "otp", type: "4 digits" },
      ], relations: ["Belongs to a Rider; gets one Driver", "Has a Fare breakdown and a Payment"] },
      { name: "Driver", purpose: "A driver and what they can drive.", fields: [
        { name: "driver_id", type: "id", note: "primary key" }, { name: "ride_types", type: "list", note: "for example mini and outstation" }, { name: "pass_valid_until", type: "date and time", note: "subscription instead of commission" },
      ], relations: ["Has many Rides"] },
      { name: "Ride type rules", purpose: "How each ride type in each city is priced and matched.", fields: [
        { name: "city, ride_type", type: "text", note: "together, the key" }, { name: "base_rate, per_km, per_min", type: "money" }, { name: "package_km, package_hours", type: "numbers", note: "rentals only" },
      ], relations: ["Used by the fare and matching services"] },
      { name: "Route record", purpose: "The cleaned route and distance of a ride.", fields: [
        { name: "ride_id", type: "id" }, { name: "distance_km", type: "number" }, { name: "path", type: "list of points" },
      ], relations: ["Belongs to a Ride"] },
      { name: "Fare breakdown", purpose: "Every part of the final price.", fields: [
        { name: "ride_id", type: "id" }, { name: "package or base", type: "money" }, { name: "extra_km, extra_min, tolls", type: "money" },
      ], relations: ["Belongs to a Ride"] },
      { name: "Payment", purpose: "How the ride was paid.", fields: [
        { name: "payment_id", type: "id", note: "unique, sent to the provider" }, { name: "ride_id", type: "id", note: "one completed payment per ride" }, { name: "method", type: "UPI, card, wallet or cash" }, { name: "status", type: "pending, paid or failed" },
      ], relations: ["Belongs to a Ride"] },
    ],
    why: [
      "A single Ride table with a ride_type and pickup_at handles instant, scheduled, rental and outstation rides alike. The differences live in rules, not in separate systems.",
      "Scheduled rides are found by an index on pickup time and state, so the scheduler can quickly ask 'which rides are due in the next hour with no driver?'.",
      "The fare breakdown is stored, not recalculated later, so your receipt always matches what you were charged.",
    ],
  },

  decisions: [
    {
      id: "one-system",
      title: "One booking system for every ride type",
      problem: "Bikes, autos, cabs, rentals and outstation trips differ in pricing, matching and timing. Building a separate system for each would mean five times the work and five times the bugs.",
      solution: "Use one ride model and one set of services, and put the differences in rules per ride type and city.",
      how: "The fare service reads the rules for your ride type and city. Matching only offers rides to drivers whose vehicle and settings fit the ride type. The ride service uses the same steps for all types.",
      where: "Ride type rules table, fare service and matching.",
      tradeoff: "Rules can become complicated. In return, a new ride type is a new set of rules, not a new system.",
    },
    {
      id: "scheduled",
      title: "Store rides booked for later, and match them shortly before pickup",
      problem: "If we matched a Saturday trip on Thursday, the driver's plans might change. If we only started looking at 7 AM, you would be left waiting.",
      solution: "Save the booking with its pickup time and no driver, and let a scheduler start matching about an hour before.",
      how: "The scheduler wakes up every minute and finds due rides. It changes each ride from 'waiting' to 'finding driver' in one step, so even if two copies of the scheduler run, each ride is handled once.",
      where: "Booking service, scheduled rides database, scheduler and matching.",
      tradeoff: "You do not know your driver until shortly before the trip. Telling you early when no driver is found keeps that from becoming a surprise.",
    },
    {
      id: "own-maps",
      title: "Route on a road graph held in memory",
      problem: "Every fare check, every arrival time and every driver's navigation needs a route. Tens of thousands of ongoing rides need fresh arrival times every half minute.",
      solution: "Build a road graph from the map regularly, load it into memory in the routing service, and feed in live traffic speeds. Ola has moved its app to its own maps, which makes this its own system to run.",
      how: "The graph builder prepares junctions, road segments and shortcuts. Live traffic adds current speeds. A route search then takes milliseconds.",
      where: "Road graph builder, routing service and live traffic.",
      tradeoff: "Running your own maps means keeping the map data up to date yourself. In return, routing is under your control and is not a cost paid per request to another company.",
    },
    {
      id: "map-matching",
      title: "Measure rental distance along roads, not from raw GPS",
      problem: "Raw GPS jumps around and drops out. Adding up straight lines between noisy points over- or under-charges you.",
      solution: "Snap each point to the road the car must have been on, and fill gaps with the most likely road route.",
      how: "The trip meter matches points to roads as they arrive, adds up road distance, and stores the cleaned route for billing and receipts.",
      where: "Trip meter and recorded route.",
      tradeoff: "More work per point, and some judgement when gaps are long. In return the bill is fair and explainable.",
    },
    {
      id: "subscription",
      title: "Use a driver subscription instead of a commission",
      problem: "Drivers want to keep more of each fare, and taking a percentage of every ride means tracking each fare in detail.",
      solution: "Drivers pay for a pass and keep their full fare. Ola said in 2025 it had moved to a zero per cent commission model for autos, bikes and cabs.",
      how: "Matching only offers rides to drivers with an active pass. Fares still go through the fare service, so riders always see a clear price.",
      where: "Matching and driver records.",
      tradeoff: "Revenue comes from passes rather than rides, and the platform must still record every payment for receipts and support.",
    },
    {
      id: "otp-contacts",
      title: "Start every ride with an OTP, and let riders share it with contacts",
      problem: "You must get into the right car, and someone you trust should be able to see where you are.",
      solution: "Ola says every cab ride starts with a one-time password and riders can share live tracking with up to five emergency contacts by SMS.",
      how: "The OTP is created with the ride and checked before it can start. Sharing creates a link that only works for this ride and stops when it ends.",
      where: "Ride service, notifications and the rider app.",
      tradeoff: "A few extra seconds at pickup, and SMS costs. In return, safety is built into every ride.",
    },
    {
      id: "many-payments",
      title: "Support many payment methods behind one payment step",
      problem: "Riders pay with UPI, cards, several wallets or cash. Each works differently and can fail in its own way.",
      solution: "Put every method behind one payment step that records each ride's payment once, with a unique payment ID.",
      how: "Online methods are called with the payment ID so retries are safe. Cash is confirmed by the driver. The ride is marked paid exactly once whatever the method.",
      where: "Payment step after the fare is final.",
      tradeoff: "Each payment provider needs its own connector and testing. A single record per ride keeps them consistent.",
    },
  ],

  failures: [
    {
      title: "No driver for a scheduled trip",
      what: "No suitable driver accepts an outstation trip as pickup time approaches.",
      userSees: "An early message so you can choose another option, instead of waiting at the door.",
      detect: "The ride is still 'finding driver' close to pickup time.",
      recover: "Retry with a wider search; notify you early.",
      prevent: "Start matching earlier for long trips, and track how often scheduled rides are left without drivers.",
    },
    {
      title: "The same scheduled ride is picked up twice",
      what: "Two copies of the scheduler run at once after a restart.",
      userSees: "Nothing; only one driver is assigned.",
      detect: "A status change from 'waiting' that finds the ride is no longer waiting.",
      recover: "The second copy skips the ride.",
      prevent: "Change status from 'waiting' only once, in one step. Test by running two schedulers together.",
    },
    {
      title: "Wrong routes after a road change",
      what: "A road closes or a new one opens and the map is out of date.",
      userSees: "Slightly wrong routes for a while.",
      detect: "Drivers repeatedly avoid or get stuck on the same segment.",
      recover: "Live traffic marks the segment slow, so routes avoid it.",
      prevent: "Rebuild the road graph regularly and accept corrections from drivers.",
    },
    {
      title: "GPS gaps in a rental",
      what: "The driver's phone loses location for a stretch.",
      userSees: "A fair distance on the bill.",
      detect: "Gaps between location points.",
      recover: "Fill the gap with the most likely road route.",
      prevent: "Map-match every point and keep the cleaned route for receipts and disputes.",
    },
    {
      title: "Driver cancels after accepting",
      what: "The driver accepts, then cancels.",
      userSees: "'Finding you another driver', with your booking kept.",
      detect: "A driver cancel on a ride that has not started.",
      recover: "Return the ride to matching automatically.",
      prevent: "Track cancel rates per driver and area.",
    },
    {
      title: "A payment fails at the end",
      what: "The UPI, card or wallet payment does not go through.",
      userSees: "The ride shows 'payment pending'; you pay another way, once.",
      detect: "The provider reports failure or does not answer in time.",
      recover: "Keep the fare breakdown; accept another method; mark paid once.",
      prevent: "One payment record per ride and a unique ID on every attempt.",
    },
  ],

  recap: {
    decisions: [
      { decision: "One system, rules per ride type", why: "New ride types without new systems.", cost: "Rules can get complicated." },
      { decision: "Scheduled rides matched shortly before pickup", why: "Drivers assigned when plans are firm.", cost: "You learn your driver later." },
      { decision: "In-memory road graph with live traffic", why: "Routes and arrival times in milliseconds.", cost: "Owning the map means keeping it current." },
      { decision: "Road-matched distance for rentals", why: "Fair, explainable bills.", cost: "More processing per point." },
      { decision: "Driver subscription", why: "Drivers keep their full fare.", cost: "Payments still need recording." },
      { decision: "OTP and shared tracking", why: "Safety on every ride.", cost: "A little friction at pickup." },
    ],
    questions: [
      { q: "How do you handle rides booked for days ahead?", a: "Save the booking with its pickup time and no driver. A scheduler regularly finds rides due within the next hour and hands each to matching after changing its status in one step, so no ride is missed or handled twice. If no driver is found in time, the rider is told early." },
      { q: "Why keep the road graph in memory?", a: "Fares, arrival times and navigation need routes constantly, including fresh arrival times for every ride in progress. A precomputed graph in memory answers in milliseconds; reading map data from disk for each request would be far too slow." },
      { q: "How do you price a rental fairly when GPS is unreliable?", a: "Snap GPS points to roads, fill gaps with the most likely road route, and add up road distance. Store the cleaned route so the receipt and any dispute use the same numbers." },
      { q: "How can one app support bikes, autos, cabs, rentals and outstation?", a: "One ride model with a ride type and a pickup time, and per-type, per-city rules for pricing and matching. The ride steps are the same; only the rules change." },
      { q: "How is Ola's design different from Rapido's?", a: "Rapido focuses on very fast short bike rides. Ola covers many ride types, including scheduled intercity trips and hourly rentals, and runs its own maps, so scheduling, routing and usage-based billing matter much more." },
    ],
  },
};
