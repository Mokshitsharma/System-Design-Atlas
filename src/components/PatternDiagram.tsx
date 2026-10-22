/**
 * Small static flow diagram for a pattern: nodes left to right, adjacent edges as straight arrows,
 * skips and back-edges as arcs. Includes a text alternative listing every edge.
 */
export function PatternDiagram({ nodes, edges, title }: { nodes: string[]; edges: [number, number, string][]; title: string }) {
  const W = 180;
  const width = nodes.length * W;
  const cy = 90;
  const x = (i: number) => i * W + W / 2;
  return (
    <figure className="box p-3">
      <svg viewBox={`0 0 ${width} 180`} className="w-full" role="img" aria-labelledby="pd-desc" style={{ maxHeight: 220 }}>
        <defs>
          <marker id="pd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-2)" />
          </marker>
        </defs>
        {edges.map(([a, b, label], k) => {
          const adjacent = Math.abs(a - b) === 1;
          const forward = b > a;
          if (adjacent) {
            const x1 = x(a) + (forward ? 70 : -70);
            const x2 = x(b) + (forward ? -72 : 72);
            const y = forward ? cy - 6 : cy + 6;
            return (
              <g key={k}>
                <line x1={x1} y1={y} x2={x2} y2={y} stroke="var(--ink-2)" strokeWidth="1.5" markerEnd="url(#pd-arrow)" />
                <text x={(x1 + x2) / 2} y={forward ? y - 30 : y + 40} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{label}</text>
              </g>
            );
          }
          const up = forward;
          const y0 = up ? cy - 24 : cy + 24;
          const yc = up ? 8 : 172;
          return (
            <g key={k}>
              <path d={`M${x(a)},${y0} C${x(a)},${yc} ${x(b)},${yc} ${x(b)},${y0}`} fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeDasharray="5 4" markerEnd="url(#pd-arrow)" />
              <text x={(x(a) + x(b)) / 2} y={up ? 22 : 166} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{label}</text>
            </g>
          );
        })}
        {nodes.map((n, i) => (
          <g key={i}>
            <rect x={x(i) - 70} y={cy - 24} width="140" height="48" rx="6" fill="var(--bg)" stroke={i === 0 ? "var(--blue)" : "var(--line-strong)"} strokeWidth={i === 0 ? 2 : 1.25} />
            <foreignObject x={x(i) - 66} y={cy - 22} width="132" height="44">
              <div style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 12.5, fontWeight: 600, lineHeight: 1.15, textAlign: "center", color: "var(--ink)" }}>{n}</div>
            </foreignObject>
          </g>
        ))}
      </svg>
      <figcaption id="pd-desc" className="tiny muted">
        {title}: {edges.map(([a, b, l]) => `${nodes[a]} to ${nodes[b]} (${l})`).join("; ")}.
      </figcaption>
    </figure>
  );
}
