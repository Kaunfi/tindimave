import { isAllowedBase } from "../constants/allowedBases.js";
import { calculateAssetScore, compareByApyAndScore } from "./score.js";

const MIN_STRATEGY_SCORE = 3.5;

const STRATEGY_UPDATE_SCHEDULE = [
  { hours: 0, minutes: 10 },
  { hours: 8, minutes: 10 },
  { hours: 16, minutes: 10 },
];

export function formatPercent(value, fractionDigits = 2) {
  return Number.isFinite(value) ? `${value.toFixed(fractionDigits)}%` : "—";
}

export function formatDateTime(dateLike) {
  if (!dateLike) return "—";
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", "");
}

export function alignToStrategySchedule(dateLike) {
  if (!dateLike) return null;
  const date = dateLike instanceof Date ? new Date(dateLike.getTime()) : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  let lastMatch = null;

  for (const { hours, minutes } of STRATEGY_UPDATE_SCHEDULE) {
    const candidate = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
    if (candidate <= date) {
      lastMatch = candidate;
    } else {
      break;
    }
  }

  if (lastMatch) return lastMatch;

  const { hours, minutes } = STRATEGY_UPDATE_SCHEDULE[STRATEGY_UPDATE_SCHEDULE.length - 1];
  const previous = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous;
}

export function pickLeverage(baseRow) {
  const parsed = Number.parseFloat(baseRow?.leverage);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  const capped = Math.min(2, parsed);
  return capped < 1 ? 1 : capped;
}

export function formatLeverage(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}x`;
}

export function buildStrategy(baseRow) {
  if (!baseRow) return null;

  const direction =
    baseRow.hedge === "Short"
      ? "Short perp / Long spot"
      : baseRow.hedge === "Long"
      ? "Long perp / Short spot"
      : "Neutral";

  return {
    pair: baseRow.pair,
    base: baseRow.base,
    apy: baseRow.apy,
    direction,
    leverage: pickLeverage(baseRow),
    score: Number.isFinite(baseRow.score) ? baseRow.score : calculateAssetScore(baseRow),
  };
}

export function selectBestStrategy(rows = []) {
  const candidates = [...rows]
    .filter((r) => Number.isFinite(r.apy))
    .filter((r) => isAllowedBase(r.base))
    .map((row) => ({ ...row, score: Number.isFinite(row.score) ? row.score : calculateAssetScore(row) }));

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => compareByApyAndScore(a, b, MIN_STRATEGY_SCORE));
  const preferred = candidates.find((r) => r.apy > 0 && r.score >= MIN_STRATEGY_SCORE);
  const pick = preferred ?? candidates[0];

  if (!pick) return null;
  return buildStrategy(pick);
}
