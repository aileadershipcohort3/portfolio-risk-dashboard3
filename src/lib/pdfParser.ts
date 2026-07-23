// Client-side lending policy PDF rule extraction. Pure keyword + sentence
// splitting heuristics — no LLM/API calls of any kind. PDF extraction is
// optional and best-effort: any failure here must never block the CSV
// analysis (see AnalysisResult.pdfParseFailed / pdfParseError).

import type { ExtractedRule } from "./types";

// pdfjs-dist v6 requires Promise.withResolvers, which is missing on older
// browsers (pre Safari 17.4 / Chrome 119 / Firefox 121). Polyfill defensively
// before importing/using pdfjs-dist.
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const RULE_KEYWORDS = [
  "credit score",
  "debt-to-income",
  "debt to income",
  "dti",
  "loan-to-value",
  "loan to value",
  "ltv",
  "delinquen", // matches delinquent / delinquency
  "default",
  "past due",
  "arrears",
  "watchlist",
  "covenant",
  "exposure limit",
  "concentration limit",
  "threshold",
  "risk rating",
  "risk grade",
  "write-off",
  "write off",
  "provisioning",
  "collateral",
  "minimum",
  "maximum",
];

const MAX_RULES = 25;
const MIN_STATEMENT_LENGTH = 15;
const MAX_STATEMENT_LENGTH = 320;

function splitIntoStatements(text: string): string[] {
  return text
    .split(/(?:\. |; )/g)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= MIN_STATEMENT_LENGTH && s.length <= MAX_STATEMENT_LENGTH);
}

function isRuleStatement(statement: string): boolean {
  const lower = statement.toLowerCase();
  return RULE_KEYWORDS.some((kw) => lower.includes(kw));
}

export interface PdfExtractionResult {
  rawText: string;
  rules: ExtractedRule[];
  pageCount: number;
}

export async function extractRulesFromPdf(file: File): Promise<PdfExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const doc = await loadingTask.promise;

  let rawText = "";
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    rawText += `${pageText}\n`;
  }

  const statements = splitIntoStatements(rawText);
  const rules: ExtractedRule[] = statements
    .filter(isRuleStatement)
    .slice(0, MAX_RULES)
    .map((text) => ({ text }));

  return { rawText, rules, pageCount: doc.numPages };
}
