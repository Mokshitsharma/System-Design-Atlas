export type SearchKind = "tutorial" | "platform" | "category" | "pattern" | "concept" | "glossary" | "section";
export type SearchDoc = { kind: SearchKind; title: string; href: string; detail: string; text: string };

export const KIND_LABEL: Record<SearchKind, string> = {
  tutorial: "Tutorial",
  platform: "Platform",
  category: "Category",
  pattern: "Pattern",
  concept: "Concept",
  glossary: "Glossary",
  section: "Tutorial section",
};

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export function searchDocs(docs: SearchDoc[], query: string, kinds?: Set<SearchKind>, limit = 30) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored: { doc: SearchDoc; score: number }[] = [];
  for (const doc of docs) {
    if (kinds?.size && !kinds.has(doc.kind)) continue;
    const title = norm(doc.title);
    const detail = norm(doc.detail);
    const text = norm(doc.text);
    let score = 0;
    let all = true;
    for (const t of terms) {
      if (title.startsWith(t)) score += 12;
      else if (title.includes(t)) score += 8;
      else if (detail.includes(t)) score += 3;
      else if (text.includes(t)) score += 1;
      else all = false;
    }
    if (all && score > 0) scored.push({ doc, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).slice(0, limit).map((s) => s.doc);
}

/** Splits text into segments with matched terms flagged, for highlighting without innerHTML. */
export function highlight(text: string, query: string): { text: string; hit: boolean }[] {
  const terms = query.trim().split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!terms.length) return [{ text, hit: false }];
  const re = new RegExp(`(${terms.join("|")})`, "gi");
  const exact = terms.map((t) => new RegExp(`^${t}$`, "i"));
  return text.split(re).filter(Boolean).map((part) => ({ text: part, hit: exact.some((r) => r.test(part)) }));
}
