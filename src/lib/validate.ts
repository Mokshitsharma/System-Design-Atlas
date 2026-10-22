import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { categories, PLATFORM_COUNT, platforms } from "@/content/catalog";
import { concepts } from "@/content/concepts";
import { glossary } from "@/content/glossary";
import { patterns } from "@/content/patterns";
import { tutorialInputs } from "@/content/tutorials";
import { Category, Concept, GlossaryTerm, Pattern, Platform, Tutorial, type Workflow } from "@/lib/schema";
import { buildSequence, placeNodes } from "@/lib/workflow";

export type Issue = { level: "error" | "warning"; where: string; message: string };

const PLACEHOLDER = /\b(lorem ipsum|todo|tbd|placeholder|coming soon)\b/i;

function dupes<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const out = new Set<T>();
  for (const x of items) (seen.has(x) ? out : seen).add(x);
  return [...out];
}

export function validateWorkflow(where: string, wf: Workflow): Issue[] {
  const issues: Issue[] = [];
  const err = (w: string, message: string) => issues.push({ level: "error", where: `${where}.${w}`, message });
  const ids = new Set(wf.nodes.map((n) => n.id));
  for (const d of dupes(wf.nodes.map((n) => n.id))) err("nodes", `duplicate node id "${d}"`);
  const cells = wf.nodes.map((n) => `${n.col},${n.row}`);
  for (const d of dupes(cells)) err("nodes", `two nodes share grid cell ${d}`);
  const failOnly = new Set(wf.nodes.filter((n) => n.failureOnly).map((n) => n.id));

  const checkSteps = (name: string, steps: Workflow["simple"], allowFailureOnly: boolean) =>
    steps.forEach((s, i) => {
      if (!ids.has(s.node)) err(`${name}[${i}]`, `unknown node "${s.node}"`);
      if (s.from && !ids.has(s.from)) err(`${name}[${i}]`, `unknown from-node "${s.from}"`);
      if (!allowFailureOnly && (failOnly.has(s.node) || (s.from && failOnly.has(s.from)))) err(`${name}[${i}]`, "uses a failure-only node outside the failure view");
    });
  checkSteps("simple", wf.simple, false);
  checkSteps("detailed", wf.detailed, false);
  for (const d of dupes(wf.failures.map((f) => f.id))) err("failures", `duplicate failure id "${d}"`);
  for (const f of wf.failures) {
    if (!ids.has(f.node)) err(`failures.${f.id}`, `unknown node "${f.node}"`);
    else if (!wf.detailed.some((s) => s.node === f.node)) err(`failures.${f.id}`, `failing node "${f.node}" never appears in the detailed path`);
    checkSteps(`failures.${f.id}`, f.steps, true);
  }
  // Every node shown in a view must be reachable by its path, so nothing on screen is unexplained.
  if (issues.length === 0) {
    for (const view of ["simple", "detailed"] as const) {
      const used = new Set(buildSequence(wf, view).flatMap((s) => [s.to, s.from].filter(Boolean) as string[]));
      for (const n of placeNodes(wf, view)) if (!used.has(n.id)) err(view, `node "${n.id}" is shown but not on the path`);
    }
  }
  return issues;
}

/** Recursively lists .ts/.tsx files, used to keep private planning code out of the app. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

export function validateContent(input = {
  categories, platforms, patterns, concepts, glossary, tutorials: tutorialInputs as Record<string, unknown>, srcDir: "src" as string | null,
}): Issue[] {
  const issues: Issue[] = [];
  const err = (where: string, message: string) => issues.push({ level: "error", where, message });
  const warn = (where: string, message: string) => issues.push({ level: "warning", where, message });
  const zodIssues = (where: string, e: z.ZodError) => e.issues.forEach((i) => err(`${where}${i.path.length ? `.${i.path.join(".")}` : ""}`, i.message));

  // Catalog
  input.categories.forEach((c, i) => { const r = Category.safeParse(c); if (!r.success) zodIssues(`categories[${i}]`, r.error); });
  if (input.categories.length !== 20) err("categories", `expected 20 categories, found ${input.categories.length}`);
  const catSlugs = new Set(input.categories.map((c) => c.slug));
  input.platforms.forEach((p, i) => { const r = Platform.safeParse(p); if (!r.success) zodIssues(`platforms[${i}]`, r.error); });
  if (input.platforms.length !== PLATFORM_COUNT) err("platforms", `expected exactly ${PLATFORM_COUNT} platforms, found ${input.platforms.length}`);
  for (const d of dupes(input.platforms.map((p) => p.slug))) err("platforms", `duplicate slug "${d}"`);
  for (const d of dupes(input.platforms.map((p) => p.id))) err("platforms", `duplicate id ${d}`);
  for (const p of input.platforms) {
    if (!catSlugs.has(p.category)) err(`platforms.${p.slug}`, `unknown category "${p.category}"`);
    if (PLACEHOLDER.test(p.signature)) err(`platforms.${p.slug}`, "signature challenge contains placeholder text");
  }

  // Library
  const patternSlugs = new Set(input.patterns.map((p) => p.slug));
  const conceptSlugs = new Set(input.concepts.map((c) => c.slug));
  const glossarySlugs = new Set(input.glossary.map((g) => g.slug));
  input.patterns.forEach((p, i) => { const r = Pattern.safeParse(p); if (!r.success) zodIssues(`patterns[${i}]`, r.error); });
  for (const d of dupes(input.patterns.map((p) => p.slug))) err("patterns", `duplicate slug "${d}"`);
  for (const p of input.patterns) {
    for (const r of p.related) if (!patternSlugs.has(r)) err(`patterns.${p.slug}`, `related pattern "${r}" does not exist`);
    for (const [a, b] of p.diagram.edges) if (!p.diagram.nodes[a] || !p.diagram.nodes[b]) err(`patterns.${p.slug}.diagram`, `edge ${a}->${b} references a missing node`);
  }
  input.concepts.forEach((c, i) => { const r = Concept.safeParse(c); if (!r.success) zodIssues(`concepts[${i}]`, r.error); });
  for (const c of input.concepts) {
    for (const p of c.patterns) if (!patternSlugs.has(p)) err(`concepts.${c.slug}`, `pattern "${p}" does not exist`);
    for (const k of c.keyTerms) if (!glossarySlugs.has(k)) err(`concepts.${c.slug}`, `glossary term "${k}" does not exist`);
  }
  input.glossary.forEach((g, i) => { const r = GlossaryTerm.safeParse(g); if (!r.success) zodIssues(`glossary[${i}]`, r.error); });
  for (const d of dupes(input.glossary.map((g) => g.slug))) err("glossary", `duplicate slug "${d}"`);
  for (const g of input.glossary) {
    for (const r of g.related) if (!glossarySlugs.has(r)) err(`glossary.${g.slug}`, `related term "${r}" does not exist`);
    if (g.concept && !conceptSlugs.has(g.concept)) err(`glossary.${g.slug}`, `concept "${g.concept}" does not exist`);
  }

  // Tutorials
  for (const [slug, raw] of Object.entries(input.tutorials)) {
    if (!input.platforms.some((p) => p.slug === slug)) { err(`tutorials.${slug}`, "no matching platform in the catalog"); continue; }
    const parsed = Tutorial.safeParse(raw);
    if (!parsed.success) { zodIssues(`tutorials.${slug}`, parsed.error); continue; }
    const t = parsed.data;
    if (t.slug !== slug) err(`tutorials.${slug}`, `slug field "${t.slug}" does not match its key`);
    const sourceIds = new Set(t.sources.map((s) => s.id));
    for (const d of dupes(t.sources.map((s) => s.id))) err(`tutorials.${slug}.sources`, `duplicate source id "${d}"`);
    const cite = (where: string, ids: string[]) => ids.forEach((id) => { if (!sourceIds.has(id)) err(where, `cites unknown source "${id}"`); });
    const claims = [...t.intro.paragraphs.filter((p) => typeof p !== "string"), ...t.intro.known];
    claims.forEach((c, i) => typeof c !== "string" && cite(`tutorials.${slug}.intro[${i}]`, c.sources));
    if (!t.intro.known.some((c) => c.evidence === "public")) err(`tutorials.${slug}.intro.known`, "needs at least one [Public] fact");
    t.failures.forEach((f, i) => {
      cite(`tutorials.${slug}.failures[${i}]`, f.sources);
      if (f.evidence === "public" && f.sources.length === 0) err(`tutorials.${slug}.failures[${i}]`, "[Public] failure must cite a source");
    });
    t.capacity.assumptions.forEach((a, i) => {
      cite(`tutorials.${slug}.capacity.assumptions[${i}]`, a.sources);
      if (a.evidence === "public" && a.sources.length === 0) err(`tutorials.${slug}.capacity.assumptions[${i}]`, "[Public] number must cite a source");
    });
    for (const p of t.patterns) if (!patternSlugs.has(p)) err(`tutorials.${slug}.patterns`, `pattern "${p}" does not exist`);
    for (const d of dupes([t.architecture.workflow.id, ...t.workflows.map((w) => w.id)])) err(`tutorials.${slug}`, `duplicate workflow id "${d}"`);
    for (const wf of [t.architecture.workflow, ...t.workflows]) issues.push(...validateWorkflow(`tutorials.${slug}.${wf.id}`, wf));
    if (JSON.stringify(t).match(PLACEHOLDER)) err(`tutorials.${slug}`, "contains placeholder text");
  }
  if (Object.keys(input.tutorials).length === 0) warn("tutorials", "no tutorials are published");

  // Privacy: the private plan must never be bundled into the site.
  if (input.srcDir) {
    for (const f of sourceFiles(input.srcDir)) {
      if (/from\s+["'][^"']*planning\//.test(readFileSync(f, "utf8"))) err(f, "imports from planning/, which is private and must stay out of the app");
    }
  }
  return issues;
}
