import React, { useEffect, useMemo, useRef, useState } from "react";
import TableShell from "./TableShell.jsx";

const SESSION_SCHEDULE_UTC = [
  { hours: 0, minutes: 10 },
  { hours: 8, minutes: 10 },
  { hours: 16, minutes: 10 },
];

function formatCurrency(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStrategyApy(entry) {
  const strategyApy = entry?.strategy?.apy;
  if (Number.isFinite(strategyApy)) return Math.max(strategyApy, 0);
  const fundingApy = entry?.funding?.avgApy;
  return Number.isFinite(fundingApy) ? Math.max(fundingApy, 0) : null;
}

function buildDailyAverageSeries(history) {
  if (!Array.isArray(history)) return [];
  const buckets = new Map();

  history.forEach((entry) => {
    const timestamp = entry?.timestamp;
    if (!timestamp) return;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return;
    const apy = getStrategyApy(entry);
    if (!Number.isFinite(apy)) return;

    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { total: 0, count: 0, date };
    bucket.total += apy;
    bucket.count += 1;
    buckets.set(key, bucket);
  });

  return [...buckets.entries()]
    .map(([key, bucket]) => ({
      key,
      date: bucket.date,
      apy: bucket.count > 0 ? bucket.total / bucket.count : null,
    }))
    .filter((item) => Number.isFinite(item.apy))
    .sort((a, b) => a.date - b.date);
}

function formatDayLabel(date) {
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" }).format(date);
}

function useResponsiveChartWidth(defaultWidth = 520) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const updateWidth = () => {
      const nextWidth = containerRef.current?.clientWidth;
      if (nextWidth) {
        setWidth(Math.max(nextWidth, defaultWidth));
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [defaultWidth]);

  return [containerRef, width];
}

function BalanceTimelineChart({ series, error }) {
  const [chartRef, viewWidth] = useResponsiveChartWidth();
  const hasSeries = series.length > 0;
  const balances = series.map((point) => point.balance);
  const minBalance = Math.min(...balances, 0);
  const maxBalance = Math.max(...balances, 0);
  const range = maxBalance - minBalance || 1;
  const viewHeight = 240;
  const paddingX = 40;
  const paddingY = 28;

  const points = series.map((point, index) => {
    const x =
      series.length === 1
        ? viewWidth / 2
        : paddingX + (index / (series.length - 1)) * (viewWidth - paddingX * 2);
    const normalizedY = (point.balance - minBalance) / range;
    const y = viewHeight - paddingY - normalizedY * (viewHeight - paddingY * 2);
    return { ...point, x, y };
  });

  const pathD = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => minBalance + (i / (yTicks - 1)) * range);
  const xTickStep = Math.max(1, Math.ceil(points.length / 5));
  const xTickPoints = points.filter((_, index) => index % xTickStep === 0 || index === points.length - 1);

  return (
    <div
      ref={chartRef}
      className="flex h-full flex-col rounded-2xl border border-blue-900 bg-[#0b1120] p-6 shadow-[0_20px_45px_rgba(15,36,84,0.35)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-400/80">Daily evolution</p>
          <h3 className="mt-2 text-xl font-semibold text-blue-50">Balance</h3>
          {error && <p className="mt-1 text-xs text-amber-300/90">{error}</p>}
        </div>
      </div>

      <div className="relative mt-6 flex-1 overflow-hidden rounded-xl border border-blue-800/70 bg-[#081324] min-h-[18rem]">
        {hasSeries ? (
          <div className="relative z-10 flex h-full flex-col justify-between p-4">
            <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="h-48 w-full text-cyan-400">
              <defs>
                <linearGradient id="balance-line" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(56,189,248,1)" />
                  <stop offset="100%" stopColor="rgba(14,165,233,0.6)" />
                </linearGradient>
              </defs>

              <line
                x1={paddingX}
                y1={paddingY}
                x2={paddingX}
                y2={viewHeight - paddingY}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <line
                x1={paddingX}
                y1={viewHeight - paddingY}
                x2={viewWidth - paddingX}
                y2={viewHeight - paddingY}
                stroke="#1e293b"
                strokeWidth="1"
              />

              {yTickValues.map((value) => {
                const normalized = (value - minBalance) / range;
                const y = viewHeight - paddingY - normalized * (viewHeight - paddingY * 2);
                return (
                  <g key={value}>
                    <line x1={paddingX - 6} x2={paddingX} y1={y} y2={y} stroke="#1e293b" strokeWidth="1" />
                    <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#cbd5e1">
                      {formatCurrency(value)}
                    </text>
                  </g>
                );
              })}

              {xTickPoints.map((point) => (
                <g key={point.key}>
                  <line
                    x1={point.x}
                    x2={point.x}
                    y1={viewHeight - paddingY}
                    y2={viewHeight - paddingY + 6}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text x={point.x} y={viewHeight - paddingY + 18} textAnchor="middle" fontSize="10" fill="#cbd5e1">
                    {formatDayLabel(point.date)}
                  </text>
                </g>
              ))}

              <path d={pathD} fill="none" stroke="url(#balance-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point) => (
                <g key={point.key}>
                  <circle cx={point.x} cy={point.y} r={5} fill="#22d3ee" stroke="#0f172a" strokeWidth="2" />
                  <text x={point.x} y={point.y - 12} textAnchor="middle" fontSize="10" fill="#e0f2fe">
                    {formatCurrency(point.balance)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div className="relative z-10 flex h-full items-center justify-center px-6 text-center text-sm text-blue-200">
            <p className="text-blue-200/80">Balance history will appear once the sub-account has reported at least one day of activity.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DailyAverageChart({ history }) {
  const [chartRef, viewWidth] = useResponsiveChartWidth();
  const series = useMemo(() => buildDailyAverageSeries(history), [history]);
  const hasSeries = series.length > 0;
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const apyValues = series.map((point) => point.apy);
  const minApy = Math.min(0, ...apyValues);
  const maxApy = Math.max(0, ...apyValues);
  const range = maxApy - minApy || 1;
  const viewHeight = 240;
  const paddingX = 40;
  const paddingY = 28;

  const points = series.map((point, index) => {
    const x =
      series.length === 1
        ? viewWidth / 2
        : paddingX + (index / (series.length - 1)) * (viewWidth - paddingX * 2);
    const normalizedY = (point.apy - minApy) / range;
    const y = viewHeight - paddingY - normalizedY * (viewHeight - paddingY * 2);
    return { ...point, x, y };
  });

  const pathD = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => minApy + (i / (yTicks - 1)) * range);
  const xTickStep = Math.max(1, Math.ceil(points.length / 5));
  const xTickPoints = points.filter((_, index) => index % xTickStep === 0 || index === points.length - 1);

  return (
    <div
      ref={chartRef}
      className="flex h-full flex-col rounded-2xl border border-blue-900 bg-[#0b1120] p-6 shadow-[0_20px_45px_rgba(15,36,84,0.35)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-400/80">Daily average</p>
          <h3 className="mt-2 text-xl font-semibold text-blue-50">Average APY</h3>
        </div>
      </div>

      <div className="relative mt-6 flex-1 overflow-hidden rounded-xl border border-blue-800/70 bg-[#081324]">
        {hasSeries ? (
          <div className="relative z-10 flex h-full flex-col p-4">
            <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="h-48 w-full text-cyan-400">
              <defs>
                <linearGradient id="daily-avg-line" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(56,189,248,0.9)" />
                  <stop offset="100%" stopColor="rgba(14,165,233,0.3)" />
                </linearGradient>
              </defs>

              <line
                x1={paddingX}
                y1={paddingY}
                x2={paddingX}
                y2={viewHeight - paddingY}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <line
                x1={paddingX}
                y1={viewHeight - paddingY}
                x2={viewWidth - paddingX}
                y2={viewHeight - paddingY}
                stroke="#1e293b"
                strokeWidth="1"
              />

              {yTickValues.map((value) => {
                const normalized = (value - minApy) / range;
                const y = viewHeight - paddingY - normalized * (viewHeight - paddingY * 2);
                return (
                  <g key={value}>
                    <line x1={paddingX - 6} x2={paddingX} y1={y} y2={y} stroke="#1e293b" strokeWidth="1" />
                    <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#cbd5e1">
                      {formatPercent(value)}
                    </text>
                  </g>
                );
              })}

              {xTickPoints.map((point) => (
                <g key={point.key}>
                  <line
                    x1={point.x}
                    x2={point.x}
                    y1={viewHeight - paddingY}
                    y2={viewHeight - paddingY + 6}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text x={point.x} y={viewHeight - paddingY + 18} textAnchor="middle" fontSize="10" fill="#cbd5e1">
                    {formatDayLabel(point.date)}
                  </text>
                </g>
              ))}

              <path d={pathD} fill="none" stroke="url(#daily-avg-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point) => (
                <circle
                  key={point.key}
                  cx={point.x}
                  cy={point.y}
                  r={5}
                  fill="#22d3ee"
                  stroke="#0f172a"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-cyan-400/40 bg-slate-900/90 px-3 py-2 text-xs text-blue-100 shadow-lg backdrop-blur"
                style={{
                  left: `${(hoveredPoint.x / viewWidth) * 100}%`,
                  top: `${(hoveredPoint.y / viewHeight) * 100}%`,
                }}
              >
                <div className="font-semibold text-cyan-200">{formatPercent(hoveredPoint.apy)}</div>
                <div className="text-[11px] text-blue-200/80">{formatDayLabel(hoveredPoint.date)}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative z-10 flex h-full items-center justify-center px-6 text-center text-sm text-blue-200">
            <p className="text-blue-200/80">Enregistrez des sessions pour voir la moyenne quotidienne de l'APY de la stratégie Nihr.</p>
          </div>
        )}
      </div>
    </div>
  );
}
function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPercent(value, multiplier = 1, fractionDigits = 2) {
  if (!Number.isFinite(value)) return "—";
  return `${(value * multiplier).toFixed(fractionDigits)}%`;
}

function getSessionWindow(value) {
  const reference = new Date(value);
  if (Number.isNaN(reference.getTime())) {
    return { start: null, end: null };
  }

  let end = null;
  let endScheduleIndex = -1;

  for (let i = SESSION_SCHEDULE_UTC.length - 1; i >= 0; i -= 1) {
    const { hours, minutes } = SESSION_SCHEDULE_UTC[i];
    const candidate = new Date(
      Date.UTC(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        reference.getUTCDate(),
        hours,
        minutes,
        0,
        0
      )
    );

    if (candidate <= reference) {
      end = candidate;
      endScheduleIndex = i;
      break;
    }
  }

  if (!end) {
    const { hours, minutes } = SESSION_SCHEDULE_UTC[SESSION_SCHEDULE_UTC.length - 1];
    end = new Date(
      Date.UTC(
        reference.getUTCFullYear(),
        reference.getUTCMonth(),
        reference.getUTCDate() - 1,
        hours,
        minutes,
        0,
        0
      )
    );
    endScheduleIndex = SESSION_SCHEDULE_UTC.length - 1;
  }

  const startIndex = (endScheduleIndex - 1 + SESSION_SCHEDULE_UTC.length) % SESSION_SCHEDULE_UTC.length;
  const start = new Date(end.getTime());
  const { hours: startHours, minutes: startMinutes } = SESSION_SCHEDULE_UTC[startIndex];
  start.setUTCHours(startHours, startMinutes, 0, 0);

  if (start >= end) {
    start.setUTCDate(start.getUTCDate() - 1);
  }

  return { start, end };
}

export default function StatsPage({ history = [], balanceHistory = [], balanceError = null }) {
  const hasHistory = Array.isArray(history) && history.length > 0;
  const balanceSeries = useMemo(() => {
    return balanceHistory
      .filter((entry) => Number.isFinite(entry?.balance))
      .map((entry) => ({
        ...entry,
        date: entry.date instanceof Date ? entry.date : new Date(entry.date),
      }))
      .filter((entry) => !Number.isNaN(entry.date.getTime()))
      .sort((a, b) => a.date - b.date);
  }, [balanceHistory]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <BalanceTimelineChart series={balanceSeries} error={balanceError} />
        <DailyAverageChart history={history} />
      </div>

      <TableShell
        title="Session history"
        footerRight={
          hasHistory
            ? `Showing ${history.length} entr${history.length === 1 ? "y" : "ies"} stored locally`
            : null
        }
      >
        <table className="min-w-full text-sm text-blue-50">
          <thead className="bg-[#111a2e] text-xs uppercase tracking-wider text-blue-200">
            <tr>
              <th className="px-4 py-3 text-left">Date &amp; heure de début</th>
              <th className="px-4 py-3 text-left">Date &amp; heure de fin</th>
              <th className="px-4 py-3 text-left">Average APY</th>
            </tr>
          </thead>
          <tbody>
            {hasHistory ? (
              history.map((entry) => {
                const { timestamp, funding = {} } = entry || {};
                const { start, end } = getSessionWindow(timestamp);
                const strategyApy = getStrategyApy(entry);
                return (
                  <tr key={timestamp} className="border-t border-blue-900 hover:bg-[#15213a]">
                    <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                      {formatTimestamp(start)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-blue-100">
                      {formatTimestamp(end)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatPercent(strategyApy)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-4 text-center text-blue-200" colSpan={3}>
                  No sessions recorded yet. Run the dashboard to capture session data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
