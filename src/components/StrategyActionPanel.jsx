import React, { useMemo, useState } from "react";

function formatCurrency(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function StrategyActionPanel({ strategy }) {
  const [activeTab, setActiveTab] = useState("deposit");
  const [depositAmount, setDepositAmount] = useState("1000.00");
  const [depositToken, setDepositToken] = useState("USDC");
  const [withdrawAmount, setWithdrawAmount] = useState("1000.00");
  const [withdrawToken, setWithdrawToken] = useState("USDC");
  const actionHeading =
    activeTab === "deposit" ? "Deploy on Vault Nihr" : "Withdraw from Vault Nihr";

  const depositReceiveLabel = useMemo(() => {
    const parsed = Number.parseFloat(depositAmount);
    if (!Number.isFinite(parsed)) return "0.00 shares";
    return `${parsed.toFixed(2)} shares`;
  }, [depositAmount]);

  const withdrawReceiveLabel = useMemo(() => {
    const parsed = Number.parseFloat(withdrawAmount);
    if (!Number.isFinite(parsed)) return `0.00 ${withdrawToken}`;
    return `${parsed.toFixed(2)} ${withdrawToken}`;
  }, [withdrawAmount, withdrawToken]);

  const quickAmounts = ["10%", "25%", "50%", "75%", "Max"];

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-blue-900 bg-gradient-to-br from-[#0a142c] via-[#0c1a38] to-[#081021] shadow-[0_20px_45px_rgba(15,36,84,0.45)]">
      <div className="border-b border-blue-900/80 px-6 py-5">
        <div className="grid gap-4 text-sm text-blue-200 sm:grid-cols-2">
          <div>
            <span className="text-xs uppercase tracking-wide text-blue-400/80">Your balance</span>
            <p className="mt-2 text-2xl font-semibold text-blue-50">{formatCurrency(0)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase tracking-wide text-blue-400/80">Funding earned</span>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">+{formatCurrency(0)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="flex w-full items-center justify-between">
          <div className="w-full">
            <div className="flex w-full items-center gap-2 rounded-full border border-blue-800/70 bg-[#0d1a33] p-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
              <button
                type="button"
                onClick={() => setActiveTab("deposit")}
                className={`flex-1 rounded-full px-4 py-1.5 text-center transition ${
                  activeTab === "deposit"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-blue-50"
                    : "hover:text-cyan-200"
                }`}
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("withdraw")}
                className={`flex-1 rounded-full px-4 py-1.5 text-center transition ${
                  activeTab === "withdraw"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-blue-50"
                    : "hover:text-cyan-200"
                }`}
              >
                Withdraw
              </button>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-blue-50">{actionHeading}</h3>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {activeTab === "deposit" ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">You're depositing</p>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-blue-800/60 bg-[#0a1326] px-4 py-3 shadow-inner shadow-blue-900/40">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(event) => setDepositAmount(event.target.value)}
                    className="flex-1 bg-transparent text-xl font-semibold text-blue-50 outline-none placeholder:text-blue-400/60"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={depositToken}
                      onChange={(event) => setDepositToken(event.target.value)}
                      className="rounded-lg border border-blue-800/70 bg-[#0f1f3b] px-3 py-2 text-sm font-medium text-blue-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                </div>
                <p className="mt-2 text-xs text-blue-300">
                  Balance: $0.00 — Min. deposit: $500.00 — Max. deposit: $250,000.00
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDepositAmount(label)}
                    className="rounded-lg border border-blue-800/70 bg-[#0d1d38] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-200 transition hover:border-blue-600/70 hover:text-cyan-200"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-blue-800/70 bg-[#0d1c35] px-4 py-3 text-sm text-blue-200 shadow-inner shadow-blue-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-blue-300">You'll receive</span>
                  <span className="font-semibold text-blue-50">{depositReceiveLabel}</span>
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-blue-400/70">
                  Authenticate to access live yields
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">You're withdrawing</p>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-blue-800/60 bg-[#0a1326] px-4 py-3 shadow-inner shadow-blue-900/40">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    className="flex-1 bg-transparent text-xl font-semibold text-blue-50 outline-none placeholder:text-blue-400/60"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-blue-800/70 bg-[#0f1f3b] px-3 py-2 text-sm font-medium text-blue-100">
                      shares
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-blue-300">
                  Balance: 0.00 shares — Min. withdrawal: 1.00 share — Max. withdrawal: 100,000.00 shares
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setWithdrawAmount(label)}
                    className="rounded-lg border border-blue-800/70 bg-[#0d1d38] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-200 transition hover:border-blue-600/70 hover:text-cyan-200"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-blue-800/70 bg-[#0d1c35] px-4 py-3 text-sm text-blue-200 shadow-inner shadow-blue-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-blue-300">You'll receive</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-50">{withdrawReceiveLabel}</span>
                    <select
                      value={withdrawToken}
                      onChange={(event) => setWithdrawToken(event.target.value)}
                      className="rounded-lg border border-blue-800/70 bg-[#0f1f3b] px-3 py-2 text-sm font-medium text-blue-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-blue-400/70">
                  Authenticate to proceed with withdrawals
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-blue-900/80 px-6 py-4">
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-blue-50 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500"
        >
          Authenticate
        </button>
        <p className="mt-3 text-center text-xs text-blue-400/80">
          Max balance per user is $1,000,000.00
        </p>
      </div>
    </div>
  );
}
