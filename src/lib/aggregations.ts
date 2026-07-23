// Dashboard-facing aggregation helpers, computed from a ScoredCustomer[].
// Kept separate from riskScoring.ts so the scoring math and the
// presentation/rollup logic don't get tangled together.

import type { RiskCategory, ScoredCustomer } from "./types";

const CATEGORIES: RiskCategory[] = ["Green", "Amber", "Red"];

export function countByCategory(customers: ScoredCustomer[]): Record<RiskCategory, number> {
  const counts: Record<RiskCategory, number> = { Green: 0, Amber: 0, Red: 0 };
  customers.forEach((c) => {
    counts[c.category] += 1;
  });
  return counts;
}

export function exposureByCategory(customers: ScoredCustomer[]): Record<RiskCategory, number> {
  const exposure: Record<RiskCategory, number> = { Green: 0, Amber: 0, Red: 0 };
  customers.forEach((c) => {
    exposure[c.category] += c.loanBalance;
  });
  return exposure;
}

export function totalExposure(customers: ScoredCustomer[]): number {
  return customers.reduce((sum, c) => sum + c.loanBalance, 0);
}

export function topRiskCustomers(customers: ScoredCustomer[], n = 10): ScoredCustomer[] {
  return [...customers].sort((a, b) => b.riskScore - a.riskScore).slice(0, n);
}

export interface IndustryExposure {
  industry: string;
  exposure: number;
  customerCount: number;
}

export function exposureByIndustry(customers: ScoredCustomer[]): IndustryExposure[] {
  const map = new Map<string, IndustryExposure>();
  customers.forEach((c) => {
    const existing = map.get(c.industrySector);
    if (existing) {
      existing.exposure += c.loanBalance;
      existing.customerCount += 1;
    } else {
      map.set(c.industrySector, { industry: c.industrySector, exposure: c.loanBalance, customerCount: 1 });
    }
  });
  return [...map.values()].sort((a, b) => b.exposure - a.exposure);
}

export function averageRiskScore(customers: ScoredCustomer[]): number {
  if (customers.length === 0) return 0;
  return customers.reduce((sum, c) => sum + c.riskScore, 0) / customers.length;
}

// --- Portfolio risk trend (illustrative) ------------------------------------

// Seeded PRNG (mulberry32) so the "illustrative" trend is deterministic for a
// given portfolio rather than jumping around on every render.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TrendPoint {
  label: string;
  value: number;
}

/**
 * Generates a client-side pseudo-random walk of the portfolio's average risk
 * score over the last `weeks` weeks, tapering to the real current average at
 * the most recent point. Purely illustrative — there is no historical data
 * source in this prototype (no backend, no persistence).
 */
export function generatePortfolioTrend(currentAverage: number, weeks = 12): TrendPoint[] {
  const rand = mulberry32(Math.round(currentAverage * 1000) + weeks);
  const points: TrendPoint[] = [];

  let value = Math.min(100, Math.max(0, currentAverage + (rand() - 0.5) * 18));

  for (let i = 0; i < weeks; i += 1) {
    const isLast = i === weeks - 1;
    if (isLast) {
      value = currentAverage;
    } else {
      const pullToCurrent = (currentAverage - value) * 0.12;
      const noise = (rand() - 0.5) * 7;
      value = Math.min(100, Math.max(0, value + pullToCurrent + noise));
    }
    const weeksAgo = weeks - 1 - i;
    points.push({
      label: weeksAgo === 0 ? "Now" : `${weeksAgo}w ago`,
      value: Math.round(value * 10) / 10,
    });
  }

  return points;
}

// --- Recommended actions -----------------------------------------------------

export function recommendedActions(customers: ScoredCustomer[]): string[] {
  const actions: string[] = [];
  const total = totalExposure(customers);
  const reds = customers.filter((c) => c.category === "Red");
  const ambers = customers.filter((c) => c.category === "Amber");
  const redExposure = reds.reduce((sum, c) => sum + c.loanBalance, 0);

  if (reds.length > 0) {
    const names = reds.slice(0, 5).map((c) => c.customerName);
    const remainder = reds.length - names.length;
    const nameList = remainder > 0 ? `${names.join(", ")}, and ${remainder} more` : names.join(", ");
    actions.push(
      `Escalate ${reds.length} Red (high-risk) customer${reds.length > 1 ? "s" : ""} for immediate review: ${nameList}.`
    );
  }

  if (total > 0 && redExposure / total > 0.15) {
    actions.push(
      `Red-category exposure is ${((redExposure / total) * 100).toFixed(1)}% of total portfolio exposure — above the 15% concentration guide; consider tightening new lending in this band.`
    );
  }

  if (ambers.length > 0) {
    actions.push(
      `Place ${ambers.length} Amber (medium-risk) customer${ambers.length > 1 ? "s" : ""} on the watchlist for enhanced monitoring.`
    );
  }

  const industries = exposureByIndustry(customers);
  if (industries.length > 0 && total > 0) {
    const top = industries[0];
    const share = (top.exposure / total) * 100;
    if (share > 30) {
      actions.push(
        `${top.industry} accounts for ${share.toFixed(1)}% of total exposure — review industry concentration limits.`
      );
    }
  }

  if (actions.length === 0) {
    actions.push("Portfolio risk profile is within normal parameters — no immediate escalations required.");
  }

  return actions;
}

export { CATEGORIES };
