// Hardcoded figure — this app has no backend, so there's no way to query
// real token-usage stats client-side. Update the constant below when you
// have a real number.
const TOTAL_TOKENS_USED = 1_500_000;

export default function TokensPage() {
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <h1 className="text-3xl font-semibold">Build Stats</h1>
      <p className="mt-2" style={{ color: "var(--muted)" }}>
        Total tokens used by Claude to build this prototype.
      </p>

      <div className="rounded-xl border p-10 shadow-sm bg-white mt-8" style={{ borderColor: "var(--border)" }}>
        <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Total Tokens Used
        </div>
        <div className="text-6xl sm:text-7xl font-bold mt-3 tabular-nums" style={{ color: "var(--accent)" }}>
          {TOTAL_TOKENS_USED.toLocaleString("en-AU")}
        </div>
        <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>
          Hardcoded figure —{" "}
          <code className="px-1 py-0.5 rounded bg-[var(--background)]">src/app/tokens/page.tsx</code> is the file to
          edit to update it.
        </p>
      </div>
    </div>
  );
}
