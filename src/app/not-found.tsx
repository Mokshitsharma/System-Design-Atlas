import Link from "next/link";
import { getTutorial, tutorialSlugs } from "@/content/tutorials";

export default function NotFound() {
  return (
    <div className="wrap py-14">
      <div className="max-w-[720px]" data-testid="not-found">
        <p className="small font-semibold text-blue-dark">Error 404</p>
        <h1 className="h1 mt-1">Page not found</h1>
        <p className="prose mt-3 text-ink-3">
          There is no page at this address. The link may be mistyped, or the page may have moved. You can search for what you were looking for, or start from one of the tutorials below.
        </p>

        <form action="/system-design" method="get" role="search" className="mt-6 flex gap-2">
          <label htmlFor="nf-q" className="sr-only">Search tutorials and platforms</label>
          <input id="nf-q" name="q" type="search" className="input" placeholder="Search a platform or topic, for example payments" />
          <button type="submit" className="btn btn-primary shrink-0">Search</button>
        </form>

        <h2 className="h3 mt-10">Tutorials</h2>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {tutorialSlugs.map((s) => {
            const t = getTutorial(s)!;
            return (
              <li key={s} className="py-3">
                <Link href={`/system-design/${s}`} className="font-semibold">{t.title}</Link>
                <p className="small text-ink-3">{t.summary}</p>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 small">
          Or go to the <Link href="/">homepage</Link>, browse <Link href="/system-design">all platforms</Link>, or read about <Link href="/patterns">architecture patterns</Link>.
        </p>
      </div>
    </div>
  );
}
