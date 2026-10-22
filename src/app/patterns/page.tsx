import type { Metadata } from "next";
import Link from "next/link";
import { patterns, plannedPatterns } from "@/content/patterns";

export const metadata: Metadata = {
  title: "Architecture patterns",
  description: "Common architecture patterns explained simply: the problem, the idea, how it works and when not to use it.",
};

export default function PatternsPage() {
  const sorted = [...patterns].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="wrap py-10">
      <h1 className="h1">Architecture patterns</h1>
      <p className="mt-2 prose text-ink-3">Reusable solutions to problems that come up again and again in system design. Each page explains the problem first, then the idea, how it works, and when it is the wrong choice.</p>
      <ul className="mt-8 grid max-w-4xl gap-x-10 md:grid-cols-2">
        {sorted.map((p) => (
          <li key={p.slug} className="border-b border-line py-3">
            <Link href={`/patterns/${p.slug}`} className="font-semibold">{p.name}</Link>
            <p className="small text-ink-3">{p.summary}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 small muted">Not written yet: {plannedPatterns.join(", ")}.</p>
    </div>
  );
}
