"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category, Platform } from "@/lib/schema";

type Row = Platform & { tutorialTitle?: string };

/** All platforms grouped by category. Search and category filter live in the URL. */
export function CatalogList({ rows, categories }: { rows: Row[]; categories: Category[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const q = params.get("q") ?? "";
  const cat = params.get("category") ?? "";
  const onlyReady = params.get("available") === "1";

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  };

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (r: Row) => {
    const hay = [r.name, r.signature, r.tutorialTitle ?? "", ...r.tags].join(" ").toLowerCase();
    return terms.every((t) => hay.includes(t));
  };
  const shown = rows.filter((r) => (!cat || r.category === cat) && (!onlyReady || r.tutorialTitle) && matches(r));
  const groups = categories.map((c) => ({ c, items: shown.filter((r) => r.category === c.slug) })).filter((g) => g.items.length);

  return (
    <div>
      <div className="grid gap-3 border-b border-line pb-5 sm:grid-cols-[1fr_16rem] sm:items-end">
        <div className="grid gap-1">
          <label htmlFor="cat-q" className="label">Search</label>
          <input id="cat-q" type="search" className="input" value={q} placeholder="Platform name or topic, for example payments" onChange={(e) => set("q", e.target.value)} data-testid="catalog-search" />
        </div>
        <div className="grid gap-1">
          <label htmlFor="cat-c" className="label">Category</label>
          <select id="cat-c" className="input" value={cat} onChange={(e) => set("category", e.target.value)} data-testid="catalog-category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 small sm:col-span-2">
          <input type="checkbox" checked={onlyReady} onChange={(e) => set("available", e.target.checked ? "1" : "")} className="h-4 w-4 accent-[var(--blue)]" />
          Show only platforms with a tutorial
        </label>
      </div>

      <p className="mt-4 small muted" aria-live="polite" data-testid="catalog-count">
        {shown.length} {shown.length === 1 ? "platform" : "platforms"}{shown.length !== rows.length ? ` of ${rows.length}` : ""}
      </p>

      {groups.length === 0 ? (
        <div className="mt-6">
          <p className="font-semibold">No platforms match.</p>
          <p className="mt-1 small muted">Try a shorter word, or clear the filters.</p>
          <button type="button" className="btn btn-sm mt-3" onClick={() => router.replace(path, { scroll: false })}>Clear filters</button>
        </div>
      ) : (
        <div className="mt-4 grid gap-8">
          {groups.map(({ c, items }) => (
            <section key={c.slug} aria-labelledby={`cat-${c.slug}`}>
              <h2 id={`cat-${c.slug}`} className="h3">{c.name}</h2>
              <p className="mt-0.5 small muted prose">{c.signatureFocus}</p>
              <ul className="mt-3 table-wrap divide-y divide-line">
                {items.map((r) => (
                  <li key={r.slug} className="grid gap-x-4 gap-y-0.5 px-3 py-2.5 sm:grid-cols-[11rem_1fr_auto] sm:items-baseline">
                    <Link href={`/system-design/${r.slug}`} className="font-semibold">{r.name}</Link>
                    <span className="small text-ink-3">{r.signature}</span>
                    <span className="tiny">{r.tutorialTitle ? <Link href={`/system-design/${r.slug}`} className="font-semibold">Read the tutorial</Link> : <Link href={`/system-design/${r.slug}`} className="text-ink-2 no-underline hover:underline">Not written yet</Link>}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
