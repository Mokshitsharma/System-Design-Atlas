import type { Metadata } from "next";
import Link from "next/link";
import { EvidenceTag } from "@/components/ui";

export const metadata: Metadata = { title: "About and sources", description: "How System Design Atlas tutorials are researched and what the evidence labels mean." };

export default function AboutPage() {
  return (
    <div className="wrap py-10">
      <article className="max-w-[780px]">
        <h1 className="h1">About System Design Atlas</h1>
        <div className="prose mt-4">
          <p>System Design Atlas explains how systems like the ones you use every day could be designed. Each tutorial takes one real platform and works through it step by step, from requirements to failure handling, with diagrams you can interact with.</p>
          <p>The tutorials are written for people who are new to system design. Technical terms are explained when they first appear, and every decision starts with the problem it solves.</p>
        </div>

        <h2 className="h2 mt-10">How tutorials are researched</h2>
        <div className="prose mt-3">
          <p>Companies rarely publish how their systems are built. So each tutorial is a proposed design based on public information, not a description of the company&apos;s internal systems. Every factual claim is labelled:</p>
        </div>
        <dl className="mt-4 grid gap-3">
          <div className="flex gap-3"><dt className="w-28 shrink-0"><EvidenceTag kind="public" /></dt><dd className="small">Backed by a public source, cited next to the claim: an official statement, documentation or a government record. Company statements are reported as the company&apos;s own account.</dd></div>
          <div className="flex gap-3"><dt className="w-28 shrink-0"><EvidenceTag kind="inferred" /></dt><dd className="small">Our reasoning from public information. It describes how such a system could work.</dd></div>
          <div className="flex gap-3"><dt className="w-28 shrink-0"><EvidenceTag kind="assumption" /></dt><dd className="small">An example number or design choice used to explain the math. It is never a real company figure.</dd></div>
        </dl>
        <div className="prose mt-6">
          <p>Sources are listed at the end of each tutorial with the date they were last checked. Interactive charts are models driven by the numbers you enter; they never show live data from any company.</p>
        </div>

        <h2 id="privacy" className="h2 mt-10 scroll-mt-20">Privacy</h2>
        <div className="prose mt-3">
          <p>The site has no accounts, no analytics and sets no cookies. Nothing you type into a calculator or search box leaves your browser.</p>
        </div>

        <h2 className="h2 mt-10">Accessibility</h2>
        <div className="prose mt-3">
          <p>Every diagram can be used with a keyboard and has a text version, which phones show by default. Charts come with a written summary and their data as a table. Animations follow your reduced-motion setting, and every step can also be stepped through by hand.</p>
        </div>

        <p className="mt-10 small"><Link href="/system-design">Browse the tutorials</Link></p>
      </article>
    </div>
  );
}
