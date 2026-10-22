import type { Claim } from "@/lib/schema";

const evidenceStyle = {
  public: { label: "Public", cls: "text-ok border-ok/40 bg-ok-soft", hint: "Supported by a cited public source" },
  inferred: { label: "Inferred", cls: "text-blue-dark border-blue/30 bg-blue-soft", hint: "Our reasoning from public information" },
  assumption: { label: "Assumption", cls: "text-warn border-warn/40 bg-warn-soft", hint: "An illustrative number or design choice" },
} as const;

export function EvidenceTag({ kind }: { kind: keyof typeof evidenceStyle }) {
  const e = evidenceStyle[kind];
  return <span title={e.hint} className={`inline-block rounded border px-1.5 text-[0.75rem] font-semibold leading-5 ${e.cls}`}>{e.label}</span>;
}

/** A claim with its evidence label and numbered citations to the sources list. */
export function ClaimText({ claim, index }: { claim: Claim; index: Map<string, number> }) {
  return (
    <>
      {claim.text}{" "}
      <EvidenceTag kind={claim.evidence} />
      {claim.sources.map((id) => (
        <a key={id} href={`#source-${id}`} className="ml-1 text-[0.8125rem] font-semibold no-underline" aria-label={`Source ${index.get(id)}`}>[{index.get(id)}]</a>
      ))}
    </>
  );
}

export const fmt = (n: number, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: d }) : "n/a";

export const compact = (n: number) =>
  Number.isFinite(n) ? Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n) : "n/a";
