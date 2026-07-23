// Shared type definitions for the Portfolio Risk Dashboard.
// No backend types here — everything is computed client-side from an
// uploaded CSV (+ optional PDF) and held in AnalysisContext.

export type RiskCategory = "Green" | "Amber" | "Red";

/** A customer row as parsed from the uploaded CSV, before scoring. */
export interface RawCustomer {
  customerId: string;
  customerName: string;
  industrySector: string;
  creditScore: number;
  repaymentStatus: string;
  loanBalance: number;
}

/** A customer row after the risk scoring engine has run. */
export interface ScoredCustomer extends RawCustomer {
  creditScoreFactor: number;
  repaymentRiskFactor: number;
  exposureFactor: number;
  riskScore: number;
  category: RiskCategory;
}

/** A single heuristically-extracted statement from the lending policy PDF. */
export interface ExtractedRule {
  text: string;
}

/** The three weights used to combine the risk factors. Must sum to 1. */
export interface RiskWeights {
  creditRiskWeight: number;
  repaymentRiskWeight: number;
  exposureWeight: number;
}

/** The full result of running an analysis — the single source of truth for the dashboard. */
export interface AnalysisResult {
  customers: ScoredCustomer[];
  rules: ExtractedRule[];
  weights: RiskWeights;
  csvFileName: string;
  pdfFileName: string | null;
  pdfPageCount: number | null;
  rowsSkipped: number;
  pdfParseFailed: boolean;
  pdfParseError: string | null;
  analysedAt: Date;
  isSampleData: boolean;
}
