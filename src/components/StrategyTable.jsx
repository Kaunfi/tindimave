import React, { useEffect, useMemo, useRef, useState } from "react";
import TableShell from "./TableShell.jsx";
import TokenLogo from "./TokenLogo.jsx";
import {
  alignToStrategySchedule,
  formatDateTime,
  formatLeverage,
  formatPercent,
  selectBestStrategy,
} from "../utils/strategy.js";

export default function StrategyTable({ data, strategy }) {
  const { rows = [], updatedAt } = data ?? {};
  const [lastStrategyUpdate, setLastStrategyUpdate] = useState(null);
  const strategyKeyRef = useRef(null);

  const best = useMemo(() => strategy ?? selectBestStrategy(rows), [rows, strategy]);

  const strategyRowsWithAllocation = useMemo(() => {
    if (!best) return [];
    return [{ ...best, allocation: 1 }];
  }, [best]);

  useEffect(() => {
    const key = best ? `${best.base}|${best.direction}` : null;
    const alignedFromData = alignToStrategySchedule(updatedAt);

    const nextAligned = alignedFromData ?? (best ? alignToStrategySchedule(new Date()) : null);

    const updateState = (value) => {
      if (!value) {
        if (lastStrategyUpdate) {
          setLastStrategyUpdate(null);
        }
        return;
      }

      if (!lastStrategyUpdate || lastStrategyUpdate.getTime() !== value.getTime()) {
        setLastStrategyUpdate(value);
      }
    };

    if (!best) {
      strategyKeyRef.current = null;
      updateState(alignedFromData);
      return;
    }

    if (strategyKeyRef.current !== key) {
      strategyKeyRef.current = key;
      updateState(nextAligned);
      return;
    }

    updateState(nextAligned);
  }, [best, updatedAt, lastStrategyUpdate]);

  const displayedUpdate = useMemo(() => {
    if (lastStrategyUpdate) return lastStrategyUpdate;
    return alignToStrategySchedule(updatedAt);
  }, [lastStrategyUpdate, updatedAt]);

  return (
    <TableShell
      title="Tindimave Strategy"
      rightExtra={
        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]">
          {best ? formatPercent(best.apy) : "—"}
        </div>
      }
      footerRight={<span>Last update : {formatDateTime(displayedUpdate)}</span>}
    >
      <table className="min-w-full text-sm text-blue-50">
        <thead className="bg-[#111a2e]">
          <tr>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Pair</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Funding APY</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Score / 10</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">LEV</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Position</th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-blue-200">Allocation</th>
          </tr>
        </thead>
        <tbody>
          {strategyRowsWithAllocation.length > 0 ? (
            strategyRowsWithAllocation.map((row) => {
              const isBest =
                best && row.base === best.base && row.direction === best.direction && row.pair === best.pair;
              const allocationPercent = row.allocation * 100;

              return (
                <tr
                  key={row.pair}
                  className={`border-t border-blue-900 hover:bg-[#15213a] ${
                    isBest ? "bg-blue-900/20" : ""
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                    <div className="flex items-center gap-2">
                      <TokenLogo base={row.base} />
                      <span>{row.pair}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-blue-200">{formatPercent(row.apy)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-blue-200">
                    {Number.isFinite(row.score) ? row.score.toFixed(2) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-blue-200">{formatLeverage(row.leverage)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-blue-200">{row.direction}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-blue-900/50">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                          style={{ width: `${Math.max(0, Math.min(100, allocationPercent))}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-blue-100">
                        {formatPercent(allocationPercent, 1)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="px-4 py-6 text-center text-blue-300" colSpan={6}>
                Waiting for live funding data…
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </TableShell>
  );
}
