/** Educational capacity estimate: how many servers keep the peak at the target utilization. */
export type CapacityInputs = { avgRps: number; peakMultiplier: number; rpsPerServer: number; utilization: number };

export function serversNeeded(c: CapacityInputs) {
  const peakRps = c.avgRps * c.peakMultiplier;
  const usablePerServer = c.rpsPerServer * c.utilization;
  const servers = Math.max(1, Math.ceil(peakRps / usablePerServer));
  return {
    peakRps,
    usablePerServer,
    servers,
    serversForAverage: Math.max(1, Math.ceil(c.avgRps / usablePerServer)),
    /** Load the fleet carries comfortably (at target utilization) and its absolute maximum. */
    comfortableRps: servers * usablePerServer,
    maxRps: servers * c.rpsPerServer,
  };
}

/** A sale-day curve: normal traffic, a sharp rise at minute 30, a plateau, then a gradual return. */
export function spikeCurve(avgRps: number, peakMultiplier: number, minutes = 120, points = 121) {
  const peak = avgRps * peakMultiplier;
  const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
  return Array.from({ length: points }, (_, i) => {
    const t = (i / (points - 1)) * minutes;
    let rps = avgRps;
    if (t >= 30 && t < 33) rps = avgRps + (peak - avgRps) * smooth((t - 30) / 3);
    else if (t >= 33 && t < 63) rps = peak;
    else if (t >= 63 && t < 93) rps = peak - (peak - avgRps) * smooth((t - 63) / 30);
    return { t: Math.round(t), rps };
  });
}
