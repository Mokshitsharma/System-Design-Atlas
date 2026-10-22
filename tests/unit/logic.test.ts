import { describe, expect, it } from "vitest";
import { categories, platforms } from "@/content/catalog";
import { concepts } from "@/content/concepts";
import { glossary } from "@/content/glossary";
import { patterns } from "@/content/patterns";
import { getTutorial, tutorialInputs } from "@/content/tutorials";
import { buildSearchIndex } from "@/lib/search";
import { highlight, searchDocs } from "@/lib/search-core";
import { serversNeeded, spikeCurve } from "@/lib/sim/capacity";
import { burstBacklog } from "@/lib/sim/queue";
import { validateContent, validateWorkflow } from "@/lib/validate";
import { buildSequence, edgesFor, edgeKey, placeNodes, pointOn } from "@/lib/workflow";

const t = getTutorial("ticketmaster")!;
const pay = t.workflows.find((w) => w.id === "pay")!;
const base = () => ({ categories, platforms, patterns, concepts, glossary, tutorials: { ...tutorialInputs } as Record<string, unknown>, srcDir: null });

describe("workflow paths", () => {
  it("draws each arrow from the previous step unless 'from' is set", () => {
    const seq = buildSequence(pay, "detailed");
    expect(seq[0].from).toBeUndefined();
    expect(seq[1]).toMatchObject({ from: "fan", to: "booking" });
    expect(seq[3]).toMatchObject({ from: "booking", to: "payments" }); // explicit from
    expect(seq.at(-1)).toMatchObject({ from: "booking", to: "fan" }); // response path back to the fan
  });

  it("failure view stops at the failing component and then follows only the recovery steps", () => {
    const seq = buildSequence(pay, "failure", "unknown-payment");
    const failAt = seq.findIndex((s) => s.kind === "fail");
    expect(seq[failAt].to).toBe("payments");
    expect(seq.slice(0, failAt).every((s) => s.kind === "normal")).toBe(true);
    expect(seq.slice(failAt + 1).every((s) => s.kind === "recovery")).toBe(true);
    // No normal success steps after the failure: the request is not faked as successful.
    expect(seq.slice(failAt + 1).some((s) => s.to === "fan" && s.kind === "normal")).toBe(false);
    expect(seq.map((s) => s.to)).toContain("recon");
  });

  it("every animated step with a 'from' has a drawable arrow", () => {
    for (const wf of [t.architecture.workflow, ...t.workflows]) {
      for (const view of ["simple", "detailed", "failure"] as const) {
        for (const f of view === "failure" ? wf.failures : [wf.failures[0]]) {
          const seq = buildSequence(wf, view, f.id);
          const edges = edgesFor(seq, placeNodes(wf, view));
          for (const s of seq) if (s.from && s.from !== s.to) expect(edges.has(edgeKey(s.from, s.to)), `${wf.id}/${view}/${s.from}->${s.to}`).toBe(true);
        }
      }
    }
  });

  it("simple view lays nodes out in reading order, four per row", () => {
    const nodes = placeNodes(t.architecture.workflow, "simple");
    expect(nodes[0].id).toBe("fan");
    expect(nodes[4].y).toBeGreaterThan(nodes[0].y);
  });

  it("failure-only nodes appear only in the failure view", () => {
    expect(placeNodes(pay, "detailed").some((n) => n.id === "recon")).toBe(false);
    expect(placeNodes(pay, "failure").some((n) => n.id === "recon")).toBe(true);
  });

  it("the pulse starts at the arrow's start and ends at its tip", () => {
    const e = [...edgesFor(buildSequence(pay, "detailed"), placeNodes(pay, "detailed")).values()][0];
    expect(pointOn(e.g, 0)).toEqual(e.g.p);
    const end = pointOn(e.g, 1);
    expect(end.x).toBeCloseTo(e.g.q.x);
    expect(end.y).toBeCloseTo(e.g.q.y);
  });
});

describe("capacity and queue models", () => {
  it("computes servers from peak, per-server rate and utilization", () => {
    const r = serversNeeded({ avgRps: 2200, peakMultiplier: 3, rpsPerServer: 400, utilization: 0.6 });
    expect(r.peakRps).toBe(6600);
    expect(r.servers).toBe(28); // ceil(6600 / 240)
    expect(r.serversForAverage).toBe(10);
  });
  it("the spike curve starts and ends at average and peaks at average × multiplier", () => {
    const c = spikeCurve(1000, 4);
    expect(c[0].rps).toBe(1000);
    expect(c.at(-1)!.rps).toBe(1000);
    expect(Math.max(...c.map((p) => p.rps))).toBe(4000);
  });
  it("a waiting-room line grows during the rush and drains afterwards", () => {
    const r = burstBacklog({ capacityRps: 40, burstRps: 1000, burstSec: 60, afterRps: 10, queueLimit: Number.MAX_SAFE_INTEGER, horizonSec: 7200, stepSec: 1 });
    expect(r.peakBacklog).toBeCloseTo((1000 - 40) * 60, -2);
    expect(r.drainedAt).not.toBeNull();
    expect(r.worstWaitSec).toBeCloseTo(r.peakBacklog / 40);
  });
});

describe("content validation", () => {
  it("the shipped content passes, including the privacy check on src/", () => {
    expect(validateContent().filter((i) => i.level === "error")).toEqual([]);
  });
  it("catches a missing platform", () => {
    expect(validateContent({ ...base(), platforms: platforms.slice(1) }).some((i) => i.message.includes("expected exactly 121"))).toBe(true);
  });
  it("catches a step pointing at a component that does not exist", () => {
    const wf = structuredClone(pay);
    wf.detailed[2] = { ...wf.detailed[2], node: "nope" };
    expect(validateWorkflow("x", wf).some((i) => i.message.includes('unknown node "nope"'))).toBe(true);
  });
  it("catches a failure whose component is never reached", () => {
    const wf = structuredClone(pay);
    wf.failures[0] = { ...wf.failures[0], node: "recon" };
    expect(validateWorkflow("x", wf).some((i) => i.message.includes("never appears in the detailed path"))).toBe(true);
  });
  it("catches two components in the same grid cell", () => {
    const wf = structuredClone(pay);
    wf.nodes[1] = { ...wf.nodes[1], col: 0, row: 0 };
    expect(validateWorkflow("x", wf).some((i) => i.message.includes("share grid cell"))).toBe(true);
  });
  it("requires a source on public failure claims", () => {
    const tm = structuredClone(tutorialInputs.ticketmaster);
    tm.failures[2] = { ...tm.failures[2], sources: [] };
    expect(validateContent({ ...base(), tutorials: { ticketmaster: tm } }).some((i) => i.message.includes("must cite a source"))).toBe(true);
  });
});

describe("public search index", () => {
  const docs = buildSearchIndex();
  it("contains every platform and the published tutorial", () => {
    expect(docs.filter((d) => d.kind === "platform" || d.kind === "tutorial")).toHaveLength(121);
    expect(docs.some((d) => d.kind === "tutorial" && d.href === "/system-design/ticketmaster")).toBe(true);
  });
  it("contains no private planning information", () => {
    const text = JSON.stringify(docs);
    expect(text).not.toMatch(/202[67]-\d\d-\d\d/);
    expect(text).not.toMatch(/\bday \d+\b/i);
    expect(text).not.toMatch(/deep dive|draft|planned/i);
  });
  it("ranks title matches first and highlights terms", () => {
    expect(searchDocs(docs, "idempotency")[0].title).toBe("Idempotency");
    expect(highlight("Waiting room", "room")).toEqual([{ text: "Waiting ", hit: false }, { text: "room", hit: true }]);
  });
});
