import React from "react";

function formatCurrency(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function StrategyActionPanel({ balance, fundingEarned, isLoading }) {
  const balanceLabel = isLoading ? "Loading…" : formatCurrency(balance);
  const fundingLabel = isLoading
    ? "Loading…"
    : Number.isFinite(fundingEarned)
      ? `${fundingEarned > 0 ? "+" : ""}${formatCurrency(fundingEarned)}`
      : "—";

  return (
    <div className="rounded-2xl border border-blue-900 bg-gradient-to-br from-[#0a142c] via-[#0c1a38] to-[#081021] shadow-[0_20px_45px_rgba(15,36,84,0.45)]">
      <div className="px-6 py-8">
        <div className="grid gap-8 text-sm text-blue-200 sm:grid-cols-2">
          <div>
            <span className="text-xs uppercase tracking-wide text-blue-400/80">Balance</span>
            <p className="mt-2 text-3xl font-semibold text-blue-50">{balanceLabel}</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs uppercase tracking-wide text-blue-400/80">Funding earned</span>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">{fundingLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
