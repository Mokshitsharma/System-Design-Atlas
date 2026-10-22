import type { TutorialInput } from "@/lib/schema";

/*
 * Ticketmaster: a beginner tutorial on designing a ticket booking system for very popular events.
 * Everything not marked "public" is a proposed design, not a description of Ticketmaster's private systems.
 */

// Illustrative inputs for the capacity section. None of these are Ticketmaster figures.
const FANS = 2_000_000;
const SEATS = 400_000;
const PER_ORDER = 3;
const SELL_HOURS = 2;
const CONVERSION = 0.5;
const SESSION_MIN = 10;
const REQ_PER_SESSION = 60;
const POLL_SEC = 15;
const ORDER_KB = 2;

const orders = SEATS / PER_ORDER;
const ordersPerSec = orders / (SELL_HOURS * 3600);
const admitPerSec = ordersPerSec / CONVERSION;
const shoppers = admitPerSec * SESSION_MIN * 60;
const shopperRps = (shoppers * REQ_PER_SESSION) / (SESSION_MIN * 60);
const pollRps = FANS / POLL_SEC;
const storageMb = (orders * ORDER_KB) / 1000;

const r = (n: number, d = 0) => Number(n.toFixed(d));

// Explanations reused by every workflow that includes the same component.
const X = {
  fan: {
    what: "The fan's phone or browser.",
    why: "This is where every request starts and where the fan sees the result.",
    input: "Taps and clicks.",
    inside: "The app shows pages, keeps the fan's place-in-line pass, and sends requests to our servers.",
    output: "Requests over the internet.",
    risks: ["The fan refreshes over and over and creates extra load.", "The connection drops in the middle of a request."],
  },
  cdn: {
    what: "A CDN (content delivery network): copies of our pages stored on servers close to fans around the world.",
    why: "Millions of fans load the same event page. Serving copies nearby is fast and keeps that load off our own servers.",
    input: "Page requests from fans.",
    inside: "If it has a fresh copy of the page, it returns it immediately. If not, it asks our servers once and keeps the answer.",
    output: "The event page and the waiting-room page.",
    risks: ["A setting mistake could send every request through to our servers."],
  },
  waiting: {
    what: "The waiting room: an online queue in front of the ticket shop.",
    why: "The shop can only serve a limited number of fans at a time. Without a line, everyone arrives at once and the site slows down or crashes for everyone.",
    input: "Fans who want to enter the shop.",
    inside: "Gives each fan a place in line, then lets a fixed number of fans in every second.",
    output: "A short-lived pass that lets one fan into the shop.",
    risks: ["If it lets people in too fast, the shop overloads anyway.", "If it loses its list, fans lose their place."],
  },
  api: {
    what: "The API gateway: the front door for every request that reaches our servers.",
    why: "Checks that need to happen on every request (is this fan signed in, do they have a pass, are they sending too many requests) are done once, in one place.",
    input: "Requests from fans who have a pass.",
    inside: "Checks the sign-in and the pass, applies rate limits, then forwards the request to the right service.",
    output: "Checked requests sent to the seat or booking service.",
    risks: ["If it is down, nothing works.", "If rate limits are too strict, real fans get blocked."],
  },
  seatsvc: {
    what: "The seat service: the part of the system that decides which seats are free, held or sold.",
    why: "Only one place may decide who gets a seat. If two places decided, they could give the same seat to two fans.",
    input: "Requests to hold, release or confirm seats.",
    inside: "Checks the fan's ticket limit, then asks the seat database to change the seats in one transaction.",
    output: "A hold with an expiry time, or a message that the seats were just taken.",
    risks: ["Thousands of fans want the same few seats, so updates queue up behind each other."],
  },
  seatdb: {
    what: "The seat database: the official record of every seat and its state.",
    why: "We need one source of truth that never loses a sale and never sells a seat twice.",
    input: "Requests to change a seat's state.",
    inside: "Runs each change as a transaction: either all the seats in a hold change, or none do.",
    output: "Saved seat states.",
    risks: ["It can slow down when one popular show gets most of the traffic.", "If it fails over to a backup during a sale, requests fail for a few seconds."],
  },
  booking: {
    what: "The booking service: turns a hold into a paid order.",
    why: "Payment is slow and can fail in confusing ways, so it gets its own service that handles those cases carefully.",
    input: "The hold, the fan's payment details and an idempotency key.",
    inside: "Checks the hold, asks the payment provider to charge the card, and saves the order.",
    output: "A confirmed order, a declined payment, or 'still checking'.",
    risks: ["The payment provider does not answer.", "The fan taps Pay twice."],
  },
  payments: {
    what: "The payment provider: an outside company that charges cards.",
    why: "Card payments need banks and card networks. We use a provider instead of building that ourselves.",
    input: "A charge request with an amount, a card token and an idempotency key.",
    inside: "Talks to the bank and approves or declines the charge.",
    output: "Approved, declined, or no answer at all.",
    risks: ["It can be slow or not answer, and then we do not know whether the card was charged."],
  },
  bookingdb: {
    what: "The booking database: stores orders and payment attempts.",
    why: "An order is proof that the fan paid. It must never be lost.",
    input: "New orders and status changes.",
    inside: "Saves the order and a 'tickets ready' event together in one transaction.",
    output: "Saved orders, and events for the queue.",
    risks: ["A failover can make a just-saved order briefly invisible on a backup copy."],
  },
  queue: {
    what: "A message queue: a list of jobs waiting to be done later.",
    why: "Sending emails and tickets is slow. Putting the job in a queue lets the fan see 'confirmed' right away instead of waiting.",
    input: "'Order confirmed' events.",
    inside: "Holds each job until a worker takes it. If the worker fails, the job stays and is tried again.",
    output: "Jobs handed to the ticket delivery worker.",
    risks: ["Jobs pile up if workers are slow.", "A job can be delivered twice, so workers must handle repeats."],
  },
  notify: {
    what: "Ticket delivery: sends confirmation emails and puts tickets in the fan's account.",
    why: "Fans need their tickets, but it does not have to happen in the same second they pay.",
    input: "Jobs from the queue.",
    inside: "Creates the tickets, sends the email, and marks the job done.",
    output: "Emails and tickets in the app.",
    risks: ["The email provider is slow or down.", "A repeated job sends a second email unless it checks first."],
  },
};

export const ticketmaster: TutorialInput = {
  slug: "ticketmaster",
  title: "Design a ticket booking system like Ticketmaster",
  summary:
    "How to sell a few hundred thousand concert seats to millions of fans who all arrive at the same minute, without selling any seat twice and without the site falling over.",
  lastVerifiedAt: "2026-10-22",
  patterns: ["waiting-room", "reservation-and-expiry", "idempotency", "cache-aside", "transactional-outbox", "reconciliation", "rate-limiting", "retry-with-jitter"],
  sources: [
    {
      id: "tm-eras-2022",
      title: "Taylor Swift | The Eras Tour Onsale Explained",
      publisher: "Ticketmaster",
      url: "https://business.ticketmaster.com/press-release/taylor-swift-the-eras-tour-onsale-explained/",
      kind: "official",
      publishedAt: "2022-11-19",
      accessedAt: "2026-10-22",
      note: "Company statement. The figures are Ticketmaster's own and have not been independently audited.",
    },
    {
      id: "senate-2023",
      title: "That's the Ticket: Promoting Competition and Protecting Consumers in Live Entertainment (S. Hrg. 118-31)",
      publisher: "U.S. Government Publishing Office",
      url: "https://www.govinfo.gov/content/pkg/CHRG-118shrg52250/html/CHRG-118shrg52250.htm",
      kind: "government",
      publishedAt: null,
      accessedAt: "2026-10-22",
      note: "Senate hearing held on 24 January 2023, including testimony from Live Nation's president.",
    },
    {
      id: "tm-smart-queue",
      title: "Ticketmaster's Guide to Smart Queue",
      publisher: "Ticketmaster Australia",
      url: "https://discover.ticketmaster.com.au/guide-to/ticketmasters-guide-to-smart-queue-15286",
      kind: "official",
      publishedAt: "2024-10-28",
      accessedAt: "2026-10-22",
      note: "A guide for fans. It describes what fans see, not how the system is built.",
    },
    {
      id: "stripe-idempotency",
      title: "Idempotent requests",
      publisher: "Stripe API Reference",
      url: "https://docs.stripe.com/api/idempotent_requests",
      kind: "documentation",
      publishedAt: null,
      accessedAt: "2026-10-22",
      note: "An example of idempotency keys in a public payment API. Not a claim about which provider Ticketmaster uses.",
    },
  ],

  intro: {
    paragraphs: [
      "Ticketmaster sells tickets for concerts, sports and shows. Most of the time this is an ordinary online shop. The hard part comes when a very popular event goes on sale: a large crowd of fans tries to buy at exactly the same moment, and there are far fewer seats than people.",
      "In this tutorial we design a ticket booking system that can handle that moment. We will keep two promises: the site stays usable while the crowd arrives, and no seat is ever sold to two people.",
      {
        text: "Everything below is a proposed design based on public information. Ticketmaster has not published how its systems are built, so the components and numbers here are our own reasoning, labelled as such.",
        evidence: "inferred",
        sources: [],
      },
    ],
    known: [
      {
        text: "For the Taylor Swift Eras Tour presale in November 2022, Ticketmaster reported 3.5 billion total system requests, four times its previous peak, and over 3.5 million fans registered in advance.",
        evidence: "public",
        sources: ["tm-eras-2022"],
      },
      {
        text: "Ticketmaster said about 15 percent of interactions had problems that day, including errors checking presale codes that made some fans lose tickets in their carts, and that it slowed down some sales to stabilise its systems.",
        evidence: "public",
        sources: ["tm-eras-2022"],
      },
      {
        text: "In a 2023 Senate hearing, Live Nation's president said the sale was hit with three times more bot traffic than ever before.",
        evidence: "public",
        sources: ["senate-2023"],
      },
      {
        text: "Fans join a waiting room before the sale starts. The time a fan joins does not decide their place in line, and when it is a fan's turn their spot is held for 10 minutes to start shopping.",
        evidence: "public",
        sources: ["tm-smart-queue"],
      },
    ],
    story: {
      title: "Imagine you are the fan",
      steps: [
        "Your favourite singer announces a tour. Tickets for your city go on sale on Friday at 10:00 AM.",
        "At 9:40 AM you open the ticket site. Instead of the shop, you see a waiting room page with a progress bar.",
        "At 10:00 the sale starts and you are given a place in line. Thousands of people are ahead of you.",
        "At 10:12 it is your turn. You pick two seats in block 112 and tap Hold. A 10-minute timer starts.",
        "You enter your card details and tap Pay. A few seconds later you see 'Order confirmed', and the tickets arrive by email shortly after.",
        "In this tutorial we follow your clicks through the system and design each part, so that the site stays up while everyone waits and nobody else gets your two seats.",
      ],
    },
  },

  requirements: {
    functional: [
      "Fans can join a waiting room before a sale and are let in when it is their turn.",
      "Fans can see a seat map and choose seats.",
      "Fans can hold seats for a few minutes while they pay.",
      "Fans can pay and receive tickets.",
      "Seats that are held but not paid for go back on sale automatically.",
    ],
    nonFunctional: [
      { name: "Correctness", meaning: "The system gives the right answer, even when many things happen at once.", target: "A seat is never sold twice." },
      { name: "Availability", meaning: "The site keeps working instead of showing errors.", target: "The waiting room stays up even when the shop behind it is struggling." },
      { name: "Low latency", meaning: "Responses come back quickly.", target: "Holding a seat takes under half a second for fans who are in the shop." },
      { name: "Scalability", meaning: "The system can handle more users by adding more servers.", target: "Handles a crowd many times larger than normal traffic." },
      { name: "Fairness", meaning: "Fans are served in the order the rules say, and bots do not jump ahead.", target: "Each account gets one place in line and a ticket limit." },
    ],
    outOfScope: ["Reselling or transferring tickets", "Choosing ticket prices", "Scanning tickets at the venue door"],
    terms: [
      { term: "Request", meaning: "One message from the fan's app to our servers, such as 'show me the seat map' or 'hold these seats'." },
      { term: "Requests per second (RPS)", meaning: "How many requests arrive every second. It is the main way we measure load." },
      { term: "Hold", meaning: "A temporary claim on seats. Nobody else can take them until the hold expires or the fan pays." },
      { term: "Transaction", meaning: "A group of database changes that either all happen or none happen." },
    ],
  },

  capacity: {
    intro:
      "Before choosing servers and databases, we estimate how much work the system has to do. These numbers are illustrative assumptions for one large sale, not Ticketmaster data. The point is to learn the method: start from people, turn them into requests per second, then decide what that means for the design.",
    assumptions: [
      { label: "Fans waiting when the sale opens", value: FANS, unit: "fans" },
      { label: "Seats on sale", value: SEATS, unit: "seats", note: "For example, 8 stadium shows of 50,000 seats" },
      { label: "Tickets per order", value: PER_ORDER, unit: "tickets" },
      { label: "Time we want the sale to take", value: SELL_HOURS, unit: "hours" },
      { label: "Fans let in who end up buying", value: CONVERSION * 100, unit: "%" },
      { label: "Shopping time per fan", value: SESSION_MIN, unit: "minutes", note: "Matches the public 10-minute shopping window" },
      { label: "Requests one fan makes while shopping", value: REQ_PER_SESSION, unit: "requests" },
      { label: "How often the waiting-room page checks for updates", value: POLL_SEC, unit: "seconds" },
    ],
    steps: [
      { label: "Orders needed to sell every seat", formula: "seats ÷ tickets per order", working: "400,000 ÷ 3", result: r(orders), unit: "orders" },
      { label: "Orders per second", formula: "orders ÷ seconds in the sale", working: "133,333 ÷ (2 × 3,600)", result: r(ordersPerSec, 1), unit: "orders/s" },
      { label: "Fans to let in per second", formula: "orders per second ÷ share who buy", working: "18.5 ÷ 0.5", result: r(admitPerSec, 1), unit: "fans/s" },
      { label: "Fans shopping at the same time", formula: "fans let in per second × shopping time", working: "37 × 600 s", result: r(shoppers), unit: "fans" },
      { label: "Requests per second from shoppers", formula: "fans shopping × requests each ÷ shopping time", working: "22,222 × 60 ÷ 600 s", result: r(shopperRps), unit: "req/s" },
      { label: "Requests per second from the waiting room", formula: "fans waiting ÷ check interval", working: "2,000,000 ÷ 15 s", result: r(pollRps), unit: "req/s" },
      { label: "Storage for all orders", formula: "orders × size of one order", working: "133,333 × 2 KB", result: r(storageMb), unit: "MB" },
    ],
    takeaways: [
      "The waiting room gets about 60 times more requests than the shop. So the waiting room must be extremely cheap to serve, ideally from the CDN.",
      "The shop only needs to handle about 2,200 requests per second because the waiting room controls how many fans are inside. The waiting room is our main capacity control.",
      "Storage is tiny. The difficulty is not the amount of data; it is many fans trying to change the same few seat records at once.",
    ],
    calculator: { avgRps: 2200, peakMultiplier: 3, rpsPerServer: 400, utilization: 0.6 },
  },

  architecture: {
    intro:
      "Here is the whole system on one page. Start with the simple view to see the main idea, then switch to the detailed view to see every component. Select any box to read what it does.",
    workflow: {
      id: "overview",
      title: "Buying a ticket, end to end",
      summary: "The path a fan takes from opening the event page to receiving tickets.",
      nodes: [
        { id: "fan", label: "Fan", kind: "user", col: 0, row: 0, explain: X.fan },
        { id: "cdn", label: "CDN", kind: "edge", col: 1, row: 0, tags: ["cache"], explain: X.cdn },
        { id: "waiting", label: "Waiting room", kind: "queue", col: 2, row: 0, tags: ["queue"], explain: X.waiting },
        { id: "api", label: "API gateway", kind: "service", col: 3, row: 0, explain: X.api },
        { id: "seatsvc", label: "Seat service", kind: "service", col: 3, row: 1, explain: X.seatsvc },
        { id: "seatdb", label: "Seat database", kind: "database", col: 3, row: 2, tags: ["transaction"], explain: X.seatdb },
        { id: "booking", label: "Booking service", kind: "service", col: 2, row: 1, tags: ["retry"], explain: X.booking },
        { id: "payments", label: "Payment provider", kind: "external", col: 1, row: 2, explain: X.payments },
        { id: "bookingdb", label: "Booking database", kind: "database", col: 2, row: 2, tags: ["transaction"], explain: X.bookingdb },
        { id: "queue", label: "Message queue", kind: "queue", col: 1, row: 1, tags: ["queue"], explain: X.queue },
        { id: "notify", label: "Ticket delivery", kind: "service", col: 0, row: 1, explain: X.notify },
      ],
      simple: [
        { node: "fan", text: "The fan opens the event page when the sale is about to start." },
        { node: "waiting", text: "The fan waits in line in the waiting room until it is their turn." },
        { node: "seatsvc", text: "Once inside, the fan picks seats. The seat service holds them for 10 minutes." },
        { node: "booking", text: "The fan pays. The booking service handles the payment." },
        { node: "payments", text: "An outside payment provider charges the card." },
        { node: "fan", from: "booking", text: "The order is confirmed and the fan sees their tickets." },
      ],
      detailed: [
        { node: "fan", text: "The fan opens the event page on their phone." },
        { node: "cdn", text: "The page comes from a CDN server nearby, so our own servers do no work." },
        { node: "waiting", text: "The fan joins the waiting room and gets a place in line." },
        { node: "api", text: "When it is their turn, the fan gets a pass and their requests now reach the API gateway." },
        { node: "seatsvc", text: "The fan picks seats. The gateway sends the request to the seat service." },
        { node: "seatdb", text: "The seat database marks the seats as held, in one transaction." },
        { node: "booking", from: "api", text: "The fan pays. The gateway sends the payment request to the booking service." },
        { node: "payments", text: "The booking service asks the payment provider to charge the card." },
        { node: "bookingdb", from: "booking", text: "The order is saved in the booking database." },
        { node: "queue", from: "booking", async: true, text: "A 'tickets ready' job is put in the message queue. The fan does not wait for it." },
        { node: "notify", async: true, text: "In the background, ticket delivery sends the email and adds the tickets to the fan's account." },
      ],
      failures: [
        {
          id: "seatdb-down",
          title: "The seat database stops responding",
          node: "seatdb",
          what: "No seat can be held or confirmed because the official record of seats is unavailable.",
          userSees: "The queue moves more slowly or pauses. Fans who already hold seats keep them.",
          detect: "Hold requests start timing out and the error rate for the seat service jumps.",
          steps: [
            { node: "seatsvc", from: "seatdb", text: "The seat service stops sending new work to the database instead of retrying in a loop." },
            { node: "api", text: "The gateway returns 'please wait' to new hold requests rather than a confusing error." },
            { node: "waiting", text: "Operators tell the waiting room to stop letting new fans in. Fans keep their place in line." },
            { node: "seatdb", from: "seatsvc", text: "When the database recovers, holds are extended so nobody lost seats because of the outage, and the sale resumes slowly." },
          ],
        },
        {
          id: "email-down",
          title: "The email provider is down",
          node: "notify",
          what: "Confirmation emails cannot be sent.",
          userSees: "The fan's order shows as confirmed on the site. The email arrives later.",
          detect: "Jobs in the message queue start piling up and delivery errors rise.",
          steps: [
            { node: "queue", from: "notify", text: "Jobs stay in the queue. Nothing is lost because the queue keeps each job until it succeeds." },
            { node: "notify", from: "queue", text: "When the provider is back, the worker retries each job and checks first that the email was not already sent." },
          ],
        },
      ],
    },
  },

  workflows: [
    {
      id: "waiting-room",
      title: "Getting into the sale: the waiting room",
      summary: "How millions of fans are turned into a steady, manageable stream of shoppers.",
      nodes: [
        { id: "fan", label: "Fan", kind: "user", col: 0, row: 0, explain: X.fan },
        { id: "cdn", label: "CDN", kind: "edge", col: 1, row: 0, tags: ["cache"], explain: X.cdn },
        { id: "bot", label: "Bot check", kind: "service", col: 1, row: 1, explain: {
          what: "A service that estimates whether a request comes from a real person or an automated program (a bot).",
          why: "Bots try to grab many places in line and resell the tickets. They also add huge amounts of traffic.",
          input: "Signals about the device, account and request pattern.",
          inside: "Gives each visitor a risk score. High-risk visitors get a challenge or are blocked.",
          output: "Allow, challenge or block.",
          risks: ["Real fans get blocked by mistake.", "New kinds of bots are not recognised."],
        } },
        { id: "waiting", label: "Waiting room", kind: "queue", col: 2, row: 0, tags: ["queue"], explain: X.waiting },
        { id: "line", label: "Line storage", kind: "database", col: 2, row: 1, explain: {
          what: "A small, fast database that remembers each fan's place in line.",
          why: "If a waiting-room server restarts, fans must not lose their place.",
          input: "New places in line and admissions.",
          inside: "Stores one entry per fan per sale, and a counter of how far the line has moved.",
          output: "Each fan's current position.",
          risks: ["If it is lost during a failover, the line has to be rebuilt."],
        } },
        { id: "api", label: "API gateway", kind: "service", col: 3, row: 0, explain: X.api },
      ],
      simple: [
        { node: "fan", text: "The fan opens the sale page before it starts." },
        { node: "waiting", text: "The fan joins the waiting room and gets a place in line." },
        { node: "api", text: "Every second, the waiting room lets the next group of fans into the shop." },
      ],
      detailed: [
        { node: "fan", text: "The fan opens the sale page about half an hour before it starts." },
        { node: "cdn", text: "The waiting-room page is served by the CDN, so millions of page loads cost our servers almost nothing." },
        { node: "bot", text: "The bot check scores the visitor. Suspicious visitors are challenged or blocked." },
        { node: "waiting", from: "cdn", text: "The fan joins the waiting room. One account gets one place." },
        { node: "line", text: "At the start time, every fan in the room gets a place in line, which is saved in line storage." },
        { node: "api", from: "waiting", text: "The waiting room lets in a fixed number of fans per second and gives each a short-lived pass. Only requests with a pass reach the API gateway." },
      ],
      failures: [
        {
          id: "bot-flood",
          title: "A flood of bots joins the line",
          node: "bot",
          what: "Automated programs create many accounts and join the waiting room, multiplying traffic.",
          userSees: "The page loads slowly and the line looks much longer than expected.",
          detect: "Joins per device or per account cluster spike, and traffic is far above the number of registered fans.",
          steps: [
            { node: "bot", from: "cdn", text: "The bot check is tightened: more visitors get a challenge before they can join." },
            { node: "waiting", from: "bot", text: "Places in line are tied to verified accounts, so extra bot requests do not get extra places." },
            { node: "api", from: "waiting", text: "Because only fans with a pass reach the shop, the shop's load stays the same even though the waiting room is busier." },
          ],
        },
        {
          id: "line-lost",
          title: "A waiting-room server crashes",
          node: "line",
          what: "The server holding part of the line restarts.",
          userSees: "Nothing, if the design is right. Their page keeps showing their position.",
          detect: "A server health check fails.",
          steps: [
            { node: "line", from: "waiting", text: "Line storage keeps a copy on more than one machine, so positions survive." },
            { node: "fan", from: "line", text: "Each fan's pass also contains their position, signed so it cannot be faked, so the line could be rebuilt from fans' devices if needed." },
          ],
        },
      ],
    },
    {
      id: "hold-seats",
      title: "Holding seats",
      summary: "How a fan claims seats for a few minutes without anyone else taking them.",
      nodes: [
        { id: "fan", label: "Fan", kind: "user", col: 0, row: 0, explain: X.fan },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, tags: ["retry"], explain: X.api },
        { id: "seatsvc", label: "Seat service", kind: "service", col: 2, row: 0, explain: X.seatsvc },
        { id: "seatdb", label: "Seat database", kind: "database", col: 3, row: 0, tags: ["transaction"], explain: X.seatdb },
        { id: "mapcache", label: "Seat map cache", kind: "cache", col: 3, row: 1, tags: ["cache"], explain: {
          what: "A cache: a fast, temporary copy of the seat map kept in memory.",
          why: "Thousands of fans look at the same seat map. Reading it from the database every time would overload the database that also has to save holds.",
          input: "Updated seat maps after seats change.",
          inside: "Keeps the latest seat map for each section and returns it in a millisecond.",
          output: "The seat map shown to fans.",
          risks: ["It can be a few seconds behind, so a seat that looks free may already be taken."],
        } },
        { id: "timer", label: "Hold timer", kind: "service", col: 2, row: 1, explain: {
          what: "A background job that releases holds when their time runs out.",
          why: "If a fan walks away, their seats must go back on sale, or the show looks sold out when it is not.",
          input: "Holds whose expiry time has passed.",
          inside: "Every few seconds, finds expired holds and marks those seats available again.",
          output: "Released seats.",
          risks: ["If it falls behind, unpaid seats stay locked."],
        } },
      ],
      simple: [
        { node: "fan", text: "The fan picks two seats on the map and taps Hold." },
        { node: "seatsvc", text: "The seat service checks the seats are still free." },
        { node: "seatdb", text: "The seats are marked as held for this fan." },
        { node: "fan", from: "seatdb", text: "The fan sees a 10-minute timer to pay." },
      ],
      detailed: [
        { node: "fan", text: "The fan taps Hold. The app attaches a unique idempotency key so that a retry cannot create a second hold." },
        { node: "api", text: "The gateway checks the fan's pass and that they are not sending too many requests." },
        { node: "seatsvc", text: "The seat service checks the ticket limit for this account." },
        { node: "seatdb", text: "One transaction marks the seats as held, but only if every one of them is still available. If even one was taken, nothing changes." },
        { node: "mapcache", async: true, text: "Shortly after, the seat map cache is refreshed so other fans see these seats as taken." },
        { node: "timer", from: "seatdb", async: true, text: "The hold has an expiry time. If the fan does not pay within 10 minutes, the hold timer releases the seats." },
        { node: "fan", from: "seatsvc", text: "The fan gets the hold and a countdown to pay." },
      ],
      failures: [
        {
          id: "same-seat",
          title: "Two fans tap the same seat at the same moment",
          node: "seatdb",
          what: "Two hold requests for the same seat arrive within a millisecond of each other.",
          userSees: "One fan gets the seat. The other sees 'these seats were just taken' and a refreshed map.",
          detect: "The database reports that the second update changed zero rows.",
          steps: [
            { node: "seatdb", from: "seatsvc", text: "The database runs the two updates one after the other. The first succeeds; the second finds the seat no longer available and changes nothing." },
            { node: "seatsvc", from: "seatdb", text: "The seat service sees that its update changed nothing and treats it as 'seat taken', not as an error." },
            { node: "fan", from: "seatsvc", text: "The second fan is told the seat is gone and shown the latest map." },
          ],
        },
        {
          id: "lost-reply",
          title: "The fan's connection drops after tapping Hold",
          node: "fan",
          what: "The hold was created, but the reply never reached the phone.",
          userSees: "A spinner, then the app retries automatically.",
          detect: "The app times out waiting for a reply.",
          steps: [
            { node: "api", from: "fan", text: "The app sends the same request again with the same idempotency key." },
            { node: "seatsvc", text: "The seat service recognises the key and returns the hold it already made, instead of creating a second one." },
            { node: "fan", from: "seatsvc", text: "The fan sees their hold as if nothing went wrong." },
          ],
        },
      ],
    },
    {
      id: "pay",
      title: "Paying for the tickets",
      summary: "How a hold becomes a paid order, including what happens when the payment result is unclear.",
      nodes: [
        { id: "fan", label: "Fan", kind: "user", col: 0, row: 0, explain: X.fan },
        { id: "booking", label: "Booking service", kind: "service", col: 1, row: 0, tags: ["retry"], explain: X.booking },
        { id: "seatsvc", label: "Seat service", kind: "service", col: 2, row: 0, explain: X.seatsvc },
        { id: "payments", label: "Payment provider", kind: "external", col: 3, row: 0, explain: X.payments },
        { id: "bookingdb", label: "Booking database", kind: "database", col: 3, row: 1, tags: ["transaction"], explain: X.bookingdb },
        { id: "queue", label: "Message queue", kind: "queue", col: 2, row: 1, tags: ["queue"], explain: X.queue },
        { id: "notify", label: "Ticket delivery", kind: "service", col: 1, row: 1, explain: X.notify },
        { id: "recon", label: "Reconciliation job", kind: "service", col: 3, row: 2, failureOnly: true, explain: {
          what: "A background job that checks our records against the payment provider's records.",
          why: "Sometimes we cannot tell whether a card was charged. Someone has to find out and fix the order.",
          input: "Orders marked 'payment unknown', and the provider's list of charges.",
          inside: "Asks the provider about each unclear payment using its idempotency key, then confirms or cancels the order.",
          output: "Confirmed orders, or refunds and released seats.",
          risks: ["If it falls behind, seats stay held and fans wait for an answer."],
        } },
      ],
      simple: [
        { node: "fan", text: "The fan enters card details and taps Pay." },
        { node: "booking", text: "The booking service checks the hold is still valid." },
        { node: "payments", text: "The payment provider charges the card." },
        { node: "bookingdb", text: "The order is saved." },
        { node: "fan", from: "booking", text: "The fan sees 'Order confirmed'." },
      ],
      detailed: [
        { node: "fan", text: "The fan taps Pay. The app sends the hold ID, a card token and an idempotency key." },
        { node: "booking", text: "The booking service checks the hold belongs to this fan and has not expired." },
        { node: "seatsvc", text: "It asks the seat service to mark the hold as 'paying', so the hold timer will not release it during payment." },
        { node: "payments", from: "booking", text: "It asks the payment provider to charge the card, passing the same idempotency key so a retry can never charge twice." },
        { node: "bookingdb", text: "The order and a 'tickets ready' event are saved in one transaction, so we never have one without the other." },
        { node: "queue", async: true, text: "The event goes into the message queue." },
        { node: "notify", async: true, text: "Ticket delivery sends the email and tickets in the background." },
        { node: "fan", from: "booking", text: "The fan sees 'Order confirmed' without waiting for the email." },
      ],
      failures: [
        {
          id: "unknown-payment",
          title: "The payment provider does not answer",
          node: "payments",
          what: "We asked for a charge and got no reply. The card may or may not have been charged.",
          userSees: "'We are confirming your payment.' The seats stay reserved for them.",
          detect: "The payment call times out.",
          steps: [
            { node: "bookingdb", from: "booking", text: "The order is saved as 'payment unknown'. The seats stay held; they are not released and not sold to anyone else." },
            { node: "recon", from: "bookingdb", text: "The reconciliation job picks up orders in this state." },
            { node: "payments", from: "recon", text: "It asks the provider: did the charge with this idempotency key happen?" },
            { node: "seatsvc", from: "recon", text: "If yes, the seats are confirmed as sold. If no, the payment is cancelled and the seats go back on sale." },
          ],
        },
        {
          id: "double-tap",
          title: "The fan taps Pay twice",
          node: "booking",
          what: "Two identical payment requests arrive.",
          userSees: "One charge and one order.",
          detect: "The second request carries an idempotency key that is already saved.",
          steps: [
            { node: "booking", from: "fan", text: "The second request arrives with the same idempotency key." },
            { node: "bookingdb", text: "The key is already stored with the first result, so the booking service returns that result instead of charging again." },
            { node: "fan", from: "booking", text: "The fan sees the same confirmed order." },
          ],
        },
      ],
    },
  ],

  database: {
    intro:
      "We use a relational database (such as PostgreSQL) for seats, holds and orders. Relational databases support transactions, which is exactly what we need to guarantee a seat is never sold twice.",
    entities: [
      { name: "Event", purpose: "One show: the venue, the date and the ticket limit per fan.", fields: [
        { name: "event_id", type: "id", note: "primary key" }, { name: "venue", type: "text" }, { name: "starts_at", type: "date and time" }, { name: "ticket_limit", type: "number" },
      ], relations: ["Has many Seats"] },
      { name: "Seat", purpose: "One seat in one show and its current state.", fields: [
        { name: "event_id", type: "id", note: "part of the primary key" }, { name: "seat_id", type: "text", note: "for example 112-A-7" }, { name: "status", type: "available, held or sold" }, { name: "hold_id", type: "id", note: "which hold has it, if any" },
      ], relations: ["Belongs to an Event", "May belong to a Hold"] },
      { name: "Hold", purpose: "A fan's temporary claim on seats.", fields: [
        { name: "hold_id", type: "id", note: "primary key" }, { name: "account_id", type: "id" }, { name: "expires_at", type: "date and time" }, { name: "idempotency_key", type: "text", note: "unique per account" }, { name: "state", type: "active, paying, converted or expired" },
      ], relations: ["Has one or more Seats", "Becomes at most one Order"] },
      { name: "Order", purpose: "A paid purchase.", fields: [
        { name: "order_id", type: "id", note: "primary key" }, { name: "hold_id", type: "id", note: "unique: one order per hold" }, { name: "status", type: "confirmed, payment unknown or cancelled" }, { name: "total", type: "money" },
      ], relations: ["Comes from one Hold", "Has one or more Payment attempts"] },
      { name: "Payment attempt", purpose: "One request to the payment provider, saved before we send it.", fields: [
        { name: "attempt_id", type: "id", note: "primary key" }, { name: "order_id", type: "id" }, { name: "idempotency_key", type: "text", note: "unique" }, { name: "result", type: "approved, declined or unknown" },
      ], relations: ["Belongs to an Order"] },
    ],
    why: [
      "Seats and holds for one event are stored together (split by event_id), so holding several seats is one small transaction on one machine.",
      "The unique constraint on Order.hold_id is a safety net: even if a bug tried to create two orders for one hold, the database would refuse.",
      "Payment attempts are saved before calling the provider, so if anything crashes we still know which payments to check.",
    ],
  },

  decisions: [
    {
      id: "waiting-room",
      title: "Put a waiting room in front of the shop",
      problem: "Millions of fans arrive in the same minute. No reasonable number of servers can serve all of them at once, and an overloaded site fails for everyone, not just the extra people.",
      solution: "Make fans wait in an online line, and let them into the shop at a steady rate the shop can handle.",
      how: "Each fan gets a place in line. Every second, the waiting room lets in the next group and gives each fan a short-lived pass. The shop only accepts requests that carry a valid pass.",
      where: "Between the CDN and the API gateway. It is the first thing a fan meets.",
      tradeoff: "Fans have to wait, sometimes a long time. But fans who get in can actually buy, instead of everyone getting errors. Try it below: let in fewer fans per second and the line gets longer, but the shop never overloads.",
      demo: "queue",
    },
    {
      id: "hold-expiry",
      title: "Hold seats for a limited time",
      problem: "Paying takes minutes. If seats were only claimed at the moment of payment, two fans could fill in their card details for the same seat, and one would lose it at the last second.",
      solution: "Let a fan hold seats for 10 minutes. During that time nobody else can take them.",
      how: "Holding marks the seats with the fan's hold and an expiry time. If the fan pays, the seats become sold. If the time runs out, the hold timer makes them available again.",
      where: "In the seat service and seat database.",
      tradeoff: "Fans who walk away keep seats locked for up to 10 minutes. A shorter time frees seats faster but rushes real fans.",
    },
    {
      id: "transaction",
      title: "Use a database transaction to claim seats",
      problem: "Two fans can try to hold the same seat at the same instant. If the system first checks 'is it free?' and then saves 'it is held', both checks can pass before either save happens.",
      solution: "Do the check and the change as one atomic step inside the database.",
      how: "The seat service sends one update: 'mark these seats as held, but only where their status is still available'. The database runs competing updates one at a time. The loser changes zero rows and knows it lost.",
      where: "Between the seat service and the seat database.",
      tradeoff: "Popular seats become a bottleneck because updates to the same row must wait for each other. For the hottest sections, the system can offer 'best available' seats instead of exact picks to spread the load.",
    },
    {
      id: "seat-map-cache",
      title: "Serve the seat map from a cache",
      problem: "Thousands of fans view the same seat map many times a minute. Reading it from the database each time would slow down the database that must also save holds.",
      solution: "Keep a ready-made copy of each seat map in a fast in-memory cache.",
      how: "When seats change, the seat map is rebuilt and the cache is updated. Fans read from the cache. If many fans ask while a map is being rebuilt, only one rebuild runs.",
      where: "Next to the seat service, read on every seat map load.",
      tradeoff: "The map can be a few seconds out of date. A fan may tap a seat that was just taken; the transaction catches it and the fan picks again.",
    },
    {
      id: "idempotency",
      title: "Make retries safe with idempotency keys",
      problem: "Networks fail. If a request to pay times out, the app cannot tell whether the payment happened. Retrying could charge the fan twice; not retrying could leave them unsure.",
      solution: "Give each action a unique ID, called an idempotency key, and make the server remember it.",
      how: "The app creates a key when the fan taps Pay and sends it with every retry. The server saves the key with the result. If the same key arrives again, it returns the saved result instead of doing the work again.",
      where: "On hold and payment requests, and passed on to the payment provider.",
      tradeoff: "The server must store keys for a while. In return, a whole class of double-charge bugs disappears.",
    },
    {
      id: "message-queue",
      title: "Send tickets through a message queue",
      problem: "After payment, several slow things must happen: emails, ticket creation, analytics. If the fan waited for all of them, checkout would be slow, and a failure in email would look like a failed payment.",
      solution: "Save a job in a message queue and reply to the fan straight away. Background workers do the slow work.",
      how: "The order and a 'tickets ready' event are saved together. The queue holds the event until a worker processes it. If the worker fails, the job is tried again later.",
      where: "After the booking database, feeding ticket delivery.",
      tradeoff: "Work happens a little later, and a job can occasionally run twice, so workers must check whether they already did it.",
    },
  ],

  failures: [
    {
      title: "The card is charged but the order is not confirmed",
      what: "The payment provider charged the card, but the reply was lost before we saved the order.",
      userSees: "'We are confirming your payment', then a confirmed order a few minutes later.",
      detect: "A payment attempt stays in 'sent' or 'unknown' longer than the provider's timeout.",
      recover: "The reconciliation job asks the provider about that attempt and confirms the order. The seats were kept on hold the whole time.",
      prevent: "Save the payment attempt before calling the provider. Test by killing the booking service right after a fake provider approves a charge, and check that exactly one order and one charge exist afterwards.",
    },
    {
      title: "The hold expires while the fan is paying",
      what: "A slow payment takes longer than the time left on the hold, and the hold timer releases the seats.",
      userSees: "Without protection: the fan pays and loses the seats. With protection: nothing unusual.",
      detect: "A payment succeeds for a hold that is no longer active.",
      recover: "Cancel the payment and refund it if the seats cannot be confirmed.",
      prevent: "Mark the hold as 'paying' when payment starts. The hold timer skips paying holds. Test with a payment provider that is deliberately slowed down.",
    },
    {
      title: "Presale codes cannot be checked",
      what: "Valid presale codes are rejected, or checking them times out, when the sale opens.",
      userSees: "Ticketmaster reported that code-checking errors during the 2022 Eras Tour presale made some fans lose tickets in their carts.",
      detect: "The error rate for code checks rises sharply at the start of the sale.",
      recover: "Let fans retry without losing their place or their held seats.",
      prevent: "Check codes before fans enter the shop, not at checkout, and keep the list of valid codes in memory. Load-test code checking with many invalid attempts.",
      evidence: "public",
      sources: ["tm-eras-2022"],
    },
    {
      title: "Bot traffic far beyond the plan",
      what: "Automated programs multiply the traffic hitting the waiting room.",
      userSees: "Slow pages and a longer line. Live Nation's president told the Senate that the bot attack in 2022 forced them to slow down and pause sales.",
      detect: "Traffic far above the number of registered fans; many joins from the same devices.",
      recover: "Tighten the bot check, lower the admission rate, and cancel orders from accounts later found to be bots.",
      prevent: "Tie places in line to verified accounts and keep the shop unreachable without a pass.",
      evidence: "public",
      sources: ["senate-2023"],
    },
    {
      title: "The seat map cache is empty when the sale opens",
      what: "The first fans let in all ask for a seat map that is not in the cache yet.",
      userSees: "The seat map loads slowly.",
      detect: "Cache misses spike together with database reads.",
      recover: "Only one request rebuilds each map; the others wait for it.",
      prevent: "Build and store every seat map before the waiting room opens.",
    },
    {
      title: "Ticket emails are delayed",
      what: "The email provider is slow or down.",
      userSees: "The order is confirmed on the site, but the email arrives late.",
      detect: "The message queue grows and delivery errors rise.",
      recover: "Jobs stay in the queue and are retried when the provider recovers.",
      prevent: "Keep email out of the checkout path. Make delivery check whether an email was already sent so retries do not send duplicates.",
    },
  ],

  recap: {
    decisions: [
      { decision: "Waiting room", why: "Turns a crowd into a steady stream the shop can serve.", cost: "Fans wait." },
      { decision: "Holds that expire", why: "Fans can pay without losing seats; abandoned seats come back.", cost: "Seats can be locked for a few minutes by fans who leave." },
      { decision: "Seat change in one transaction", why: "A seat can never be sold twice.", cost: "The most popular seats become a bottleneck." },
      { decision: "Cached seat map", why: "Protects the database from read traffic.", cost: "The map can be a few seconds old." },
      { decision: "Idempotency keys", why: "Retries never double-charge.", cost: "Keys must be stored." },
      { decision: "Message queue for tickets", why: "Fast checkout; email problems do not break payment.", cost: "Tickets arrive a little later; workers must handle repeats." },
    ],
    questions: [
      { q: "How do you make sure two people cannot buy the same seat?", a: "Claim seats with a single database update that only changes seats still marked available, inside a transaction. If two requests race, the database runs them one after the other and the second changes nothing." },
      { q: "Why not just add more servers instead of using a waiting room?", a: "The crowd arrives in seconds, but new servers take minutes to start, and the database behind them cannot grow the same way. A waiting room controls how much work arrives, which is cheaper and more reliable than trying to absorb all of it." },
      { q: "What happens if the payment provider times out?", a: "Keep the seats held, save the order as 'payment unknown', and let a reconciliation job ask the provider what happened using the idempotency key. Then confirm or cancel." },
      { q: "Why is the seat map allowed to be out of date?", a: "Because the seat map is only a guide. The real check happens in the transaction when the fan holds seats, so a stale map costs a retry, not a double sale." },
    ],
  },
};
