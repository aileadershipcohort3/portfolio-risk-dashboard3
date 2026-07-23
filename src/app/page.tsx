"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadPanel from "@/components/UploadPanel";
import { useAnalysis } from "@/context/AnalysisContext";
import { parseCustomerCsv } from "@/lib/csvParser";
import { extractRulesFromPdf } from "@/lib/pdfParser";
import { scoreCustomers, DEFAULT_WEIGHTS, RISK_THRESHOLDS } from "@/lib/riskScoring";
import type { AnalysisResult, ExtractedRule } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const { setResult } = useAnalysis();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSampleSelected, setIsSampleSelected] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePdfSelected(file: File | null) {
    setPdfFile(file);
    setIsSampleSelected(false);
  }

  function handleCsvSelected(file: File | null) {
    setCsvFile(file);
    setIsSampleSelected(false);
  }

  async function handleLoadSampleData() {
    setIsLoadingSample(true);
    setError(null);
    try {
      const [csvRes, pdfRes] = await Promise.all([
        fetch("/sample-data/sample-customers.csv"),
        fetch("/sample-data/sample-lending-policy.pdf"),
      ]);
      if (!csvRes.ok || !pdfRes.ok) {
        throw new Error("Could not load the bundled sample data files.");
      }
      const [csvBlob, pdfBlob] = await Promise.all([csvRes.blob(), pdfRes.blob()]);
      const csv = new File([csvBlob], "sample-customers.csv", { type: "text/csv" });
      const pdf = new File([pdfBlob], "sample-lending-policy.pdf", { type: "application/pdf" });
      setCsvFile(csv);
      setPdfFile(pdf);
      setIsSampleSelected(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load sample data.");
    } finally {
      setIsLoadingSample(false);
    }
  }

  async function handleRunAnalysis() {
    if (!csvFile) return;
    setIsAnalysing(true);
    setError(null);
    try {
      const { customers: rawCustomers, rowsSkipped } = await parseCustomerCsv(csvFile);
      const customers = scoreCustomers(rawCustomers, DEFAULT_WEIGHTS);

      let rules: ExtractedRule[] = [];
      let pdfPageCount: number | null = null;
      let pdfParseFailed = false;
      let pdfParseError: string | null = null;

      if (pdfFile) {
        try {
          const pdfResult = await extractRulesFromPdf(pdfFile);
          rules = pdfResult.rules;
          pdfPageCount = pdfResult.pageCount;
        } catch (e) {
          // PDF extraction is optional/best-effort — never block CSV analysis.
          pdfParseFailed = true;
          pdfParseError = e instanceof Error ? e.message : "Could not extract text from the PDF.";
        }
      }

      const result: AnalysisResult = {
        customers,
        rules,
        weights: DEFAULT_WEIGHTS,
        csvFileName: csvFile.name,
        pdfFileName: pdfFile ? pdfFile.name : null,
        pdfPageCount,
        rowsSkipped,
        pdfParseFailed,
        pdfParseError,
        analysedAt: new Date(),
        isSampleData: isSampleSelected,
      };

      setResult(result);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while analysing the files.");
    } finally {
      setIsAnalysing(false);
    }
  }

  const weightPct = (w: number) => `${Math.round(w * 100)}%`;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold">Portfolio Risk Analysis</h1>
      <p className="mt-2" style={{ color: "var(--muted)" }}>
        Upload your lending policy document and customer portfolio to generate an executive risk dashboard. All
        processing happens in your browser — no files are sent to a server.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <UploadPanel
          inputId="pdf-upload"
          title="1. Lending Policy & Risk Guidance (PDF)"
          subtitle="Used to surface key policy rules and thresholds referenced on the dashboard. Optional, but recommended."
          accept="application/pdf"
          selectedFileName={pdfFile ? pdfFile.name : null}
          onFileSelected={handlePdfSelected}
        />
        <UploadPanel
          inputId="csv-upload"
          title="2. Customer Portfolio (CSV)"
          subtitle="Expected columns: CustomerID, CustomerName, Industry, CreditScore, RepaymentStatus, LoanBalance. Column names are matched flexibly."
          accept=".csv,text/csv"
          selectedFileName={csvFile ? csvFile.name : null}
          onFileSelected={handleCsvSelected}
        />
      </div>

      {error && (
        <div
          className="mt-4 rounded-md p-3 text-sm"
          style={{ background: "var(--risk-red-bg)", color: "var(--risk-red)" }}
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-6">
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={!csvFile || isAnalysing}
          className="px-5 py-2.5 rounded-md text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{ background: "var(--accent)" }}
        >
          {isAnalysing ? "Analysing…" : "Run Analysis"}
        </button>
        <button
          type="button"
          onClick={handleLoadSampleData}
          disabled={isLoadingSample}
          className="px-5 py-2.5 rounded-md text-sm font-medium border disabled:opacity-50 cursor-pointer"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          {isLoadingSample ? "Loading…" : "Load Sample Data"}
        </button>
      </div>

      <div className="rounded-xl border p-5 shadow-sm bg-white mt-8" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold">How risk is scored</h3>
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          Risk Score&nbsp;=&nbsp;({weightPct(DEFAULT_WEIGHTS.creditRiskWeight)}&nbsp;×&nbsp;Credit Score Factor)
          +&nbsp;({weightPct(DEFAULT_WEIGHTS.repaymentRiskWeight)}&nbsp;×&nbsp;Repayment Status Factor)
          +&nbsp;({weightPct(DEFAULT_WEIGHTS.exposureWeight)}&nbsp;×&nbsp;Loan Balance Factor)
        </p>
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          Customers are categorised Green (0–{RISK_THRESHOLDS.greenMax}), Amber ({RISK_THRESHOLDS.greenMax + 1}–
          {RISK_THRESHOLDS.amberMax}), or Red ({RISK_THRESHOLDS.amberMax + 1}–100) based on the combined score.
        </p>
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          To change these weights or thresholds, edit{" "}
          <code className="px-1 py-0.5 rounded bg-[var(--background)]">src/lib/riskScoring.ts</code>.
        </p>
      </div>
    </div>
  );
}
