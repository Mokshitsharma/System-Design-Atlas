"use client";

import Link from "next/link";
import { useState } from "react";
import type { GlossaryTerm } from "@/lib/schema";

export function GlossaryList({ terms, conceptNames }: { terms: GlossaryTerm[]; conceptNames: Record<string, string> }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = terms.filter((t) => !needle || t.term.toLowerCase().includes(needle) || t.definition.toLowerCase().includes(needle));
  const name = (slug: string) => terms.find((t) => t.slug === slug)?.term ?? slug;
  return (
    <div>
      <div className="grid max-w-md gap-1">
        <label htmlFor="g-q" className="label">Filter terms</label>
        <input id="g-q" type="search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example: cache, queue, latency" />
      </div>
      <p className="mt-3 tiny muted" aria-live="polite"><span className="num">{shown.length}</span> of {terms.length} terms</p>
      {shown.length === 0 ? (
        <p className="mt-6">No term matches &ldquo;{q}&rdquo;. Try a shorter word.</p>
      ) : (
        <dl className="mt-4 grid max-w-3xl">
          {shown.map((t) => (
            <div key={t.slug} id={t.slug} className="scroll-mt-24 border-t border-line py-4 target:bg-blue-soft target:px-3">
              <dt className="font-semibold">{t.term}</dt>
              <dd className="mt-1 small">
                <p>{t.definition}</p>
                <p className="mt-1.5 muted">
                  {t.related.length > 0 && <>Related: {t.related.map((r, i) => <span key={r}>{i > 0 && ", "}<a href={`#${r}`}>{name(r)}</a></span>)}. </>}
                  {t.concept && <>Read more in <Link href={`/concepts/${t.concept}`}>{conceptNames[t.concept]}</Link>.</>}
                </p>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
