"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { highlight, KIND_LABEL, searchDocs, type SearchDoc, type SearchKind } from "@/lib/search-core";

const FILTERS: SearchKind[] = ["tutorial", "platform", "pattern", "concept", "glossary"];

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((s, i) =>
        s.hit ? <mark key={i} className="bg-blue-soft font-semibold text-blue-dark">{s.text}</mark> : <span key={i}>{s.text}</span>,
      )}
    </>
  );
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [kinds, setKinds] = useState<Set<SearchKind>>(new Set());
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();

  const load = useCallback(() => {
    setFailed(false);
    fetch("/search-index.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setDocs)
      .catch(() => setFailed(true));
  }, []);

  const show = useCallback(() => {
    setOpen(true);
    if (!docs) load();
  }, [docs, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); show(); }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); show(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); inputRef.current?.focus(); }
    if (!open && d.open) d.close();
  }, [open]);

  const results = useMemo(() => (docs ? searchDocs(docs, q, kinds) : []), [docs, q, kinds]);

  const go = (doc: SearchDoc) => { setOpen(false); router.push(doc.href); };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active]); }
  };

  const toggleKind = (k: SearchKind) => { setActive(0); setKinds((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; }); };

  return (
    <>
      <button type="button" onClick={show} className="btn btn-sm shrink-0 font-medium text-ink-3" aria-haspopup="dialog" data-testid="open-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Search</span>
        <kbd className="hidden rounded border border-line px-1 text-[0.7rem] text-ink-2 md:inline">Ctrl K</kbd>
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === dialogRef.current) setOpen(false); }}
        className="m-auto mt-[8vh] w-[min(680px,calc(100vw-32px))] rounded-md border border-line bg-bg p-0 text-ink shadow-lg backdrop:bg-slate-900/40"
        aria-label="Search the atlas"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={18} aria-hidden="true" className="text-ink-2" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onInputKey}
            placeholder="Search tutorials, platforms, patterns and terms"
            className="h-14 w-full bg-transparent text-base outline-none"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-label="Search query"
            data-testid="search-input"
          />
          <button type="button" onClick={() => setOpen(false)} className="btn btn-sm" aria-label="Close search"><X size={18} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5" role="group" aria-label="Filter results">
          {FILTERS.map((k) => (
            <button key={k} type="button" className={`rounded border px-2 py-0.5 text-[0.8125rem] font-medium ${kinds.has(k) ? "border-blue bg-blue text-white" : "border-line-strong text-ink-3"}`} aria-pressed={kinds.has(k)} onClick={() => toggleKind(k)}>{KIND_LABEL[k]}</button>
          ))}
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {failed ? (
            <p className="p-4 small">The search index did not load. <button className="font-semibold text-blue underline" onClick={load}>Try again</button></p>
          ) : !docs ? (
            <p className="p-4 small muted">Loading the search index.</p>
          ) : !q.trim() ? (
            <p className="p-4 small muted">Try &ldquo;ticket&rdquo;, &ldquo;cache&rdquo; or &ldquo;idempotency&rdquo;. Use the arrow keys to move and Enter to open.</p>
          ) : results.length === 0 ? (
            <p className="p-4 small">Nothing matches &ldquo;{q}&rdquo;{kinds.size ? " with these filters. Clear a filter to widen the search." : ". Try a shorter or different word."}</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Results" data-testid="search-results">
              {results.map((r, i) => (
                <li
                  key={r.href + r.title}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`cursor-pointer border-b border-line px-4 py-2.5 last:border-b-0 ${i === active ? "bg-blue-soft" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold"><Highlighted text={r.title} query={q} /></span>
                    <span className="shrink-0 tiny muted">{KIND_LABEL[r.kind]}</span>
                  </div>
                  <p className="small muted line-clamp-1"><Highlighted text={r.detail} query={q} /></p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}
