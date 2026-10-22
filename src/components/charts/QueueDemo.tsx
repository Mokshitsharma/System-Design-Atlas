"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { burstBacklog } from "@/lib/sim/queue";
import { compact, fmt } from "../ui";
import { NumberField } from "./NumberField";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** How the waiting-room line grows during a rush and drains afterwards. */
export default function QueueDemo({ people = "fans", place = "shop" }: { people?: string; place?: string }) {
  const [arrive, setArrive] = useState(5000);
  const [rushSec, setRushSec] = useState(300);
  const [admit, setAdmit] = useState(40);
  const after = Math.round(admit / 4);
  const r = useMemo(
    () => burstBacklog({ capacityRps: admit, burstRps: arrive, burstSec: rushSec, afterRps: after, queueLimit: Number.MAX_SAFE_INTEGER, horizonSec: 6 * 3600, stepSec: 30 }),
    [arrive, rushSec, admit, after],
  );
  const data = r.points.map((p) => ({ min: Math.round(p.t / 60), line: p.backlog }));
  const lastIn = r.drainedAt === null ? "more than 6 hours" : `${fmt(r.drainedAt / 60)} minutes`;

  return (
    <div className="box" data-testid="queue-demo">
      <div className="grid gap-4 border-b border-line p-4 sm:grid-cols-3">
        <NumberField label={`${cap(people)} arriving per second during the rush`} value={arrive} min={100} max={50000} step={100} onChange={setArrive} />
        <NumberField label="Length of the rush" unit="seconds" value={rushSec} min={30} max={1800} step={30} onChange={setRushSec} />
        <NumberField label={`${cap(people)} let into the ${place} per second`} value={admit} min={5} max={500} step={5} onChange={setAdmit} />
      </div>
      <div className="px-2 pt-3">
        <p className="px-2 small font-semibold" id="queue-title">{cap(people)} waiting in line (illustrative)</p>
        <div className="h-52" role="img" aria-labelledby="queue-title" aria-describedby="queue-summary">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 18, left: 4 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="min" type="number" domain={[0, "dataMax"]} stroke="var(--ink-2)" fontSize={12} label={{ value: "Minutes", position: "insideBottom", offset: -10, fill: "var(--ink-2)", fontSize: 12 }} />
              <YAxis tickFormatter={compact} stroke="var(--ink-2)" fontSize={12} width={48} />
              <Tooltip contentStyle={{ border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }} labelFormatter={(v) => `Minute ${v}`} formatter={(v) => [`${fmt(Number(v))} ${people}`, "In line"]} />
              <Area type="monotone" dataKey="line" stroke="var(--blue)" strokeWidth={2} fill="var(--blue)" fillOpacity={0.1} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="border-t border-line p-4 small" aria-live="polite" id="queue-summary" data-testid="queue-result">
        <p>
          The line peaks at <strong className="num">{fmt(r.peakBacklog)}</strong> {people}. The {place} always takes exactly {fmt(admit)} {people} per second, so it never overloads.
          The last person in the rush waits about <strong className="num">{fmt(r.worstWaitSec / 60)} minutes</strong>, and the line is empty after {lastIn}.
        </p>
        <p className="mt-2 tiny muted">After the rush, new {people} keep arriving at a quarter of the {place}&apos;s rate. Wait for the last person = people in line ÷ people let in per second. A simplified model: real people give up and leave, so lines shrink faster than this.</p>
      </div>
    </div>
  );
}
