import type { TutorialInput } from "@/lib/schema";

/*
 * Netflix: a beginner tutorial on designing a video streaming service.
 * The reader is the viewer throughout. Everything not marked "public" is a proposed design,
 * not a description of Netflix's internal systems.
 */

// Public: "We finished 2024 with 302M memberships." (source "nflx-q4-2024")
const MEMBERSHIPS = 302_000_000;

// Illustrative assumptions.
const WATCHING_SHARE = 0.1;
const BITRATE_MBPS = 5;
const SESSION_MIN = 45;
const REQ_PER_START = 30;
const PROGRESS_SEC = 60;
const LADDER_MBPS = 30;

const streams = MEMBERSHIPS * WATCHING_SHARE;
const tbps = (streams * BITRATE_MBPS) / 1_000_000;
const startsPerSec = streams / (SESSION_MIN * 60);
const controlRps = startsPerSec * REQ_PER_START;
const progressRps = streams / PROGRESS_SEC;
const gbPerHour = (LADDER_MBPS * 3600) / 8 / 1000;

const r = (n: number, d = 0) => Number(n.toFixed(d));

// Plain-English explanations, written with you as the viewer.
const X = {
  you: {
    what: "You, watching Netflix on your TV, phone or laptop.",
    why: "Everything starts with you choosing something to watch and pressing Play.",
    input: "Your clicks and remote-control presses.",
    inside: "The Netflix app shows the home page, asks for video, and plays it from a small store of video it keeps ready.",
    output: "Requests to Netflix, and downloads of video chunks.",
    risks: ["Your Wi-Fi slows down in the middle of an episode.", "Your internet provider's network is busy at 9 PM."],
  },
  api: {
    what: "The API gateway: the front door to Netflix's services in the cloud.",
    why: "The app needs one place to send requests for the home page, search and playback, with sign-in checks done once.",
    input: "Requests from the app.",
    inside: "Checks your account and device, then sends each request to the right service.",
    output: "Checked requests to the home page, playback and other services.",
    risks: ["If it is down, you cannot browse or start a show, even though the video servers are fine."],
  },
  home: {
    what: "The home page service builds the rows you see: Continue Watching, Top 10, new releases and so on.",
    why: "There are thousands of titles. Showing you the ones you are most likely to enjoy, in a useful order, is what makes the home page work.",
    input: "Your profile, what you have watched, and the list of available titles.",
    inside: "Asks the recommendation service for your rows, adds artwork and details, and puts the page together.",
    output: "Your personal home page.",
    risks: ["If recommendations are slow, the whole home page is slow unless it stops waiting."],
  },
  recs: {
    what: "The recommendation service chooses which titles to show you, and in what order.",
    why: "Two people rarely want the same home page. Recommendations are worked out from what you and similar viewers watched.",
    input: "Your profile and viewing history.",
    inside: "Uses results calculated earlier (it would be too slow to calculate everything when you open the app) and adjusts them to the moment.",
    output: "Ordered lists of titles for your rows.",
    risks: ["It can be slow or fail. The home page must still appear."],
  },
  playback: {
    what: "The playback service decides how your TV should play the title you chose.",
    why: "Before any video flows, someone has to check your plan, your device, and which video files and servers to use.",
    input: "The title you pressed Play on, your account and your device.",
    inside: "Checks what your plan and device allow, asks for a licence key and nearby servers, and puts together a playback plan.",
    output: "A 'manifest': the list of quality levels and where to download them from.",
    risks: ["On release night, very many people press Play on the same episode at once."],
  },
  license: {
    what: "The licence service hands out keys that unlock protected video (DRM, digital rights management).",
    why: "Films and shows are protected so they can only be played by paying members on approved devices. Your TV needs a key to decode the video.",
    input: "A key request from your device.",
    inside: "Checks the request is valid for your account and device, and returns a key.",
    output: "A decryption key for this title on this device.",
    risks: ["Without a key nothing plays, so this service must be very reliable."],
  },
  steering: {
    what: "The steering service picks which video servers your TV should download from.",
    why: "The video should come from a server close to you that has the title and is not overloaded.",
    input: "Your location and internet provider, and the title.",
    inside: "Finds nearby Open Connect boxes that hold the title, ranks them by closeness and how busy they are.",
    output: "A short, ordered list of servers to try.",
    risks: ["If its information is out of date, it can send you to a box that is busy."],
  },
  oca: {
    what: "An Open Connect box: a Netflix video server placed close to viewers, often inside your internet provider's network.",
    why: "Video is huge. Sending it across the world for every viewer would be slow and expensive. A copy nearby makes playback fast and keeps the long-distance internet free.",
    input: "Requests for small chunks of video.",
    inside: "Holds copies of many titles on its disks and sends chunks as fast as your connection allows.",
    output: "Video chunks to your device.",
    risks: ["A box can fail or become very busy in the evening."],
  },
  history: {
    what: "Your viewing history: what you have watched and where you stopped.",
    why: "Continue Watching, recommendations and resuming on another device all depend on it.",
    input: "Progress reports from your device every so often.",
    inside: "Saves the latest position for each title on each profile.",
    output: "Your progress, used by the home page and the player.",
    risks: ["It receives a very large number of small writes; if it is slow, the latest position may be a little behind."],
  },
};

export const netflix: TutorialInput = {
  slug: "netflix",
  title: "Design a video streaming service like Netflix",
  summary:
    "How to start a show within seconds, keep it playing smoothly when your Wi-Fi wobbles, and serve a whole country's evening viewing without the internet grinding to a halt.",
  lastVerifiedAt: "2026-10-22",
  patterns: ["cdn-edge-caching", "cache-aside", "circuit-breaker", "bulkhead-isolation", "retry-with-jitter", "load-balancing", "feature-flags", "dead-letter-queue"],
  sources: [
    {
      id: "nflx-q4-2024",
      title: "Netflix Fourth Quarter 2024 Letter to Shareholders",
      publisher: "Netflix (investor relations)",
      url: "https://s22.q4cdn.com/959853165/files/doc_financials/2024/q4/FINAL-Q4-24-Shareholder-Letter.pdf",
      kind: "official",
      publishedAt: "2025-01-21",
      accessedAt: "2026-10-22",
      note: "Memberships are accounts, not people. Netflix said it would stop reporting memberships every quarter from 2025.",
    },
    {
      id: "open-connect",
      title: "Netflix Open Connect",
      publisher: "Netflix",
      url: "https://openconnect.netflix.com/en/",
      kind: "official",
      publishedAt: null,
      accessedAt: "2026-10-22",
      note: "Netflix's page for internet providers. It does not give a share of traffic served.",
    },
    {
      id: "chaos-monkey",
      title: "Chaos Monkey",
      publisher: "Netflix (open source)",
      url: "https://netflix.github.io/chaosmonkey/",
      kind: "documentation",
      publishedAt: null,
      accessedAt: "2026-10-22",
    },
  ],

  intro: {
    paragraphs: [
      "Netflix lets you watch films and series on almost any screen. Pressing Play feels instant, but behind it two very different systems work together: one in the cloud that knows who you are and what you can watch, and one made of video servers placed close to you that actually send the pictures.",
      "Streaming is different from a booking site. Nobody is fighting over a scarce seat. The hard part is size: video is enormous, and in the evening a large part of a country is watching at the same time. The system's job is to move all that video quickly, close to where people are, and keep it playing even when networks misbehave.",
      "In this tutorial we design a streaming service that starts quickly, adapts to your connection, survives server failures without you noticing, and remembers where you stopped.",
      {
        text: "This is a proposed design based on public information. Netflix has published parts of its approach, such as its Open Connect video servers, but not its full internal system, so the components and most numbers here are our own reasoning, labelled as such.",
        evidence: "inferred",
        sources: [],
      },
    ],
    known: [
      {
        text: "Netflix reported that it finished 2024 with 302 million memberships, and said that from 2025 it would no longer report memberships every quarter.",
        evidence: "public",
        sources: ["nflx-q4-2024"],
      },
      {
        text: "Netflix runs Open Connect, a programme in which its video servers (Open Connect Appliances) can be placed inside internet providers' networks or connected at data centres and internet exchanges. Netflix says it partners with over a thousand internet providers and runs appliances in 60+ data centres.",
        evidence: "public",
        sources: ["open-connect"],
      },
      {
        text: "Netflix describes nightly content fills: the appliances are loaded and updated with content overnight.",
        evidence: "public",
        sources: ["open-connect"],
      },
      {
        text: "Netflix built and open-sourced Chaos Monkey, which randomly terminates servers in production so that engineers build services that survive server failures.",
        evidence: "public",
        sources: ["chaos-monkey"],
      },
    ],
    story: {
      title: "Imagine you are the viewer",
      steps: [
        "The new season of a show you love came out today. At 9 PM you sit down and turn on Netflix on your TV.",
        "Your home page opens with the new season right at the top, next to Continue Watching.",
        "You press Play. Within about two seconds the episode starts. For a moment it looks a little soft, then it becomes sharp.",
        "Halfway through, someone in your house starts a big download and your Wi-Fi slows down. The picture gets slightly less sharp, but it never stops to load.",
        "You stop at 32 minutes and go to bed. Next morning, on the bus, you open Netflix on your phone and it offers to continue from 32 minutes.",
        "In this tutorial we follow you through each of those moments. Where did the video come from? How did it start so fast? Why did it not freeze when your Wi-Fi slowed down? And how did your phone know where you stopped?",
      ],
    },
  },

  requirements: {
    functional: [
      "You can browse a home page of titles chosen for you, and search.",
      "You can press Play and start watching within a couple of seconds.",
      "Video quality adjusts automatically to your internet speed.",
      "Only members with the right plan and approved devices can play protected titles.",
      "Your progress is saved, so you can continue on any device.",
      "New titles are available everywhere at their release time.",
    ],
    nonFunctional: [
      { name: "Fast start", meaning: "Little waiting after pressing Play.", target: "Video starts in about two seconds on a normal connection." },
      { name: "Smooth playback", meaning: "No stopping to load in the middle of a show.", target: "Rebuffering is rare; quality drops before playback stops." },
      { name: "Scalability", meaning: "The system can grow by adding servers.", target: "Handles the evening peak across a whole country." },
      { name: "Availability", meaning: "The service keeps working instead of showing errors.", target: "Playback continues if one server or one cloud region fails." },
      { name: "Cost", meaning: "Moving data is expensive.", target: "Most video travels a short distance, from servers close to viewers." },
    ],
    outOfScope: ["Making the shows", "Billing and sign-up", "Live sports and live events"],
    terms: [
      { term: "CDN", meaning: "Content delivery network: many servers in many places holding copies of content close to users. Netflix's own CDN is called Open Connect." },
      { term: "Bitrate", meaning: "How much data per second a video needs. Higher bitrate usually means sharper picture and a bigger download." },
      { term: "Chunk", meaning: "A small piece of a video, a few seconds long. Videos are downloaded chunk by chunk." },
      { term: "Buffer", meaning: "Video that has been downloaded but not watched yet. It is a cushion against short slowdowns." },
      { term: "Adaptive bitrate", meaning: "Choosing the quality of each next chunk based on how fast your connection is right now." },
      { term: "DRM", meaning: "Digital rights management: protecting video so only approved devices can decode it, using keys." },
    ],
  },

  capacity: {
    intro:
      "Let us estimate the work at the busiest evening hour. Netflix has published its number of memberships, so we start there and label everything else as an assumption. The result shows why streaming needs a very different design from a normal website.",
    assumptions: [
      { label: "Memberships at the end of 2024", value: MEMBERSHIPS, unit: "memberships", evidence: "public", sources: ["nflx-q4-2024"] },
      { label: "Share of memberships streaming at the busiest moment", value: WATCHING_SHARE * 100, unit: "%", note: "Illustrative; not a Netflix figure" },
      { label: "Average video bitrate", value: BITRATE_MBPS, unit: "Mbps", note: "Roughly HD quality" },
      { label: "Average viewing session", value: SESSION_MIN, unit: "minutes" },
      { label: "Requests to the cloud for one play start", value: REQ_PER_START, unit: "requests", note: "Home page, details, playback, licence, steering" },
      { label: "How often a device reports viewing progress", value: PROGRESS_SEC, unit: "seconds" },
      { label: "Total bitrate of all quality versions of one title", value: LADDER_MBPS, unit: "Mbps", note: "Sum of every resolution and quality kept" },
    ],
    steps: [
      { label: "Streams at the same time", formula: "memberships × share streaming", working: "302,000,000 × 0.10", result: r(streams), unit: "streams" },
      { label: "Video leaving servers every second", formula: "streams × bitrate", working: "30,200,000 × 5 Mbps", result: r(tbps), unit: "Tbps" },
      { label: "New plays started per second", formula: "streams ÷ session length in seconds", working: "30,200,000 ÷ 2,700", result: r(startsPerSec), unit: "starts/s" },
      { label: "Cloud requests per second from play starts", formula: "starts per second × requests per start", working: "11,185 × 30", result: r(controlRps), unit: "req/s" },
      { label: "Progress reports per second", formula: "streams ÷ report interval", working: "30,200,000 ÷ 60", result: r(progressRps), unit: "writes/s" },
      { label: "Storage for one hour of one title, all versions", formula: "total bitrate × 3,600 s ÷ 8", working: "30 Mbps × 3,600 ÷ 8", result: r(gbPerHour, 1), unit: "GB" },
    ],
    takeaways: [
      "Video traffic (about 151 terabits per second in this example) is millions of times larger than the cloud requests. No single data centre can send that. The video must come from many servers spread out close to viewers.",
      "The cloud part still matters: hundreds of thousands of requests per second for home pages, play starts and progress reports. But those are small messages, and they are a normal web-scale problem.",
      "Each title is stored in many versions, so storage per title is large. Copying popular titles to servers near viewers ahead of time is cheaper than sending them across the world on demand.",
    ],
    calculator: { avgRps: 110000, peakMultiplier: 3, rpsPerServer: 1000, utilization: 0.6 },
  },

  architecture: {
    intro:
      "Netflix-style streaming has two halves. The cloud half handles your account, home page and the decision to play. The video half, a network of servers near you, sends the actual pictures. Start with the simple view, then the detailed view, and press Send request to follow one evening of viewing.",
    workflow: {
      id: "overview",
      title: "From opening the app to watching",
      summary: "Your evening, from the home page to the video on your screen.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "home", label: "Home page service", kind: "service", col: 2, row: 0, explain: X.home },
        { id: "recs", label: "Recommendations", kind: "service", col: 3, row: 0, tags: ["cache"], explain: X.recs },
        { id: "playback", label: "Playback service", kind: "service", col: 2, row: 1, tags: ["retry"], explain: X.playback },
        { id: "license", label: "Licence service", kind: "service", col: 3, row: 1, explain: X.license },
        { id: "steering", label: "Steering service", kind: "service", col: 1, row: 1, explain: X.steering },
        { id: "oca", label: "Open Connect box", kind: "edge", col: 0, row: 1, tags: ["cache"], explain: X.oca },
        { id: "history", label: "Viewing history", kind: "database", col: 2, row: 2, explain: X.history },
        { id: "oca2", label: "Second-choice box", kind: "edge", col: 1, row: 2, failureOnly: true, tags: ["cache"], explain: X.oca },
      ],
      simple: [
        { node: "you", text: "You open Netflix on your TV." },
        { node: "home", text: "You see a home page of shows picked for you." },
        { node: "playback", text: "You press Play. Netflix decides how and where your TV should get the video." },
        { node: "oca", text: "The video streams to you from a Netflix server near you." },
        { node: "you", text: "You watch the episode." },
      ],
      detailed: [
        { node: "you", text: "At 9 PM you turn on your TV and open Netflix." },
        { node: "api", text: "The app's request reaches the API gateway in the cloud." },
        { node: "home", text: "The home page service builds your rows: Continue Watching, Top 10, new releases." },
        { node: "recs", text: "It asks the recommendation service which titles to show you, and in which order." },
        { node: "playback", from: "api", text: "You press Play on the new episode. The playback service checks your plan and device." },
        { node: "license", text: "The licence service gives your TV a key to unlock the protected video." },
        { node: "steering", from: "playback", text: "The steering service picks Open Connect boxes near you that have this episode." },
        { node: "you", from: "playback", text: "Your TV receives a plan: the quality levels available and the servers to download them from." },
        { node: "oca", text: "Your TV downloads the video in small chunks from an Open Connect box, often inside your own internet provider's network." },
        { node: "history", from: "playback", async: true, text: "Every minute or so your TV reports how far you have watched, and it is saved in your viewing history." },
      ],
      failures: [
        {
          id: "recs-down",
          title: "Recommendations are not answering",
          node: "recs",
          what: "The recommendation service is slow or down.",
          userSees: "Your home page shows popular and new titles instead of personal picks. Search and Play work as normal.",
          detect: "Recommendation requests time out or return errors.",
          steps: [
            { node: "home", from: "recs", text: "The home page service stops waiting after a short time instead of hanging." },
            { node: "you", from: "home", text: "You get a simpler home page with popular rows. You can still find and play your show." },
          ],
        },
        {
          id: "box-fails",
          title: "The video server fails mid-episode",
          node: "oca",
          what: "The Open Connect box your TV is downloading from stops answering.",
          userSees: "Usually nothing. At most a brief pause before the video carries on.",
          detect: "Your TV notices that chunks have stopped arriving.",
          steps: [
            { node: "you", from: "oca", text: "Your TV still has some seconds of video in its buffer, so the picture keeps going." },
            { node: "oca2", from: "you", text: "The TV switches to the next server on the list it was given, and keeps downloading from there." },
            { node: "you", from: "oca2", text: "The episode continues. You probably never noticed." },
          ],
        },
      ],
    },
  },

  workflows: [
    {
      id: "prepare",
      title: "Getting a new episode ready",
      summary: "What happens before release night, so the episode is already close to you when you press Play.",
      nodes: [
        { id: "studio", label: "Finished episode", kind: "user", col: 0, row: 0, explain: {
          what: "The finished episode as delivered: one very large, very high-quality master file.",
          why: "Everything you eventually watch is made from this one file.",
          input: "The final cut from the production team.",
          inside: "Nothing yet; it is the starting point.",
          output: "The master file, uploaded to Netflix.",
          risks: ["It is huge, so uploading and processing take time."],
        } },
        { id: "store", label: "Master storage", kind: "database", col: 1, row: 0, explain: {
          what: "Safe, long-term cloud storage for master files.",
          why: "If anything goes wrong later, the original is always there to start again from.",
          input: "Uploaded master files.",
          inside: "Stores them with several copies so they are never lost.",
          output: "The master file for encoding.",
          risks: ["Very large files cost money to keep, but they cannot be thrown away."],
        } },
        { id: "encode", label: "Encoding workers", kind: "service", col: 2, row: 0, tags: ["retry"], explain: {
          what: "Many computers that turn the master file into the versions you can stream.",
          why: "Phones, laptops and 4K TVs on fast and slow connections all need different versions of the same episode.",
          input: "The master file.",
          inside: "Split the episode into pieces, encode each piece at many resolutions and qualities in parallel, and cut the results into chunks a few seconds long.",
          output: "Many versions of the episode, in small chunks.",
          risks: ["A worker can crash halfway; only its piece should need redoing."],
        } },
        { id: "files", label: "Encoded files", kind: "database", col: 3, row: 0, explain: {
          what: "Storage for every finished version of every title.",
          why: "These are the files that are copied to video servers around the world.",
          input: "Finished, checked chunks from the encoders.",
          inside: "Keeps every version, ready to be copied out.",
          output: "Files for the nightly fill.",
          risks: ["A broken file here would reach every viewer, so files are checked before they are stored."],
        } },
        { id: "fill", label: "Nightly fill", kind: "service", col: 3, row: 1, explain: {
          what: "The process that copies titles to Open Connect boxes, mostly at night.",
          why: "At night, internet links are quiet. Copying then means the evening's viewing does not compete with the copying.",
          input: "Which titles each box should hold, often based on what is likely to be popular nearby.",
          inside: "Sends the new or popular files to each box during quiet hours.",
          output: "Boxes that already hold tomorrow's popular titles.",
          risks: ["A box that misses its fill does not have the new episode."],
        } },
        { id: "oca", label: "Open Connect box", kind: "edge", col: 2, row: 1, tags: ["cache"], explain: X.oca },
        { id: "catalog", label: "Catalog service", kind: "service", col: 1, row: 1, explain: {
          what: "The catalog knows which titles exist, in which countries, and from when.",
          why: "An episode must appear for everyone at its release time, not before.",
          input: "Title details and release times.",
          inside: "Switches a title to 'available' at its release time in each country.",
          output: "The list of what you can watch right now.",
          risks: ["A mistake here could release an episode early, or not at all."],
        } },
      ],
      simple: [
        { node: "studio", text: "The finished episode arrives as one very large master file." },
        { node: "encode", text: "It is turned into many versions, for every kind of screen and connection." },
        { node: "oca", text: "Copies are placed on Netflix servers near viewers, before release." },
        { node: "catalog", text: "At release time, the episode appears in the app for everyone." },
      ],
      detailed: [
        { node: "studio", text: "The finished episode arrives as one very large, high-quality master file." },
        { node: "store", text: "It is stored safely in cloud storage, with several copies." },
        { node: "encode", text: "Encoding workers split the episode into pieces and make many versions in parallel, from small files for weak phone connections up to 4K, all cut into chunks of a few seconds." },
        { node: "files", text: "Each finished version is checked, then stored, ready to be sent out." },
        { node: "fill", text: "Over the nights before release, the files are copied to Open Connect boxes around the world, mostly in quiet night hours." },
        { node: "oca", text: "Boxes near viewers now hold the episode. On release night it is already close to you." },
        { node: "catalog", from: "files", text: "The catalog switches the episode to 'available' at its release time, so it appears in everyone's app." },
      ],
      failures: [
        {
          id: "encoder-crash",
          title: "An encoding worker crashes",
          node: "encode",
          what: "One of the computers encoding the episode stops halfway.",
          userSees: "Nothing. Viewers never see half-finished files.",
          detect: "The worker stops reporting progress on its piece.",
          steps: [
            { node: "encode", from: "store", text: "Only the unfinished piece is given to another worker, starting again from the master file. The rest of the episode is unaffected." },
            { node: "files", from: "encode", text: "Only complete, checked files are stored, so nothing broken can reach viewers." },
          ],
        },
        {
          id: "fill-missed",
          title: "A video server misses its nightly fill",
          node: "oca",
          what: "One Open Connect box did not receive the new episode in time.",
          userSees: "Nothing. Viewers near it are sent to another box that has the episode.",
          detect: "The box reports that it is missing titles it should hold.",
          steps: [
            { node: "fill", from: "oca", text: "The fill is tried again during the next quiet period." },
            { node: "catalog", from: "fill", text: "The episode still goes live on time. Viewers near that box are simply directed to other boxes until it catches up." },
          ],
        },
      ],
    },
    {
      id: "play",
      title: "Pressing Play",
      summary: "The two seconds between pressing Play and seeing the picture.",
      nodes: [
        { id: "you", label: "You", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "api", label: "API gateway", kind: "service", col: 1, row: 0, explain: X.api },
        { id: "playback", label: "Playback service", kind: "service", col: 2, row: 0, tags: ["retry"], explain: X.playback },
        { id: "license", label: "Licence service", kind: "service", col: 3, row: 0, explain: X.license },
        { id: "steering", label: "Steering service", kind: "service", col: 2, row: 1, explain: X.steering },
        { id: "oca", label: "Open Connect box", kind: "edge", col: 1, row: 1, tags: ["cache"], explain: X.oca },
        { id: "oca2", label: "Second-choice box", kind: "edge", col: 0, row: 1, failureOnly: true, tags: ["cache"], explain: X.oca },
      ],
      simple: [
        { node: "you", text: "You press Play." },
        { node: "playback", text: "Netflix checks you can watch it and decides where your TV should get the video." },
        { node: "oca", from: "you", text: "Your TV downloads the first chunks from a server near you." },
        { node: "you", text: "The episode starts." },
      ],
      detailed: [
        { node: "you", text: "You press Play on the new episode." },
        { node: "api", text: "The request reaches the API gateway, which checks your account." },
        { node: "playback", text: "The playback service checks what your plan and your TV allow, for example HD or 4K." },
        { node: "license", text: "The licence service gives your TV a key to unlock this episode." },
        { node: "steering", from: "playback", text: "The steering service picks a few nearby boxes that have the episode, ranked by distance and how busy they are." },
        { node: "you", from: "playback", text: "Your TV gets the plan: the quality levels available and the list of servers to try, best first." },
        { node: "oca", text: "Your TV starts with a lower quality, so the first chunks are small and arrive quickly." },
        { node: "you", from: "oca", text: "The picture appears within a couple of seconds, and gets sharper as your TV measures how fast your connection is." },
      ],
      failures: [
        {
          id: "license-down",
          title: "The licence service is not answering",
          node: "license",
          what: "Your TV cannot get the key it needs to unlock the video.",
          userSees: "A clear error with a 'try again' button, not a frozen screen. The video cannot play without a key.",
          detect: "Key requests time out or fail.",
          steps: [
            { node: "playback", from: "license", text: "The playback service retries once with a backup copy of the licence service, with a short wait so it does not add to the overload." },
            { node: "you", from: "playback", text: "If it still fails, you see an error you can act on. The system does not pretend the video is starting." },
          ],
        },
        {
          id: "busy-box",
          title: "The nearest server is too busy",
          node: "oca",
          what: "The first box on the list is overloaded at 9 PM and sends chunks slowly.",
          userSees: "The start takes a moment longer, then the video plays normally.",
          detect: "Your TV sees the first chunks arriving much slower than expected.",
          steps: [
            { node: "you", from: "oca", text: "Your TV gives up on the slow box after a short time." },
            { node: "oca2", from: "you", text: "It moves to the next server on its list." },
            { node: "you", from: "oca2", text: "Chunks arrive quickly and the episode starts." },
          ],
        },
      ],
    },
    {
      id: "adaptive",
      title: "Keeping the picture smooth when your Wi-Fi slows",
      summary: "How the player chooses the quality of each next chunk, so the show does not stop to load.",
      nodes: [
        { id: "player", label: "Your TV's player", kind: "user", col: 0, row: 0, explain: {
          what: "The video player inside the Netflix app on your TV.",
          why: "It shows you the picture, and it is the part that can see how fast video is really arriving at your home.",
          input: "Video chunks from the buffer.",
          inside: "Decodes and plays the chunks in order.",
          output: "The picture on your screen.",
          risks: ["If the buffer runs empty, the picture stops to load."],
        } },
        { id: "quality", label: "Quality chooser", kind: "service", col: 1, row: 1, explain: {
          what: "Logic in the player that decides the quality of the next chunk (adaptive bitrate).",
          why: "Your connection speed changes all the time. Choosing the quality chunk by chunk keeps the picture as sharp as possible without stopping.",
          input: "How fast recent chunks arrived, and how much video is waiting in the buffer.",
          inside: "If chunks arrive fast and the buffer is full, it picks a higher quality. If they arrive slowly or the buffer is shrinking, it picks a lower one.",
          output: "The quality level for the next chunk.",
          risks: ["Switching too often makes the picture keep changing; switching too late lets the buffer run out."],
        } },
        { id: "oca", label: "Open Connect box", kind: "edge", col: 2, row: 0, tags: ["cache"], explain: X.oca },
        { id: "buffer", label: "Buffer on your TV", kind: "cache", col: 1, row: 0, explain: {
          what: "The video your TV has downloaded but not shown yet.",
          why: "It is a cushion. If the connection slows for a few seconds, the player keeps showing video from the buffer.",
          input: "New chunks.",
          inside: "Holds chunks in order, usually some tens of seconds ahead of what you are watching.",
          output: "The next chunk to play.",
          risks: ["If downloads are slower than playback for long enough, it empties."],
        } },
      ],
      simple: [
        { node: "player", text: "You are watching. Your TV keeps some video downloaded ahead." },
        { node: "oca", text: "It downloads the next chunk at the best quality your connection can keep up with." },
        { node: "player", text: "The new chunk plays next, without a pause." },
      ],
      detailed: [
        { node: "player", text: "You are watching. The player plays chunks from the buffer, which holds some seconds of video ahead." },
        { node: "buffer", text: "The buffer reports how much video is waiting." },
        { node: "quality", text: "Every few seconds the quality chooser looks at two things: how fast the last chunks arrived, and how full the buffer is." },
        { node: "oca", text: "It asks the Open Connect box for the next chunk at the best quality your connection can keep up with." },
        { node: "buffer", text: "The chunk arrives and joins the end of the buffer." },
        { node: "player", from: "buffer", text: "The player keeps showing video from the front of the buffer, so short slowdowns are never visible." },
      ],
      failures: [
        {
          id: "wifi-slows",
          title: "Your Wi-Fi slows down",
          node: "oca",
          what: "Someone at home starts a big download, and chunks start arriving more slowly than they play.",
          userSees: "The picture becomes a little softer for a while, but it does not stop. When the Wi-Fi recovers, it sharpens again.",
          detect: "The player sees chunks arriving slowly and the buffer shrinking.",
          steps: [
            { node: "buffer", from: "oca", text: "The buffer starts to shrink, because video is played faster than it arrives." },
            { node: "quality", from: "buffer", text: "The quality chooser switches to a lower quality. Those chunks are much smaller." },
            { node: "oca", from: "quality", text: "The next chunks are requested at the lower quality, and they arrive in time." },
            { node: "player", from: "buffer", text: "You keep watching without a pause. Quality climbs back up once the connection is fast again." },
          ],
        },
      ],
    },
    {
      id: "resume",
      title: "Continuing on another device",
      summary: "How your phone knows you stopped at 32 minutes on your TV.",
      nodes: [
        { id: "tv", label: "Your TV", kind: "user", col: 0, row: 0, explain: X.you },
        { id: "playback", label: "Playback service", kind: "service", col: 1, row: 0, explain: X.playback },
        { id: "events", label: "Event queue", kind: "queue", col: 2, row: 0, tags: ["queue"], explain: {
          what: "A queue that holds progress reports until they are saved.",
          why: "Millions of small progress reports arrive every minute. A queue smooths them out so the history database is never flooded.",
          input: "Progress reports from devices.",
          inside: "Holds each report until the history writer saves it; if saving fails, the report waits and is retried.",
          output: "Reports for the viewing history.",
          risks: ["If saving falls behind, the latest position can be a little out of date."],
        } },
        { id: "history", label: "Viewing history", kind: "database", col: 3, row: 0, explain: X.history },
        { id: "home", label: "Home page service", kind: "service", col: 2, row: 1, explain: X.home },
        { id: "phone", label: "Your phone", kind: "user", col: 3, row: 1, explain: X.you },
      ],
      simple: [
        { node: "tv", text: "You stop watching on your TV at 32 minutes." },
        { node: "history", text: "Your position is saved in your viewing history." },
        { node: "phone", text: "The next day your phone offers to continue from 32 minutes." },
      ],
      detailed: [
        { node: "tv", text: "You stop at 32 minutes and go to bed." },
        { node: "playback", text: "Your TV has been reporting its position about once a minute; the last report says 32 minutes 10 seconds." },
        { node: "events", async: true, text: "Each report goes into the event queue, so a burst of reports never overwhelms the database." },
        { node: "history", async: true, text: "The latest position is saved in your viewing history." },
        { node: "home", from: "phone", text: "Next morning you open Netflix on your phone, and the home page service builds your rows." },
        { node: "history", from: "home", text: "It reads your viewing history and puts the episode in Continue Watching at 32:10." },
        { node: "phone", from: "home", text: "You tap it, and it continues where you stopped." },
      ],
      failures: [
        {
          id: "history-slow",
          title: "The viewing history is falling behind",
          node: "history",
          what: "Saving progress is slower than reports arrive.",
          userSees: "Continue Watching may start a minute or two earlier than where you stopped. Nothing else is affected.",
          detect: "The event queue grows, and the age of the latest saved position increases.",
          steps: [
            { node: "events", from: "history", text: "Reports wait in the queue. None are lost; they are saved when the database catches up." },
            { node: "home", from: "history", text: "Continue Watching uses the latest position that has been saved so far." },
            { node: "phone", from: "home", text: "You may need to skip forward a little. Watching itself is never blocked by the history." },
          ],
        },
      ],
    },
  ],

  database: {
    intro:
      "Most of what you watch is video files, not database rows. The databases hold the small but important facts: what exists, who can watch it, which server has which copy, and where you stopped.",
    entities: [
      { name: "Title", purpose: "One film or episode and where and when it can be watched.", fields: [
        { name: "title_id", type: "id", note: "primary key" }, { name: "name", type: "text" }, { name: "release_at", type: "date and time, per country" }, { name: "countries", type: "list" },
      ], relations: ["Has many Video versions"] },
      { name: "Video version", purpose: "One encoded version of a title, for example 1080p at a given quality.", fields: [
        { name: "version_id", type: "id", note: "primary key" }, { name: "title_id", type: "id" }, { name: "resolution", type: "text" }, { name: "bitrate", type: "number" }, { name: "chunk_list", type: "file locations" },
      ], relations: ["Belongs to a Title", "Stored on many Boxes"] },
      { name: "Box", purpose: "One Open Connect server and where it is.", fields: [
        { name: "box_id", type: "id", note: "primary key" }, { name: "location", type: "internet provider or data centre" }, { name: "health", type: "ok, busy or down" },
      ], relations: ["Holds many Video versions"] },
      { name: "Box contents", purpose: "Which versions each box currently holds, used by steering.", fields: [
        { name: "box_id", type: "id" }, { name: "version_id", type: "id" }, { name: "filled_at", type: "date and time" },
      ], relations: ["Links Boxes and Video versions"] },
      { name: "Profile", purpose: "One person's profile inside an account.", fields: [
        { name: "profile_id", type: "id", note: "primary key" }, { name: "account_id", type: "id" }, { name: "plan", type: "basic, standard or premium" },
      ], relations: ["Has a Viewing history"] },
      { name: "Viewing history", purpose: "Where each profile stopped in each title.", fields: [
        { name: "profile_id, title_id", type: "ids", note: "together, the key" }, { name: "position", type: "seconds" }, { name: "updated_at", type: "date and time" },
      ], relations: ["Belongs to a Profile and a Title"] },
    ],
    why: [
      "The video itself is stored as files on servers near viewers, not in a database. The database only records which box holds which version.",
      "Viewing history has one row per profile and title, and each report simply overwrites the position. That keeps a huge number of writes small and simple.",
      "Title and box data change slowly and are read constantly, so they are copied to caches near the services that read them.",
    ],
  },

  decisions: [
    {
      id: "two-halves",
      title: "Split the system into a cloud half and a video half",
      problem: "The video is millions of times larger than everything else. If the same servers handled your home page and your video, the video would swamp them.",
      solution: "Run the small, smart work (accounts, home pages, playback decisions) in the cloud, and send the video from a separate network of servers close to viewers. Netflix's video network is called Open Connect.",
      how: "The cloud tells your TV what to play and which nearby servers to use. Your TV then downloads the video directly from those servers, without going back to the cloud for each chunk.",
      where: "Across the whole system: API gateway and services in the cloud; Open Connect boxes near viewers.",
      tradeoff: "Two very different systems must be built and kept in step. In return, each can be designed for its own job.",
    },
    {
      id: "near-viewers",
      title: "Put copies of titles near viewers before they are needed",
      problem: "Fetching each popular episode from far away for each viewer would be slow and would fill long-distance internet links every evening.",
      solution: "Place video servers inside or next to internet providers' networks, and fill them with likely-popular titles ahead of time. Netflix describes nightly content fills for its Open Connect appliances.",
      how: "Each night, while links are quiet, servers receive new and popular titles. In the evening, most viewers are served by a box nearby.",
      where: "The nightly fill process and the Open Connect boxes.",
      tradeoff: "Boxes have limited disk space, so we must guess what will be popular where. Rare titles may come from further away.",
    },
    {
      id: "many-versions",
      title: "Encode every title in many versions, cut into small chunks",
      problem: "A 4K TV on fibre and a phone on a weak mobile signal cannot use the same video file.",
      solution: "Make many versions of each title at different resolutions and qualities, and cut each into chunks a few seconds long.",
      how: "Encoding happens once, before release, on many computers in parallel. Because every version is cut at the same points, the player can switch between versions at any chunk boundary.",
      where: "Encoding workers and encoded-file storage.",
      tradeoff: "Many versions use much more storage and encoding time. In return, every viewer gets a version that suits them.",
    },
    {
      id: "adaptive",
      title: "Let the player choose the quality of each chunk",
      problem: "Your connection speed changes from minute to minute. A fixed quality would either stop to load or look worse than it could.",
      solution: "The player measures how fast chunks arrive and how full its buffer is, and picks the quality of the next chunk itself (adaptive bitrate).",
      how: "It starts low so the picture appears quickly, steps up while the connection is good, and steps down before the buffer runs out.",
      where: "Inside the app on your device.",
      tradeoff: "The quality you see can change during a show. Most people prefer a softer picture to a frozen one.",
    },
    {
      id: "server-list",
      title: "Give the player a list of servers, not just one",
      problem: "Any single video server can fail or become overloaded during the evening.",
      solution: "The steering service gives your TV a short, ranked list of nearby servers that hold the title.",
      how: "If the first server is slow or stops answering, the player moves to the next one by itself, without asking the cloud again.",
      where: "Steering service and the player.",
      tradeoff: "Steering needs up-to-date information about every box's contents and health.",
    },
    {
      id: "fallbacks",
      title: "Keep playing when non-essential parts fail, and test it on purpose",
      problem: "There are many services behind the home page. If any slow one could block the page, something would always be broken.",
      solution: "Give every non-essential call a short time limit and a fallback. Then test failures deliberately: Netflix built Chaos Monkey to switch off servers in production so that services are built to survive.",
      how: "If recommendations do not answer in time, the home page shows popular rows instead. Playback, licences and video delivery are kept separate, so a problem in browsing does not stop people watching.",
      where: "Home page service, playback service and every service call.",
      tradeoff: "Fallback pages are less personal. Testing in production needs care and good monitoring.",
    },
    {
      id: "progress-queue",
      title: "Send progress reports through a queue",
      problem: "Every viewer's device reports its position about once a minute. Writing all of those straight into a database would overload it at peak times.",
      solution: "Put reports in a queue, save them steadily, and keep only the latest position per profile and title.",
      how: "Devices report to the playback service, which places reports on the queue. A writer saves them; if it falls behind, reports wait instead of being lost.",
      where: "Between the playback service and the viewing history.",
      tradeoff: "Your saved position can be a minute or two behind during busy times.",
    },
  ],

  failures: [
    {
      title: "A video server fails during an episode",
      what: "The Open Connect box you are streaming from goes down.",
      userSees: "Usually nothing; at most a short pause.",
      detect: "Your device stops receiving chunks; the box stops reporting its health.",
      recover: "The player uses its buffer, then moves to the next server on its list.",
      prevent: "Always give players several servers. Test by switching off servers during a load test and checking playback continues.",
    },
    {
      title: "Release night: everyone presses Play on the same episode",
      what: "A very popular new season goes live and a huge number of people start it within minutes.",
      userSees: "With preparation, nothing unusual. Without it, slow starts.",
      detect: "Play starts per second jump far above normal at the release time.",
      recover: "Steering spreads viewers across many boxes; the cloud services add capacity.",
      prevent: "Fill boxes with the episode in the nights before release, and add cloud capacity before the release time rather than waiting for automatic scaling.",
    },
    {
      title: "Recommendations are down",
      what: "The service that personalises your home page stops answering.",
      userSees: "A less personal home page; search and Play work normally.",
      detect: "Time-outs and errors from the recommendation service.",
      recover: "The home page shows popular and new rows as a fallback.",
      prevent: "Short time limits and a fallback for every non-essential call. Regularly test by switching the service off, the idea behind Chaos Monkey.",
      evidence: "public",
      sources: ["chaos-monkey"],
    },
    {
      title: "The licence service fails",
      what: "Devices cannot get keys to unlock protected video.",
      userSees: "New plays fail with a clear error and a retry button. Shows already playing continue.",
      detect: "Key requests fail or time out.",
      recover: "Retry against a backup copy of the service; fix the cause. Never fake a successful start.",
      prevent: "Run the licence service in several places and keep it separate from browsing services.",
    },
    {
      title: "Your connection slows down",
      what: "Your home internet becomes slower during a show.",
      userSees: "The picture becomes softer for a while instead of stopping.",
      detect: "The player sees chunks arriving slowly and its buffer shrinking.",
      recover: "The player switches to lower-quality chunks until the connection recovers.",
      prevent: "Keep a buffer of video ahead, and start each show at a modest quality.",
    },
    {
      title: "A whole cloud region has a problem",
      what: "One of the cloud data-centre regions that runs the cloud half becomes unavailable.",
      userSees: "Perhaps a short delay starting a new show. Video already streaming from Open Connect boxes keeps playing.",
      detect: "Errors from every service in that region at once.",
      recover: "Send cloud traffic to another region that holds the same data.",
      prevent: "Run the cloud services in more than one region and practise moving traffic between them.",
    },
  ],

  recap: {
    decisions: [
      { decision: "Cloud half and video half", why: "Huge video traffic never touches the services that run the app.", cost: "Two very different systems to build and run." },
      { decision: "Copies near viewers, filled at night", why: "Fast starts and less long-distance traffic.", cost: "Must guess what will be popular where." },
      { decision: "Many versions in small chunks", why: "Every screen and connection gets a suitable version.", cost: "Much more storage and encoding work." },
      { decision: "Player chooses quality", why: "A softer picture instead of a frozen one.", cost: "Quality can change during a show." },
      { decision: "List of servers and fallbacks", why: "One failure does not stop you watching.", cost: "More logic in the player and in steering." },
      { decision: "Progress through a queue", why: "Millions of reports never flood the database.", cost: "Saved position can be slightly behind." },
    ],
    questions: [
      { q: "Why does Netflix need its own video servers near viewers?", a: "Video is enormous and the evening peak is a large share of a country watching at once. Serving it from a few central data centres would be slow and expensive. Placing copies inside or near internet providers keeps most video traffic short-distance." },
      { q: "How does playback start so quickly?", a: "The decision is made once in the cloud (plan check, licence, list of nearby servers). The player then starts at a low quality so the first chunks are small, and steps up as it learns how fast the connection is." },
      { q: "What happens when your connection slows down?", a: "The player sees chunks arriving more slowly and its buffer shrinking, and switches to lower-quality, smaller chunks. The picture softens instead of stopping." },
      { q: "How would you prepare for a huge release?", a: "Copy the episode to video servers in the nights before release, add cloud capacity ahead of the release time, and make sure non-essential features have fallbacks so the essential path, pressing Play, keeps working." },
      { q: "How is streaming different from ticket booking?", a: "Nothing is scarce: everyone can watch the same episode. The challenge is the size and the steadiness of the data flow, not fairness or double-selling." },
    ],
  },
};
