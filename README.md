# Portfolio Risk Dashboard

A client-side prototype that turns a lending policy PDF and a customer portfolio CSV into an executive risk dashboard: risk-scored customers, Green/Amber/Red categorisation, exposure breakdowns, and recommended actions.

Everything runs in the browser. There is no backend, no database, no authentication, and nothing is persisted or uploaded to a server — reloading the page clears the current analysis by design.

## What it does

1. **Upload** (`/`) — upload a lending policy PDF (optional) and a customer portfolio CSV (required), or click **Load Sample Data** to try it with bundled sample files.
2. **Analysis** — the CSV is parsed and each customer is scored using the formula below; the PDF (if provided) is scanned with keyword heuristics to surface relevant policy statements. No AI/LLM calls are involved in either step.
3. **Executive Dashboard** (`/dashboard`) — KPI cards by risk category, total exposure, a category/exposure chart, an industry exposure chart, a portfolio risk trend, the top 10 highest-risk customers, recommended actions, and the scoring methodology.

### Risk scoring

```
Risk Score = (Credit Risk Weight   × Credit Score Factor)
           + (Repayment Risk Weight × Repayment Status Factor)
           + (Exposure Weight       × Loan Balance Factor)
```

Default weights: Credit Risk 40%, Repayment Risk 40%, Exposure 20%. Customers are categorised Green (0–35), Amber (36–65), or Red (66–100).

**To change the weights or thresholds, edit [`src/lib/riskScoring.ts`](src/lib/riskScoring.ts)** — it is the single file that controls scoring behaviour; the Upload page and dashboard read these constants directly, so nothing else needs to change.

### Expected CSV columns

`CustomerID, CustomerName, Industry, CreditScore, RepaymentStatus, LoanBalance` — column names are matched flexibly (case-insensitive, common aliases accepted).

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push this repository to GitHub (already done if you're reading this from the repo).
2. In Vercel: **Import Project** → select this GitHub repository → accept the defaults (framework auto-detected as Next.js via `vercel.json`) → **Deploy**.
3. No environment variables are required — the app has no backend.

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS + Recharts, with `papaparse` for CSV parsing and `pdfjs-dist` for client-side PDF text extraction.

## Out of scope (by design)

No real customer data, no authentication, no server-side storage. The Portfolio Risk Trend chart is an illustrative, client-generated visualisation (there's no historical data source in a no-backend prototype) that tapers to the real current average.
