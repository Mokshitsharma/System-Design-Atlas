import type { Category, Platform } from "@/lib/schema";

/** The original 120-platform curriculum plus platforms added later (IRCTC). */
export const PLATFORM_COUNT = 121;

/**
 * The public platform registry. It holds no dates or preparation status; whether a platform
 * has a tutorial is decided only by the published tutorials in src/content/tutorials.
 */

export const categories: Category[] = [
  { slug: "ride-hailing", plate: 1, name: "Ride-hailing", signatureFocus: "Location ingestion, geospatial indexing, driver-rider matching, dispatch, surge pricing, supply shortages, ETA calculation and trip-state management." },
  { slug: "maps-navigation", plate: 2, name: "Maps and navigation", signatureFocus: "Map tiles, graph routing, traffic updates, spatial indexes, route recalculation and regional data distribution." },
  { slug: "parcel-logistics", plate: 3, name: "Parcel and logistics", signatureFocus: "Shipment state machines, scan events, routing, tracking fan-out, duplicate scans, reconciliation and delayed event ingestion." },
  { slug: "food-delivery", plate: 4, name: "Food delivery", signatureFocus: "Order orchestration, restaurant acceptance, dispatch, courier assignment, ETA, cancellations and dinner-time or weather-driven demand spikes." },
  { slug: "quick-commerce", plate: 5, name: "Quick commerce and grocery", signatureFocus: "Dark-store inventory, picking, stock reservations, batching, substitutions, short delivery windows and local inventory consistency." },
  { slug: "e-commerce", plate: 6, name: "E-commerce", signatureFocus: "Flash sales, checkout, inventory reservation, catalog search, seller synchronization, promotions, payment failures and order state transitions." },
  { slug: "inventory-warehouse", plate: 7, name: "Inventory and warehouse management", signatureFocus: "Stock ledgers, warehouse transfers, concurrent allocation, reservations, reconciliation and consistency across channels." },
  { slug: "stockbroking", plate: 8, name: "Stockbroking and investing", signatureFocus: "Order lifecycle, market-open traffic, risk checks, broker-to-exchange connectivity, quote distribution and settlement reconciliation." },
  { slug: "payments", plate: 9, name: "Payments and fintech", signatureFocus: "Idempotency, payment state machines, double-entry ledgers, webhook delivery, retries, reconciliation and payment uncertainty." },
  { slug: "tickets-reservations", plate: 10, name: "Tickets, reservations and events", signatureFocus: "Scarce-resource allocation, seat or room holds, waiting rooms, high-demand releases, payment timeouts, cancellations and availability consistency." },
  { slug: "service-marketplaces", plate: 11, name: "Service marketplaces", signatureFocus: "Matching, provider availability, ranking, messaging, payments, disputes and job-state transitions." },
  { slug: "messaging", plate: 12, name: "Messaging", signatureFocus: "Persistent connections, offline delivery, ordering, acknowledgements, fan-out, synchronization and end-to-end encryption where applicable." },
  { slug: "social-dating", plate: 13, name: "Social and dating", signatureFocus: "Social graphs, feed ranking, push/pull fan-out, media distribution, matching, moderation and viral traffic." },
  { slug: "video-streaming", plate: 14, name: "Video and media streaming", signatureFocus: "Upload and transcoding, adaptive bitrate delivery, content distribution, recommendation systems, live events and playback reliability." },
  { slug: "ai-assistants", plate: 15, name: "AI assistants and LLM platforms", signatureFocus: "Inference serving, GPU scheduling, batching, request queues, token streaming, context management, quotas, model routing and overload control." },
  { slug: "ml-platforms", plate: 16, name: "ML platforms and MLOps", signatureFocus: "Experiment tracking, dataset lineage, model registries, feature pipelines, model serving, reproducibility and training-job scheduling." },
  { slug: "developer-platforms", plate: 17, name: "Developer platforms and CI/CD", signatureFocus: "Git operations, webhooks, build scheduling, isolated execution, artifact storage, deployment rollouts and cache invalidation." },
  { slug: "productivity", plate: 18, name: "Productivity and collaboration", signatureFocus: "Collaboration, permission models, real-time updates, search, event propagation, workflow state and concurrent editing." },
  { slug: "crm-enterprise", plate: 19, name: "CRM, support and enterprise platforms", signatureFocus: "Tenant isolation, workflow engines, search indexing, webhook orchestration, permissions, auditability and large enterprise workloads." },
  { slug: "storage-search", plate: 20, name: "Storage, search and knowledge", signatureFocus: "Synchronization, object storage, indexing, ranking, document versioning, conflict resolution, replication and knowledge retrieval." },
];

type Row = [name: string, slug: string, difficulty: number, signature: string, tags: string[]];

const rows: Record<string, Row[]> = {
  "ride-hailing": [
    ["Uber", "uber", 5, "Real-time driver-rider matching across geospatial cells with surge pricing", ["geospatial", "matching", "surge-pricing"]],
    ["Rapido", "rapido", 3, "Two-wheeler dispatch with dense, short-trip demand in Indian cities", ["dispatch", "geospatial"]],
    ["Ola", "ola", 4, "Multi-vehicle-class dispatch and trip-state consistency", ["dispatch", "state-machine"]],
    ["Lyft", "lyft", 4, "ETA prediction and marketplace balancing under supply shortages", ["eta", "marketplace"]],
    ["Grab", "grab", 4, "Super-app dispatch across rides, food and payments in Southeast Asia", ["super-app", "dispatch"]],
    ["inDrive", "indrive", 3, "Bid-based fare negotiation between riders and drivers", ["bidding", "matching"]],
  ],
  "maps-navigation": [
    ["Google Maps", "google-maps", 5, "Planet-scale routing with live traffic and fast route recalculation", ["routing", "traffic", "tiles"]],
    ["Waze", "waze", 4, "Crowdsourced incident reports feeding live route updates", ["crowdsourcing", "routing"]],
    ["Mapbox", "mapbox", 4, "Vector tile generation and global tile delivery for developers", ["tiles", "cdn"]],
    ["HERE WeGo", "here-wego", 3, "Offline map packages and regional map-data updates", ["offline", "tiles"]],
    ["Apple Maps", "apple-maps", 4, "Privacy-preserving routing and on-device navigation", ["privacy", "routing"]],
    ["OpenStreetMap-based routing", "openstreetmap-routing", 3, "Graph preprocessing for fast shortest-path queries on open data", ["graph", "routing"]],
  ],
  "parcel-logistics": [
    ["Shiprocket", "shiprocket", 3, "Multi-carrier aggregation and shipment-status normalization", ["aggregation", "webhooks"]],
    ["Delhivery", "delhivery", 4, "Scan-event ingestion and hub routing at national scale", ["events", "routing"]],
    ["DHL", "dhl", 4, "Cross-border shipment tracking with customs state transitions", ["state-machine", "tracking"]],
    ["FedEx", "fedex", 4, "Peak-season tracking fan-out and delayed scan reconciliation", ["fan-out", "reconciliation"]],
    ["UPS", "ups", 4, "Route optimization and delivery-window commitments", ["optimization", "routing"]],
    ["India Post tracking", "india-post-tracking", 3, "Tracking over heterogeneous, intermittently connected offices", ["tracking", "offline"]],
  ],
  "food-delivery": [
    ["Zomato", "zomato", 4, "Dinner-peak order orchestration and courier assignment", ["orchestration", "dispatch"]],
    ["Swiggy", "swiggy", 4, "Weather-driven demand spikes and delivery ETA under pressure", ["eta", "surge"]],
    ["DoorDash", "doordash", 4, "Dispatch optimization balancing courier utilization and food readiness", ["dispatch", "optimization"]],
    ["Uber Eats", "uber-eats", 4, "Sharing ride-hailing logistics infrastructure with a food marketplace", ["dispatch", "marketplace"]],
    ["Deliveroo", "deliveroo", 3, "Restaurant acceptance and cancellation handling", ["state-machine", "cancellations"]],
    ["Meituan", "meituan", 5, "Very high order density with batched courier routing", ["batching", "routing"]],
  ],
  "quick-commerce": [
    ["Blinkit", "blinkit", 4, "Ten-minute delivery with dark-store inventory reservations", ["inventory", "dark-store"]],
    ["Zepto", "zepto", 4, "Picking and packing throughput inside short fulfillment windows", ["fulfillment", "inventory"]],
    ["Swiggy Instamart", "swiggy-instamart", 4, "Local inventory consistency and substitutions", ["inventory", "substitution"]],
    ["BigBasket", "bigbasket", 3, "Slot-based delivery capacity and order batching", ["slots", "batching"]],
    ["Instacart", "instacart", 4, "Shopper-picked orders with live substitution approval", ["substitution", "marketplace"]],
    ["Gopuff", "gopuff", 3, "Micro-fulfillment inventory and delivery radius planning", ["inventory", "fulfillment"]],
  ],
  "e-commerce": [
    ["Amazon", "amazon", 5, "Checkout and order pipelines that stay available during peak sales", ["checkout", "availability"]],
    ["Flipkart", "flipkart", 5, "Flash-sale inventory reservation and checkout isolation", ["flash-sale", "inventory"]],
    ["eBay", "ebay", 4, "Auction bidding close-time contention", ["auctions", "contention"]],
    ["Etsy", "etsy", 3, "Marketplace search across many small sellers", ["search", "marketplace"]],
    ["Meesho", "meesho", 4, "Low-cost catalog serving and reseller-driven traffic", ["catalog", "cost"]],
    ["Shopify-powered stores", "shopify-stores", 4, "Multi-tenant storefronts during merchant flash sales", ["multi-tenant", "flash-sale"]],
  ],
  "inventory-warehouse": [
    ["Zoho Inventory", "zoho-inventory", 3, "Multi-channel stock synchronization for small businesses", ["sync", "ledger"]],
    ["Odoo Inventory", "odoo-inventory", 3, "Double-entry stock moves and warehouse routes", ["ledger", "workflow"]],
    ["Shopify inventory workflows", "shopify-inventory", 3, "Inventory levels across locations and sales channels", ["inventory", "multi-location"]],
    ["SAP warehouse workflows", "sap-warehouse", 4, "Warehouse task orchestration and bin-level allocation", ["workflow", "allocation"]],
    ["Oracle inventory systems", "oracle-inventory", 4, "Enterprise reservation and allocation across organizations", ["reservation", "enterprise"]],
    ["Cin7", "cin7", 3, "Channel integrations and stock reconciliation", ["integrations", "reconciliation"]],
  ],
  stockbroking: [
    ["Groww", "groww", 4, "Market-open order surges and quote distribution", ["market-open", "orders"]],
    ["Zerodha", "zerodha", 5, "Order lifecycle and risk checks at the 9:15 AM market open", ["market-open", "risk"]],
    ["Upstox", "upstox", 4, "Low-latency quote streaming to mobile clients", ["streaming", "quotes"]],
    ["Angel One", "angel-one", 4, "Broker-to-exchange connectivity and order acknowledgement", ["exchange", "orders"]],
    ["Robinhood", "robinhood", 4, "Retail trading surges and margin risk controls", ["risk", "surge"]],
    ["Interactive Brokers", "interactive-brokers", 5, "Global multi-exchange routing and settlement reconciliation", ["routing", "settlement"]],
  ],
  payments: [
    ["Razorpay", "razorpay", 5, "Payment state machines with UPI and card network uncertainty", ["payments", "state-machine"]],
    ["Stripe", "stripe", 5, "Idempotent payment APIs and reliable webhook delivery", ["idempotency", "webhooks"]],
    ["PayPal", "paypal", 4, "Wallet balances and double-entry ledgers", ["ledger", "wallet"]],
    ["PhonePe", "phonepe", 5, "UPI transaction throughput during festival peaks", ["upi", "throughput"]],
    ["Google Pay", "google-pay", 4, "Tokenized payments and UPI flows", ["tokenization", "upi"]],
    ["Cashfree", "cashfree", 4, "Payouts, settlement and reconciliation", ["payouts", "reconciliation"]],
  ],
  "tickets-reservations": [
    ["District", "district", 3, "Event discovery and booking for dining, movies and live events", ["booking", "events"]],
    ["BookMyShow", "bookmyshow", 4, "Seat-map contention for blockbuster releases and concerts", ["seat-map", "contention"]],
    ["Ticketmaster", "ticketmaster", 5, "High-demand onsales: waiting rooms, seat holds and bot defense", ["waiting-room", "seat-holds", "bots"]],
    ["Airbnb", "airbnb", 4, "Calendar availability and double-booking prevention", ["availability", "search"]],
    ["Booking.com", "booking-com", 4, "Inventory from many property systems with stale-availability risk", ["inventory", "sync"]],
    ["MakeMyTrip", "makemytrip", 4, "Supplier fan-out search for flights and hotels", ["fan-out", "search"]],
    ["IRCTC", "irctc", 5, "Tatkal booking rush: fair access to scarce train berths when booking opens", ["tatkal", "waiting-list", "flash-crowd"]],
  ],
  "service-marketplaces": [
    ["Urban Company", "urban-company", 3, "Professional scheduling and slot allocation", ["scheduling", "matching"]],
    ["Taskrabbit", "taskrabbit", 3, "Tasker availability and job matching", ["matching", "availability"]],
    ["Thumbtack", "thumbtack", 3, "Lead distribution and pro ranking", ["ranking", "leads"]],
    ["Fiverr", "fiverr", 3, "Order states, delivery and dispute workflows", ["state-machine", "disputes"]],
    ["Upwork", "upwork", 4, "Contracts, escrow and time tracking", ["escrow", "workflow"]],
    ["Freelancer", "freelancer", 3, "Bidding on projects and milestone payments", ["bidding", "payments"]],
  ],
  messaging: [
    ["WhatsApp", "whatsapp", 5, "Persistent connections and offline delivery with end-to-end encryption", ["connections", "e2ee", "delivery"]],
    ["Telegram", "telegram", 4, "Cloud-synced chats and very large channel fan-out", ["fan-out", "sync"]],
    ["Signal", "signal", 4, "Minimal-metadata delivery with end-to-end encryption", ["e2ee", "privacy"]],
    ["Discord", "discord", 5, "Large-guild fan-out and voice connections", ["fan-out", "voice"]],
    ["Slack", "slack", 4, "Workspace message ordering and real-time sync", ["ordering", "sync"]],
    ["Microsoft Teams", "microsoft-teams", 4, "Enterprise chat, presence and meeting signaling", ["presence", "enterprise"]],
  ],
  "social-dating": [
    ["Instagram", "instagram", 5, "Feed fan-out and media delivery for very large follower graphs", ["fan-out", "media", "feed"]],
    ["Facebook", "facebook", 5, "Social-graph storage and ranked news feed", ["graph", "ranking"]],
    ["Reddit", "reddit", 4, "Vote counting and hot-ranking under viral traffic", ["ranking", "counters"]],
    ["X", "x", 5, "Timeline fan-out with celebrity accounts", ["fan-out", "timeline"]],
    ["Tinder", "tinder", 4, "Geo-filtered candidate generation and swipe matching", ["matching", "geospatial"]],
    ["Bumble", "bumble", 3, "Match expiry and moderation workflows", ["matching", "moderation"]],
  ],
  "video-streaming": [
    ["YouTube", "youtube", 5, "Upload, transcoding and global video delivery", ["transcoding", "cdn"]],
    ["Netflix", "netflix", 5, "Evening peaks, release spikes and edge-cached playback", ["cdn", "playback", "release-spike"]],
    ["Twitch", "twitch", 4, "Low-latency live video and chat fan-out", ["live", "fan-out"]],
    ["Disney+", "disney-plus", 4, "Launch-day sign-up surges and entitlement checks", ["surge", "entitlements"]],
    ["Spotify", "spotify", 4, "Audio delivery and personalized recommendation pipelines", ["recommendations", "audio"]],
    ["JioHotstar", "jiohotstar", 5, "Live cricket concurrency spikes", ["live", "concurrency"]],
  ],
  "ai-assistants": [
    ["ChatGPT", "chatgpt", 5, "LLM inference serving with token streaming under overload", ["inference", "gpu", "streaming"]],
    ["Claude", "claude", 5, "Long-context inference and KV-cache memory pressure", ["inference", "kv-cache"]],
    ["Gemini", "gemini", 5, "Multimodal inference routing across model sizes", ["inference", "routing"]],
    ["Perplexity", "perplexity", 4, "Retrieval-augmented answers with live web search", ["retrieval", "search"]],
    ["Microsoft Copilot", "microsoft-copilot", 4, "Assistant features embedded in many products with shared quotas", ["quotas", "routing"]],
    ["Grok", "grok", 4, "Assistant responses grounded in a real-time social stream", ["retrieval", "streaming"]],
  ],
  "ml-platforms": [
    ["MLflow", "mlflow", 3, "Experiment tracking and model registry", ["tracking", "registry"]],
    ["Weights & Biases", "weights-and-biases", 3, "High-volume metric logging from training runs", ["ingestion", "tracking"]],
    ["Hugging Face", "hugging-face", 4, "Model and dataset hosting with large-file distribution", ["storage", "distribution"]],
    ["Vertex AI", "vertex-ai", 4, "Managed training-job scheduling and model serving", ["scheduling", "serving"]],
    ["Amazon SageMaker", "amazon-sagemaker", 4, "Endpoint autoscaling for model inference", ["serving", "autoscaling"]],
    ["Databricks", "databricks", 4, "Lakehouse pipelines and feature engineering at scale", ["pipelines", "lineage"]],
  ],
  "developer-platforms": [
    ["GitHub", "github", 5, "Git operations, webhooks and Actions job scheduling", ["git", "ci", "webhooks"]],
    ["GitLab", "gitlab", 4, "Integrated CI runners and repository storage", ["ci", "git"]],
    ["Bitbucket", "bitbucket", 3, "Pipelines and pull-request workflows", ["ci", "workflow"]],
    ["Vercel", "vercel", 4, "Build isolation, edge deployment and instant rollback", ["builds", "edge", "rollouts"]],
    ["Netlify", "netlify", 3, "Atomic deploys and cache invalidation", ["deploys", "cdn"]],
    ["CircleCI", "circleci", 3, "Build queueing and cache reuse across jobs", ["ci", "caching"]],
  ],
  productivity: [
    ["Notion", "notion", 4, "Block-based documents with real-time collaboration", ["collaboration", "documents"]],
    ["Trello", "trello", 3, "Board updates propagated to many viewers", ["real-time", "boards"]],
    ["Asana", "asana", 3, "Task dependencies and workflow rules", ["workflow", "permissions"]],
    ["Jira", "jira", 4, "Configurable workflows and large-instance search", ["workflow", "search"]],
    ["Linear", "linear", 4, "Local-first sync for issue tracking", ["sync", "local-first"]],
    ["Monday.com", "monday-com", 3, "Board automations and event propagation", ["automation", "events"]],
  ],
  "crm-enterprise": [
    ["Salesforce", "salesforce", 5, "Multi-tenant metadata-driven platform with strict tenant isolation", ["multi-tenant", "isolation"]],
    ["HubSpot", "hubspot", 4, "Marketing automation and contact-timeline events", ["automation", "events"]],
    ["Zendesk", "zendesk", 4, "Ticket routing and SLA timers", ["routing", "sla"]],
    ["Freshdesk", "freshdesk", 3, "Omnichannel ticket ingestion", ["ingestion", "routing"]],
    ["Intercom", "intercom", 3, "Real-time customer messaging and bots", ["messaging", "automation"]],
    ["ServiceNow", "servicenow", 4, "Enterprise workflow engine and audit trails", ["workflow", "audit"]],
  ],
  "storage-search": [
    ["Google Drive", "google-drive", 4, "File sync, sharing permissions and conflict handling", ["sync", "permissions"]],
    ["Dropbox", "dropbox", 4, "Block-level sync and deduplicated storage", ["sync", "storage"]],
    ["Google Search", "google-search", 5, "Web-scale crawling, indexing and query serving", ["indexing", "ranking"]],
    ["Elasticsearch", "elasticsearch", 4, "Shard allocation, indexing pressure and query fan-out", ["indexing", "sharding"]],
    ["Confluence", "confluence", 3, "Page versioning and permission-aware search", ["versioning", "search"]],
    ["Wikipedia", "wikipedia", 4, "Read-heavy caching with edit propagation", ["caching", "cdn"]],
  ],
};

let id = 0;
export const platforms: Platform[] = categories.flatMap((c) =>
  (rows[c.slug] ?? []).map(([name, slug, difficulty, signature, tags]) => ({
    id: ++id,
    slug,
    name,
    category: c.slug,
    difficulty,
    signature,
    tags,
  })),
);

export const platformBySlug = new Map(platforms.map((p) => [p.slug, p]));
export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
