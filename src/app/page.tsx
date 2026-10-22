import Link from "next/link";
import { categories, categoryBySlug, platformBySlug, platforms } from "@/content/catalog";
import { concepts } from "@/content/concepts";
import { patternBySlug, patterns } from "@/content/patterns";
import { getTutorial, readingMinutes, tutorialSlugs } from "@/content/tutorials";

const LEVEL: Record<number, string> = { 1: "Beginner", 2: "Beginner", 3: "Beginner friendly", 4: "Intermediate", 5: "Advanced" };

const POPULAR = ["cache-aside", "load-balancing", "idempotency", "waiting-room", "rate-limiting", "cdn-edge-caching"];

export default function Home() {
  const tutorials = tutorialSlugs
    .map((slug) => {
      const t = getTutorial(slug)!;
      const p = platformBySlug.get(slug)!;
      return {
        slug,
        title: t.title,
        summary: t.summary,
        difficulty: p.difficulty,
        category: categoryBySlug.get(p.category)!.name,
        minutes: readingMinutes(slug),
        diagrams: t.workflows.length + 1,
        learn: t.decisions.slice(0, 3).map((d) => d.title),
        question: t.recap.questions[0],
      };
    })
    .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title));
  const firstTutorial = tutorials[0];
  const basics = [...concepts].sort((a, b) => a.order - b.order);
  const tutorialCount = (cat: string) => tutorialSlugs.filter((s) => platformBySlug.get(s)!.category === cat).length;

  const PATH = [
    { title: "Learn the basics", body: "How requests travel, what databases and caches do, and why systems slow down. Short pages in reading order.", href: `/concepts/${basics[0].slug}`, cta: `Start with ${basics[0].name}` },
    { title: "Learn the building blocks", body: "Common solutions such as caching, queues, rate limits and retries: the problem each one solves and when not to use it.", href: "/patterns", cta: "Browse the patterns" },
    { title: "Design real systems", body: "Full tutorials on real platforms. Each starts with a short story where you are the user, then builds the design step by step.", href: `/system-design/${firstTutorial.slug}`, cta: `Start with ${firstTutorial.title.replace(/^Design an? /, "").replace(/^./, (c) => c.toUpperCase())}` },
    { title: "Practise for interviews", body: "Every tutorial ends with trade-offs and interview questions with answers. Try answering before you open them.", href: "#practice", cta: "See sample questions" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-bg-alt">
        <div className="wrap grid gap-10 py-12 md:py-16 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <h1 className="h1 !text-[clamp(2rem,1.5rem+1.8vw,2.75rem)]">Learn System Design, Step by Step</h1>
            <p className="mt-3 prose text-[1.125rem] text-ink-3">
              Free, beginner-friendly tutorials that show how real apps like Uber, Netflix and IRCTC could be designed. Every diagram is interactive: send a request through the system and watch where it goes.
            </p>
            <form action="/system-design" method="get" role="search" className="mt-6 flex max-w-xl gap-2">
              <label htmlFor="home-q" className="sr-only">Search tutorials</label>
              <input id="home-q" name="q" type="search" className="input !bg-bg" placeholder="Search a platform or topic, for example payments" />
              <button type="submit" className="btn btn-primary shrink-0">Search</button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 small">
              <span className="muted">Popular topics:</span>
              {POPULAR.map((s) => (
                <Link key={s} href={`/patterns/${s}`} className="rounded border border-line-strong bg-bg px-2 py-0.5 text-ink-3 no-underline hover:border-blue hover:text-blue">{patternBySlug.get(s)!.name}</Link>
              ))}
            </div>
          </div>

          <div className="box bg-bg p-5">
            <p className="small font-semibold">New here? Start with this tutorial</p>
            <Link href={`/system-design/${firstTutorial.slug}`} className="mt-2 block text-[1.125rem] font-semibold">{firstTutorial.title}</Link>
            <p className="mt-1 small text-ink-3">{firstTutorial.summary}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 small">
              <div><dt className="tiny muted">Level</dt><dd className="font-semibold">{LEVEL[firstTutorial.difficulty]}</dd></div>
              <div><dt className="tiny muted">Reading time</dt><dd className="font-semibold">{firstTutorial.minutes} min</dd></div>
              <div><dt className="tiny muted">Diagrams</dt><dd className="font-semibold">{firstTutorial.diagrams} interactive</dd></div>
            </dl>
            <Link href={`/system-design/${firstTutorial.slug}`} className="btn btn-primary mt-4 w-full">Start learning</Link>
          </div>
        </div>
      </section>

      {/* Learning path */}
      <section className="wrap pt-14" aria-labelledby="path">
        <h2 id="path" className="h2">Your learning path</h2>
        <p className="mt-1 small muted">Four steps. Start at the top, or jump to whatever you need.</p>
        <ol className="mt-6 grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
          {PATH.map((s, i) => (
            <li key={s.title} className="flex flex-col bg-bg p-5">
              <span className="num inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-soft font-bold text-blue-dark">{i + 1}</span>
              <h3 className="h3 mt-3">{s.title}</h3>
              <p className="mt-1 flex-1 small text-ink-3">{s.body}</p>
              <Link href={s.href} className="mt-3 small font-semibold">{s.cta}</Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Tutorials */}
      <section className="wrap pt-14" aria-labelledby="tutorials">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="tutorials" className="h2">System design tutorials</h2>
          <Link href="/system-design" className="small font-semibold">All {platforms.length} platforms</Link>
        </div>
        <p className="mt-1 small muted">Ordered from the most approachable to the most advanced.</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2" data-testid="home-tutorials">
          {tutorials.map((t) => (
            <li key={t.slug} className="box flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tiny">
                <span className="rounded bg-blue-soft px-1.5 py-0.5 font-semibold text-blue-dark">{LEVEL[t.difficulty]}</span>
                <span className="muted">{t.category}</span>
              </div>
              <Link href={`/system-design/${t.slug}`} className="mt-2 text-[1.125rem] font-semibold">{t.title}</Link>
              <p className="mt-1 small text-ink-3">{t.summary}</p>
              <p className="mt-3 tiny font-semibold">What you will learn</p>
              <ul className="mt-1 list-disc pl-5 small text-ink-3">
                {t.learn.map((l) => <li key={l}>{l}</li>)}
              </ul>
              <p className="mt-auto pt-4 tiny muted">{t.minutes} min read. {t.diagrams} interactive diagrams.</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Fundamentals and topics */}
      <div className="wrap grid gap-12 pt-14 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="basics">
          <h2 id="basics" className="h2">Fundamentals</h2>
          <p className="mt-1 small muted">Short explanations of the ideas every tutorial uses, in reading order.</p>
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {basics.slice(0, 8).map((c) => (
              <li key={c.slug} className="grid grid-cols-[2rem_1fr] py-2.5">
                <span className="num small font-semibold text-ink-2">{c.order}.</span>
                <span>
                  <Link href={`/concepts/${c.slug}`} className="font-semibold">{c.name}</Link>
                  <span className="block small text-ink-3">{c.summary}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link href="/concepts" className="mt-3 inline-block small font-semibold">All {concepts.length} fundamentals</Link>
        </section>

        <section aria-labelledby="topics">
          <h2 id="topics" className="h2">Browse by topic</h2>
          <p className="mt-1 small muted">Real platforms grouped by the kind of problem they solve.</p>
          <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
            {categories.map((c) => {
              const n = tutorialCount(c.slug);
              return (
                <li key={c.slug} className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                  <Link href={`/system-design?category=${c.slug}`} className="small">{c.name}</Link>
                  {n > 0 && <span className="tiny shrink-0 font-semibold text-ok">{n} {n === 1 ? "tutorial" : "tutorials"}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Practice */}
      <section id="practice" className="wrap scroll-mt-20 pt-14" aria-labelledby="practice-h">
        <h2 id="practice-h" className="h2">Practise with interview questions</h2>
        <p className="mt-1 small muted">Try answering in your own words first, then open the answer.</p>
        <div className="mt-5 grid gap-2">
          {tutorials.map((t) => (
            <details key={t.slug} className="box px-4 py-3">
              <summary className="cursor-pointer font-semibold">{t.question.q}</summary>
              <p className="mt-2 prose text-ink-3">{t.question.a}</p>
              <p className="mt-2 tiny">From <Link href={`/system-design/${t.slug}#recap`}>{t.title}</Link></p>
            </details>
          ))}
        </div>
      </section>

      {/* How tutorials work */}
      <section className="wrap pt-14" aria-labelledby="how">
        <div className="rounded-md border border-line bg-bg-alt p-6">
          <h2 id="how" className="h2">How every tutorial works</h2>
          <p className="mt-1 small muted">The same nine sections every time, so you always know where to look. Facts from public sources are labelled and cited; everything else is clearly marked as our own design.</p>
          <ol className="mt-4 grid gap-x-8 gap-y-1.5 small sm:grid-cols-2 lg:grid-cols-3">
            {["Introduction, with a story where you are the user", "Requirements", "Capacity estimation, with the math shown", "High-level architecture", "Step-by-step workflows you can play", "Database design", "Technical decisions and trade-offs", "Failure scenarios and recovery", "Recap and interview questions"].map((s, i) => (
              <li key={s} className="grid grid-cols-[1.5rem_1fr]">
                <span className="num font-semibold text-blue-dark">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 small">Also: <Link href="/patterns">{patterns.length} architecture patterns</Link> and a <Link href="/glossary">glossary</Link> of every term.</p>
        </div>
      </section>
    </>
  );
}
