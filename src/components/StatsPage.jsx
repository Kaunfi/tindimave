import React, { useMemo, useState } from "react";
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

function DailyAverageChart({ history }) {
  const series = useMemo(() => buildDailyAverageSeries(history), [history]);
  const hasSeries = series.length > 0;
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const apyValues = series.map((point) => point.apy);
  const minApy = Math.min(0, ...apyValues);
  const maxApy = Math.max(0, ...apyValues);
  const range = maxApy - minApy || 1;
  const viewWidth = 520;
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
    <div className="flex h-full flex-col rounded-2xl border border-blue-900 bg-[#0b1120] p-6 shadow-[0_20px_45px_rgba(15,36,84,0.35)]">
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
function formatPercent(value, multiplier = 1, fractionDigits = 2) {
  if (!Number.isFinite(value)) return "—";
  return `${(value * multiplier).toFixed(fractionDigits)}%`;
}

export default function StatsPage({ history = [] }) {
  return (
    <div className="max-w-4xl">
      <DailyAverageChart history={history} />
    </div>
  );
}
