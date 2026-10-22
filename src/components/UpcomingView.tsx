import Link from "next/link";
import { platforms } from "@/content/catalog";
import { getTutorial, tutorialSlugs } from "@/content/tutorials";
import type { Category, Platform } from "@/lib/schema";

const SECTIONS = [
  ["Introduction", "what the platform does and the problem we are solving"],
  ["Requirements", "what the system must do, and how well"],
  ["Capacity estimation", "turning users into requests per second, with the math shown"],
  ["High-level architecture", "every component on one interactive diagram"],
  ["Step-by-step workflows", "the important journeys, which you can play like a request"],
  ["Database design", "the main tables and why they are shaped that way"],
  ["Technical decisions", "the problem, the solution and the trade-off for each choice"],
  ["Failure scenarios", "what breaks, what users see and how the system recovers"],
  ["Recap", "trade-offs and interview questions"],
];

/** Page for a platform whose tutorial is not written yet. States only what the tutorial is about. */
export function UpcomingView({ platform, category }: { platform: Platform; category: Category }) {
  const others = platforms.filter((p) => p.category === category.slug && p.slug !== platform.slug);
  const ready = tutorialSlugs.map((s) => ({ slug: s, title: getTutorial(s)!.title, sameCategory: platforms.find((p) => p.slug === s)!.category === category.slug }))
    .sort((a, b) => Number(b.sameCategory) - Number(a.sameCategory));

  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="small muted">
        <Link href="/system-design">System Design</Link> <span aria-hidden="true">/</span> <Link href={`/system-design?category=${category.slug}`}>{category.name}</Link>
      </nav>
      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="max-w-[780px]" data-testid="upcoming">
          <h1 className="h1">{platform.name} system design</h1>
          <div className="note mt-5">
            <p className="font-semibold">This tutorial is not written yet.</p>
            <p className="mt-1 small">The design challenge it will cover is described below. In the meantime, the finished tutorials use the same format and many of the same ideas.</p>
          </div>

          <h2 className="h2 mt-8">The design challenge</h2>
          <p className="prose mt-2 text-[1.125rem]">{platform.signature}.</p>

          <h2 className="h2 mt-8">What makes {category.name.toLowerCase()} interesting</h2>
          <p className="prose mt-2">{category.signatureFocus}</p>

          <h2 className="h2 mt-8">How the tutorial will be organised</h2>
          <p className="prose mt-2 muted">Every tutorial follows the same nine sections, starting with a short story where you are the user.</p>
          <ol className="mt-3 grid gap-1.5 small">
            {SECTIONS.map(([name, desc], i) => (
              <li key={name} className="grid grid-cols-[1.5rem_1fr]">
                <span className="num font-semibold text-blue-dark">{i + 1}.</span>
                <span><span className="font-semibold">{name}:</span> <span className="text-ink-3">{desc}</span></span>
              </li>
            ))}
          </ol>
        </article>

        <aside className="grid content-start gap-8 small">
          <section>
            <h2 className="font-semibold">Read a finished tutorial</h2>
            <ul className="mt-2 grid gap-2">
              {ready.map((t) => <li key={t.slug}><Link href={`/system-design/${t.slug}`}>{t.title}</Link></li>)}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold">Also in {category.name}</h2>
            <ul className="mt-2 grid gap-1">
              {others.map((p) => <li key={p.slug}><Link href={`/system-design/${p.slug}`}>{p.name}</Link></li>)}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
