import type { Step, WNode, Workflow } from "@/lib/schema";

/** Pure helpers behind the workflow diagram: which nodes show, where they sit, and the path to play. */

export type View = "simple" | "detailed" | "failure";
export type PathStep = { from?: string; to: string; text: string; async: boolean; kind: "normal" | "fail" | "recovery" };
export type Placed = WNode & { x: number; y: number };

export const NODE_W = 156;
export const NODE_H = 58;
const COL_W = 196;
const ROW_H = 118;
const PAD = 22;
const SIMPLE_PER_ROW = 4;

/** Turns steps into arrows: each arrow comes from `from`, or the previous step's node. */
export function toPath(steps: Step[], kind: PathStep["kind"] = "normal", prev?: string): PathStep[] {
  let last = prev;
  return steps.map((s) => {
    const p: PathStep = { from: s.from ?? last, to: s.node, text: s.text, async: s.async ?? false, kind };
    last = s.node;
    return p;
  });
}

/**
 * The sequence a request follows in a view. In the failure view: the detailed path up to the first
 * time the failing component is reached (that step fails), then the configured recovery steps.
 */
export function buildSequence(wf: Workflow, view: View, failureId?: string): PathStep[] {
  if (view === "simple") return toPath(wf.simple);
  if (view === "detailed") return toPath(wf.detailed);
  const f = wf.failures.find((x) => x.id === failureId) ?? wf.failures[0];
  const full = toPath(wf.detailed);
  const at = full.findIndex((s) => s.to === f.node);
  const upTo = at >= 0 ? full.slice(0, at + 1) : full;
  const failed = upTo.map((s, i) => (i === upTo.length - 1 ? { ...s, kind: "fail" as const, text: f.what } : s));
  return [...failed, ...toPath(f.steps, "recovery", f.node)];
}

/** Node positions. Simple view packs its nodes in step order, wrapping like reading lines. */
export function placeNodes(wf: Workflow, view: View): Placed[] {
  if (view === "simple") {
    const order: string[] = [];
    for (const s of wf.simple) if (!order.includes(s.node)) order.push(s.node);
    return order.map((id, i) => {
      const n = wf.nodes.find((x) => x.id === id)!;
      const row = Math.floor(i / SIMPLE_PER_ROW);
      const col = i % SIMPLE_PER_ROW;
      return { ...n, x: PAD + col * COL_W, y: PAD + row * ROW_H };
    });
  }
  return wf.nodes
    .filter((n) => view === "failure" || !n.failureOnly)
    .map((n) => ({ ...n, x: PAD + n.col * COL_W, y: PAD + n.row * ROW_H }));
}

export function canvasSize(nodes: Placed[]) {
  const w = Math.max(...nodes.map((n) => n.x + NODE_W)) + PAD;
  const h = Math.max(...nodes.map((n) => n.y + NODE_H)) + PAD;
  return { w, h };
}

/** Point where a ray from the box centre toward (tx, ty) leaves the box. */
function exitPoint(n: Placed, tx: number, ty: number) {
  const cx = n.x + NODE_W / 2;
  const cy = n.y + NODE_H / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const t = Math.min((NODE_W / 2 + 4) / Math.abs(dx || 1e-9), (NODE_H / 2 + 4) / Math.abs(dy || 1e-9));
  return { x: cx + dx * t, y: cy + dy * t };
}

export type Pt = { x: number; y: number };
/** Arrow geometry: a straight segment, or a quadratic curve through control point `c`. */
export type Geom = { p: Pt; q: Pt; c?: Pt };

export const geomToPath = (g: Geom) =>
  g.c
    ? `M ${g.p.x.toFixed(1)} ${g.p.y.toFixed(1)} Q ${g.c.x.toFixed(1)} ${g.c.y.toFixed(1)} ${g.q.x.toFixed(1)} ${g.q.y.toFixed(1)}`
    : `M ${g.p.x.toFixed(1)} ${g.p.y.toFixed(1)} L ${g.q.x.toFixed(1)} ${g.q.y.toFixed(1)}`;

/** Point at fraction t (0..1) along an arrow; used to place the moving request pulse. */
export function pointOn(g: Geom, t: number): Pt {
  const u = Math.min(1, Math.max(0, t));
  if (!g.c) return { x: g.p.x + (g.q.x - g.p.x) * u, y: g.p.y + (g.q.y - g.p.y) * u };
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return { x: a * g.p.x + b * g.c.x + c * g.q.x, y: a * g.p.y + b * g.c.y + c * g.q.y };
}

/**
 * Geometry for an arrow between two boxes. Straight when neighbours; curved when the straight line
 * would cross another box (same row or column, two or more apart) or when the reverse arrow also exists.
 */
export function edgeGeom(a: Placed, b: Placed, reverseExists: boolean): Geom {
  const ac = { x: a.x + NODE_W / 2, y: a.y + NODE_H / 2 };
  const bc = { x: b.x + NODE_W / 2, y: b.y + NODE_H / 2 };
  const sameRow = Math.abs(a.y - b.y) < 1;
  const sameCol = Math.abs(a.x - b.x) < 1;
  const far = (sameRow && Math.abs(a.x - b.x) > COL_W + 1) || (sameCol && Math.abs(a.y - b.y) > ROW_H + 1);
  if (!far && !reverseExists) return { p: exitPoint(a, bc.x, bc.y), q: exitPoint(b, ac.x, ac.y) };
  const mx = (ac.x + bc.x) / 2;
  const my = (ac.y + bc.y) / 2;
  const len = Math.hypot(bc.x - ac.x, bc.y - ac.y) || 1;
  // Normal to the line; reverse pairs bend to opposite sides, far same-row arrows bend upward.
  let nx = -(bc.y - ac.y) / len;
  let ny = (bc.x - ac.x) / len;
  if (sameRow && far && ny > 0) { nx = -nx; ny = -ny; }
  const bend = far ? Math.min(70, 26 + len * 0.12) : 26;
  const c = { x: mx + nx * bend, y: my + ny * bend };
  return { p: exitPoint(a, c.x, c.y), q: exitPoint(b, c.x, c.y), c };
}

export const edgeKey = (from: string, to: string) => `${from}->${to}`;

/** Unique arrows to draw for a sequence, with their geometry. */
export function edgesFor(seq: PathStep[], nodes: Placed[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const keys = new Set(seq.filter((s) => s.from).map((s) => edgeKey(s.from!, s.to)));
  const out = new Map<string, { key: string; from: string; to: string; g: Geom; d: string; async: boolean }>();
  for (const s of seq) {
    if (!s.from || s.from === s.to) continue;
    const key = edgeKey(s.from, s.to);
    if (out.has(key)) continue;
    const a = byId.get(s.from);
    const b = byId.get(s.to);
    if (!a || !b) continue;
    const g = edgeGeom(a, b, keys.has(edgeKey(s.to, s.from)));
    out.set(key, { key, from: s.from, to: s.to, g, d: geomToPath(g), async: s.async });
  }
  return out;
}
