import type { Metadata } from "next";
import Link from "next/link";
import { concepts } from "@/content/concepts";

export const metadata: Metadata = { title: "Concepts", description: "System design fundamentals in learning order, from networking to inference serving." };

export default function ConceptsPage() {
  return (
    <div className="wrap py-10">
      <h1 className="h1">Concepts</h1>
      <p className="mt-2 prose text-ink-3">Short explanations of the ideas the tutorials build on, in a sensible reading order.</p>
      <ol className="mt-8 max-w-3xl divide-y divide-line border-y border-line">
        {[...concepts].sort((a, b) => a.order - b.order).map((c) => (
          <li key={c.slug} className="grid grid-cols-[2rem_1fr] py-3">
            <span className="num font-semibold text-ink-2">{c.order}.</span>
            <span><Link href={`/concepts/${c.slug}`} className="font-semibold">{c.name}</Link><span className="block small text-ink-3">{c.summary}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
