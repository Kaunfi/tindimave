import React, { useEffect, useMemo, useState } from "react";
import TableShell from "./TableShell.jsx";
import TokenLogo from "./TokenLogo.jsx";
import {
  ensureTokenSymbol,
  formatPairLabel,
  quoteKeyFromPairName,
  tokenKeyFromPairName,
} from "./tokenUtils.js";

const API = "https://api.hyperliquid.xyz/info";

const FALLBACK_SPOT_ROWS = [
  {
    pair: "BTC-USD",
    base: "BTC",
    quote: "USD",
    minProvideSize: 0.0001,
    makerFeeBps: 2,
    takerFeeBps: 5,
  },
  {
    pair: "ETH-USD",
    base: "ETH",
    quote: "USD",
    minProvideSize: 0.001,
    makerFeeBps: 2,
    takerFeeBps: 5,
  },
  {
    pair: "SOL-USD",
    base: "SOL",
    quote: "USD",
    minProvideSize: 0.01,
    makerFeeBps: 2,
    takerFeeBps: 5,
  },
];

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchSpotMeta() {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "spotMeta" }),
  });
  if (!res.ok) {
    throw new Error(`Hyperliquid responded with ${res.status}`);
  }
  const txt = await res.text();
  let data;
  try {
    data = JSON.parse(txt);
  } catch (e) {
    throw new Error("Invalid JSON from Hyperliquid (spot).\n" + txt.slice(0, 300));
  }
  const list = Array.isArray(data) ? data : data?.universe || [];

  return list.map((entry) => {
    const rawName = entry?.symbol || entry?.name || "";
    const baseCandidate = ensureTokenSymbol(
      tokenKeyFromPairName(rawName),
      tokenKeyFromPairName(entry?.name),
      entry?.tokens?.baseSymbol,
      entry?.tokens?.baseTicker,
      entry?.tokens?.base,
      entry?.tokens?.baseToken?.symbol,
      entry?.base,
      entry?.baseSymbol
    );
    const quoteCandidate = ensureTokenSymbol(
      quoteKeyFromPairName(rawName),
      quoteKeyFromPairName(entry?.name),
      entry?.tokens?.quoteSymbol,
      entry?.tokens?.quoteTicker,
      entry?.tokens?.quote,
      entry?.tokens?.quoteToken?.symbol,
      entry?.quote,
      entry?.quoteSymbol
    );
    const base = ensureTokenSymbol(baseCandidate, tokenKeyFromPairName(rawName));
    const quote = ensureTokenSymbol(quoteCandidate, quoteKeyFromPairName(rawName));
    const pairLabel = formatPairLabel(rawName, base, quote);
    return {
      pair: pairLabel || (base && quote ? `${base}/${quote}` : rawName) || "—",
      base,
      quote,
      minProvideSize:
        parseNumber(entry?.minProvideSize ?? entry?.minProvide ?? entry?.minSize ?? entry?.minProvideAmt) ?? null,
      makerFeeBps:
        parseNumber(entry?.makerFeeBps ?? entry?.makerFee ?? entry?.makerFeeRate ?? entry?.maker) ?? null,
      takerFeeBps:
        parseNumber(entry?.takerFeeBps ?? entry?.takerFee ?? entry?.takerFeeRate ?? entry?.taker) ?? null,
    };
  });
}

export function useSpotData() {
  const [rows, setRows] = useState(FALLBACK_SPOT_ROWS);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const live = await fetchSpotMeta();
        if (!mounted) return;
        setRows(live);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        const reason = String(e?.message || e || "unknown error");
        setRows(FALLBACK_SPOT_ROWS);
        setError(`Unable to load live spot data (${reason}). Displaying sample data instead.`);
      }
    }

    run();
    const id = setInterval(run, 5 * 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return { rows, error };
}

export default function SpotTable() {
  const { rows, error } = useSpotData();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...rows]
      .filter((row) => {
        const base = String(row.base || "").toLowerCase();
        const pair = String(row.pair || "").toLowerCase();
        const quote = String(row.quote || "").toLowerCase();
        if (!query) return true;
        return base.includes(query) || pair.includes(query) || quote.includes(query);
      })
      .sort((a, b) => String(a.base || "").localeCompare(String(b.base || "")));
  }, [rows, q]);

  return (
    <TableShell
      title="Spot markets"
      rightExtra={
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
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
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Pair</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Min provide</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Maker fee (bps)</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Taker fee (bps)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => {
            const pairLabel = formatPairLabel(row.pair, row.base, row.quote);
            const minProvide = row.minProvideSize;
            const makerFee = row.makerFeeBps;
            const takerFee = row.takerFeeBps;
            const hasBase = Boolean(row.base);

            return (
              <tr key={`${row.pair}-${row.base}`} className="border-t border-blue-900 hover:bg-[#15213a]">
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  <div className="flex items-center gap-2">
                    <TokenLogo base={hasBase ? row.base : undefined} />
                    {hasBase ? (
                      <a
                        className="text-blue-200 hover:text-cyan-300"
                        href={`https://app.hyperliquid.xyz/spot/${row.base}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.base}
                      </a>
                    ) : (
                      <span className="text-blue-200">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">{pairLabel}</td>
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  {minProvide != null ? minProvide.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  {makerFee != null ? makerFee.toFixed(2) : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  {takerFee != null ? takerFee.toFixed(2) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}
