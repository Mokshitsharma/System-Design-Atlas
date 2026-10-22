/**
 * M/M/c queue (Poisson arrivals, exponential service, c identical servers).
 * c = 1 is the textbook M/M/1. Results are steady-state and only valid when rho < 1.
 */
export type QueueInputs = { arrivalRps: number; serviceRpsPerServer: number; servers: number; timeoutSec: number };

export function erlangC(c: number, a: number): number {
  // a = offered load in Erlangs (lambda / mu). Iterative form avoids factorial overflow.
  let term = 1;
  let sum = 1;
  for (let k = 1; k < c; k++) {
    term *= a / k;
    sum += term;
  }
  const last = (term * a) / c; // a^c / c!
  const rho = a / c;
  const top = last / (1 - rho);
  return top / (sum + top);
}

export function mmc(q: QueueInputs) {
  const { arrivalRps: lambda, serviceRpsPerServer: mu, servers: c, timeoutSec } = q;
  const rho = lambda / (c * mu);
  if (!(rho < 1)) {
    return { stable: false as const, rho, backlogGrowthRps: lambda - c * mu };
  }
  const pWait = erlangC(c, lambda / mu);
  const wq = pWait / (c * mu - lambda);
  const w = wq + 1 / mu;
  // P(Wq > T) = C * exp(-(c mu - lambda) T)
  const timeoutShare = pWait * Math.exp(-(c * mu - lambda) * timeoutSec);
  return { stable: true as const, rho, pWait, wqSec: wq, wSec: w, lq: lambda * wq, l: lambda * w, timeoutShare };
}

/**
 * Fluid backlog model for a burst: arrivals exceed capacity for `burstSec`, then fall back.
 * The queue is bounded at `queueLimit`; arrivals beyond it are rejected. Deterministic.
 */
export function burstBacklog(opts: {
  capacityRps: number;
  burstRps: number;
  burstSec: number;
  afterRps: number;
  queueLimit: number;
  horizonSec: number;
  stepSec?: number;
}) {
  const step = opts.stepSec ?? Math.max(1, Math.round(opts.horizonSec / 200));
  let backlog = 0;
  let rejected = 0;
  let drainedAt: number | null = null;
  const points: { t: number; backlog: number; rejected: number }[] = [];
  for (let t = 0; t <= opts.horizonSec; t += step) {
    const arrivals = (t < opts.burstSec ? opts.burstRps : opts.afterRps) * step;
    backlog += arrivals - opts.capacityRps * step;
    if (backlog > opts.queueLimit) {
      rejected += backlog - opts.queueLimit;
      backlog = opts.queueLimit;
    }
    if (backlog < 0) backlog = 0;
    if (t >= opts.burstSec && backlog === 0 && drainedAt === null) drainedAt = t;
    points.push({ t, backlog, rejected });
  }
  const peakBacklog = Math.max(...points.map((p) => p.backlog));
  return {
    points,
    peakBacklog,
    rejected,
    drainedAt,
    /** Little's law: the last request queued at the peak waits roughly backlog / capacity. */
    worstWaitSec: peakBacklog / opts.capacityRps,
    drains: opts.afterRps < opts.capacityRps,
  };
}
