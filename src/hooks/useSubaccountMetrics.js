import { useEffect, useMemo, useState } from "react";

const FALLBACK_HISTORY = [
  { date: "2024-10-20", balance: 12850.75 },
  { date: "2024-10-21", balance: 13012.4 },
  { date: "2024-10-22", balance: 13140.05 },
  { date: "2024-10-23", balance: 13355.92 },
  { date: "2024-10-24", balance: 13680.5 },
  { date: "2024-10-25", balance: 13942.13 },
  { date: "2024-10-26", balance: 14105.72 },
];

const FALLBACK_METRICS = {
  balance: FALLBACK_HISTORY[FALLBACK_HISTORY.length - 1].balance,
  fundingEarnings: 482.33,
  balanceHistory: FALLBACK_HISTORY,
};

const DEFAULT_ENDPOINT =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_SUBACCOUNT_METRICS_URL
    ? import.meta.env.VITE_SUBACCOUNT_METRICS_URL
    : "/api/subaccount-metrics";

function parseBalanceHistory(list) {
  if (!Array.isArray(list)) return [];

  return list
    .map((entry) => {
      const dateValue = entry?.date ?? entry?.timestamp ?? entry?.day ?? entry?.at;
      const balanceValue = entry?.balance ?? entry?.value ?? entry?.equity ?? entry?.total ?? entry?.amount;

      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      const balance = Number(balanceValue);

      if (!Number.isFinite(balance)) return null;
      if (Number.isNaN(date.getTime())) return null;

      const key = date.toISOString().slice(0, 10);
      return { key, date, balance };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);
}

function normalizeMetrics(raw) {
  const history = parseBalanceHistory(raw?.balanceHistory ?? raw?.history ?? raw?.balances ?? []);

  const latestBalance = Number(
    raw?.balance ?? raw?.equity ?? raw?.walletBalance ?? raw?.total ?? raw?.totalBalance ?? history.at(-1)?.balance
  );
  const fundingEarned = Number(raw?.fundingEarnings ?? raw?.fundingEarned ?? raw?.cumulativeFunding ?? raw?.funding ?? 0);

  return {
    balance: Number.isFinite(latestBalance) ? latestBalance : null,
    fundingEarnings: Number.isFinite(fundingEarned) ? fundingEarned : null,
    balanceHistory: history,
  };
}

export function useSubaccountMetrics() {
  const [metrics, setMetrics] = useState(FALLBACK_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let controller = new AbortController();

    async function fetchMetrics() {
      setLoading(true);
      controller.abort();
      controller = new AbortController();

      try {
        const response = await fetch(DEFAULT_ENDPOINT, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const json = await response.json();
        if (!mounted) return;

        const normalized = normalizeMetrics(json);
        setMetrics((prev) => ({ ...prev, ...normalized }));
        setError(null);
      } catch (e) {
        if (!mounted) return;
        const reason = e?.name === "AbortError" ? "request was cancelled" : e?.message || String(e);
        setError(`Unable to load sub-account metrics (${reason}). Displaying cached values.`);
        setMetrics(FALLBACK_METRICS);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMetrics();
    const id = setInterval(fetchMetrics, 300_000);

    return () => {
      mounted = false;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  const summary = useMemo(() => {
    const latest = metrics.balanceHistory.at(-1);
    const first = metrics.balanceHistory[0];
    const change = latest && first ? latest.balance - first.balance : null;
    return { ...metrics, latestBalanceChange: change };
  }, [metrics]);

  return { ...summary, loading, error };
}

export { FALLBACK_METRICS };
