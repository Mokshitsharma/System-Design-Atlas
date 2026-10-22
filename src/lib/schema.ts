import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Shared enums                                                        */
/* ------------------------------------------------------------------ */

export const Evidence = z.enum(["public", "inferred", "assumption"]);
export type Evidence = z.infer<typeof Evidence>;


const isoDate = z.iso.date();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case");

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export const Category = z.object({
  slug,
  plate: z.number().int().min(1).max(20),
  name: z.string().min(2),
  signatureFocus: z.string().min(20),
});
export type Category = z.infer<typeof Category>;

export const Platform = z.object({
  id: z.number().int().min(1),
  slug,
  name: z.string().min(1),
  category: slug,
  difficulty: z.number().int().min(1).max(5),
  signature: z.string().min(12),
  tags: z.array(z.string().min(2)).min(1),
});
export type Platform = z.infer<typeof Platform>;


/* ------------------------------------------------------------------ */
/* Sources and evidence                                                */
/* ------------------------------------------------------------------ */

export const Source = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(4),
  publisher: z.string().min(2),
  url: z.url({ protocol: /^https$/ }),
  kind: z.enum(["official", "government", "documentation", "press", "book", "paper"]),
  publishedAt: isoDate.nullable(),
  accessedAt: isoDate,
  note: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

/** A paragraph that makes a material claim carries an evidence label. */
export const Claim = z
  .object({
    text: z.string().min(20),
    evidence: Evidence,
    sources: z.array(z.string()).default([]),
    note: z.string().optional(),
  })
  .refine((c) => c.evidence !== "public" || c.sources.length > 0, {
    message: "a [Public] claim must cite at least one source",
  });
export type Claim = z.infer<typeof Claim>;

/* ------------------------------------------------------------------ */
/* Workflow diagrams                                                   */
/* ------------------------------------------------------------------ */

export const NODE_KINDS = ["user", "edge", "service", "database", "cache", "queue", "external"] as const;
export const NodeKind = z.enum(NODE_KINDS);
export type NodeKind = z.infer<typeof NodeKind>;

export const TAGS = ["cache", "queue", "transaction", "retry"] as const;
export const Tag = z.enum(TAGS);
export type Tag = z.infer<typeof Tag>;

/** Plain-English explanation shown when a component is selected. */
export const Explain = z.object({
  what: z.string().min(10),
  why: z.string().min(10),
  input: z.string().min(3),
  inside: z.string().min(10),
  output: z.string().min(3),
  risks: z.array(z.string()).min(1),
});

export const WNode = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(2).max(28),
  kind: NodeKind,
  /** Grid position in the detailed and failure views: 4 columns, any number of rows. */
  col: z.number().int().min(0).max(3),
  row: z.number().int().min(0).max(5),
  /** Shown only in the failure view (for example a reconciliation job). */
  failureOnly: z.boolean().default(false),
  tags: z.array(Tag).default([]),
  explain: Explain,
});
export type WNode = z.infer<typeof WNode>;

/** One step of a path. The arrow goes from `from` (default: the previous step's node) to `node`. */
export const Step = z.object({
  node: z.string(),
  from: z.string().optional(),
  text: z.string().min(8),
  /** Happens later, in the background; drawn as a dashed arrow. */
  async: z.boolean().default(false),
});
export type Step = z.infer<typeof Step>;

export const WFailure = z.object({
  id: z.string(),
  title: z.string().min(5),
  node: z.string(),
  what: z.string().min(10),
  userSees: z.string().min(10),
  detect: z.string().min(10),
  steps: z.array(Step).min(1),
});
export type WFailure = z.infer<typeof WFailure>;

export const Workflow = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(5),
  summary: z.string().min(20),
  nodes: z.array(WNode).min(2).max(14),
  simple: z.array(Step).min(2).max(8),
  detailed: z.array(Step).min(2).max(14),
  failures: z.array(WFailure).min(1).max(4),
});
export type Workflow = z.infer<typeof Workflow>;

/* ------------------------------------------------------------------ */
/* Tutorial                                                            */
/* ------------------------------------------------------------------ */

const Para = z.union([z.string().min(20), Claim]);
export type Para = z.infer<typeof Para>;

export const Tutorial = z.object({
  slug,
  title: z.string().min(10),
  summary: z.string().min(40),
  lastVerifiedAt: isoDate,
  sources: z.array(Source).min(1),
  patterns: z.array(slug).min(1),
  intro: z.object({
    paragraphs: z.array(Para).min(2),
    known: z.array(Claim).min(1),
    /** The whole journey told with the reader as the user, in plain words. */
    story: z.object({ title: z.string().min(5), steps: z.array(z.string().min(15)).min(3).max(9) }),
  }),
  requirements: z.object({
    functional: z.array(z.string().min(10)).min(3).max(8),
    nonFunctional: z.array(z.object({ name: z.string(), meaning: z.string().min(10), target: z.string() })).min(3).max(8),
    outOfScope: z.array(z.string()).min(1),
    terms: z.array(z.object({ term: z.string(), meaning: z.string().min(10) })).default([]),
  }),
  capacity: z.object({
    intro: z.string().min(20),
    assumptions: z.array(z.object({ label: z.string(), value: z.number(), unit: z.string(), note: z.string().optional(), evidence: Evidence.default("assumption"), sources: z.array(z.string()).default([]) })).min(3),
    steps: z.array(z.object({ label: z.string(), formula: z.string(), working: z.string(), result: z.number().finite(), unit: z.string() })).min(3).max(8),
    takeaways: z.array(z.string()).min(1),
    calculator: z.object({
      avgRps: z.number().positive(),
      peakMultiplier: z.number().min(1).max(50),
      rpsPerServer: z.number().positive(),
      utilization: z.number().min(0.1).max(0.95),
    }),
  }),
  architecture: z.object({ intro: z.string().min(20), workflow: Workflow }),
  workflows: z.array(Workflow).min(1).max(4),
  database: z.object({
    intro: z.string().min(20),
    entities: z
      .array(z.object({
        name: z.string(),
        purpose: z.string().min(10),
        fields: z.array(z.object({ name: z.string(), type: z.string(), note: z.string().optional() })).min(2),
        relations: z.array(z.string()).default([]),
      }))
      .min(3).max(8),
    why: z.array(z.string().min(10)).min(1),
  }),
  decisions: z
    .array(z.object({
      id: z.string(),
      title: z.string(),
      problem: z.string().min(20),
      solution: z.string().min(20),
      how: z.string().min(20),
      where: z.string().min(10),
      tradeoff: z.string().min(20),
      demo: z.enum(["queue"]).optional(),
      /** Words the queue demo uses for the people waiting and the place they wait to enter. */
      demoPeople: z.string().default("fans"),
      demoPlace: z.string().default("shop"),
    }))
    .min(3).max(8),
  failures: z
    .array(z.object({
      title: z.string(),
      what: z.string().min(10),
      userSees: z.string().min(10),
      detect: z.string().min(10),
      recover: z.string().min(10),
      prevent: z.string().min(10),
      evidence: Evidence.default("inferred"),
      sources: z.array(z.string()).default([]),
    }))
    .min(4).max(8),
  recap: z.object({
    decisions: z.array(z.object({ decision: z.string(), why: z.string(), cost: z.string() })).min(3),
    questions: z.array(z.object({ q: z.string(), a: z.string() })).min(3).max(8),
  }),
});
export type Tutorial = z.infer<typeof Tutorial>;
export type TutorialInput = z.input<typeof Tutorial>;

/* ------------------------------------------------------------------ */
/* Library content                                                     */
/* ------------------------------------------------------------------ */

export const Pattern = z.object({
  slug,
  name: z.string(),
  summary: z.string().min(20),
  problem: z.string().min(40),
  idea: z.string().min(40),
  diagram: z.object({
    nodes: z.array(z.string()).min(2),
    edges: z.array(z.tuple([z.number().int(), z.number().int(), z.string()])).min(1),
  }),
  flow: z.array(z.string()).min(3),
  advantages: z.array(z.string()).min(2),
  limitations: z.array(z.string()).min(1),
  failureModes: z.array(z.string()).min(1),
  operations: z.array(z.string()).min(1),
  useWhen: z.array(z.string()).min(1),
  avoidWhen: z.array(z.string()).min(1),
  related: z.array(slug),
});
export type Pattern = z.infer<typeof Pattern>;

export const Concept = z.object({
  slug,
  name: z.string(),
  area: z.string(),
  order: z.number().int(),
  summary: z.string().min(20),
  body: z.array(z.string().min(40)).min(2),
  keyTerms: z.array(z.string()),
  patterns: z.array(slug),
});
export type Concept = z.infer<typeof Concept>;

export const GlossaryTerm = z.object({
  term: z.string(),
  slug,
  definition: z.string().min(20),
  related: z.array(slug),
  concept: slug.optional(),
});
export type GlossaryTerm = z.infer<typeof GlossaryTerm>;

