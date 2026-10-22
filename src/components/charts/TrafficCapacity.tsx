"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { serversNeeded, spikeCurve, type CapacityInputs } from "@/lib/sim/capacity";
import { compact, fmt } from "../ui";
import { NumberField } from "./NumberField";

/** Traffic during a spike and the servers needed to handle it. Both update from the same inputs. */
export default function TrafficCapacity({ defaults }: { defaults: CapacityInputs }) {
  const [c, setC] = useState(defaults);
  const set = (k: keyof CapacityInputs) => (v: number) => setC((x) => ({ ...x, [k]: v }));
  const r = serversNeeded(c);
  const data = useMemo(() => spikeCurve(c.avgRps, c.peakMultiplier), [c.avgRps, c.peakMultiplier]);
  const [table, setTable] = useState(false);

  return (
    <div className="box" data-testid="traffic-capacity">
      <div className="grid gap-4 border-b border-line p-4 sm:grid-cols-2">
        <NumberField label="Average requests per second" value={c.avgRps} min={10} max={100000} step={10} onChange={set("avgRps")} />
        <NumberField label="Peak multiplier" unit="x" value={c.peakMultiplier} min={1} max={50} step={0.5} onChange={set("peakMultiplier")} />
        <NumberField label="Requests one server can handle per second" value={c.rpsPerServer} min={10} max={10000} step={10} onChange={set("rpsPerServer")} />
        <NumberField label="Target utilization" unit="0.1 to 0.95" value={c.utilization} min={0.1} max={0.95} step={0.05} onChange={set("utilization")} />
      </div>

      <div className="px-2 pt-3">
        <p className="px-2 small font-semibold" id="traffic-title">Requests per second during a sale (illustrative)</p>
        <div className="h-64" role="img" aria-labelledby="traffic-title" aria-describedby="traffic-summary">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 18, left: 4 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="t" type="number" domain={[0, 120]} ticks={[0, 30, 60, 90, 120]} stroke="var(--ink-2)" fontSize={12}
                label={{ value: "Minutes", position: "insideBottom", offset: -10, fill: "var(--ink-2)", fontSize: 12 }} />
              <YAxis tickFormatter={compact} stroke="var(--ink-2)" fontSize={12} width={48} domain={[0, (max: number) => Math.max(max, r.comfortableRps) * 1.1]} />
              <Tooltip contentStyle={{ border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }} labelFormatter={(v) => `Minute ${v}`} formatter={(v) => [`${fmt(Number(v))} req/s`, "Traffic"]} />
              <ReferenceLine y={r.comfortableRps} stroke="var(--ok)" strokeDasharray="6 4" label={{ value: `${r.servers} servers at target load`, position: "insideTopRight", fill: "var(--ok)", fontSize: 12 }} />
              <Area type="monotone" dataKey="rps" stroke="var(--blue)" strokeWidth={2} fill="var(--blue)" fillOpacity={0.1} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p id="traffic-summary" className="px-2 pb-3 tiny muted">
          Normal traffic is {fmt(c.avgRps)} requests per second. At minute 30 the sale opens and traffic rises to {fmt(r.peakRps)} for half an hour, then falls back. The dashed line is what {r.servers} servers handle at the target utilization.
        </p>
      </div>

      <div className="grid gap-4 border-t border-line p-4 md:grid-cols-[1fr_1.2fr]" aria-live="polite" data-testid="capacity-result">
        <dl className="grid grid-cols-2 gap-3">
          <div><dt className="tiny muted">Peak traffic</dt><dd className="num text-xl font-bold">{fmt(r.peakRps)} <span className="small font-normal muted">req/s</span></dd></div>
          <div><dt className="tiny muted">Servers needed</dt><dd className="num text-xl font-bold text-blue-dark" data-testid="servers">{fmt(r.servers)}</dd></div>
          <div><dt className="tiny muted">Servers for average traffic only</dt><dd className="num text-xl font-bold">{fmt(r.serversForAverage)}</dd></div>
          <div><dt className="tiny muted">Most the fleet can take</dt><dd className="num text-xl font-bold">{fmt(r.maxRps)} <span className="small font-normal muted">req/s</span></dd></div>
        </dl>
        <div className="small">
          <p className="font-semibold">How it is calculated</p>
          <pre className="codeblock mt-1 whitespace-pre-wrap">{`peak    = average × multiplier
        = ${fmt(c.avgRps)} × ${c.peakMultiplier} = ${fmt(r.peakRps)} req/s
servers = ceil(peak ÷ (per server × utilization))
        = ceil(${fmt(r.peakRps)} ÷ (${fmt(c.rpsPerServer)} × ${c.utilization})) = ${fmt(r.servers)}`}</pre>
          <p className="mt-2 tiny muted">
            This is an educational estimate, not a production guarantee. Real servers vary, traffic is burstier than this curve, and new servers take minutes to start. The target utilization leaves room for that.
          </p>
        </div>
      </div>

      <div className="border-t border-line px-4 py-2.5">
        <button type="button" className="btn btn-sm" aria-expanded={table} onClick={() => setTable((t) => !t)}>{table ? "Hide" : "Show"} the chart data</button>
        {table && (
          <div className="table-wrap mt-3 max-h-64 overflow-y-auto">
            <table className="table">
              <thead><tr><th className="n">Minute</th><th className="n">Requests per second</th></tr></thead>
              <tbody>{data.filter((_, i) => i % 10 === 0).map((d) => <tr key={d.t}><td className="n">{d.t}</td><td className="n">{fmt(d.rps)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
