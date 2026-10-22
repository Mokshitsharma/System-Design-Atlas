import type { Concept } from "@/lib/schema";

/** Ordered from foundations to specialized topics. */
export const concepts: Concept[] = [
  {
    slug: "networking-basics", name: "Networking basics", area: "Networking", order: 1,
    summary: "How a request travels: DNS, TCP, TLS and the cost of each round trip.",
    body: [
      "Every remote call starts with name resolution. DNS maps a hostname to addresses, and the answer can depend on where the client is, which is how GeoDNS steers users to nearby regions. DNS answers are cached for their TTL, so changes take time to propagate.",
      "TCP needs a handshake before data flows, and TLS adds at least one more round trip. On a 100 ms path, a new HTTPS connection costs several hundred milliseconds before the first byte of the response. Connection reuse, HTTP/2 multiplexing and edge termination exist to avoid paying that cost repeatedly.",
      "Bandwidth and latency are different limits. A large seat map over a fast link is limited by bandwidth; a chatty API with many small calls is limited by latency. Estimating both is part of capacity planning.",
    ],
    keyTerms: ["dns", "tls", "latency"], patterns: ["cdn-edge-caching", "load-balancing"],
  },
  {
    slug: "http-and-rpc", name: "HTTP and RPC", area: "HTTP and RPC", order: 2,
    summary: "Request semantics, status codes, idempotent methods and when to use RPC frameworks.",
    body: [
      "HTTP methods carry meaning. GET, PUT and DELETE are defined as idempotent; POST is not. That definition matters to every proxy and client that might retry, which is why non-idempotent POSTs need idempotency keys.",
      "Status codes are a contract. 409 means the request conflicts with current state, 429 means slow down, 503 with Retry-After means the server is shedding load. Clients can only behave well if servers use these precisely.",
      "RPC frameworks such as gRPC add typed schemas, streaming and efficient encoding between internal services. They do not remove the need for timeouts, deadlines and retry policy.",
    ],
    keyTerms: ["idempotency-key", "status-code"], patterns: ["idempotency", "api-gateway"],
  },
  {
    slug: "databases", name: "Databases and transactions", area: "Databases", order: 3,
    summary: "ACID transactions, isolation levels, indexes and conditional updates.",
    body: [
      "A transaction groups changes so they commit together or not at all. Isolation levels define what concurrent transactions can see of each other; weaker levels allow anomalies such as lost updates.",
      "Conditional updates are the workhorse of correctness under contention. UPDATE ... WHERE status = 'available' changes a row only if it is still in the expected state, and the affected-row count tells the caller whether it won.",
      "Indexes make reads fast and writes slower. Every index on a hot write path costs write throughput, so choose them from real query patterns.",
    ],
    keyTerms: ["acid", "isolation-level", "conditional-update"], patterns: ["reservation-and-expiry", "database-sharding"],
  },
  {
    slug: "distributed-systems", name: "Distributed systems", area: "Distributed systems", order: 4,
    summary: "Partial failure, timeouts and why you cannot tell slow from dead.",
    body: [
      "In a distributed system, components fail independently. A caller that times out cannot know whether the callee never received the request, processed it and failed to reply, or is still working.",
      "This uncertainty shapes every design: intent is recorded before side effects, operations are made idempotent, and reconciliation repairs what online logic could not decide.",
      "Clocks on different machines disagree. Use them for timeouts and leases with safety margins, never as the sole source of ordering.",
    ],
    keyTerms: ["partial-failure", "timeout"], patterns: ["idempotency", "reconciliation", "retry-with-jitter"],
  },
  {
    slug: "consistency-models", name: "Consistency models", area: "Consistency models", order: 5,
    summary: "Strong, read-your-writes and eventual consistency, and how to choose.",
    body: [
      "Strong consistency means every read sees the latest committed write. It is required where a wrong read causes an irreversible action, such as selling the same seat twice.",
      "Eventual consistency allows replicas to disagree briefly and converge. It is acceptable for seat maps, feeds and counters where a stale view only costs a retry.",
      "Most systems mix models: strong for the authoritative write path, eventual for read models derived from it. The design skill is drawing that line explicitly.",
    ],
    keyTerms: ["strong-consistency", "eventual-consistency"], patterns: ["database-replication", "cache-aside"],
  },
  {
    slug: "caching", name: "Caching", area: "Caching", order: 6,
    summary: "Hit rate, working set, invalidation and stampedes.",
    body: [
      "A cache is worth what its hit rate saves. With skewed popularity, a cache holding a small fraction of keys can absorb most reads; the Cache simulator in the Practice Lab models this with a Zipf distribution.",
      "Invalidation is the hard part. Delete-on-write with a TTL backstop is the common default; versioned keys avoid races where an old value is written back after an update.",
      "When a hot key expires, every concurrent request misses together. Request coalescing and serve-stale prevent that stampede from reaching the database.",
    ],
    keyTerms: ["hit-rate", "working-set", "cache-stampede", "hot-key"], patterns: ["cache-aside", "request-coalescing", "cdn-edge-caching"],
  },
  {
    slug: "queues-and-streams", name: "Queues and event streams", area: "Queues and event streams", order: 7,
    summary: "Decoupling with queues, delivery guarantees and consumer lag.",
    body: [
      "Queues absorb bursts and let producers and consumers scale independently. They do not create capacity; a consumer slower than its producer still falls behind, just more quietly.",
      "Most brokers deliver at least once, so consumers must be idempotent. Ordering is usually guaranteed only within a partition, so partition by the key whose order matters.",
      "Consumer lag is the key health metric: how far behind the newest event the consumers are, measured in messages or seconds.",
    ],
    keyTerms: ["at-least-once", "consumer-lag", "dead-letter-queue"], patterns: ["transactional-outbox", "dead-letter-queue", "backpressure"],
  },
  {
    slug: "storage", name: "Storage", area: "Storage", order: 8,
    summary: "Block, file and object storage, durability and lifecycle.",
    body: [
      "Object storage holds large immutable blobs cheaply and durably, addressed by key. It suits media, backups and artifacts, but not small transactional updates.",
      "Durability is expressed as the probability of losing data over a year; availability is whether you can read it now. They are different promises.",
      "Lifecycle rules move data to cheaper tiers and delete it on schedule, which is both a cost control and a privacy obligation.",
    ],
    keyTerms: ["durability", "rpo"], patterns: ["database-replication"],
  },
  {
    slug: "observability", name: "Observability", area: "Observability", order: 9,
    summary: "Metrics, logs and traces, and the signals worth alerting on.",
    body: [
      "Metrics tell you that something is wrong, traces tell you where, and logs tell you why. All three are needed during an incident.",
      "Alert on symptoms users feel, such as error rate and latency for key journeys, rather than on every internal cause.",
      "Percentiles matter more than averages. A p99 latency of 5 s means one request in a hundred is slow, and a page that makes 50 calls will often hit one.",
    ],
    keyTerms: ["p99", "slo"], patterns: [],
  },
  {
    slug: "reliability-engineering", name: "Reliability engineering", area: "Reliability engineering", order: 10,
    summary: "SLOs, error budgets, cascading failure and graceful degradation.",
    body: [
      "A service level objective states how reliable a journey must be. The error budget is the allowed unreliability, and spending it decides when to slow releases.",
      "Cascading failures start when one slow component causes its callers to queue and retry, which overloads them in turn. Timeouts, load shedding and retry budgets break the chain.",
      "Graceful degradation is a plan, not an accident: a ladder of features to disable, in order, each with a trigger and a recovery condition.",
    ],
    keyTerms: ["slo", "error-budget", "load-shedding", "graceful-degradation"], patterns: ["circuit-breaker", "bulkhead-isolation", "backpressure"],
  },
  {
    slug: "security", name: "Security", area: "Security", order: 11,
    summary: "Trust boundaries, object-level authorization and abuse.",
    body: [
      "Every request from a client is untrusted. Authorization must be checked on the server for every object, using identity from the session rather than IDs from the request body.",
      "Abuse is a capacity problem as well as a security problem: bots consume the same resources as humans. Limits per account and device are part of the security design.",
      "Secrets belong in a secret store, not in code or logs. Rotate them, and design for rotation before you need it.",
    ],
    keyTerms: ["bola", "trust-boundary"], patterns: ["rate-limiting", "api-gateway"],
  },
  {
    slug: "capacity-planning", name: "Capacity planning", area: "Capacity planning", order: 12,
    summary: "From users to requests per second to instances, with explicit assumptions.",
    body: [
      "Start from user behavior: how many people, how many actions each, over what time. Convert to average requests per second, then apply a peak-to-average ratio drawn from the shape of the workload.",
      "Divide peak load by what one instance can sustain at a target utilization, then add headroom. The Capacity calculator shows each step of this arithmetic.",
      "Scaling is not instant. Detection, decision and startup together can take minutes, so step-shaped peaks must be pre-scaled rather than autoscaled.",
    ],
    keyTerms: ["peak-to-average", "headroom", "littles-law"], patterns: ["waiting-room", "load-balancing"],
  },
  {
    slug: "queueing-theory", name: "Queueing basics", area: "Capacity planning", order: 13,
    summary: "Utilization, waiting time and why systems fall apart near 100 percent.",
    body: [
      "Little's law, L = λW, links the number of requests in a system to arrival rate and time in system. It holds for any stable system and is the quickest sanity check in capacity planning.",
      "In an M/M/1 queue, waiting time grows as ρ / (1 − ρ). At 50 percent utilization requests wait one service time on average; at 90 percent, nine; at 99 percent, ninety-nine.",
      "Real workloads are burstier than the model assumes, so treat its results as optimistic. The Queue simulator states its assumptions on screen.",
    ],
    keyTerms: ["littles-law", "utilization"], patterns: ["backpressure"],
  },
  {
    slug: "ml-infrastructure", name: "ML infrastructure", area: "ML infrastructure", order: 14,
    summary: "Training pipelines, feature stores, registries and reproducibility.",
    body: [
      "Training is batch work scheduled on scarce accelerators. Reproducibility needs versioned data, code and configuration captured together for each run.",
      "A model registry records which model version is approved for which environment, and lets serving roll back to a known version.",
      "Training-serving skew happens when features are computed differently offline and online. Feature stores reduce it by sharing definitions.",
    ],
    keyTerms: ["model-registry", "feature-store"], patterns: ["canary-deployment"],
  },
  {
    slug: "inference-serving", name: "Inference serving", area: "Inference serving", order: 15,
    summary: "Prefill and decode, continuous batching, KV-cache and token-based admission.",
    body: [
      "LLM inference has two phases. Prefill processes the prompt in parallel and is compute-bound; decode generates one token at a time and is memory-bandwidth-bound.",
      "Continuous batching adds new sequences to a running batch as others finish, keeping accelerators busy without waiting for a full batch.",
      "The KV-cache stores attention state for each active sequence and grows with context length. It, rather than compute, often limits how many requests fit at once, so admission control counts tokens, not requests.",
    ],
    keyTerms: ["prefill", "decode", "kv-cache", "continuous-batching"], patterns: ["model-serving-batching", "rate-limiting"],
  },
];

export const conceptBySlug = new Map(concepts.map((c) => [c.slug, c]));
