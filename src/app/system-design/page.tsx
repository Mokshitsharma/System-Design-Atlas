import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogList } from "@/components/CatalogList";
import { categories, platforms } from "@/content/catalog";
import { getTutorial, hasTutorial } from "@/content/tutorials";

export const metadata: Metadata = {
  title: "System design tutorials",
  description: "System design tutorials for real-world platforms, grouped by category.",
};

export default function SystemDesignPage() {
  const rows = platforms.map((p) => ({ ...p, tutorialTitle: hasTutorial(p.slug) ? getTutorial(p.slug)!.title : undefined }));
  return (
    <div className="wrap py-10">
      <h1 className="h1">System design tutorials</h1>
      <p className="mt-2 prose text-ink-3">
        Real-world platforms grouped by the kind of problem they solve. Platforms marked &ldquo;Read the tutorial&rdquo; have a full tutorial; for the others you can see the design challenge the tutorial will cover.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="small muted">Loading the list.</p>}>
          <CatalogList rows={rows} categories={categories} />
        </Suspense>
      </div>
    </div>
  );
}
