import React, { useEffect, useMemo, useState } from "react";
import NihrLogo from "./components/NihrLogo.jsx";
import StrategyTable from "./components/StrategyTable.jsx";
import StrategyActionPanel from "./components/StrategyActionPanel.jsx";
import FundingTable from "./components/FundingTable.jsx";
import StatsPage from "./components/StatsPage.jsx";
import Hip3Table from "./components/Hip3Table.jsx";
import { useFundingData } from "./hooks/useFundingData.js";
import { useSubaccountMetrics } from "./hooks/useSubaccountMetrics.js";
import { useSpotData } from "./components/SpotTable.jsx";
import { aggregateFundingStats, aggregateSpotStats } from "./utils/stats.js";
import { selectBestStrategy } from "./utils/strategy.js";

const DashboardIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="3.75" y="3.75" width="7.5" height="7.5" rx="1.25" />
    <rect x="12.75" y="3.75" width="7.5" height="5.5" rx="1.25" />
    <rect x="12.75" y="10.75" width="7.5" height="9.5" rx="1.25" />
    <rect x="3.75" y="13.75" width="7.5" height="6.5" rx="1.25" />
  </svg>
);

const StatsIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M4 19.5h16" strokeLinecap="round" />
    <path d="M8 19.5V10.25a1.25 1.25 0 0 1 2.5 0V19.5" />
    <path d="M13.75 19.5V6.75a1.25 1.25 0 0 1 2.5 0V19.5" />
    <path d="M5.75 19.5V13.75a1.25 1.25 0 0 1 2.5 0V19.5" />
    <path d="M16.75 19.5V11.25a1.25 1.25 0 0 1 2.5 0V19.5" />
  </svg>
);

const Hip3Icon = ({ className = "h-5 w-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M12 3.5 4.75 7.25 12 11l7.25-3.75L12 3.5Z" />
    <path d="m4.75 12.25 7.25 3.75 7.25-3.75" />
    <path d="M4.75 9.5v7.25L12 20.5l7.25-3.75V9.5" />
  </svg>
);

const HISTORY_STORAGE_KEY = "nihr.sessionHistory.v2";
const LEGACY_HISTORY_KEYS = ["nihr.sessionHistory"];
const MAX_HISTORY_ENTRIES = 180;
const NAV_ITEMS = [
  { key: "app", label: "App", icon: DashboardIcon, path: "/app" },
  { key: "hip3", label: "HIP3", icon: Hip3Icon, path: "/hip3" },
  { key: "stats", label: "Stats", icon: StatsIcon, path: "/stats" },
];

function resolveTabFromLocation() {
  if (typeof window === "undefined") return "app";
  const pathname = (window.location.pathname || "").toLowerCase();
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "";
  const match = NAV_ITEMS.find((item) => item.key === lastSegment);
  return match ? match.key : "app";
}

function loadHistoryFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    LEGACY_HISTORY_KEYS.forEach((legacyKey) => {
      if (legacyKey !== HISTORY_STORAGE_KEY) {
        window.localStorage.removeItem(legacyKey);
      }
    });

    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        const funding = entry?.funding || {};
        const normalizedFunding = {
          ...funding,
          avgApy: Number.isFinite(funding.avgApy) ? Math.max(funding.avgApy, 0) : null,
        };
        const strategy = entry?.strategy;
        const normalizedStrategy = strategy
          ? {
              pair: typeof strategy.pair === "string" ? strategy.pair : null,
              base: typeof strategy.base === "string" ? strategy.base : null,
              direction: typeof strategy.direction === "string" ? strategy.direction : null,
              apy: Number.isFinite(strategy.apy) ? Math.max(strategy.apy, 0) : null,
              score: Number.isFinite(strategy.score) ? strategy.score : null,
            }
          : null;

        return {
          timestamp: entry?.timestamp,
          funding: normalizedFunding,
          spot: entry?.spot || {},
          strategy: normalizedStrategy,
        };
      })
      .filter((entry) => typeof entry.timestamp === "string");
  } catch (e) {
    return [];
  }
}

function persistHistory(entries) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    // ignore persistence errors
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => resolveTabFromLocation());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [history, setHistory] = useState(() => loadHistoryFromStorage());
  const fundingData = useFundingData();
  const spotData = useSpotData();
  const subaccountMetrics = useSubaccountMetrics();

  const bestStrategy = useMemo(
    () => selectBestStrategy(fundingData?.rows ?? []),
    [fundingData?.rows]
  );

  const recordableTimestamp = useMemo(() => {
    const stamp = fundingData?.updatedAt;
    if (!(stamp instanceof Date)) return null;
    if (!Array.isArray(fundingData?.rows) || fundingData.rows.length === 0) return null;
    if (!Array.isArray(spotData?.rows) || spotData.rows.length === 0) return null;
    return stamp.toISOString();
  }, [fundingData?.updatedAt, fundingData?.rows, spotData?.rows]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(resolveTabFromLocation());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("popstate", handlePopState);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const baseUrl = window.location.href;
    const activeNav = NAV_ITEMS.find((item) => item.key === activeTab);
    const fallbackNav = NAV_ITEMS[0];
    const nextPath = activeNav?.path || fallbackNav.path || "/app";
    const nextUrl = new URL(`.${nextPath}`, baseUrl);
    const desiredPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;

    if (`${window.location.pathname}${window.location.search}${window.location.hash}` === desiredPath) {
      return;
    }

    window.history.replaceState(null, "", desiredPath);
  }, [activeTab]);

  useEffect(() => {
    if (!recordableTimestamp) return;
    setHistory((prev) => {
      if (prev.some((entry) => entry.timestamp === recordableTimestamp)) return prev;
      const fundingSummary = aggregateFundingStats(fundingData.rows);
      const spotSummary = aggregateSpotStats(spotData.rows);
      const strategyApy = Number.isFinite(bestStrategy?.apy)
        ? Math.max(bestStrategy.apy, 0)
        : null;
      const strategySnapshot = bestStrategy
        ? {
            pair: bestStrategy.pair,
            base: bestStrategy.base,
            direction: bestStrategy.direction,
            apy: strategyApy,
            score: Number.isFinite(bestStrategy.score) ? bestStrategy.score : null,
          }
        : null;
      const enrichedFundingSummary = {
        ...fundingSummary,
        avgApy: strategyApy ?? fundingSummary.avgApy,
      };
      const next = [
        {
          timestamp: recordableTimestamp,
          funding: enrichedFundingSummary,
          spot: spotSummary,
          strategy: strategySnapshot,
        },
        ...prev,
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return next.slice(0, MAX_HISTORY_ENTRIES);
    });
  }, [recordableTimestamp, fundingData.rows, spotData.rows, bestStrategy]);

  useEffect(() => {
    persistHistory(history);
  }, [history]);

  const navButtonClass = (tab) => {
    const isActive = activeTab === tab;
    return [
      "flex w-full items-center rounded-xl border px-3 py-2 text-sm transition-colors duration-150",
      isSidebarCollapsed ? "justify-center" : "justify-start gap-3",
      isActive
        ? "border-blue-500/60 bg-[#132146] text-blue-50 shadow-[0_0_14px_rgba(56,189,248,0.35)]"
        : "border-transparent text-blue-300 hover:border-blue-700/60 hover:bg-[#101c39] hover:text-cyan-200",
    ]
      .filter(Boolean)
      .join(" ");
  };

  const sidebarWidthClass = isSidebarCollapsed ? "w-20" : "w-64";
  const mainOffsetClass = isSidebarCollapsed ? "ml-20" : "ml-64";
  const activeNavLabel = NAV_ITEMS.find((item) => item.key === activeTab)?.label || "Dashboard";

  return (
    <div className="min-h-screen bg-[#081021] text-blue-50">
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-blue-900 bg-[#070f1f] transition-[width] duration-200 ${sidebarWidthClass}`}
      >
        <div className="px-4 pt-8 pb-6">
          <button
            type="button"
            onClick={() => setActiveTab("app")}
            className={`flex w-full items-center rounded-xl border border-transparent px-2 py-2 transition hover:border-blue-700/60 hover:bg-[#101c39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070f1f] ${
              isSidebarCollapsed ? "flex-col gap-2" : "gap-3"
            }`}
          >
            <NihrLogo className={isSidebarCollapsed ? "h-12 w-12" : "h-16 w-16"} />
            {!isSidebarCollapsed && (
              <span className="text-2xl font-semibold tracking-tight text-blue-100">Tindimave</span>
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-3">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={navButtonClass(key)}
              onClick={() => setActiveTab(key)}
              aria-current={activeTab === key ? "page" : undefined}
              aria-label={isSidebarCollapsed ? label : undefined}
            >
              <Icon className="h-5 w-5" />
              {!isSidebarCollapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div className="border-t border-blue-900 px-3 py-5">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            className={[
              "flex w-full items-center rounded-lg border border-blue-800/60 bg-[#0b1329] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-300 transition-colors hover:border-blue-500/60 hover:text-cyan-200",
              isSidebarCollapsed ? "justify-center" : "justify-between",
            ].join(" ")}
          >
            {!isSidebarCollapsed && <span>Collapse</span>}
            <span aria-hidden="true" className="text-base">
              {isSidebarCollapsed ? "»" : "«"}
            </span>
            <span className="sr-only">{isSidebarCollapsed ? "Expand menu" : "Collapse menu"}</span>
          </button>
        </div>
      </aside>

      <div className={`${mainOffsetClass} flex min-h-screen flex-col transition-[margin-left] duration-200`}>
        <header className="sticky top-0 z-10 border-b border-blue-900 bg-[#081021]/90 backdrop-blur">
          <div className="flex w-full items-center justify-between px-4 py-4 md:px-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-400/70">{activeNavLabel}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <div className="w-full space-y-6">
            {activeTab === "app" && (
              <div className="space-y-6">
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
                  <StrategyTable data={fundingData} strategy={bestStrategy} />
                  <div className="w-full xl:sticky xl:top-6">
                    <StrategyActionPanel
                      balance={subaccountMetrics.balance}
                      fundingEarned={subaccountMetrics.fundingEarnings}
                      isLoading={subaccountMetrics.loading}
                    />
                  </div>
                </div>
                <FundingTable data={fundingData} />
              </div>
            )}

            {activeTab === "hip3" && <Hip3Table />}

            {activeTab === "stats" && (
              <StatsPage
                history={history}
                balanceHistory={subaccountMetrics.balanceHistory}
                balanceError={subaccountMetrics.error}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
