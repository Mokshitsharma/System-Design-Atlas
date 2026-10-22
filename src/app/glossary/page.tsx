import type { Metadata } from "next";
import { GlossaryList } from "@/components/GlossaryList";
import { concepts } from "@/content/concepts";
import { glossary } from "@/content/glossary";

export const metadata: Metadata = { title: "Glossary", description: "Plain-English definitions of system design terms." };

export default function GlossaryPage() {
  const terms = [...glossary].sort((a, b) => a.term.localeCompare(b.term));
  return (
    <div className="wrap py-10">
      <h1 className="h1">Glossary</h1>
      <p className="mt-2 prose text-ink-3">Plain-English definitions of the terms used in the tutorials.</p>
      <div className="mt-6"><GlossaryList terms={terms} conceptNames={Object.fromEntries(concepts.map((c) => [c.slug, c.name]))} /></div>
    </div>
  );
}
