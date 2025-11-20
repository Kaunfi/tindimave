import React, { useEffect, useMemo, useState } from "react";
import TableShell from "./TableShell.jsx";
import TokenLogo from "./TokenLogo.jsx";
import { ensureTokenSymbol } from "./tokenUtils.js";

const API = "https://api.hyperliquid.xyz/info";

const FALLBACK_HIP3_ROWS = [
  {
    symbol: "HLP",
    name: "Hyperliquid LP Token",
    chain: "Hyperliquid",
    decimals: 18,
    description: "Sample HIP3 vault token representing liquidity provision on Hyperliquid.",
  },
  {
    symbol: "USDe",
    name: "Example Restaked USD",
    chain: "Ethereum",
    decimals: 18,
    description: "Illustrative HIP3 restaked stablecoin used when live data is unavailable.",
  },
  {
    symbol: "stSOL",
    name: "Example Staked SOL",
    chain: "Solana",
    decimals: 9,
    description: "Placeholder HIP3 asset entry for demonstration purposes.",
  },
];

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

function normalizeHip3Entry(entry) {
  const symbol = ensureTokenSymbol(
    entry?.symbol,
    entry?.name,
    entry?.ticker,
    entry?.pfSym,
    entry?.pf_sym,
    entry?.coin,
    entry?.token?.symbol,
    entry?.token?.ticker
  );

  const decimals =
    parseNumber(entry?.decimals ?? entry?.token?.decimals ?? entry?.token?.tokenDecimals) ?? null;

  return {
    symbol: symbol || "—",
    name: entry?.name || entry?.token?.name || "—",
    chain: entry?.chain || entry?.network || entry?.nativeNetwork || entry?.token?.chain || "—",
    decimals,
    description: entry?.description || entry?.token?.description || entry?.note || "—",
  };
}

async function fetchHip3Assets() {
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
    throw new Error("Invalid JSON from Hyperliquid (hip3).\n" + txt.slice(0, 300));
  }

  const list = Array.isArray(data) ? data : data?.universe || [];
  const hip3Entries = list.filter(isHip3Entry);
  if (hip3Entries.length === 0) {
    throw new Error("No HIP3 assets found in live response");
  }

  return hip3Entries.map(normalizeHip3Entry);
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
        return (
          String(row.symbol || "").toLowerCase().includes(q) ||
          String(row.name || "").toLowerCase().includes(q) ||
          String(row.chain || "").toLowerCase().includes(q)
        );
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
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Name</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Chain</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Decimals</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Description</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={`${row.symbol}-${row.chain}-${row.name}`} className="border-t border-blue-900 hover:bg-[#15213a]">
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
              <td className="px-4 py-3 whitespace-nowrap text-blue-100">{row.name || "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap text-blue-100">{row.chain || "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                {row.decimals != null ? row.decimals : "—"}
              </td>
              <td className="px-4 py-3 text-blue-100">{row.description || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}
