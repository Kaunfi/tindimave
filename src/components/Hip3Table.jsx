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

const STARTING_BALANCE = 10_000;

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

function scoreAsset(row) {
  const change = Number.isFinite(row?.change24h) ? row.change24h : null;
  const volume = Number.isFinite(row?.volume24h) ? row.volume24h : null;
  if (change == null || volume == null) return null;
  const stabilityWeight = Math.log10(volume + 10);
  const momentum = Math.abs(change);
  return momentum * stabilityWeight;
}

function buildStrategy(rows) {
  const scored = rows
    .map((row) => ({
      row,
      score: scoreAsset(row),
    }))
    .filter((item) => item.score != null);

  const longCandidate = scored
    .filter(({ row }) => row.change24h > 0)
    .sort((a, b) => b.score - a.score)[0];

  const shortCandidate = scored
    .filter(({ row }) => row.change24h < 0)
    .sort((a, b) => b.score - a.score)[0];

  const pickLong = longCandidate?.score || -Infinity;
  const pickShort = shortCandidate?.score || -Infinity;

  const selected = pickLong >= pickShort ? longCandidate : shortCandidate;

  if (!selected) {
    return {
      headline: "En attente de données fiables",
      description: "La stratégie se mettra à jour dès que des mouvements cohérents seront détectés.",
      direction: null,
      asset: null,
      projectedPnlPct: 0,
      updatedAt: new Date(),
    };
  }

  const { row } = selected;
  const direction = row.change24h >= 0 ? "Long" : "Short";
  const riskBuffer = 0.35;
  const projectedPnlPct = (direction === "Long" ? row.change24h : -row.change24h) * riskBuffer;

  return {
    headline: `${direction} ${row.symbol}`,
    description:
      direction === "Long"
        ? "Momentum positif avec volume soutenu, allocation progressive pour rester prudent."
        : "Pression vendeuse marquée, position courte prudente avec taille réduite.",
    direction,
    asset: row.symbol,
    projectedPnlPct,
    updatedAt: new Date(),
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
  const [strategy, setStrategy] = useState(() => buildStrategy(FALLBACK_HIP3_ROWS));

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const live = await fetchHip3Assets();
        if (!mounted) return;
        setRows(live);
        setStrategy(buildStrategy(live));
        setError(null);
      } catch (e) {
        if (!mounted) return;
        const reason = String(e?.message || e || "unknown error");
        setRows(FALLBACK_HIP3_ROWS);
        setStrategy(buildStrategy(FALLBACK_HIP3_ROWS));
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

  useEffect(() => {
    setStrategy(buildStrategy(rows));
  }, [rows]);

  useEffect(() => {
    const id = setInterval(() => {
      setStrategy(buildStrategy(rows));
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (!q) return true;
        return String(row.symbol || "").toLowerCase().includes(q);
      })
      .sort((a, b) => String(a.symbol || "").localeCompare(String(b.symbol || "")));
  }, [rows, query]);

  const simulatedBalance = useMemo(() => {
    const pnlPct = Number.isFinite(strategy?.projectedPnlPct) ? strategy.projectedPnlPct : 0;
    const balance = STARTING_BALANCE * (1 + pnlPct / 100);
    return { balance, pnlPct };
  }, [strategy]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-blue-900/70 bg-[#0c152d] p-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-200">Stratégie</h3>
            <span className="text-[11px] text-blue-300/70">
              Refresh auto 5 min
            </span>
          </div>
          <div className="mt-3 text-lg font-semibold text-blue-50">{strategy.headline}</div>
          <p className="mt-2 text-sm text-blue-200/80">{strategy.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-blue-200/80">
            <span className="rounded-full bg-blue-900/60 px-3 py-1">Profil: sécurisé</span>
            {strategy.asset && (
              <span className="rounded-full bg-blue-900/60 px-3 py-1">Actif pivot: {strategy.asset}</span>
            )}
            <span className="rounded-full bg-blue-900/60 px-3 py-1">
              Dernière analyse: {strategy.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-blue-900/70 bg-[#0c152d] p-4 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-200">Portefeuille</h3>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-300/80">Balance simulée</p>
              <p className="text-2xl font-semibold text-blue-50">
                {simulatedBalance.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} $
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-blue-300/80">PNL</p>
              <p
                className={`text-xl font-semibold ${
                  simulatedBalance.pnlPct >= 0 ? "text-green-300" : "text-red-300"
                }`}
              >
                {simulatedBalance.pnlPct >= 0 ? "+" : ""}
                {simulatedBalance.pnlPct.toFixed(2)}%
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-blue-200/70">
            Hypothèse: départ à {STARTING_BALANCE.toLocaleString()} $, ajusté selon la variation projetée de la stratégie en mode low-risk.
          </p>
        </div>
      </div>

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
    </div>
  );
}
