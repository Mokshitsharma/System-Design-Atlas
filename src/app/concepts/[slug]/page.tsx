import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { conceptBySlug, concepts } from "@/content/concepts";
import { glossary } from "@/content/glossary";
import { patternBySlug } from "@/content/patterns";

export function generateStaticParams() {
  return concepts.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/concepts/[slug]">): Promise<Metadata> {
  const c = conceptBySlug.get((await params).slug);
  return c ? { title: c.name, description: c.summary } : {};
}

export default async function ConceptPage({ params }: PageProps<"/concepts/[slug]">) {
  const { slug } = await params;
  const c = conceptBySlug.get(slug);
  if (!c) notFound();
  const ordered = [...concepts].sort((a, b) => a.order - b.order);
  const i = ordered.findIndex((x) => x.slug === slug);
  const terms = glossary.filter((g) => c.keyTerms.includes(g.slug));
  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="small muted"><Link href="/concepts">Concepts</Link></nav>
      <article className="mt-4 max-w-[780px]">
        <h1 className="h1">{c.name}</h1>
        <p className="mt-2 text-[1.125rem] text-ink-3 prose">{c.summary}</p>
        <div className="prose mt-6">{c.body.map((p) => <p key={p}>{p}</p>)}</div>
        {terms.length > 0 && (
          <div className="note mt-8">
            <p className="font-semibold">Key terms</p>
            <dl className="mt-2 grid gap-2 small">
              {terms.map((t) => <div key={t.slug}><dt className="inline font-semibold"><Link href={`/glossary#${t.slug}`}>{t.term}</Link>: </dt><dd className="inline">{t.definition}</dd></div>)}
            </dl>
          </div>
        )}
        {c.patterns.length > 0 && (
          <p className="mt-6 small"><span className="font-semibold">Patterns that build on this:</span> {c.patterns.map((p, k) => <span key={p}>{k > 0 && ", "}<Link href={`/patterns/${p}`}>{patternBySlug.get(p)!.name}</Link></span>)}.</p>
        )}
        <nav aria-label="Concept order" className="mt-10 flex justify-between gap-4 border-t border-line pt-4 small">
          {i > 0 ? <Link href={`/concepts/${ordered[i - 1].slug}`}>Previous: {ordered[i - 1].name}</Link> : <span />}
          {i < ordered.length - 1 ? <Link href={`/concepts/${ordered[i + 1].slug}`}>Next: {ordered[i + 1].name}</Link> : <span />}
        </nav>
      </article>
    </div>
  );
}
