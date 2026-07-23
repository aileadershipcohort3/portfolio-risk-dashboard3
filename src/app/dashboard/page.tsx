"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- recharts v3's Tooltip/Pie
   render-prop types (ValueType | undefined, no custom nameKey field) don't line
   up with strict callback typing; loosely typed here per project convention
   rather than fighting recharts' generics. */

import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";
import { useAnalysis } from "@/context/AnalysisContext";
import RiskBadge from "@/components/RiskBadge";
import {
  countByCategory,
  exposureByCategory,
  totalExposure,
  topRiskCustomers,
  exposureByIndustry,
  averageRiskScore,
  generatePortfolioTrend,
  recommendedActions,
} from "@/lib/aggregations";
import { RISK_THRESHOLDS, DEFAULT_WEIGHTS } from "@/lib/riskScoring";
import type { RiskCategory } from "@/lib/types";

const CATEGORIES: RiskCategory[] = ["Green", "Amber", "Red"];

const CATEGORY_COLORS: Record<RiskCategory, string> = {
  Green: "#2f7d4f",
  Amber: "#b5720f",
  Red: "#b13030",
};

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  Green: "Low Risk",
  Amber: "Medium Risk",
  Red: "High Risk",
};

const EXPOSURE_BAR_COLOR = "#333a42";

const INDUSTRY_PALETTE = [
  "#14141a",
  "#e8600c",
  "#b94c09",
  "#8a6b52",
  "#f2934f",
  "#6b6f76",
  "#9a9ea5",
  "#c9ccd1",
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function DashboardPage() {
  const { result } = useAnalysis();

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24">
        <p className="text-lg font-medium">No analysis loaded yet</p>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Upload a portfolio to generate the executive dashboard.
        </p>
        <Link
          href="/"
          className="mt-6 px-5 py-2.5 rounded-md text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  const { customers } = result;
  const counts = countByCategory(customers);
  const exposureByCat = exposureByCategory(customers);
  const total = totalExposure(customers);
  const top10 = topRiskCustomers(customers, 10);
  const industryData = exposureByIndustry(customers);
  const avgRisk = averageRiskScore(customers);
  const trend = generatePortfolioTrend(avgRisk);
  const actions = recommendedActions(customers);

  const categoryChartData = CATEGORIES.map((cat) => ({
    category: cat,
    customers: counts[cat],
    exposure: exposureByCat[cat],
  }));

  const analysedDate = result.analysedAt.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const analysedTime = result.analysedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-semibold">Executive Dashboard</h1>
          {result.isSampleData && (
            <span
              className="px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide uppercase text-white"
              style={{ background: "var(--accent)" }}
            >
              Sample Data
            </span>
          )}
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          {customers.length} customers · {result.csvFileName} · {result.pdfFileName ?? "no policy uploaded"} ·
          analysed {analysedDate}, {analysedTime}
        </p>
      </div>

      {/* 2. Category KPI cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => {
          const count = counts[cat];
          const pctCustomers = customers.length > 0 ? (count / customers.length) * 100 : 0;
          const exposure = exposureByCat[cat];
          const pctExposure = total > 0 ? (exposure / total) * 100 : 0;
          return (
            <div key={cat} className="rounded-xl border p-5 shadow-sm bg-white" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                <span className="text-sm font-medium">
                  {cat} ({CATEGORY_LABELS[cat]})
                </span>
              </div>
              <div className="text-3xl font-semibold mt-2">{count}</div>
              <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                {pctCustomers.toFixed(1)}% of customers · {formatCompactCurrency(exposure)} exposure (
                {pctExposure.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Total portfolio exposure */}
      <div className="rounded-xl border p-5 shadow-sm bg-white" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Total Portfolio Exposure
        </div>
        <div className="text-3xl font-semibold mt-1">{formatCurrency(total)}</div>
      </div>

      {/* 4. Chart row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5 shadow-sm bg-white" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold">Customers &amp; Exposure by Risk Category</h3>
          <CategoryLegend />
          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} stroke="var(--muted)" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="var(--muted)" allowDecimals={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  stroke="var(--muted)"
                  tickFormatter={(v: any) => formatCompactCurrency(Number(v))}
                />
                <Tooltip
                  formatter={(value: any, name: any) =>
                    name === "exposure" ? [formatCurrency(Number(value)), "Exposure"] : [value, "Customers"]
                  }
                />
                <Bar yAxisId="left" dataKey="customers" name="customers" radius={[4, 4, 0, 0]}>
                  {categoryChartData.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} />
                  ))}
                </Bar>
                <Bar yAxisId="right" dataKey="exposure" name="exposure" fill={EXPOSURE_BAR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border p-5 shadow-sm bg-white" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold">Exposure by Industry Sector</h3>
          <div className="h-80 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={industryData}
                  dataKey="exposure"
                  nameKey="industry"
                  outerRadius={100}
                  label={(props: any) => props.name ?? props.industry ?? ""}
                >
                  {industryData.map((entry, idx) => (
                    <Cell key={entry.industry} fill={INDUSTRY_PALETTE[idx % INDUSTRY_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, _name: any, item: any) => [
                    formatCurrency(Number(value)),
                    item?.payload?.industry ?? "Exposure",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Portfolio Risk Trend (full width, alone) */}
      <div className="rounded-xl border p-5 shadow-sm bg-white" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold">Portfolio Risk Trend</h3>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Illustrative trend leading up to current position
        </p>
        <div className="h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted)" domain={[0, 100]} />
              <Tooltip formatter={(value: any) => [Number(value).toFixed(1), "Average Risk Score"]} />
              <Line type="monotone" dataKey="value" name="Average Risk Score" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Top 10 Highest-Risk Customers */}
      <div className="rounded-xl border p-5 shadow-sm bg-white overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold">Top 10 Highest-Risk Customers</h3>
        <table className="w-full mt-3 text-sm min-w-[640px]">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: "var(--border)" }}>
              <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Customer</th>
              <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Industry</th>
              <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Credit Score</th>
              <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Repayment Status</th>
              <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Loan Balance</th>
              <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Risk Score</th>
              <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((c) => (
              <tr key={c.customerId} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                <td className="py-2 pr-4">{c.customerName}</td>
                <td className="py-2 pr-4" style={{ color: "var(--muted)" }}>{c.industrySector}</td>
                <td className="py-2 pr-4">{c.creditScore}</td>
                <td className="py-2 pr-4" style={{ color: "var(--muted)" }}>{c.repaymentStatus}</td>
                <td className="py-2 pr-4">{formatCurrency(c.loanBalance)}</td>
                <td className="py-2 pr-4 font-medium">{c.riskScore.toFixed(1)}</td>
                <td className="py-2 pr-4">
                  <RiskBadge category={c.category} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 7. Bottom row: Recommended Actions + Scoring Methodology */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5 shadow-sm bg-white" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold">Recommended Actions</h3>
          <ul className="mt-3 space-y-2">
            {actions.map((action, idx) => (
              <li key={idx} className="flex gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "var(--accent)" }} />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border p-5 shadow-sm bg-white" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-semibold">Scoring Methodology</h3>
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            Risk Score = ({Math.round(DEFAULT_WEIGHTS.creditRiskWeight * 100)}% × Credit Score Factor) + (
            {Math.round(DEFAULT_WEIGHTS.repaymentRiskWeight * 100)}% × Repayment Status Factor) + (
            {Math.round(DEFAULT_WEIGHTS.exposureWeight * 100)}% × Loan Balance Factor)
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
            Green 0–{RISK_THRESHOLDS.greenMax} · Amber {RISK_THRESHOLDS.greenMax + 1}–{RISK_THRESHOLDS.amberMax} · Red{" "}
            {RISK_THRESHOLDS.amberMax + 1}–100
          </p>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <h4 className="text-sm font-semibold">Extracted Policy Highlights</h4>
            {!result.pdfFileName && (
              <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
                No policy PDF was uploaded, so no rules were extracted for this analysis.
              </p>
            )}
            {result.pdfFileName && result.pdfParseFailed && (
              <p className="text-sm mt-2" style={{ color: "var(--risk-red)" }}>
                Could not extract text from {result.pdfFileName}
                {result.pdfParseError ? `: ${result.pdfParseError}` : "."}
              </p>
            )}
            {result.pdfFileName && !result.pdfParseFailed && (
              <>
                <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
                  Heuristic extraction from {result.pdfFileName} — {result.pdfPageCount ?? 0} page
                  {result.pdfPageCount === 1 ? "" : "s"} scanned.
                </p>
                {result.rules.length === 0 ? (
                  <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
                    No policy rules were identified in this document.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
                    {result.rules.map((rule, idx) => (
                      <li key={idx} className="text-sm pl-3 border-l-2" style={{ borderColor: "var(--accent)" }}>
                        {rule.text}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-2" style={{ color: "var(--muted)" }}>
      <span className="font-medium" style={{ color: "var(--foreground)" }}>
        Customers:
      </span>
      <LegendDot color={CATEGORY_COLORS.Green} label="Green" />
      <LegendDot color={CATEGORY_COLORS.Amber} label="Amber" />
      <LegendDot color={CATEGORY_COLORS.Red} label="Red" />
      <span className="mx-1" style={{ color: "var(--border)" }}>
        |
      </span>
      <LegendDot color={EXPOSURE_BAR_COLOR} label="Exposure" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}
