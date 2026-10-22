import Link from "next/link";
import type { ReactNode } from "react";
import { patternBySlug } from "@/content/patterns";
import type { Category, Platform, Tutorial, Workflow } from "@/lib/schema";
import { QueueDemo, TrafficCapacity } from "./charts/lazy";
import { ClaimText, EvidenceTag, fmt } from "./ui";
import { WorkflowDiagram } from "./WorkflowDiagram";

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const SECTIONS = [
  ["introduction", "Introduction"],
  ["requirements", "Requirements"],
  ["capacity", "Capacity estimation"],
  ["architecture", "High-level architecture"],
  ["workflows", "Step-by-step workflows"],
  ["database", "Database design"],
  ["decisions", "Important technical decisions"],
  ["failures", "Failure scenarios"],
  ["recap", "Trade-offs and interview recap"],
] as const;

function Section({ n, id, title, children }: { n: number; id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <h2 id={`${id}-h`} className="h2">{n}. {title}</h2>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5">{children}</div>
    </section>
  );
}

/** Written version of a workflow, so the article reads fine without touching the diagram. */
function WrittenSteps({ wf }: { wf: Workflow }) {
  const name = (id: string) => wf.nodes.find((n) => n.id === id)!.label;
  return (
    <ol className="prose hidden sm:block">
      {wf.detailed.map((s, i) => (
        <li key={i}><strong>{name(s.node)}.</strong> {s.text}{s.async && <span className="muted"> (in the background)</span>}</li>
      ))}
    </ol>
  );
}

export function TutorialView({ t, platform, category, minutes }: { t: Tutorial; platform: Platform; category: Category; minutes: number }) {
  const index = new Map(t.sources.map((s, i) => [s.id, i + 1]));
  const arch = t.architecture.workflow;
  const archOrder: string[] = [];
  for (const s of arch.detailed) if (!archOrder.includes(s.node)) archOrder.push(s.node);

  return (
    <div className="wrap py-8">
      <nav aria-label="Breadcrumb" className="small muted">
        <Link href="/system-design">System Design</Link> <span aria-hidden="true">/</span> <Link href={`/system-design?category=${category.slug}`}>{category.name}</Link>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Table of contents: sticky column on desktop, collapsible on small screens */}
        <aside className="lg:order-none">
          <details className="box lg:hidden" data-testid="toc-mobile">
            <summary className="cursor-pointer px-3 py-2 font-semibold">Contents</summary>
            <ol className="border-t border-line px-3 py-2 small">
              {SECTIONS.map(([id, label], i) => <li key={id} className="py-1"><a href={`#${id}`} className="no-underline">{i + 1}. {label}</a></li>)}
            </ol>
          </details>
          <nav aria-label="Contents" className="sticky top-20 hidden lg:block">
            <p className="small font-semibold">Contents</p>
            <ol className="mt-2 border-l border-line small">
              {SECTIONS.map(([id, label], i) => (
                <li key={id}><a href={`#${id}`} className="block py-1 pl-3 text-ink-3 no-underline hover:text-blue">{i + 1}. {label}</a></li>
              ))}
              <li><a href="#sources" className="block py-1 pl-3 text-ink-3 no-underline hover:text-blue">Sources</a></li>
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 max-w-[780px]">
          <header className="mb-8">
            <h1 className="h1">{t.title}</h1>
            <p className="mt-3 text-[1.125rem] text-ink-3 prose">{t.summary}</p>
            <p className="mt-3 small muted">{platform.name}, {category.name}. About {minutes} minutes to read. Sources checked {longDate(t.lastVerifiedAt)}.</p>
          </header>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
            <Section n={1} id="introduction" title="Introduction">
              <div className="prose">
                {t.intro.paragraphs.map((p, i) => <p key={i}>{typeof p === "string" ? p : <ClaimText claim={p} index={index} />}</p>)}
              </div>
              <div className="box p-4" data-testid="story">
                <h3 className="h3">{t.intro.story.title}</h3>
                <ol className="mt-3 grid gap-2">
                  {t.intro.story.steps.map((s, i) => (
                    <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-1">
                      <span className="num font-semibold text-blue-dark">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="note">
                <p className="font-semibold">What is publicly known</p>
                <ul className="mt-2 grid gap-2 small">
                  {t.intro.known.map((c, i) => <li key={i}><ClaimText claim={c} index={index} /></li>)}
                </ul>
              </div>
              <p className="tiny muted">
                Labels: <EvidenceTag kind="public" /> backed by a cited source, <EvidenceTag kind="inferred" /> our reasoning, <EvidenceTag kind="assumption" /> an example number. Numbers in brackets link to the <a href="#sources">sources</a>.
              </p>
            </Section>

            <Section n={2} id="requirements" title="Requirements">
              <div>
                <h3 className="h3">Functional requirements</h3>
                <p className="mt-1 small muted">What the system must do.</p>
                <ul className="prose mt-2">{t.requirements.functional.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
              <div>
                <h3 className="h3">Non-functional requirements</h3>
                <p className="mt-1 small muted">How well the system must do it.</p>
                <div className="table-wrap mt-2">
                  <table className="table">
                    <thead><tr><th>Quality</th><th>What it means</th><th>Our target</th></tr></thead>
                    <tbody>{t.requirements.nonFunctional.map((r) => <tr key={r.name}><td className="font-semibold">{r.name}</td><td>{r.meaning}</td><td>{r.target}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
              <p className="small"><span className="font-semibold">Out of scope:</span> {t.requirements.outOfScope.join("; ")}.</p>
              {t.requirements.terms.length > 0 && (
                <div>
                  <h3 className="h3">Terms used in this tutorial</h3>
                  <dl className="mt-2 grid gap-2 small">
                    {t.requirements.terms.map((x) => <div key={x.term}><dt className="inline font-semibold">{x.term}: </dt><dd className="inline">{x.meaning}</dd></div>)}
                  </dl>
                </div>
              )}
            </Section>

            <Section n={3} id="capacity" title="Capacity estimation">
              <p className="prose">{t.capacity.intro}</p>
              <div>
                <h3 className="h3">Starting numbers</h3>
                <div className="table-wrap mt-2">
                  <table className="table">
                    <tbody>{t.capacity.assumptions.map((a) => (
                      <tr key={a.label}>
                        <td>{a.label}{a.note && <span className="block tiny muted">{a.note}</span>}</td>
                        <td className="n font-semibold">{fmt(a.value)} {a.unit}</td>
                        <td className="w-px whitespace-nowrap"><EvidenceTag kind={a.evidence} />{a.sources.map((id) => <a key={id} href={`#source-${id}`} className="ml-1 text-[0.8125rem] font-semibold no-underline">[{index.get(id)}]</a>)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="h3">Calculations</h3>
                <div className="table-wrap mt-2">
                  <table className="table">
                    <thead><tr><th>What we calculate</th><th>Formula</th><th>With our numbers</th><th className="n">Result</th></tr></thead>
                    <tbody>{t.capacity.steps.map((s) => (
                      <tr key={s.label}><td>{s.label}</td><td className="small text-ink-3">{s.formula}</td><td className="font-mono text-[0.8125rem]">{s.working}</td><td className="n font-semibold">{fmt(s.result, 1)} {s.unit}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="h3">What these numbers tell us</h3>
                <ul className="prose mt-2">{t.capacity.takeaways.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div>
                <h3 className="h3">Try it: traffic spike and servers needed</h3>
                <p className="mt-1 prose small muted">Change the inputs and watch the traffic curve and the server count update. Start with the peak multiplier.</p>
                <div className="mt-3"><TrafficCapacity defaults={t.capacity.calculator} /></div>
              </div>
            </Section>

            <Section n={4} id="architecture" title="High-level architecture">
              <p className="prose">{t.architecture.intro}</p>
              <WorkflowDiagram workflow={arch} />
              <div>
                <h3 className="h3">The components, in the order a request meets them</h3>
                <ol className="prose mt-2">
                  {archOrder.map((id) => {
                    const n = arch.nodes.find((x) => x.id === id)!;
                    return <li key={id}><strong>{n.label}.</strong> {n.explain.what} {n.explain.why}</li>;
                  })}
                </ol>
              </div>
            </Section>

            <Section n={5} id="workflows" title="Step-by-step workflows">
              <p className="prose">Now we zoom in on the most important journeys. Each diagram starts in the simple view. Switch to the detailed view to see every component, or to the failure view to see what happens when something breaks.</p>
              {t.workflows.map((wf, i) => (
                <div key={wf.id} id={`workflow-${wf.id}`} className="scroll-mt-20 grid grid-cols-[minmax(0,1fr)] gap-3">
                  <h3 className="h3">5.{i + 1} {wf.title}</h3>
                  <p className="prose">{wf.summary}</p>
                  <WorkflowDiagram workflow={wf} />
                  <WrittenSteps wf={wf} />
                </div>
              ))}
            </Section>

            <Section n={6} id="database" title="Database design">
              <p className="prose">{t.database.intro}</p>
              <div className="grid gap-4 md:grid-cols-2">
                {t.database.entities.map((e) => (
                  <div key={e.name} className="table-wrap">
                    <table className="table">
                      <caption className="border-b border-line bg-bg-alt px-3 py-2 text-left"><span className="font-semibold">{e.name}</span><span className="block tiny muted">{e.purpose}</span></caption>
                      <tbody>{e.fields.map((f) => <tr key={f.name}><td className="font-mono text-[0.8125rem]">{f.name}</td><td className="small text-ink-3">{f.type}{f.note && <span className="muted">, {f.note}</span>}</td></tr>)}</tbody>
                    </table>
                    {e.relations.length > 0 && <p className="border-t border-line px-3 py-2 tiny text-ink-3">{e.relations.join(". ")}.</p>}
                  </div>
                ))}
              </div>
              <div>
                <h3 className="h3">Why the data is stored this way</h3>
                <ul className="prose mt-2">{t.database.why.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            </Section>

            <Section n={7} id="decisions" title="Important technical decisions">
              {t.decisions.map((d, i) => (
                <div key={d.id} id={`decision-${d.id}`} className="scroll-mt-20 grid grid-cols-[minmax(0,1fr)] gap-2">
                  <h3 className="h3">7.{i + 1} {d.title}</h3>
                  <dl className="prose grid gap-2">
                    <div><dt className="font-semibold">The problem</dt><dd>{d.problem}</dd></div>
                    <div><dt className="font-semibold">The solution</dt><dd>{d.solution}</dd></div>
                    <div><dt className="font-semibold">How it works</dt><dd>{d.how}</dd></div>
                    <div><dt className="font-semibold">Where it sits</dt><dd>{d.where}</dd></div>
                    <div><dt className="font-semibold">The trade-off</dt><dd>{d.tradeoff}</dd></div>
                  </dl>
                  {d.demo === "queue" && <div className="mt-2"><QueueDemo people={d.demoPeople} place={d.demoPlace} /></div>}
                </div>
              ))}
            </Section>

            <Section n={8} id="failures" title="Failure scenarios">
              <p className="prose">Every real system fails sometimes. Good design decides in advance what happens when it does.</p>
              {t.failures.map((f, i) => (
                <div key={f.title} className="box p-4">
                  <h3 className="h3">8.{i + 1} {f.title} {f.evidence !== "inferred" && <EvidenceTag kind={f.evidence} />}
                    {f.sources.map((id) => <a key={id} href={`#source-${id}`} className="ml-1 text-[0.8125rem] font-semibold no-underline">[{index.get(id)}]</a>)}
                  </h3>
                  <dl className="mt-2 grid gap-x-6 gap-y-2 small sm:grid-cols-2">
                    <div><dt className="font-semibold">What goes wrong</dt><dd className="text-ink-3">{f.what}</dd></div>
                    <div><dt className="font-semibold">What the user experiences</dt><dd className="text-ink-3">{f.userSees}</dd></div>
                    <div><dt className="font-semibold">How the system notices</dt><dd className="text-ink-3">{f.detect}</dd></div>
                    <div><dt className="font-semibold">How it recovers</dt><dd className="text-ink-3">{f.recover}</dd></div>
                    <div className="sm:col-span-2"><dt className="font-semibold">How to prevent and test it</dt><dd className="text-ink-3">{f.prevent}</dd></div>
                  </dl>
                </div>
              ))}
            </Section>

            <Section n={9} id="recap" title="Trade-offs and interview recap">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Decision</th><th>Why</th><th>What it costs</th></tr></thead>
                  <tbody>{t.recap.decisions.map((d) => <tr key={d.decision}><td className="font-semibold">{d.decision}</td><td>{d.why}</td><td className="text-ink-3">{d.cost}</td></tr>)}</tbody>
                </table>
              </div>
              <div>
                <h3 className="h3">Interview questions</h3>
                <div className="mt-2 grid gap-2">
                  {t.recap.questions.map((q) => (
                    <details key={q.q} className="box px-4 py-3">
                      <summary className="cursor-pointer font-semibold">{q.q}</summary>
                      <p className="mt-2 prose text-ink-3">{q.a}</p>
                    </details>
                  ))}
                </div>
              </div>
              <p className="small">
                <span className="font-semibold">Patterns used here:</span>{" "}
                {t.patterns.map((p, i) => <span key={p}>{i > 0 && ", "}<Link href={`/patterns/${p}`}>{patternBySlug.get(p)?.name ?? p}</Link></span>)}.
              </p>
            </Section>

            <section id="sources" aria-labelledby="sources-h" className="scroll-mt-20 border-t border-line pt-8">
              <h2 id="sources-h" className="h2">Sources</h2>
              <p className="mt-2 small muted">Company statements are reported as the company&apos;s own account. The architecture in this tutorial is a proposal, not a description of {platform.name}&apos;s internal systems.</p>
              <ol className="mt-3 grid gap-3 small">
                {t.sources.map((s, i) => (
                  <li key={s.id} id={`source-${s.id}`} className="scroll-mt-20">
                    <span className="num font-semibold">[{i + 1}]</span>{" "}
                    <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>. {s.publisher}.{" "}
                    {s.publishedAt ? `Published ${longDate(s.publishedAt)}.` : "Date not stated."} Checked {longDate(s.accessedAt)}.
                    {s.note && <span className="block muted">{s.note}</span>}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
