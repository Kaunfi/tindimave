import { useEffect, useRef, useState } from "react";
import {
  ensureTokenSymbol,
  formatPairLabel,
  quoteKeyFromPairName,
  tokenKeyFromPairName,
} from "../components/tokenUtils.js";
import { calculateAssetScore } from "../utils/score.js";

const API = "https://api.hyperliquid.xyz/info";

const SCHEDULE_UTC_MINUTES = [10, 8 * 60 + 10, 16 * 60 + 10];

function getLastScheduledUpdate(now = new Date()) {
  const currentUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  for (let i = SCHEDULE_UTC_MINUTES.length - 1; i >= 0; i -= 1) {
    const scheduleMinutes = SCHEDULE_UTC_MINUTES[i];
    if (currentUtcMinutes >= scheduleMinutes) {
      const hours = Math.floor(scheduleMinutes / 60);
      const minutes = scheduleMinutes % 60;
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes));
    }
  }

  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  base.setUTCDate(base.getUTCDate() - 1);
  const lastMinutes = SCHEDULE_UTC_MINUTES[SCHEDULE_UTC_MINUTES.length - 1];
  const hours = Math.floor(lastMinutes / 60);
  const minutes = lastMinutes % 60;
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hours, minutes));
}

const FALLBACK_ROWS = [
  {
    pair: "BTC-USD",
    base: "BTC",
    markPx: 67892.12,
    funding: 0.00015,
    apy: 131.4,
    hedge: "Short",
    oi: 1_845_329_000,
    vol24h: 2_465_870_000,
    premium: 0.00042,
    oraclePx: 67840.15,
    prevDayPx: 66800.11,
    leverage: "50",
  },
  {
    pair: "ETH-USD",
    base: "ETH",
    markPx: 3542.76,
    funding: -0.00009,
    apy: -78.84,
    hedge: "Long",
    oi: 842_511_000,
    vol24h: 1_265_772_000,
    premium: -0.00031,
    oraclePx: 3529.44,
    prevDayPx: 3480.52,
    leverage: "30",
  },
  {
    pair: "SOL-USD",
    base: "SOL",
    markPx: 188.63,
    funding: 0.00021,
    apy: 183.96,
    hedge: "Short",
    oi: 265_194_000,
    vol24h: 396_452_000,
    premium: 0.00067,
    oraclePx: 187.9,
    prevDayPx: 180.34,
    leverage: "25",
  },
].map((row) => ({ ...row, score: calculateAssetScore(row) }));

const FALLBACK_SPOT_SET = new Set(FALLBACK_ROWS.map((row) => row.base));

export function useFundingData() {
  const [rows, setRows] = useState([]);
  const [spotSet, setSpotSet] = useState(null);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const lastUpdateRef = useRef(null);
  const lastUpdateHadError = useRef(false);
  const hasRowsRef = useRef(false);

  async function fetchPerps() {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    });
    if (!res.ok) {
      throw new Error(`Hyperliquid responded with ${res.status}`);
    }
    const txt = await res.text();
    let data;
    try {
      data = JSON.parse(txt);
    } catch (e) {
      throw new Error("Invalid JSON from Hyperliquid (perps).\n" + txt.slice(0, 300));
    }

    const meta = data?.[0]?.universe || [];
    const assets = data?.[1] || [];

    return meta.map((pair, i) => {
      const a = assets[i] || {};
      const asSymbolCandidate = (value) =>
        typeof value === "string" || typeof value === "number" ? value : undefined;
      const rawPairName =
        pair?.name ||
        pair?.pfSym ||
        pair?.pf_sym ||
        pair?.perp?.name ||
        pair?.perp?.pfSym ||
        a?.pair ||
        a?.name ||
        a?.pfSym ||
        "";

      const baseCandidates = [
        tokenKeyFromPairName(rawPairName),
        tokenKeyFromPairName(pair?.perp?.name),
        tokenKeyFromPairName(pair?.perp?.pfSym),
        tokenKeyFromPairName(a?.pair),
        tokenKeyFromPairName(a?.name),
        tokenKeyFromPairName(a?.pfSym),
        asSymbolCandidate(pair?.base),
        asSymbolCandidate(pair?.baseSymbol),
        asSymbolCandidate(pair?.baseToken),
        asSymbolCandidate(pair?.baseToken?.symbol),
        asSymbolCandidate(pair?.perp?.token?.base),
        asSymbolCandidate(pair?.perp?.token?.baseSymbol),
        asSymbolCandidate(a?.base),
        asSymbolCandidate(a?.baseSymbol),
        asSymbolCandidate(a?.token?.base),
        asSymbolCandidate(a?.token?.baseSymbol),
        asSymbolCandidate(a?.baseToken),
        asSymbolCandidate(a?.baseToken?.symbol),
      ].filter((value) => value !== undefined);

      const quoteCandidates = [
        quoteKeyFromPairName(rawPairName),
        quoteKeyFromPairName(pair?.perp?.name),
        quoteKeyFromPairName(pair?.perp?.pfSym),
        quoteKeyFromPairName(a?.pair),
        quoteKeyFromPairName(a?.name),
        quoteKeyFromPairName(a?.pfSym),
        asSymbolCandidate(pair?.quote),
        asSymbolCandidate(pair?.quoteSymbol),
        asSymbolCandidate(pair?.perp?.token?.quote),
        asSymbolCandidate(pair?.perp?.token?.quoteSymbol),
        asSymbolCandidate(a?.quote),
        asSymbolCandidate(a?.quoteSymbol),
        asSymbolCandidate(a?.token?.quote),
        asSymbolCandidate(a?.token?.quoteSymbol),
        asSymbolCandidate(a?.quoteToken),
        asSymbolCandidate(a?.quoteToken?.symbol),
      ].filter((value) => value !== undefined);

      const normalizedBase = ensureTokenSymbol(...baseCandidates);
      const initialQuote = ensureTokenSymbol(...quoteCandidates);

      const initialPairLabel = formatPairLabel(rawPairName, normalizedBase, initialQuote);
      const base = ensureTokenSymbol(
        normalizedBase,
        tokenKeyFromPairName(initialPairLabel),
        tokenKeyFromPairName(rawPairName)
      );
      const quote = ensureTokenSymbol(
        initialQuote,
        quoteKeyFromPairName(initialPairLabel),
        quoteKeyFromPairName(rawPairName)
      );
      const pairLabel = formatPairLabel(initialPairLabel || rawPairName, base, quote);

      const rawFunding = Number(a.funding);
      const funding = Number.isFinite(rawFunding) ? rawFunding : 0;
      const apy = funding * 24 * 365 * 100;
      const normalized = {
        pair: pairLabel || "—",
        base,
        markPx: Number(a.markPx) || 0,
        funding,
        apy,
        hedge: funding > 0 ? "Short" : funding < 0 ? "Long" : "-",
        oi: Number(a.openInterest) || 0,
        vol24h: Number(a.dayNtlVlm) || 0,
        premium: Number(a.premium) || 0,
        oraclePx: Number(a.oraclePx) || 0,
        prevDayPx: Number(a.prevDayPx) || 0,
        leverage: String(pair?.maxLeverage ?? "").replace("x", ""),
      };

      return { ...normalized, score: calculateAssetScore(normalized) };
    });
  }

  async function fetchSpot() {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "spotMeta" }),
      });
      if (!res.ok) {
        throw new Error(`Hyperliquid responded with ${res.status}`);
      }
      const txt = await res.text();
      const data = JSON.parse(txt);
      const list = Array.isArray(data) ? data : data?.universe || [];
      const bases = list
        .map((x) => {
          const rawName = x?.symbol || x?.name || "";
          return ensureTokenSymbol(
            tokenKeyFromPairName(rawName),
            tokenKeyFromPairName(x?.name),
            x?.tokens?.baseSymbol,
            x?.tokens?.baseTicker,
            x?.tokens?.base,
            x?.tokens?.baseToken?.symbol,
            x?.base,
            x?.baseSymbol
          );
        })
        .filter(Boolean);
      setSpotSet(new Set(bases));
    } catch (e) {
      setSpotSet(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const mapped = await fetchPerps();
        if (!mounted) return;
        const scheduledAt = getLastScheduledUpdate(new Date());
        const lastRecorded = lastUpdateRef.current;
        const isNewSchedule = !lastRecorded || scheduledAt.getTime() !== lastRecorded.getTime();
        const shouldUpdateSchedule = isNewSchedule || lastUpdateHadError.current || !hasRowsRef.current;

        setRows(mapped);
        hasRowsRef.current = true;

        if (shouldUpdateSchedule) {
          setUpdatedAt(scheduledAt);
          lastUpdateRef.current = scheduledAt;
          lastUpdateHadError.current = false;
        }

        setError(null);
      } catch (e) {
        if (!mounted) return;
        const scheduledAt = getLastScheduledUpdate(new Date());
        setRows(FALLBACK_ROWS);
        setSpotSet(new Set(FALLBACK_SPOT_SET));
        const reason = String(e?.message || e || "unknown error");
        setError(`Unable to load live funding data (${reason}). Displaying sample data instead.`);
        setUpdatedAt(scheduledAt);
        lastUpdateRef.current = scheduledAt;
        lastUpdateHadError.current = true;
        hasRowsRef.current = true;
        return;
      }

      fetchSpot();
    }

    run();
    const id = setInterval(run, 300_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return { rows, spotSet, error, updatedAt };
}

export { FALLBACK_ROWS };
