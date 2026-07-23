// ============================================================================
// THIS IS THE FILE TO EDIT to change how the risk score is calculated —
// weights, credit score band, exposure cap, repayment status mapping, and the
// Green/Amber/Red thresholds all live here. Nothing else in the codebase
// hard-codes these numbers; the UI reads them from these exports so the
// Upload page and the dashboard's "Scoring Methodology" card always stay in
// sync with whatever you change below.
//
//   Risk Score = (Credit Risk Weight   x Credit Score Factor)
//              + (Repayment Risk Weight x Repayment Status Factor)
//              + (Exposure Weight       x Loan Balance Factor)
// ============================================================================

import type { RawCustomer, RiskCategory, RiskWeights, ScoredCustomer } from "./types";

/**
 * Default weights. Credit history and repayment behaviour are the strongest
 * predictors of default, so they carry the most weight; exposure reflects
 * materiality (how much is at stake), not probability of default, hence the
 * lower weight. Must sum to 1.
 */
export const DEFAULT_WEIGHTS: RiskWeights = {
  creditRiskWeight: 0.4,
  repaymentRiskWeight: 0.4,
  exposureWeight: 0.2,
};

export const CREDIT_SCORE_MIN = 300;
export const CREDIT_SCORE_MAX = 850;

/** Loan balances above this are treated the same for exposure-risk purposes. */
export const EXPOSURE_CAP = 500_000;

export const RISK_THRESHOLDS = {
  greenMax: 35,
  amberMax: 65,
} as const;

/**
 * Credit Score Factor: a lower credit score means higher risk, so this is an
 * inverted, clamped, 0-100 scale. Score is clamped to [MIN, MAX] first so an
 * out-of-band value can't push the factor outside 0-100.
 */
export function computeCreditScoreFactor(creditScore: number): number {
  const clamped = Math.min(CREDIT_SCORE_MAX, Math.max(CREDIT_SCORE_MIN, creditScore));
  return ((CREDIT_SCORE_MAX - clamped) / (CREDIT_SCORE_MAX - CREDIT_SCORE_MIN)) * 100;
}

/**
 * Exposure Factor: loan balance scaled 0-100 against a cap. Balances at or
 * above the cap all score 100 — beyond a point, materiality is materiality.
 */
export function computeExposureFactor(loanBalance: number): number {
  const safeBalance = Math.max(0, loanBalance);
  return (Math.min(safeBalance, EXPOSURE_CAP) / EXPOSURE_CAP) * 100;
}

/**
 * Repayment Status Factor: free-text lookup with a numeric-day-count fallback,
 * since portfolio exports use inconsistent wording for the same thing.
 *
 * NOTE: "60 Days Late" (generic bucket) resolves to 75, while the specific
 * label "60 Days Past Due" resolves to 60. This asymmetry is intentional
 * (kept for historical consistency with prior extracts) — not a bug to fix.
 */
export function computeRepaymentRiskFactor(rawStatus: string): number {
  const s = (rawStatus ?? "").toLowerCase().trim().replace(/\s+/g, " ");

  if (s.includes("60 days past due")) return 60;

  if (s.includes("current") || s.includes("on time")) return 0;
  if (s.includes("watchlist") || s.includes("grace")) return 20;
  if (s.includes("write-off") || s.includes("write off") || s.includes("default")) return 100;
  if (s.includes("non-performing") || s.includes("nonperforming") || s.includes("npl")) return 95;

  const dayMatch = s.match(/(\d+)\s*\+?\s*days?/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const hasPlus = s.includes("+");
    if (hasPlus || days >= 90) return 90;
    if (days === 60) return 75;
    if (days >= 30) return 55;
    if (days >= 1) return 35;
  }

  // Unrecognised text — treated as moderate risk, never silently ignored.
  return 50;
}

export function categorize(riskScore: number): RiskCategory {
  if (riskScore <= RISK_THRESHOLDS.greenMax) return "Green";
  if (riskScore <= RISK_THRESHOLDS.amberMax) return "Amber";
  return "Red";
}

/** Scores a single raw customer row using the given weights. */
export function scoreCustomer(customer: RawCustomer, weights: RiskWeights = DEFAULT_WEIGHTS): ScoredCustomer {
  const creditScoreFactor = computeCreditScoreFactor(customer.creditScore);
  const repaymentRiskFactor = computeRepaymentRiskFactor(customer.repaymentStatus);
  const exposureFactor = computeExposureFactor(customer.loanBalance);

  const riskScore =
    weights.creditRiskWeight * creditScoreFactor +
    weights.repaymentRiskWeight * repaymentRiskFactor +
    weights.exposureWeight * exposureFactor;

  return {
    ...customer,
    creditScoreFactor,
    repaymentRiskFactor,
    exposureFactor,
    riskScore,
    category: categorize(riskScore),
  };
}

export function scoreCustomers(customers: RawCustomer[], weights: RiskWeights = DEFAULT_WEIGHTS): ScoredCustomer[] {
  return customers.map((c) => scoreCustomer(c, weights));
}
