// Client-side CSV parsing for the customer portfolio upload. Column names are
// matched flexibly (case-insensitive, whitespace/punctuation-insensitive)
// against a set of accepted aliases per logical column.

import Papa from "papaparse";
import type { RawCustomer } from "./types";

type LogicalColumn = keyof RawCustomer;

const HEADER_ALIASES: Record<LogicalColumn, string[]> = {
  customerId: ["customer_id", "customerid", "id", "account_id", "account number", "customer id"],
  customerName: ["customer_name", "customername", "name", "client name", "customer"],
  industrySector: ["industry_sector", "industry", "sector", "industry sector"],
  creditScore: ["credit_score", "creditscore", "credit score", "score", "bureau_score"],
  repaymentStatus: [
    "repayment_status",
    "repaymentstatus",
    "repayment status",
    "status",
    "arrears_status",
    "delinquency_status",
  ],
  loanBalance: ["loan_balance", "loanbalance", "loan balance", "balance", "exposure", "outstanding_balance"],
};

const REQUIRED_COLUMN_LABELS: Record<LogicalColumn, string> = {
  customerId: "CustomerID",
  customerName: "CustomerName",
  industrySector: "Industry",
  creditScore: "CreditScore",
  repaymentStatus: "RepaymentStatus",
  loanBalance: "LoanBalance",
};

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildAliasLookup(): Map<string, LogicalColumn> {
  const map = new Map<string, LogicalColumn>();
  (Object.keys(HEADER_ALIASES) as LogicalColumn[]).forEach((logical) => {
    map.set(normalizeKey(logical), logical);
    HEADER_ALIASES[logical].forEach((alias) => map.set(normalizeKey(alias), logical));
  });
  return map;
}

function parseNumber(raw: string | undefined): number {
  if (raw == null) return NaN;
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

export interface CsvParseResult {
  customers: RawCustomer[];
  rowsSkipped: number;
}

export function parseCustomerCsv(file: File): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const fields = results.meta.fields ?? [];
          const aliasLookup = buildAliasLookup();

          const columnMap = new Map<LogicalColumn, string>();
          fields.forEach((field) => {
            const logical = aliasLookup.get(normalizeKey(field));
            if (logical && !columnMap.has(logical)) {
              columnMap.set(logical, field);
            }
          });

          const missing = (Object.keys(HEADER_ALIASES) as LogicalColumn[]).filter((k) => !columnMap.has(k));
          if (missing.length > 0) {
            reject(
              new Error(
                `Could not find required column(s) in the CSV: ${missing
                  .map((m) => REQUIRED_COLUMN_LABELS[m])
                  .join(", ")}. Column names are matched flexibly, but these were not recognised.`
              )
            );
            return;
          }

          const customers: RawCustomer[] = [];
          let rowsSkipped = 0;

          for (const row of results.data) {
            const customerId = (row[columnMap.get("customerId")!] ?? "").trim();
            const customerName = (row[columnMap.get("customerName")!] ?? "").trim();
            const industrySector = (row[columnMap.get("industrySector")!] ?? "").trim() || "Unclassified";
            const creditScore = parseNumber(row[columnMap.get("creditScore")!]);
            const repaymentStatus = (row[columnMap.get("repaymentStatus")!] ?? "").trim();
            const loanBalance = parseNumber(row[columnMap.get("loanBalance")!]);

            if (!customerId || Number.isNaN(creditScore) || Number.isNaN(loanBalance)) {
              rowsSkipped += 1;
              continue;
            }

            customers.push({
              customerId,
              customerName: customerName || customerId,
              industrySector,
              creditScore,
              repaymentStatus: repaymentStatus || "Unknown",
              loanBalance,
            });
          }

          resolve({ customers, rowsSkipped });
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to parse CSV file."));
        }
      },
      error: (err) => reject(err instanceof Error ? err : new Error("Failed to parse CSV file.")),
    });
  });
}
