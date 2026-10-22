import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatternDiagram } from "@/components/PatternDiagram";
import { platformBySlug } from "@/content/catalog";
import { concepts } from "@/content/concepts";
import { patternBySlug, patterns } from "@/content/patterns";
import { getTutorial, tutorialSlugs } from "@/content/tutorials";

export function generateStaticParams() {
  return patterns.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/patterns/[slug]">): Promise<Metadata> {
  const p = patternBySlug.get((await params).slug);
  return p ? { title: p.name, description: p.summary } : {};
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="h3">{title}</h3>
      <ul className="prose mt-2 small">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </section>
  );
}

export default async function PatternPage({ params }: PageProps<"/patterns/[slug]">) {
  const { slug } = await params;
  const p = patternBySlug.get(slug);
  if (!p) notFound();
  const usedIn = tutorialSlugs.filter((s) => getTutorial(s)!.patterns.includes(slug));
  const background = concepts.filter((c) => c.patterns.includes(slug));

  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="small muted"><Link href="/patterns">Architecture patterns</Link></nav>
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
        <article className="min-w-0 max-w-[780px]">
          <h1 className="h1">{p.name}</h1>
          <p className="mt-2 text-[1.125rem] text-ink-3 prose">{p.summary}</p>
          <div className="mt-8 grid gap-8">
            <section><h2 className="h2">1. The problem</h2><p className="prose mt-2">{p.problem}</p></section>
            <section><h2 className="h2">2. The idea</h2><p className="prose mt-2">{p.idea}</p></section>
            <section>
              <h2 className="h2">3. How it works</h2>
              <div className="mt-3"><PatternDiagram nodes={p.diagram.nodes} edges={p.diagram.edges} title={p.name} /></div>
              <ol className="prose mt-4">{p.flow.map((f) => <li key={f}>{f}</li>)}</ol>
            </section>
            <section>
              <h2 className="h2">4. Strengths and weaknesses</h2>
              <div className="mt-3 grid gap-6 md:grid-cols-2">
                <List title="Advantages" items={p.advantages} />
                <List title="Limitations" items={p.limitations} />
                <List title="How it can fail" items={p.failureModes} />
                <List title="Running it in production" items={p.operations} />
              </div>
            </section>
            <section>
              <h2 className="h2">5. When to use it</h2>
              <div className="mt-3 grid gap-6 md:grid-cols-2">
                <List title="Use it when" items={p.useWhen} />
                <List title="Avoid it when" items={p.avoidWhen} />
              </div>
            </section>
          </div>
        </article>
        <aside className="grid content-start gap-6 small">
          {usedIn.length > 0 && (
            <section>
              <h2 className="font-semibold">Used in</h2>
              <ul className="mt-1">{usedIn.map((s) => <li key={s}><Link href={`/system-design/${s}`}>{platformBySlug.get(s)!.name} tutorial</Link></li>)}</ul>
            </section>
          )}
          <section>
            <h2 className="font-semibold">Related patterns</h2>
            <ul className="mt-1">{p.related.map((r) => <li key={r}><Link href={`/patterns/${r}`}>{patternBySlug.get(r)!.name}</Link></li>)}</ul>
          </section>
          {background.length > 0 && (
            <section>
              <h2 className="font-semibold">Background reading</h2>
              <ul className="mt-1">{background.map((c) => <li key={c.slug}><Link href={`/concepts/${c.slug}`}>{c.name}</Link></li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
