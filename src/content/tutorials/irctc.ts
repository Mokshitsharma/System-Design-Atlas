import type { TutorialInput } from "@/lib/schema";

/*
 * IRCTC: a beginner tutorial on designing train ticket booking for the Tatkal rush.
 * The reader is the passenger throughout. Everything not marked "public" is a proposed design,
 * not a description of IRCTC's or Indian Railways' internal systems.
 */

// Public figures from IRCTC's Internet Ticketing page (source "irctc-it").
const RECORD_MINUTE = 30_155; // tickets in one minute, 12 March 2025, 10:01 AM
const RECORD_DAY = 1_617_000; // e-tickets in one day, 6 March 2025 (16.17 lakh)

// Illustrative assumptions.
const REQ_PER_BOOKING = 25;
const TRIERS_PER_SUCCESS = 3;
const TICKET_KB = 2;

const peakPerSec = RECORD_MINUTE / 60;
const avgPerSec = RECORD_DAY / 86_400;
const ratio = peakPerSec / avgPerSec;
const peakReq = peakPerSec * REQ_PER_BOOKING;
const peakReqAll = peakReq * TRIERS_PER_SUCCESS;
const storageGb = (RECORD_DAY * TICKET_KB) / 1_000_000;

const r = (n: number, d = 0) => Number(n.toFixed(d));

// Plain-English explanations, written with you as the passenger.
const X = {
  you: {
    what: "You, using the IRCTC app or website on your phone or laptop.",
    why: "Every booking starts with you tapping something, and ends with you seeing your ticket.",
    input: "Your taps: log in, search, book, pay.",
    inside: "The app shows screens, remembers that you are logged in, and sends your requests to the servers.",
    output: "Requests to IRCTC's servers.",
    risks: ["Your network drops in the middle of a payment.", "You tap Book twice because the page looks stuck."],
  },
  cdn: {
    what: "A CDN (content delivery network): copies of the app's pages, pictures and scripts kept on servers close to you.",
    why: "At 9:59 AM a huge number of people open the same pages. If those pages come from a nearby copy, the booking servers are left free for real bookings.",
    input: "Requests for pages and pictures.",
    inside: "Returns a stored copy if it has one. Only asks the main servers when the copy is missing or old.",
    output: "Pages and pictures, quickly.",
    risks: ["If it is set up wrongly, every page request goes to the main servers and overloads them."],
  },
  auth: {
    what: "The login service checks who you are.",
    why: "Tickets are tied to your account, and Tatkal can only be booked from an Aadhaar-verified account, so the system must know it is really you.",
    input: "Your user ID, password and the captcha you typed.",
    inside: "Checks the password, checks the captcha (to slow down computer programs), and starts a session so you stay logged in.",
    output: "A session: a short-lived pass that says 'this is you'.",
    risks: ["Everyone logs in at 9:58, so it gets very busy just before Tatkal opens.", "Programs try to log in with stolen passwords."],
  },
  api: {
    what: "The API gateway: the front door for every request after you log in.",
    why: "Some checks must happen on every request: are you logged in, are you sending too many requests? Doing them in one place keeps every service simpler.",
    input: "Your requests, with your session pass.",
    inside: "Checks the pass, applies limits (for example, how many searches per minute), and sends the request to the right service.",
    output: "Checked requests passed on to search or booking.",
    risks: ["If it goes down, nobody can do anything.", "Limits that are too strict block real passengers."],
  },
  search: {
    what: "The train search service finds trains between two stations and shows how many seats are left.",
    why: "You need to see your options before you book. Searching is the most common thing people do, so it must be fast.",
    input: "From station, to station, date, class and quota, for example Delhi to Patna, tomorrow, 3A, Tatkal.",
    inside: "Looks up trains on that route and reads the seats-left numbers from a fast cache.",
    output: "A list of trains with 'AVAILABLE 42', 'RAC 5' or 'WL 18'.",
    risks: ["The seats-left number can be a few seconds old during the rush."],
  },
  booking: {
    what: "The booking service turns your request into a ticket.",
    why: "Booking has to do several things in the right order: check the quota, take a berth, take payment and save the ticket. One service owns that whole process.",
    input: "Train, date, class, quota, passenger details, and a unique request ID.",
    inside: "Takes a berth from the quota (or a waiting-list number), asks the payment gateway for payment, then saves the ticket.",
    output: "A ticket with a PNR, or a clear 'not booked' with a refund.",
    risks: ["Payment succeeds but saving the ticket fails.", "You tap Book twice."],
  },
  inventory: {
    what: "The seat and quota database: the official count of berths for every train, date, class and quota.",
    why: "Seats are sold on the website and at station counters at the same time. Everyone must use one shared record, or the same berth could be sold twice.",
    input: "Requests to take or give back a berth.",
    inside: "Each change is a transaction: it reduces the count only if a berth is still left, and records exactly which berth was given.",
    output: "A berth number, or 'none left, here is a waiting-list number'.",
    risks: ["At 10:00 thousands of requests want the same train and class at once, so they queue up behind each other."],
  },
  payment: {
    what: "The payment gateway: an outside company that talks to your bank or UPI app.",
    why: "IRCTC does not hold your money directly. The gateway collects the payment from your bank and tells the booking service whether it worked.",
    input: "The amount, and a unique ID for this payment.",
    inside: "Sends a request to your bank or UPI app, waits for you to approve it, and reports the result.",
    output: "Success, failure, or sometimes no clear answer.",
    risks: ["Your bank is slow, so the answer comes late or not at all.", "Money leaves your account but the success message is lost."],
  },
  pnrdb: {
    what: "The ticket database stores every ticket with its PNR (Passenger Name Record) number.",
    why: "Your PNR is how you, the ticket checker and the railways find your booking. It must never be lost.",
    input: "New tickets, cancellations, and status changes such as WL to confirmed.",
    inside: "Saves the ticket together with a 'ticket booked' message, in one transaction, so the SMS is never sent for a ticket that was not saved.",
    output: "Your saved ticket, and messages for the queue.",
    risks: ["If it is slow, bookings wait even after payment."],
  },
  queue: {
    what: "A message queue: a to-do list for jobs that can happen a few seconds later.",
    why: "Sending your SMS and email takes time. With a queue, you see your ticket immediately and the messages follow.",
    input: "'Ticket booked' and 'status changed' messages.",
    inside: "Keeps each job until a worker finishes it. If a worker fails, the job is tried again.",
    output: "Jobs for the SMS and email service.",
    risks: ["Jobs pile up if the SMS provider is slow.", "A job can run twice, so the sender checks before sending again."],
  },
  sms: {
    what: "The SMS and email service sends you your ticket details.",
    why: "You want proof of booking on your phone, even without opening the app.",
    input: "Jobs from the queue.",
    inside: "Formats the message with your PNR and berth, and sends it through a telecom or email provider.",
    output: "An SMS and an email to you.",
    risks: ["The telecom provider is delayed, so the SMS arrives late. Your ticket is still valid."],
  },
};

export const irctc: TutorialInput = {
  slug: "irctc",
  title: "Design a train ticket booking system like IRCTC",
  summary:
    "How to let a very large number of people book train tickets at exactly 10:00 AM, when Tatkal opens, while giving each berth to exactly one person and never keeping anyone's money without a ticket.",
  lastVerifiedAt: "2026-10-22",
  patterns: ["waiting-room", "reservation-and-expiry", "idempotency", "reconciliation", "cache-aside", "rate-limiting", "transactional-outbox", "retry-with-jitter"],
  sources: [
    {
      id: "irctc-it",
      title: "Internet Ticketing",
      publisher: "IRCTC",
      url: "https://www.irctc.com/internet-ticketing.php",
      kind: "official",
      publishedAt: null,
      accessedAt: "2026-10-22",
      note: "IRCTC's own figures. Page not dated; the latest figures it gives are from March 2025.",
    },
    {
      id: "tatkal-timings",
      title: "No new Tatkal rules from April 15: IRCTC clears air on social media misinformation",
      publisher: "Business Today",
      url: "https://businesstoday.in/india/story/no-new-tatkal-rules-from-april-15-irctc-clears-air-on-social-media-misinformation-471844-2025-04-13",
      kind: "press",
      publishedAt: "2025-04-13",
      accessedAt: "2026-10-22",
      note: "Reports IRCTC's statement that Tatkal timings are unchanged. Check IRCTC before travelling; rules can change.",
    },
    {
      id: "tatkal-aadhaar",
      title: "Only Aadhaar authenticated users can book Tatkal tickets from July 1",
      publisher: "The Tribune (PTI)",
      url: "https://www.tribuneindia.com/news/india/only-aadhaar-authenticated-users-can-book-tatkal-tickets-from-july-1",
      kind: "press",
      publishedAt: "2025-06-11",
      accessedAt: "2026-10-22",
      note: "Reports a Railway Ministry circular dated 10 June 2025.",
    },
    {
      id: "arp-60",
      title: "Indian Railways reduces advance reservation period from 120 to 60 days",
      publisher: "Onmanorama",
      url: "https://onmanorama.com/news/india/2024/10/17/indian-railways-advance-reservation-period-train-journey.html",
      kind: "press",
      publishedAt: "2024-10-17",
      accessedAt: "2026-10-22",
      note: "Reports a Railway Board circular dated 16 October 2024.",
    },
  ],

  intro: {
    paragraphs: [
      "IRCTC runs the website and app where people in India book train tickets. On a normal day this is a busy online shop. But every morning there is a moment that looks more like a stampede: Tatkal opens, and a large number of people try to book the last-minute quota of berths in the same few seconds.",
      "Tatkal is a quota of berths set aside for people who need to travel at short notice. It opens one day before the journey. Because there are far fewer Tatkal berths than people who want them, most of the work happens in the first minute.",
      "In this tutorial we design a system that can handle that minute. We keep three promises: the site stays usable at 10:00 AM, each berth goes to exactly one passenger, and nobody loses money without getting a ticket.",
      {
        text: "This is a proposed design based on public information. IRCTC and Indian Railways have not published how their systems are built inside, so the components and many numbers here are our own reasoning, labelled as such.",
        evidence: "inferred",
        sources: [],
      },
    ],
    known: [
      {
        text: "IRCTC moved to its Next Generation e-Ticketing (NGeT) system on 28 April 2014. IRCTC says it can handle more than 30,000 ticket bookings per minute, and its highest-ever per-minute record was 30,155 bookings on 12 March 2025 at 10:01 AM.",
        evidence: "public",
        sources: ["irctc-it"],
      },
      {
        text: "IRCTC reports a record of 16.17 lakh e-tickets booked in a single day (6 March 2025), and says 86.38 percent of reserved rail tickets were booked online in 2024-25.",
        evidence: "public",
        sources: ["irctc-it"],
      },
      {
        text: "Tatkal can be booked one day before the journey. Booking opens at 10:00 AM for AC classes and 11:00 AM for non-AC classes. In April 2025 IRCTC said no change to these timings was proposed.",
        evidence: "public",
        sources: ["tatkal-timings"],
      },
      {
        text: "From 1 July 2025, only Aadhaar-authenticated users can book Tatkal tickets on the IRCTC website or app, with an Aadhaar-based OTP required from 15 July 2025. Authorised agents may not book opening-day Tatkal tickets in the first 30 minutes (10:00 to 10:30 for AC, 11:00 to 11:30 for non-AC).",
        evidence: "public",
        sources: ["tatkal-aadhaar"],
      },
      {
        text: "From 1 November 2024, the advance reservation period for most trains was reduced from 120 days to 60 days before the journey.",
        evidence: "public",
        sources: ["arp-60"],
      },
      {
        text: "The record minute, 10:01 AM, falls right after AC Tatkal opens at 10:00. That is our clue that the Tatkal opening is the hardest moment for the system.",
        evidence: "inferred",
        sources: ["irctc-it", "tatkal-timings"],
      },
    ],
    story: {
      title: "Imagine you are the passenger",
      steps: [
        "Your grandmother in Patna is unwell, and you need to travel from Delhi tomorrow. All regular 3A berths are booked, so you decide to try Tatkal.",
        "At 9:50 AM you open the IRCTC app and log in. Your account is already linked to Aadhaar, which Tatkal requires.",
        "At 9:58 AM you search for tomorrow's trains from Delhi to Patna and choose one that shows 3A Tatkal seats.",
        "At exactly 10:00 AM AC Tatkal opens. You tap Book Now at the same moment as a very large number of other people.",
        "You enter the OTP sent to your Aadhaar-linked mobile number, then pay with UPI.",
        "A few seconds later the app shows 'CNF B2-34': confirmed, coach B2, berth 34. An SMS with your PNR arrives soon after.",
        "In this tutorial we follow every one of those taps through the system. At each step we ask: what has to happen so that you, and only you, get berth 34?",
      ],
    },
  },

  requirements: {
    functional: [
      "You can search trains between two stations and see seats left for each class and quota.",
      "You can book tickets for up to a few passengers, from the general quota or the Tatkal quota.",
      "If no berth is left, you can still book a waiting-list ticket and see your waiting-list number.",
      "You can pay online and receive a PNR, by app, SMS and email.",
      "You can cancel a ticket and get a refund, and the freed berth goes to the next person on the waiting list.",
      "Tatkal booking is allowed only from Aadhaar-verified accounts, with an OTP check.",
    ],
    nonFunctional: [
      { name: "Correctness", meaning: "The answer is right even when many people act at once.", target: "A berth is never given to two passengers for the same part of the journey." },
      { name: "Availability", meaning: "The site keeps working instead of showing errors.", target: "Stays usable during the 10:00 and 11:00 Tatkal rush." },
      { name: "Fairness", meaning: "Everyone gets the same chance, and automated programs do not jump ahead.", target: "Requests are served in arrival order; limits per account." },
      { name: "Low latency", meaning: "Responses come back quickly.", target: "Seat search answers in under a second, even at 10:00." },
      { name: "No lost money", meaning: "Every rupee taken is either turned into a ticket or returned.", target: "Every successful payment ends as a ticket or an automatic refund." },
      { name: "One shared truth", meaning: "The website and station counters see the same seats.", target: "One seat record for every sales channel." },
    ],
    outOfScope: ["Train timetables and running status", "Food ordering and hotel booking", "How fares are calculated"],
    terms: [
      { term: "PNR", meaning: "Passenger Name Record: the 10-digit number that identifies your booking." },
      { term: "Quota", meaning: "A share of the berths kept for a group, such as Tatkal, ladies or senior citizens. Each quota is counted separately." },
      { term: "Tatkal", meaning: "A quota for short-notice travel that opens one day before the journey." },
      { term: "Waiting list (WL)", meaning: "When all berths are gone you can still book and get a number in line, for example WL 12. If others cancel, you move up." },
      { term: "RAC", meaning: "Reservation Against Cancellation: you can board and get a shared seat, and may get a full berth if someone cancels." },
      { term: "Transaction", meaning: "A group of database changes that either all happen or none happen." },
    ],
  },

  capacity: {
    intro:
      "Let us estimate how much work the system does at its busiest moment. Here we are lucky: IRCTC has published two real records, so we start from public numbers and add a few clearly labelled assumptions for the rest.",
    assumptions: [
      { label: "Tickets booked in the record minute (12 March 2025, 10:01 AM)", value: RECORD_MINUTE, unit: "tickets", evidence: "public", sources: ["irctc-it"] },
      { label: "Tickets booked on the record day (6 March 2025)", value: RECORD_DAY, unit: "tickets", evidence: "public", sources: ["irctc-it"] },
      { label: "Requests your app sends for one booking", value: REQ_PER_BOOKING, unit: "requests", note: "Search, availability checks, passenger form, OTP, payment, status" },
      { label: "People trying, for every one who gets a ticket", value: TRIERS_PER_SUCCESS, unit: "people", note: "Many people try and miss out at 10:00" },
      { label: "Size of one saved ticket", value: TICKET_KB, unit: "KB" },
    ],
    steps: [
      { label: "Tickets per second in the record minute", formula: "tickets in the minute ÷ 60", working: "30,155 ÷ 60", result: r(peakPerSec, 1), unit: "tickets/s" },
      { label: "Average tickets per second on the record day", formula: "tickets in the day ÷ seconds in a day", working: "16,17,000 ÷ 86,400", result: r(avgPerSec, 1), unit: "tickets/s" },
      { label: "How much busier the peak is than the average", formula: "peak ÷ average", working: "502.6 ÷ 18.7", result: r(ratio, 1), unit: "times" },
      { label: "Requests per second from successful bookings", formula: "tickets per second × requests per booking", working: "502.6 × 25", result: r(peakReq), unit: "req/s" },
      { label: "Requests per second including people who miss out", formula: "previous result × people trying per success", working: "12,565 × 3", result: r(peakReqAll), unit: "req/s" },
      { label: "Storage for one record day of tickets", formula: "tickets × size of one ticket", working: "16,17,000 × 2 KB", result: r(storageGb, 1), unit: "GB" },
    ],
    takeaways: [
      "The peak minute is about 27 times busier than the average for the day. (The two records are from different days in March 2025, so this is a rough ratio.) A system sized for the average would fail every morning at 10:00.",
      "Most of the load comes from people searching and retrying, not from successful bookings. Making search cheap (with a cache) matters as much as making booking fast.",
      "The data is small: a few gigabytes a day. The real difficulty is many people trying to change the same seat counts in the same second.",
    ],
    calculator: { avgRps: 470, peakMultiplier: 27, rpsPerServer: 500, utilization: 0.6 },
  },

  architecture: {
    intro:
      "Here is the whole system on one page, following you from login to ticket. Start with the simple view, then switch to the detailed view to see every part. Press Send request to watch your booking travel through it, and select any box to learn what it does.",
    workflow: {
      id: "overview",
      title: "Booking a ticket, end to end",
      summary: "Your journey from opening the app to holding a PNR.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "cdn", label: "CDN", kind: "edge", col: 1, row: 0, tags: ["cache"], explain: X.cdn },
        { id: "auth", label: "Login service", kind: "service", col: 2, row: 0, explain: X.auth },
        { id: "api", label: "API gateway", kind: "service", col: 3, row: 0, explain: X.api },
        { id: "search", label: "Train search", kind: "service", col: 3, row: 1, tags: ["cache"], explain: X.search },
        { id: "booking", label: "Booking service", kind: "service", col: 2, row: 1, tags: ["retry"], explain: X.booking },
        { id: "inventory", label: "Seat and quota database", kind: "database", col: 2, row: 2, tags: ["transaction"], explain: X.inventory },
        { id: "payment", label: "Payment gateway", kind: "external", col: 1, row: 1, explain: X.payment },
        { id: "pnrdb", label: "Ticket database", kind: "database", col: 1, row: 2, tags: ["transaction"], explain: X.pnrdb },
        { id: "queue", label: "Message queue", kind: "queue", col: 0, row: 1, explain: X.queue },
        { id: "sms", label: "SMS and email", kind: "service", col: 0, row: 2, explain: X.sms },
      ],
      simple: [
        { node: "you", text: "You open the IRCTC app." },
        { node: "auth", text: "You log in with your user ID, password and captcha." },
        { node: "search", text: "You search trains from Delhi to Patna for tomorrow and see seats left." },
        { node: "booking", text: "You tap Book Now for a 3A Tatkal berth." },
        { node: "payment", text: "You pay with UPI." },
        { node: "you", from: "booking", text: "You get your ticket and PNR." },
      ],
      detailed: [
        { node: "you", text: "At 9:50 AM you open the IRCTC app." },
        { node: "cdn", text: "The app's screens and pictures load from a CDN server near you, so the booking servers do no work yet." },
        { node: "auth", text: "You type your user ID, password and captcha. The login service checks them and starts your session." },
        { node: "api", text: "From now on every request you send passes through the API gateway, which checks your session and your request limits." },
        { node: "search", text: "You search Delhi to Patna for tomorrow. The search service reads seats-left numbers from a fast cache." },
        { node: "booking", from: "api", text: "At 10:00 you tap Book Now for 3A Tatkal. The booking service takes over." },
        { node: "inventory", text: "In one transaction, the booking service takes one berth from the 3A Tatkal quota for your train and date." },
        { node: "payment", from: "booking", text: "You pay with UPI. The payment gateway asks your bank and reports success." },
        { node: "pnrdb", from: "booking", text: "Your ticket is saved with a PNR number and berth number." },
        { node: "queue", from: "pnrdb", async: true, text: "A 'ticket booked' job goes into the message queue. You do not wait for it." },
        { node: "sms", async: true, text: "In the background, you get an SMS and email with your PNR." },
        { node: "you", from: "booking", text: "Your screen shows 'CNF B2-34'. You are going to Patna." },
      ],
      failures: [
        {
          id: "search-overload",
          title: "Train search is overloaded at 10:00",
          node: "search",
          what: "Everyone refreshes the seats-left numbers at the same moment, and search slows down.",
          userSees: "Search results take a little longer and may show numbers from a few seconds ago. Booking still checks the real count.",
          detect: "Search response time rises and the number of search requests per second jumps far above normal.",
          steps: [
            { node: "search", from: "api", text: "Search answers only from the cache, which can be a few seconds old, instead of asking the database." },
            { node: "api", from: "search", text: "The gateway limits how often one account can search per minute, so refreshing over and over does not help bots." },
            { node: "you", from: "api", text: "You see slightly older numbers, but your booking is still checked against the real seat database." },
          ],
        },
        {
          id: "sms-down",
          title: "The SMS provider is down",
          node: "sms",
          what: "Messages cannot be sent for a while.",
          userSees: "Your ticket shows in the app and on the website straight away. The SMS arrives later.",
          detect: "Jobs pile up in the message queue and sending errors rise.",
          steps: [
            { node: "queue", from: "sms", text: "Each job stays in the queue until it succeeds, so no message is lost." },
            { node: "sms", from: "queue", text: "When the provider recovers, each job is tried again. The sender checks first, so you do not get the same SMS twice." },
          ],
        },
      ],
    },
  },

  workflows: [
    {
      id: "login",
      title: "Logging in before Tatkal opens",
      summary: "How the system gets ready for you at 9:58 AM, when everyone is logging in at the same time.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "cdn", label: "CDN", kind: "edge", col: 1, row: 0, tags: ["cache"], explain: X.cdn },
        { id: "auth", label: "Login service", kind: "service", col: 2, row: 0, explain: X.auth },
        { id: "users", label: "User accounts", kind: "database", col: 3, row: 0, explain: {
          what: "The database of IRCTC accounts: your user ID, a scrambled (hashed) form of your password, and whether you are Aadhaar-verified.",
          why: "The login service needs to compare what you typed with what you set up when you registered.",
          input: "Your user ID.",
          inside: "Finds your account and returns the stored password check and your verification status.",
          output: "Your account details, without the real password.",
          risks: ["If it is slow, every login is slow."],
        } },
        { id: "session", label: "Session store", kind: "cache", col: 2, row: 1, tags: ["cache"], explain: {
          what: "A fast, in-memory store of who is logged in right now.",
          why: "After you log in, every request needs to know it is you. Checking a fast store is much quicker than logging in again each time.",
          input: "New sessions after login, and session checks on every request.",
          inside: "Keeps your session for a limited time, then deletes it.",
          output: "Yes, this request belongs to you, or no, please log in again.",
          risks: ["If it is lost, everyone is logged out at once, at the worst moment."],
        } },
      ],
      simple: [
        { node: "you", text: "At 9:50 AM you open the app and tap Login." },
        { node: "auth", text: "You type your user ID, password and captcha. The login service checks them." },
        { node: "you", from: "auth", text: "You are logged in and ready for 10:00." },
      ],
      detailed: [
        { node: "you", text: "At 9:50 AM you open the app and tap Login." },
        { node: "cdn", text: "The login page loads from a CDN server near you." },
        { node: "auth", text: "You type your user ID, password and the captcha. The captcha makes life harder for programs that log in automatically." },
        { node: "users", text: "The login service finds your account and checks your password against the stored, scrambled version. It also sees that your account is Aadhaar-verified." },
        { node: "session", from: "auth", text: "A session is created and stored, so the next requests you send are recognised without logging in again." },
        { node: "you", from: "auth", text: "You are logged in at 9:51 AM, well before the rush." },
      ],
      failures: [
        {
          id: "login-rush",
          title: "Too many people log in at 9:59",
          node: "auth",
          what: "A huge wave of logins arrives in the last minute before Tatkal opens.",
          userSees: "A short 'please wait' message, then you are logged in. People who logged in earlier are not affected.",
          detect: "Login response time and the number of logins per second jump sharply just before 10:00.",
          steps: [
            { node: "auth", from: "cdn", text: "The login service accepts only as many logins at once as it can handle. The rest wait a few seconds instead of all failing." },
            { node: "you", from: "auth", text: "You see 'please wait', then you are logged in. This is why logging in early helps you." },
          ],
        },
        {
          id: "session-lost",
          title: "A session store machine fails",
          node: "session",
          what: "One of the machines holding logged-in sessions stops.",
          userSees: "Usually nothing. At worst you are asked to log in again. No booking is lost.",
          detect: "Session checks start failing for some users.",
          steps: [
            { node: "session", from: "auth", text: "Each session is copied to a second machine, so the copy takes over." },
            { node: "you", from: "auth", text: "If a session was not copied in time, you are asked to log in again. Your bookings are stored in a different database, so they are safe." },
          ],
        },
      ],
    },
    {
      id: "availability",
      title: "Checking seat availability",
      summary: "How you see 'AVAILABLE 42' or 'WL 18' in under a second, even when everyone is checking at once.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "search", label: "Train search", kind: "service", col: 2, row: 0, explain: X.search },
        { id: "seatcache", label: "Availability cache", kind: "cache", col: 3, row: 0, tags: ["cache"], explain: {
          what: "A cache: a fast copy of the seats-left numbers kept in memory.",
          why: "At 10:00 a very large number of people check seats again and again. Answering all of them from the main seat database would slow down the database that has to make bookings.",
          input: "Fresh counts copied from the seat database every few seconds.",
          inside: "Stores the count for each train, date, class and quota, and returns it in about a millisecond.",
          output: "Seats left, RAC or waiting-list numbers.",
          risks: ["The number can be a few seconds old, so a seat you see may already be gone."],
        } },
        { id: "inventory", label: "Seat and quota database", kind: "database", col: 3, row: 1, tags: ["transaction"], explain: X.inventory },
      ],
      simple: [
        { node: "you", text: "You search for 3A Tatkal on trains from Delhi to Patna tomorrow." },
        { node: "search", text: "The search service looks up the trains and how many seats are left." },
        { node: "you", from: "search", text: "You see the list, for example 'AVAILABLE 12' on one train and 'WL 5' on another." },
      ],
      detailed: [
        { node: "you", text: "You search for 3A Tatkal on trains from Delhi to Patna tomorrow." },
        { node: "api", text: "The gateway checks your session and that you are not searching too many times a minute." },
        { node: "search", text: "The search service finds the trains that run on this route on that date." },
        { node: "seatcache", text: "For each train it reads seats left from the availability cache instead of the database." },
        { node: "inventory", from: "seatcache", async: true, text: "Every few seconds, the cache is refreshed from the real seat database in the background." },
        { node: "you", from: "search", text: "You see seats left for each train within a second." },
      ],
      failures: [
        {
          id: "stale-count",
          title: "The cache shows a seat that is already gone",
          node: "seatcache",
          what: "The cache said 'AVAILABLE 1', but that last berth was sold two seconds ago.",
          userSees: "When you tap Book, you are offered a waiting-list ticket instead, with a clear message.",
          detect: "Bookings that see 'available' in search but find no berth in the database.",
          steps: [
            { node: "inventory", from: "api", text: "When you tap Book, the real seat database is checked inside a transaction, never the cache." },
            { node: "you", from: "api", text: "You see 'No berth left; book as WL 1?'. You choose whether to continue. Nobody gets a berth twice." },
          ],
        },
      ],
    },
    {
      id: "book",
      title: "Booking a Tatkal ticket at 10:00",
      summary: "The most important journey: what happens between tapping Book Now and seeing your berth number.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "bq", label: "Booking queue", kind: "queue", col: 2, row: 0, tags: ["queue"], explain: {
          what: "A queue in front of the booking service: booking requests wait here in the order they arrived.",
          why: "At 10:00 far more people tap Book than the booking service can process in the same second. A queue makes them wait in order instead of crashing the service.",
          input: "Booking requests from people like you.",
          inside: "Holds requests in arrival order and hands them to the booking service at the rate it can handle.",
          output: "One request at a time per worker, in order.",
          risks: ["If it lets requests in too fast, the booking service overloads anyway.", "Long waits make people tap again."],
        } },
        { id: "booking", label: "Booking service", kind: "service", col: 3, row: 0, tags: ["retry"], explain: X.booking },
        { id: "otp", label: "Aadhaar OTP check", kind: "external", col: 3, row: 1, explain: {
          what: "A one-time password (OTP) check sent to the mobile number linked to your Aadhaar.",
          why: "Since July 2025, Tatkal booking needs an Aadhaar-based OTP. It proves a real, verified person is booking, which makes it harder for programs to grab berths.",
          input: "Your request, and the OTP you type in.",
          inside: "Sends a 6-digit code to your phone and checks that you typed the same code.",
          output: "Verified or not verified.",
          risks: ["The OTP SMS arrives late during the rush.", "You type it wrong and have to request a new one."],
        } },
        { id: "inventory", label: "Seat and quota database", kind: "database", col: 2, row: 1, tags: ["transaction"], explain: X.inventory },
        { id: "payment", label: "Payment gateway", kind: "external", col: 2, row: 2, explain: X.payment },
        { id: "pnrdb", label: "Ticket database", kind: "database", col: 3, row: 2, tags: ["transaction"], explain: X.pnrdb },
        { id: "refund", label: "Payment check job", kind: "service", col: 1, row: 2, failureOnly: true, explain: {
          what: "A background job that finds payments that did not turn into tickets, and fixes them.",
          why: "Sometimes your bank takes the money but something fails before the ticket is saved. The railway must never keep money without giving a ticket.",
          input: "Payments marked 'paid but not booked', and the gateway's list of payments.",
          inside: "Checks each one with the payment gateway, then refunds the money and gives the berth back.",
          output: "Refunds and released berths.",
          risks: ["If it falls behind, refunds take longer."],
        } },
      ],
      simple: [
        { node: "you", text: "At 10:00:05 you tap Book Now for 3A Tatkal." },
        { node: "bq", text: "Your request waits in line with everyone else's, in the order it arrived." },
        { node: "booking", text: "When your turn comes, a berth is taken for you." },
        { node: "payment", text: "You pay with UPI." },
        { node: "you", from: "booking", text: "You see your berth number and PNR." },
      ],
      detailed: [
        { node: "you", text: "At 10:00:05 you tap Book Now for 3A Tatkal. The app sends a unique request ID with it, so a repeat tap cannot book twice." },
        { node: "api", text: "The gateway checks your session and that your account is Aadhaar-verified." },
        { node: "bq", text: "Your request joins the booking queue, in arrival order. You see 'please wait, your request is being processed'." },
        { node: "booking", text: "When your turn comes, the booking service picks up your request." },
        { node: "otp", text: "An OTP is sent to your Aadhaar-linked mobile. You type it in, and it is checked." },
        { node: "inventory", from: "booking", text: "In one transaction, one berth is taken from the 3A Tatkal quota for your train and date. If none are left, you are offered a waiting-list number instead. The berth is held for you for a few minutes while you pay." },
        { node: "payment", from: "booking", text: "You pay with UPI. The gateway asks your bank and reports success, using the same request ID so a retry can never charge you twice." },
        { node: "pnrdb", from: "booking", text: "Your ticket is saved with a PNR, berth number and a 'ticket booked' message, together in one transaction." },
        { node: "you", from: "booking", text: "Your screen shows 'CNF B2-34'. The SMS follows a moment later." },
      ],
      failures: [
        {
          id: "paid-no-ticket",
          title: "Money is deducted but no ticket is booked",
          node: "pnrdb",
          what: "Your bank took the money, but saving the ticket failed.",
          userSees: "'Booking failed. Your money will be refunded automatically.' The refund then reaches your bank account.",
          detect: "A successful payment with no matching ticket after a short time.",
          steps: [
            { node: "refund", from: "pnrdb", text: "The ticket could not be saved, so the payment is marked 'paid but not booked'. The payment check job picks it up." },
            { node: "payment", from: "refund", text: "The job asks the payment gateway to return your money, using the payment's unique ID so it is refunded exactly once." },
            { node: "inventory", from: "refund", text: "The berth that was held for you goes back into the Tatkal quota for someone else." },
            { node: "you", from: "booking", text: "You are told clearly that the booking failed and the refund has started. You are not left wondering." },
          ],
        },
        {
          id: "quota-gone",
          title: "The Tatkal quota runs out before your turn",
          node: "inventory",
          what: "By the time your request reaches the seat database, all 3A Tatkal berths on your train are taken.",
          userSees: "'No berth left. Book as WL 7?' You decide whether to continue, before paying anything.",
          detect: "The transaction finds the quota count at zero.",
          steps: [
            { node: "booking", from: "inventory", text: "The database reports that no berth is left. Nothing has been charged yet." },
            { node: "you", from: "booking", text: "You are offered a waiting-list ticket or the option to stop. No money is taken unless you agree." },
          ],
        },
      ],
    },
    {
      id: "cancel",
      title: "Cancelling, and how the waiting list moves",
      summary: "What happens when you cancel, and how someone on the waiting list gets your berth.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "booking", label: "Booking service", kind: "service", col: 2, row: 0, explain: X.booking },
        { id: "inventory", label: "Seat and quota database", kind: "database", col: 3, row: 0, tags: ["transaction"], explain: X.inventory },
        { id: "wl", label: "Waiting list", kind: "queue", col: 3, row: 1, tags: ["queue"], explain: {
          what: "The ordered list of people waiting for a berth on a train, date and class.",
          why: "When a berth is freed, it must go to the person who has waited longest. An ordered list makes that automatic and fair.",
          input: "New waiting-list bookings, and freed berths.",
          inside: "Gives each freed berth to the first person in line, moves everyone else up by one, and records the change.",
          output: "Status changes, such as WL 1 becoming confirmed.",
          risks: ["If updates fall behind, people see their old status for a while."],
        } },
        { id: "other", label: "Waitlisted passenger", kind: "user", col: 2, row: 1, explain: {
          what: "Another passenger who booked a waiting-list ticket on the same train and class.",
          why: "Your cancellation is their chance to travel.",
          input: "A status update.",
          inside: "Their app and SMS show the new status.",
          output: "They know they are confirmed.",
          risks: ["They might not see the update until they check the app."],
        } },
        { id: "payment", label: "Payment gateway", kind: "external", col: 1, row: 1, explain: X.payment },
      ],
      simple: [
        { node: "you", text: "Your plans change, so you cancel your ticket." },
        { node: "booking", text: "The booking service cancels it and starts your refund." },
        { node: "wl", text: "Your berth goes to the first person on the waiting list." },
        { node: "other", text: "That passenger's ticket becomes confirmed." },
      ],
      detailed: [
        { node: "you", text: "Your grandmother recovers, so you open My Bookings and tap Cancel." },
        { node: "api", text: "The gateway checks the ticket belongs to your account. Nobody can cancel someone else's ticket by changing a number." },
        { node: "booking", text: "The booking service works out the cancellation charge under the railway's rules." },
        { node: "inventory", text: "In one transaction, your berth goes back to the train's quota." },
        { node: "wl", text: "The freed berth goes to the first person on the waiting list, and everyone behind them moves up one place." },
        { node: "other", async: true, text: "That passenger gets an SMS: their ticket is now confirmed." },
        { node: "payment", from: "booking", text: "Your refund, the fare minus the cancellation charge, is sent back through the payment gateway." },
        { node: "you", from: "booking", text: "You see the cancellation confirmed and your refund amount." },
      ],
      failures: [
        {
          id: "wl-lag",
          title: "Waiting-list updates fall behind",
          node: "wl",
          what: "During a busy period many cancellations arrive at once, and promotions are processed late.",
          userSees: "Waitlisted passengers see their new status a little later than usual.",
          detect: "The number of freed berths not yet given to the waiting list keeps growing.",
          steps: [
            { node: "wl", from: "inventory", text: "Each freed berth is saved before it is handed out, so no berth is ever lost, only delayed." },
            { node: "other", from: "wl", text: "When the backlog clears, statuses update in the right order: first in line, first confirmed." },
          ],
        },
      ],
    },
  ],

  database: {
    intro:
      "We use a relational database (such as PostgreSQL) for seats and tickets, because it supports transactions. In simple words, a transaction lets us say 'take one berth only if one is left', and be sure that two people can never both succeed.",
    entities: [
      { name: "Train run", purpose: "One train on one date, for example train 12309 on 26 October.", fields: [
        { name: "run_id", type: "id", note: "primary key" }, { name: "train_number", type: "text" }, { name: "journey_date", type: "date" },
      ], relations: ["Has a quota count for each class and quota", "Has many Tickets"] },
      { name: "Quota count", purpose: "How many berths are left for one class and quota on one train run, for example 3A Tatkal.", fields: [
        { name: "run_id", type: "id", note: "part of the key" }, { name: "class", type: "text", note: "for example 3A" }, { name: "quota", type: "text", note: "for example Tatkal" }, { name: "berths_left", type: "number", note: "never below zero" },
      ], relations: ["Belongs to a Train run"] },
      { name: "Ticket (PNR)", purpose: "One booking, which can have several passengers.", fields: [
        { name: "pnr", type: "10-digit number", note: "primary key" }, { name: "account_id", type: "id", note: "who booked it" }, { name: "run_id", type: "id" }, { name: "request_id", type: "text", note: "unique, stops double bookings" }, { name: "status", type: "booked, cancelled or payment pending" },
      ], relations: ["Has one or more Passengers", "Has one or more Payments"] },
      { name: "Passenger", purpose: "One traveller on a ticket and their seat status.", fields: [
        { name: "pnr", type: "number" }, { name: "name and age", type: "text and number" }, { name: "status", type: "CNF, RAC or WL", note: "with berth or list number" }, { name: "berth", type: "text", note: "for example B2-34, when confirmed" },
      ], relations: ["Belongs to a Ticket"] },
      { name: "Waiting-list entry", purpose: "One passenger's place in line for a train run, class and quota.", fields: [
        { name: "run_id, class, quota", type: "ids and text" }, { name: "position", type: "number", note: "1 is next in line" }, { name: "pnr", type: "number" },
      ], relations: ["Points to a Passenger"] },
      { name: "Payment", purpose: "One payment attempt, saved before we ask the bank.", fields: [
        { name: "payment_id", type: "id", note: "unique, sent to the gateway" }, { name: "pnr", type: "number" }, { name: "amount", type: "money" }, { name: "result", type: "success, failed, unknown or refunded" },
      ], relations: ["Belongs to a Ticket"] },
    ],
    why: [
      "Seat counts are kept per train run, class and quota. Booking a berth changes one small row, so many different trains can be booked at the same time without waiting for each other.",
      "The request ID on a ticket is unique. If your app sends the same booking twice, the database refuses the second one.",
      "Payments are saved before the bank is asked. If anything crashes, we still know exactly which payments to check and refund.",
    ],
  },

  decisions: [
    {
      id: "booking-queue",
      title: "Make booking requests wait in line at 10:00",
      problem: "At 10:00 far more people tap Book than the system can process in the same second. If every request goes straight to the booking service, it overloads, and then almost nobody gets a ticket.",
      solution: "Put a queue in front of the booking service. Requests wait in arrival order and are taken at a steady rate.",
      how: "When you tap Book, your request joins the queue and you see 'please wait'. The booking service takes the next requests as fast as it can safely handle them. Because the line is in arrival order, tapping again does not move you forward.",
      where: "Between the API gateway and the booking service.",
      tradeoff: "You may wait a few seconds or minutes. In return, the requests that reach the booking service actually succeed. Try it below: lower the rate and the line grows, but the booking system never overloads.",
      demo: "queue",
      demoPeople: "passengers",
      demoPlace: "booking system",
    },
    {
      id: "quota-count",
      title: "Count berths per quota, and take one in a transaction",
      problem: "Two people can try to book the last 3A Tatkal berth in the same millisecond. If the system first reads 'one left' and then saves 'zero left', both can read 'one left' before either saves.",
      solution: "Keep a count of berths left for each train, date, class and quota, and change it with one atomic step.",
      how: "The booking service sends one instruction: 'reduce berths_left by one, but only if it is more than zero'. The database runs competing instructions one at a time. The second person finds zero, and is offered the waiting list instead.",
      where: "Between the booking service and the seat and quota database.",
      tradeoff: "Requests for the same train and class wait for each other for a moment. That is fine, because different trains do not block each other.",
    },
    {
      id: "hold-while-paying",
      title: "Hold the berth for a few minutes while you pay",
      problem: "Paying takes time. If the berth were only taken after payment, you could pay and then find the berth gone.",
      solution: "Take the berth first, mark it as held for you, and give it back if you do not pay in time.",
      how: "The berth is held with an expiry time. If your payment succeeds, the hold becomes your ticket. If you close the app or the time runs out, a background job returns the berth to the quota.",
      where: "In the booking service and the seat database.",
      tradeoff: "Berths held by people who never pay are locked for a few minutes. A shorter hold frees them sooner, but rushes slow payers.",
    },
    {
      id: "waiting-list",
      title: "Keep the waiting list as an ordered line",
      problem: "When someone cancels, the freed berth must go to the right person, the one who has waited longest, and nobody should be skipped.",
      solution: "Store the waiting list as an ordered list per train, date, class and quota, and promote from the front.",
      how: "A cancellation returns a berth, and the waiting list gives it to position 1. Everyone else moves up by one. The passenger gets an SMS.",
      where: "Next to the seat and quota database, triggered by cancellations.",
      tradeoff: "Status changes may arrive a little late when many cancellations happen together. But they are never lost and always in order.",
    },
    {
      id: "availability-cache",
      title: "Show seats left from a cache",
      problem: "People check availability far more often than they book. If every check went to the seat database, the checks would slow down the bookings.",
      solution: "Keep a copy of the seats-left numbers in a fast in-memory cache and refresh it every few seconds.",
      how: "Search reads only from the cache. In the background, the cache is updated from the seat database. The real database is used only when you actually book.",
      where: "Next to the train search service.",
      tradeoff: "The number you see can be a few seconds old. The booking transaction always checks the real count, so the worst case is that you are offered the waiting list instead of a berth.",
    },
    {
      id: "no-money-without-ticket",
      title: "Never keep money without giving a ticket",
      problem: "Networks and banks fail. Sometimes the bank takes your money but the ticket is not saved, or the bank's reply never arrives.",
      solution: "Give every payment a unique ID, save it before asking the bank, and run a job that checks unfinished payments and refunds them.",
      how: "The same payment ID is used on every retry, so you can never be charged twice. A payment check job regularly compares the railway's records with the gateway's, and refunds any payment that has no ticket.",
      where: "Around the booking service and the payment gateway.",
      tradeoff: "The design is more complicated, and refunds take time to reach your bank. But no passenger is ever left with money taken and no ticket.",
    },
    {
      id: "aadhaar",
      title: "Verify identity for Tatkal",
      problem: "Programs (bots) and agents can book berths faster than people, leaving nothing for passengers who really need to travel.",
      solution: "Allow Tatkal booking only from Aadhaar-verified accounts, with an OTP, and keep agents out of the first 30 minutes. These are public railway rules since July 2025.",
      how: "During booking, an OTP is sent to the mobile number linked to the passenger's Aadhaar, and the booking continues only after it is entered correctly.",
      where: "In the booking flow, before a berth is taken.",
      tradeoff: "It adds a step and depends on the OTP arriving on time. In return it is much harder to book Tatkal with automated programs.",
    },
  ],

  failures: [
    {
      title: "Money is deducted but no ticket is booked",
      what: "Your bank took the money, but the ticket was not saved.",
      userSees: "'Booking failed; your money will be refunded automatically'. The refund reaches your account later.",
      detect: "A successful payment with no ticket after a short time.",
      recover: "The payment check job refunds the money using the payment's ID and returns the held berth to the quota.",
      prevent: "Save the payment before asking the bank. Test by stopping the booking service just after a fake bank approves a payment, then check that exactly one refund happens.",
    },
    {
      title: "The bank does not reply",
      what: "The payment gateway does not hear back from your bank, so nobody knows whether you paid.",
      userSees: "'Payment status pending.' Your berth stays held while it is checked.",
      detect: "A payment stays 'unknown' longer than the gateway's time limit.",
      recover: "The payment check job asks the gateway what happened. If you paid, the ticket is confirmed; if not, the berth is released.",
      prevent: "Never release the berth while the payment is unknown. Test with a fake bank that never answers.",
    },
    {
      title: "Everyone arrives at 10:00",
      what: "The Tatkal opening brings a burst of requests, much larger than the daily average. IRCTC's own record minute was 10:01 AM.",
      userSees: "A short wait in the booking queue rather than error pages.",
      detect: "Requests per second and queue length jump at 10:00 and 11:00.",
      recover: "The booking queue takes requests at a safe rate; search answers from the cache; limits stop repeated refreshing.",
      prevent: "Add servers before 10:00 rather than waiting for automatic scaling, which takes minutes. Practise with a load test that copies the 10:00 burst.",
      evidence: "public",
      sources: ["irctc-it"],
    },
    {
      title: "The OTP arrives late",
      what: "During the rush, SMS delivery is slow and the Aadhaar OTP takes a while to arrive.",
      userSees: "You wait for the OTP. Your place is not lost while you wait.",
      detect: "The time between sending an OTP and receiving the correct code goes up.",
      recover: "Keep your request's place for a reasonable time and allow you to resend the OTP.",
      prevent: "Ask for the OTP before taking a berth, so a slow OTP never holds a berth that someone else could use.",
    },
    {
      title: "You book from two phones at the same time",
      what: "You tap Book on your phone and your laptop for the same journey.",
      userSees: "Two separate bookings if they are different requests, each clearly shown. A repeat of the same request is never booked twice.",
      detect: "The same request ID arriving twice, or many bookings from one account at once.",
      recover: "The unique request ID makes the repeat return the first result. Account limits stop too many bookings at once.",
      prevent: "Generate the request ID when you open the booking form, not when you tap Book. Test by sending the same request 20 times at once.",
    },
    {
      title: "Programs try to grab berths",
      what: "Automated programs log in and book faster than people can.",
      userSees: "Fewer Tatkal berths left for real passengers, if nothing is done.",
      detect: "Many logins or bookings from the same devices, and unusually fast form filling.",
      recover: "Block the accounts and cancel bookings that broke the rules.",
      prevent: "Captcha at login, Aadhaar OTP for Tatkal, request limits per account, and no agents in the first 30 minutes.",
      evidence: "public",
      sources: ["tatkal-aadhaar"],
    },
  ],

  recap: {
    decisions: [
      { decision: "Booking queue at 10:00", why: "Turns a burst into a steady stream the system can handle.", cost: "You may wait a little." },
      { decision: "Berth counts changed in a transaction", why: "A berth is never sold twice.", cost: "Requests for the same train wait for each other briefly." },
      { decision: "Hold the berth while you pay", why: "You do not lose the berth during payment.", cost: "Unpaid holds lock berths for a few minutes." },
      { decision: "Ordered waiting list", why: "Freed berths go to whoever waited longest.", cost: "Status updates can lag during busy periods." },
      { decision: "Seats-left from a cache", why: "Search stays fast and protects the database.", cost: "Numbers can be a few seconds old." },
      { decision: "Payment IDs and a payment check job", why: "Nobody keeps money without a ticket.", cost: "More moving parts; refunds take time." },
    ],
    questions: [
      { q: "How do you stop two people booking the same last berth?", a: "Change the berth count in one transaction that only succeeds if a berth is left. The database runs the two requests one after the other; the second sees zero and is offered the waiting list." },
      { q: "Why not just add enough servers for 10:00?", a: "The peak is about 27 times the daily average, but only for a minute or two. Servers for that peak would sit idle all day, and automatic scaling is too slow for a burst that starts in one second. A queue, a cache and servers added before 10:00 together are cheaper and more reliable." },
      { q: "A passenger says money was deducted but no ticket was booked. What does your design do?", a: "The payment was saved with a unique ID before the bank was asked. The payment check job finds payments with no ticket, asks the gateway to refund exactly once, and returns the held berth." },
      { q: "How does the waiting list move when someone cancels?", a: "The cancellation returns a berth inside a transaction, and the waiting list gives it to position 1 and moves everyone else up. Each freed berth is saved before it is handed out, so none are lost even if processing is delayed." },
      { q: "How is IRCTC's problem different from a concert ticket sale?", a: "Train berths have quotas, a waiting list and RAC, so 'sold out' still allows booking a place in line. Seats are also sold at station counters, so every channel must share one seat record. And the rush happens every single day at 10:00 and 11:00, not once per event." },
    ],
  },
};
