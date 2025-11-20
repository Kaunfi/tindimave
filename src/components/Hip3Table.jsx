import React, { useEffect, useMemo, useState } from "react";
import TableShell from "./TableShell.jsx";
import TokenLogo from "./TokenLogo.jsx";
import { ensureTokenSymbol } from "./tokenUtils.js";

const API = "https://api.hyperliquid.xyz/info";

const FALLBACK_HIP3_ROWS = [
  {
    symbol: "HLP",
    lastPrice: 1.01,
    change24h: 0.35,
    volume24h: 152_000,
    openInterest: 2_450_000,
  },
  {
    symbol: "USDe",
    lastPrice: 0.99,
    change24h: -0.12,
    volume24h: 88_500,
    openInterest: 1_125_000,
  },
  {
    symbol: "stSOL",
    lastPrice: 188.34,
    change24h: 1.8,
    volume24h: 320_000,
    openInterest: 845_000,
  },
];

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stripXyzPrefix(value) {
  if (typeof value !== "string") return value;
  return value.replace(/^xyz[:]?/i, "");
}

function isHip3Entry(entry) {
  const type = ensureTokenSymbol(
    entry?.tokenType,
    entry?.type,
    entry?.assetType,
    entry?.category,
    entry?.token?.type,
    entry?.token?.category
  );
  if (type === "HIP3") return true;
  if (entry?.hip3 === true || entry?.isHip3 === true) return true;
  const rawSymbols = [
    entry?.symbol,
    entry?.name,
    entry?.ticker,
    entry?.pfSym,
    entry?.pf_sym,
    entry?.coin,
    entry?.token?.symbol,
    entry?.token?.ticker,
  ];
  if (rawSymbols.some((value) => typeof value === "string" && value.toLowerCase().startsWith("xyz:"))) {
    return true;
  }
  return false;
}

function normalizeHip3Entry(entry, ctx) {
  const rawSymbol = ensureTokenSymbol(
    entry?.symbol,
    entry?.name,
    entry?.ticker,
    entry?.pfSym,
    entry?.pf_sym,
    entry?.coin,
    entry?.token?.symbol,
    entry?.token?.ticker
  );

  const symbol = stripXyzPrefix(rawSymbol);
  const lastPrice = parseNumber(ctx?.markPx ?? ctx?.midPx ?? ctx?.price ?? ctx?.px);
  const prevDayPx = parseNumber(ctx?.prevDayPx ?? ctx?.prevDayPrice ?? ctx?.prevDayMid);
  const change24h =
    lastPrice != null && prevDayPx != null && prevDayPx !== 0
      ? ((lastPrice - prevDayPx) / prevDayPx) * 100
      : null;

  return {
    symbol: symbol || "—",
    lastPrice,
    change24h,
    volume24h: parseNumber(ctx?.dayNtlVlm ?? ctx?.volume ?? ctx?.vol24h ?? ctx?.dayVolume),
    openInterest: parseNumber(ctx?.openInterest ?? ctx?.openInterestUsd ?? ctx?.oi),
  };
}

async function fetchHip3Assets() {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs", dex: "xyz" }),
  });

  if (!res.ok) {
    throw new Error(`Hyperliquid responded with ${res.status}`);
  }

  const txt = await res.text();
  let data;
  try {
    data = JSON.parse(txt);
  } catch (e) {
    throw new Error("Invalid JSON from Hyperliquid (hip3).\n" + txt.slice(0, 300));
  }

  const meta = Array.isArray(data?.[0]?.universe)
    ? data?.[0]?.universe
    : Array.isArray(data)
      ? data
      : data?.universe || [];
  const contexts = Array.isArray(data?.[1]) ? data?.[1] : Array.isArray(data?.assetCtxs) ? data.assetCtxs : [];

  const combined = meta.map((entry, index) => ({ entry, ctx: contexts[index] || {} }));

  const xyzEntries = combined.filter(({ entry }) => {
    const dex = String(entry?.dex || entry?.dexName || entry?.source || "").toLowerCase();
    if (dex === "xyz") return true;
    const symbols = [entry?.symbol, entry?.name, entry?.ticker, entry?.token?.symbol];
    return symbols.some((value) => typeof value === "string" && value.toLowerCase().startsWith("xyz:"));
  });

  const hip3Entries = xyzEntries.filter(({ entry }) => isHip3Entry(entry));
  if (hip3Entries.length === 0) {
    throw new Error("No HIP3 assets found in live response");
  }

  return hip3Entries.map(({ entry, ctx }) => normalizeHip3Entry(entry, ctx));
}

export default function Hip3Table() {
  const [rows, setRows] = useState(FALLBACK_HIP3_ROWS);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const live = await fetchHip3Assets();
        if (!mounted) return;
        setRows(live);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        const reason = String(e?.message || e || "unknown error");
        setRows(FALLBACK_HIP3_ROWS);
        setError(`Unable to load live HIP3 assets (${reason}). Displaying sample data instead.`);
      }
    }

    run();
    const id = setInterval(run, 5 * 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (!q) return true;
        return String(row.symbol || "").toLowerCase().includes(q);
      })
      .sort((a, b) => String(a.symbol || "").localeCompare(String(b.symbol || "")));
  }, [rows, query]);

  return (
    <TableShell
      title="HIP3 assets"
      rightExtra={
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search asset..."
          className="bg-[#0f1b38] border border-blue-900 rounded-lg px-3 py-1.5 text-sm text-blue-100 outline-none"
        />
      }
    >
      {error && <div className="px-5 py-3 text-red-300 text-sm">{error}</div>}

      <table className="min-w-full text-sm text-blue-50">
        <thead className="bg-[#111a2e]">
          <tr>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Asset</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Last price</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">24h Change</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Volume</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Open Interest</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => {
            const change = row.change24h;
            const changeLabel =
              change != null && Number.isFinite(change) ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "—";
            return (
              <tr key={row.symbol} className="border-t border-blue-900 hover:bg-[#15213a]">
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  <div className="flex items-center gap-2">
                    <TokenLogo base={row.symbol !== "—" ? row.symbol : undefined} />
                    {row.symbol !== "—" ? (
                      <a
                        className="text-blue-200 hover:text-cyan-300"
                        href={`https://app.hyperliquid.xyz/spot/${row.symbol}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.symbol}
                      </a>
                    ) : (
                      <span className="text-blue-200">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  {row.lastPrice != null ? row.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  <span className={change == null ? "" : change >= 0 ? "text-green-300" : "text-red-300"}>
                    {changeLabel}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  {row.volume24h != null ? row.volume24h.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  {row.openInterest != null ? row.openInterest.toLocaleString() : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}
