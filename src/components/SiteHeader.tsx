"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchDialog } from "./SearchDialog";
import { Wordmark } from "./Wordmark";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/system-design", label: "System Design" },
  { href: "/patterns", label: "Architecture Patterns" },
];

export function SiteHeader() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="wrap flex h-14 items-center gap-3">
        <Link href="/" className="shrink-0 no-underline" aria-label="System Design Atlas home"><Wordmark /></Link>
        <nav aria-label="Main" className="min-w-0 flex-1 sm:ml-2">
          <ul className="flex items-center gap-0.5 whitespace-nowrap">
            {NAV.map((n) => (
              <li key={n.href} className={n.href === "/" ? "hidden sm:block" : ""}>
                <Link
                  href={n.href}
                  aria-current={active(n.href) ? "page" : undefined}
                  className={`block rounded px-2.5 py-1.5 text-[0.9375rem] font-medium no-underline ${active(n.href) ? "text-blue" : "text-ink-3 hover:text-blue"}`}
                >
                  {n.label === "Architecture Patterns" ? <><span className="hidden md:inline">Architecture </span>Patterns</> : n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SearchDialog />
      </div>
    </header>
  );
}
