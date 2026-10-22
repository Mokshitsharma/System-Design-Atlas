import type { SearchDoc } from "./search-core";
import { categories, categoryBySlug, platforms } from "@/content/catalog";
import { concepts } from "@/content/concepts";
import { glossary } from "@/content/glossary";
import { patterns } from "@/content/patterns";
import { getTutorial, hasTutorial, tutorialSlugs } from "@/content/tutorials";

/** Only public material: published tutorials, the platform list, and reference pages. No planning data. */
export function buildSearchIndex(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const p of platforms) {
    const c = categoryBySlug.get(p.category)!;
    const ready = hasTutorial(p.slug);
    docs.push({
      kind: ready ? "tutorial" : "platform",
      title: ready ? getTutorial(p.slug)!.title : p.name,
      href: `/system-design/${p.slug}`,
      detail: ready ? `${c.name}. Tutorial available.` : `${c.name}. Tutorial not written yet.`,
      text: [p.name, p.signature, c.name, ...p.tags].join(" "),
    });
  }
  for (const c of categories) docs.push({ kind: "category", title: c.name, href: `/system-design?category=${c.slug}`, detail: "Category", text: c.signatureFocus });
  for (const p of patterns) docs.push({ kind: "pattern", title: p.name, href: `/patterns/${p.slug}`, detail: p.summary, text: [p.problem, p.idea].join(" ") });
  for (const c of concepts) docs.push({ kind: "concept", title: c.name, href: `/concepts/${c.slug}`, detail: c.summary, text: c.body.join(" ") });
  for (const g of glossary) docs.push({ kind: "glossary", title: g.term, href: `/glossary#${g.slug}`, detail: g.definition, text: g.definition });
  for (const slug of tutorialSlugs) {
    const t = getTutorial(slug)!;
    const name = platforms.find((p) => p.slug === slug)!.name;
    const sec = (id: string, title: string, text: string) => docs.push({ kind: "section", title: `${name}: ${title}`, href: `/system-design/${slug}#${id}`, detail: t.title, text });
    sec("capacity", "Capacity estimation", t.capacity.steps.map((s) => s.label).join(" "));
    sec("database", "Database design", t.database.entities.map((e) => `${e.name} ${e.purpose}`).join(" "));
    for (const d of t.decisions) sec(`decision-${d.id}`, d.title, `${d.problem} ${d.solution}`);
    sec("failures", "Failure scenarios", t.failures.map((f) => `${f.title} ${f.what}`).join(" "));
    for (const w of t.workflows) sec(`workflow-${w.id}`, w.title, w.summary);
  }
  return docs;
}
