"use client";

import { Pause, Play, RotateCcw, Send, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import type { NodeKind, Workflow } from "@/lib/schema";
import { buildSequence, canvasSize, edgeKey, edgesFor, NODE_H, NODE_W, placeNodes, pointOn, type View } from "@/lib/workflow";

const KIND_LABEL: Record<NodeKind, string> = {
  user: "User", edge: "Edge network", service: "Service", database: "Database", cache: "Cache", queue: "Queue", external: "Outside service",
};
const TAG_LABEL = { cache: "cache", queue: "queue", transaction: "transaction", retry: "retry-safe" } as const;

type Status = "idle" | "playing" | "paused" | "done";
type Run = { status: Status; step: number; phase: "travel" | "dwell"; progress: number };
const IDLE: Run = { status: "idle", step: -1, phase: "dwell", progress: 1 };

const TRAVEL_MS = 900;
const DWELL_MS = 1700;

function subscribeMotion(cb: () => void) {
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const useReducedMotion = () =>
  useSyncExternalStore(subscribeMotion, () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);

/**
 * Interactive workflow diagram. "Send request" plays the configured path for the current view:
 * a pulse travels each arrow in order, the receiving component lights up, and the step is explained.
 * The same state drives a numbered text version used on phones and for screen readers.
 */
export function WorkflowDiagram({ workflow }: { workflow: Workflow }) {
  const uid = useId();
  const reduced = useReducedMotion();
  const [view, setView] = useState<View>("simple");
  const [failureId, setFailureId] = useState(workflow.failures[0].id);
  const [selected, setSelected] = useState<string | null>(null);
  const [textMode, setTextMode] = useState(false);
  const [run, setRun] = useState<Run>(IDLE);

  const seq = useMemo(() => buildSequence(workflow, view, failureId), [workflow, view, failureId]);
  const nodes = useMemo(() => placeNodes(workflow, view), [workflow, view]);
  const edges = useMemo(() => edgesFor(seq, nodes), [seq, nodes]);
  const size = canvasSize(nodes);
  const failure = workflow.failures.find((f) => f.id === failureId)!;
  const inPath = useMemo(() => new Set(seq.flatMap((s) => [s.to, s.from].filter(Boolean) as string[])), [seq]);

  const cur = run.step >= 0 ? seq[run.step] : undefined;
  const travelling = cur && run.phase === "travel" && run.status !== "done";
  const curEdge = cur?.from && cur.from !== cur.to ? edges.get(edgeKey(cur.from, cur.to)) : undefined;
  const failedReached = view === "failure" && seq.some((s, i) => s.kind === "fail" && (i < run.step || (i === run.step && run.phase === "dwell")));

  // One animation loop at a time: the effect owns the frame and cancels it on any state change that stops playback.
  useEffect(() => {
    if (run.status !== "playing") return;
    let last = performance.now();
    let raf = requestAnimationFrame(function frame(now) {
      const dt = now - last;
      last = now;
      setRun((r) => {
        if (r.status !== "playing") return r;
        const step = seq[r.step];
        if (r.phase === "travel") {
          const instant = reduced || !step?.from || step.from === step.to;
          const p = instant ? 1 : r.progress + dt / TRAVEL_MS;
          return p >= 1 ? { ...r, phase: "dwell", progress: 0 } : { ...r, progress: p };
        }
        const p = r.progress + dt / (reduced ? DWELL_MS * 1.3 : DWELL_MS);
        if (p < 1) return { ...r, progress: p };
        if (r.step >= seq.length - 1) return { ...r, status: "done", progress: 1 };
        return { status: "playing", step: r.step + 1, phase: "travel", progress: 0 };
      });
      raf = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(raf);
  }, [run.status, seq, reduced]);

  const send = () => { setSelected(null); setRun({ status: "playing", step: 0, phase: "travel", progress: 0 }); };
  const pause = () => setRun((r) => (r.status === "playing" ? { ...r, status: "paused" } : r));
  const resume = () => setRun((r) => (r.status === "paused" ? { ...r, status: "playing" } : r));
  const reset = () => setRun(IDLE);
  const goTo = (step: number) => setRun({ status: step >= seq.length - 1 ? "done" : "paused", step, phase: "dwell", progress: 1 });
  const changeView = (v: View) => { setView(v); setRun(IDLE); setSelected(null); };

  const nodeState = (id: string): "active" | "failed" | "recovery" | "idle" | "dim" => {
    if (view === "failure" && id === failure.node && failedReached) return "failed";
    if (cur && cur.to === id && (run.phase === "dwell" || run.status === "done")) return cur.kind === "recovery" ? "recovery" : cur.kind === "fail" ? "failed" : "active";
    if (!inPath.has(id)) return "dim";
    return "idle";
  };

  const pulse = travelling && curEdge ? pointOn(curEdge.g, run.progress) : null;
  const pulseColor = cur?.kind === "recovery" ? "var(--ok)" : "var(--blue)";
  const sel = selected ? workflow.nodes.find((n) => n.id === selected) : undefined;
  const nameOf = (id?: string) => (id ? workflow.nodes.find((n) => n.id === id)?.label ?? id : "");

  const views: { id: View; label: string }[] = [
    { id: "simple", label: "Simple" },
    { id: "detailed", label: "Detailed" },
    { id: "failure", label: "When something fails" },
  ];

  return (
    <div className="box" data-testid={`workflow-${workflow.id}`}>
      {/* View selector */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-3 py-2.5">
        <div className="tabs" role="tablist" aria-label="Diagram view">
          {views.map((v) => (
            <button key={v.id} type="button" role="tab" className="tab" aria-selected={view === v.id} onClick={() => changeView(v.id)}>{v.label}</button>
          ))}
        </div>
        {view === "failure" && (
          <label className="flex min-w-0 items-center gap-2 small">
            <span className="label shrink-0">Failure</span>
            <select className="input !w-auto max-w-full" value={failureId} onChange={(e) => { setFailureId(e.target.value); setRun(IDLE); }}>
              {workflow.failures.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
          </label>
        )}
        <button type="button" className="btn btn-sm ml-auto hidden sm:inline-flex" aria-pressed={textMode} onClick={() => setTextMode((t) => !t)}>
          {textMode ? "Show diagram" : "Show as text"}
        </button>
      </div>

      {/* Playback controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-bg-alt px-3 py-2.5">
        {run.status === "playing" ? (
          <button type="button" className="btn btn-sm" onClick={pause} data-testid="pause"><Pause size={15} aria-hidden="true" />Pause</button>
        ) : run.status === "paused" ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={resume} data-testid="resume"><Play size={15} aria-hidden="true" />Resume</button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm" onClick={send} data-testid="send-request"><Send size={15} aria-hidden="true" />{run.status === "done" ? "Send again" : "Send request"}</button>
        )}
        <button type="button" className="btn btn-sm" onClick={() => goTo(Math.max(0, run.step - 1))} disabled={run.step <= 0} aria-label="Previous step"><SkipBack size={15} aria-hidden="true" /></button>
        <button type="button" className="btn btn-sm" onClick={() => goTo(Math.min(seq.length - 1, run.step + 1))} disabled={run.step >= seq.length - 1} aria-label="Next step" data-testid="next-step"><SkipForward size={15} aria-hidden="true" /></button>
        <button type="button" className="btn btn-sm" onClick={reset} disabled={run.status === "idle"} data-testid="reset"><RotateCcw size={15} aria-hidden="true" />Reset</button>
        <span className="num ml-auto tiny muted" data-testid="step-counter">{run.step < 0 ? `${seq.length} steps` : `Step ${run.step + 1} of ${seq.length}`}</span>
      </div>

      {/* Diagram (tablet and desktop) */}
      <div className={textMode ? "hidden" : "hidden overflow-x-auto sm:block"}>
        <svg viewBox={`0 0 ${size.w} ${size.h}`} className="block w-full" style={{ minWidth: Math.min(size.w, 600), maxHeight: 460 }} role="group" aria-label={`${workflow.title}, ${views.find((v) => v.id === view)!.label.toLowerCase()} view`}>
          <defs>
            {[["base", "var(--line-strong)"], ["blue", "var(--blue)"], ["ok", "var(--ok)"]].map(([k, c]) => (
              <marker key={k} id={`${uid}-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={c} />
              </marker>
            ))}
          </defs>
          {[...edges.values()].map((e) => (
            <path key={e.key} d={e.d} fill="none" stroke="var(--line-strong)" strokeWidth={1.6} strokeDasharray={e.async ? "6 5" : undefined} markerEnd={`url(#${uid}-arrow-base)`} data-edge={e.key} />
          ))}
          {curEdge && (
            <path
              d={curEdge.d}
              fill="none"
              stroke={pulseColor}
              strokeWidth={2.75}
              pathLength={1}
              strokeDasharray={`${run.phase === "travel" ? run.progress : 1} 1`}
              markerEnd={run.phase === "dwell" ? `url(#${uid}-arrow-${cur?.kind === "recovery" ? "ok" : "blue"})` : undefined}
              data-testid="active-edge"
              data-edge={curEdge.key}
            />
          )}
          {nodes.map((n) => {
            const st = nodeState(n.id);
            const stroke = st === "failed" ? "var(--fail)" : st === "recovery" ? "var(--ok)" : st === "active" ? "var(--blue)" : "var(--line-strong)";
            const fill = st === "failed" ? "var(--fail-soft)" : st === "recovery" ? "var(--ok-soft)" : st === "active" ? "var(--blue-soft)" : "var(--bg)";
            const isSel = selected === n.id;
            return (
              <g
                key={n.id}
                role="button"
                tabIndex={0}
                aria-label={`${n.label}, ${KIND_LABEL[n.kind]}${st === "failed" ? ", failed" : st === "active" || st === "recovery" ? ", current step" : ""}. Show explanation`}
                aria-pressed={isSel}
                onClick={() => setSelected(isSel ? null : n.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(isSel ? null : n.id); } }}
                className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-[var(--blue-dark)] [&:focus-visible>rect:first-child]:[stroke-width:3]"
                opacity={st === "dim" ? 0.4 : 1}
                data-node={n.id}
                data-state={st}
              >
                <rect x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx={6} fill={fill} stroke={isSel ? "var(--ink)" : stroke} strokeWidth={st !== "idle" && st !== "dim" ? 2.5 : isSel ? 2 : 1.25} strokeDasharray={n.kind === "external" ? "5 4" : undefined} />
                <text x={n.x + 12} y={n.y + 24} fontSize={15} fontWeight={600} fill="var(--ink)">{n.label}</text>
                <text x={n.x + 12} y={n.y + 43} fontSize={12} fill={st === "failed" ? "var(--fail)" : "var(--ink-2)"}>
                  {st === "failed" ? "Failed" : KIND_LABEL[n.kind]}{st !== "failed" ? n.tags.filter((t) => t !== n.kind).map((t) => `, ${TAG_LABEL[t]}`).join("") : ""}
                </text>
              </g>
            );
          })}
          {pulse && (
            <g pointerEvents="none" data-testid="pulse">
              <circle cx={pulse.x} cy={pulse.y} r={11} fill={pulseColor} opacity={0.18} />
              <circle cx={pulse.x} cy={pulse.y} r={5.5} fill={pulseColor} />
            </g>
          )}
        </svg>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-3 py-2 tiny muted" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><svg width="26" height="6"><line x1="0" y1="3" x2="26" y2="3" stroke="var(--line-strong)" strokeWidth="2" /></svg>Request or response</span>
          <span className="inline-flex items-center gap-1.5"><svg width="26" height="6"><line x1="0" y1="3" x2="26" y2="3" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="6 5" /></svg>Happens later, in the background</span>
          <span className="inline-flex items-center gap-1.5"><svg width="18" height="12"><rect x="1" y="1" width="16" height="10" rx="2" fill="none" stroke="var(--ink-2)" strokeDasharray="4 3" /></svg>Outside company</span>
          {view === "failure" && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-ok" />Recovery steps</span>}
        </div>
      </div>

      {/* Text version: always on phones, optional on larger screens */}
      <ol className={textMode ? "block" : "sm:hidden"} aria-label="Steps">
        {seq.map((s, i) => {
          const on = i === run.step;
          const showFrom = s.from && (i === 0 || seq[i - 1].to !== s.from);
          return (
            <li key={i} className={`relative border-b border-line px-3 py-2.5 last:border-b-0 ${on ? (s.kind === "fail" ? "bg-fail-soft" : s.kind === "recovery" ? "bg-ok-soft" : "bg-blue-soft") : ""}`}>
              {on && travelling && <span aria-hidden="true" className="absolute left-0 top-0 w-[3px] rounded bg-blue" style={{ height: `${Math.round(run.progress * 100)}%` }} />}
              <div className="flex items-baseline gap-2">
                <span className="num w-6 shrink-0 tiny muted">{i + 1}</span>
                <span className="min-w-0">
                  <button type="button" className="font-semibold text-ink underline decoration-line-strong underline-offset-2 hover:text-blue" onClick={() => setSelected(selected === s.to ? null : s.to)}>{nameOf(s.to)}</button>
                  {showFrom && <span className="tiny muted"> (from {nameOf(s.from)})</span>}
                  {s.kind === "fail" && <span className="ml-1.5 font-semibold text-fail">Fails here</span>}
                  {s.kind === "recovery" && <span className="ml-1.5 tiny font-semibold text-ok">Recovery</span>}
                  {s.async && <span className="ml-1.5 tiny muted">In the background</span>}
                  <span className="block small text-ink-3">{s.text}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Current step */}
      <div className="border-t border-line px-4 py-3" aria-live="polite" data-testid="step-text">
        {run.status === "idle" ? (
          <p className="small muted">Press <strong className="text-ink">Send request</strong> to watch a request travel through the system, or use the step buttons to go at your own pace. Select any component to learn what it does.</p>
        ) : run.status === "done" && view === "failure" ? (
          <div className="small">
            <p className="font-semibold text-fail">The request did not succeed normally. This is how the system recovers.</p>
            <p className="mt-1"><span className="font-semibold">What the user sees:</span> {failure.userSees}</p>
            <p className="mt-1"><span className="font-semibold">How we notice:</span> {failure.detect}</p>
          </div>
        ) : run.status === "done" ? (
          <p className="small"><span className="font-semibold text-ok">Request complete.</span> {cur?.text}</p>
        ) : cur ? (
          <p className="small">
            <span className={`font-semibold ${cur.kind === "fail" ? "text-fail" : cur.kind === "recovery" ? "text-ok" : "text-blue-dark"}`}>
              {cur.kind === "fail" ? `Failure at ${nameOf(cur.to)}: ` : `${nameOf(cur.to)}: `}
            </span>
            {cur.text}
          </p>
        ) : null}
      </div>

      {/* Component explanation */}
      {sel && (
        <div className="border-t border-line bg-bg-alt px-4 py-4" data-testid="node-explain">
          <div className="flex items-start justify-between gap-3">
            <h4 className="h3">{sel.label} <span className="small font-normal muted">{KIND_LABEL[sel.kind]}</span></h4>
            <button type="button" className="btn btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
          <dl className="mt-2 grid gap-x-8 gap-y-2.5 small md:grid-cols-2">
            <div><dt className="font-semibold">What is it?</dt><dd className="text-ink-3">{sel.explain.what}</dd></div>
            <div><dt className="font-semibold">Why do we need it?</dt><dd className="text-ink-3">{sel.explain.why}</dd></div>
            <div><dt className="font-semibold">What goes in</dt><dd className="text-ink-3">{sel.explain.input}</dd></div>
            <div><dt className="font-semibold">What happens inside</dt><dd className="text-ink-3">{sel.explain.inside}</dd></div>
            <div><dt className="font-semibold">What comes out</dt><dd className="text-ink-3">{sel.explain.output}</dd></div>
            <div><dt className="font-semibold">What can go wrong</dt><dd className="text-ink-3"><ul className="list-disc pl-4">{sel.explain.risks.map((r) => <li key={r}>{r}</li>)}</ul></dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
