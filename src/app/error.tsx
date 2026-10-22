"use client";

import Link from "next/link";

/** Route-level error boundary. Shows no internal details; the digest helps match server logs. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap py-16">
      <h1 className="h1">This page failed to load</h1>
      <p className="mt-3 prose text-ink-3">Something went wrong while showing it. Try again; the rest of the site still works.</p>
      {error.digest && <p className="mt-2 tiny muted">Reference: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn">Go to the homepage</Link>
      </div>
    </div>
  );
}
