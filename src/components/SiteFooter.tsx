import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-bg-alt">
      <div className="wrap flex flex-col gap-4 py-8 small md:flex-row md:items-start md:justify-between">
        <p className="max-w-md muted">
          Tutorials describe proposed designs based on public information. They are not descriptions of any company&apos;s internal systems.
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><Link href="/system-design">All tutorials</Link></li>
            <li><Link href="/patterns">Patterns</Link></li>
            <li><Link href="/concepts">Concepts</Link></li>
            <li><Link href="/glossary">Glossary</Link></li>
            <li><Link href="/about">About and sources</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
