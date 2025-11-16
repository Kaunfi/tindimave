import React, { useMemo, useState } from "react";
import TableShell from "./TableShell.jsx";
import TokenLogo from "./TokenLogo.jsx";
import { isAllowedBase } from "../constants/allowedBases.js";

export default function FundingTable({ data }) {
  const { rows = [], spotSet, error } = data ?? {};
  const [sort, setSort] = useState({ key: "apy", direction: "desc" });

  const filtered = useMemo(() => {
    const base = [...rows]
      .filter((r) => Number.isFinite(r.apy))
      .filter((r) => isAllowedBase(r.base));
    const dir = sort.direction === "asc" ? 1 : -1;
    base.sort((a, b) => {
      const A = a[sort.key];
      const B = b[sort.key];
      if (typeof A === "number" && typeof B === "number") return (A - B) * dir;
      return String(A).localeCompare(String(B)) * dir;
    });
    return base;
  }, [rows, sort, spotSet]);

  const Th = ({ k, children }) => (
    <th
      className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200 select-none cursor-pointer"
      onClick={() =>
        setSort((s) =>
          s.key === k ? { key: k, direction: s.direction === "asc" ? "desc" : "asc" } : { key: k, direction: "asc" }
        )
      }
    >
      <span className="inline-flex items-center gap-2">
        {children}
        <span className="text-[10px] opacity-60">{sort.key === k ? (sort.direction === "asc" ? "▲" : "▼") : "•"}</span>
      </span>
    </th>
  );

  return (
    <TableShell title="Funding rates">
      {error && <div className="px-5 py-3 text-red-300 text-sm">{error}</div>}

      <table className="min-w-full text-sm text-blue-50">
        <thead className="bg-[#111a2e]">
          <tr>
            <Th k="pair">Pair</Th>
            <Th k="apy">APY</Th>
            <Th k="score">Score / 10</Th>
            <Th k="funding">Funding</Th>
            <Th k="hedge">Hedge</Th>
            <Th k="vol24h">24H Volume</Th>
            <Th k="oi">Open Interest</Th>
            <Th k="premium">Premium</Th>
            <Th k="leverage">Max Lev</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const signClass =
              r.funding < 0 ? "text-green-300" : r.funding > 0 ? "text-red-300" : "text-blue-200";
            const showSpotBadge = spotSet instanceof Set && spotSet.size > 0 && spotSet.has(r.base);

            return (
              <tr key={r.pair} className="border-t border-blue-900 hover:bg-[#15213a]">
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                  <div className="flex items-center gap-2">
                    <TokenLogo base={r.base} />
                    <a
                      className="text-blue-200 hover:text-cyan-300"
                      href={`https://app.hyperliquid.xyz/trade/${r.base}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.pair}
                    </a>
                    {showSpotBadge && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide text-blue-300 bg-blue-900/60 border border-blue-700 rounded px-1.5 py-0.5"
                      >
                        Spot
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-blue-100">{r.apy.toFixed(2)}%</td>
                <td className="px-4 py-3 whitespace-nowrap">{Number.isFinite(r.score) ? r.score.toFixed(2) : "—"}</td>
                <td className={`px-4 py-3 whitespace-nowrap ${signClass}`}>{(r.funding * 100).toFixed(6)}%</td>
                <td className={`px-4 py-3 whitespace-nowrap ${signClass}`}>{r.hedge}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.vol24h.toLocaleString()}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.oi.toLocaleString()}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.premium.toFixed(6)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.leverage ? `${r.leverage}x` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}