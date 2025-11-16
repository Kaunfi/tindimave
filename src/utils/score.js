const MAX_APY_CONSIDERED = 200; // %
const MAX_VOLUME = 5_000_000_000; // $5B reference
const MAX_OPEN_INTEREST = 2_000_000_000; // $2B reference
const MAX_PREMIUM_DEVIATION = 0.0025; // 0.25%
const MAX_BASIS_DRIFT = 0.01; // 1%
const MAX_LEVERAGE = 50;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeLog(value, reference) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return clamp(Math.log10(value) / Math.log10(reference));
}

function fundingComponent(row) {
  const apy = Number.isFinite(row?.apy) ? row.apy : 0;
  const capped = clamp((apy + MAX_APY_CONSIDERED) / (MAX_APY_CONSIDERED * 2));
  return capped;
}

function volumeComponent(row) {
  const volume = Number.isFinite(row?.vol24h) ? row.vol24h : 0;
  return normalizeLog(volume + 1, MAX_VOLUME);
}

function riskComponent(row) {
  const premium = Math.abs(Number.isFinite(row?.premium) ? row.premium : 0);
  const premiumPenalty = clamp(premium / MAX_PREMIUM_DEVIATION);
  const mark = Number.isFinite(row?.markPx) ? row.markPx : null;
  const oracle = Number.isFinite(row?.oraclePx) ? row.oraclePx : mark;
  const basis = oracle || mark || 1;
  const drift = basis !== 0 ? Math.abs((mark ?? oracle ?? 0) - basis) / Math.abs(basis) : 0;
  const driftPenalty = clamp(drift / MAX_BASIS_DRIFT);
  const score = 1 - clamp(premiumPenalty * 0.6 + driftPenalty * 0.4);
  return score;
}

function efficiencyComponent(row) {
  const oi = Number.isFinite(row?.oi) ? row.oi : 0;
  const leverage = Number.parseFloat(row?.leverage);
  const leverageScore = clamp((Number.isFinite(leverage) ? leverage : 1) / MAX_LEVERAGE);
  const oiScore = normalizeLog(oi + 1, MAX_OPEN_INTEREST);
  return clamp(oiScore * 0.6 + leverageScore * 0.4);
}

export function calculateAssetScore(row) {
  if (!row || typeof row !== "object") return 0;

  const fundingScore = fundingComponent(row);
  const volumeScore = volumeComponent(row);
  const riskScore = riskComponent(row);
  const efficiencyScore = efficiencyComponent(row);

  const weighted =
    fundingScore * 0.35 + volumeScore * 0.25 + riskScore * 0.2 + efficiencyScore * 0.2;

  const finalScore = clamp(weighted, 0, 1) * 10;
  return Number(finalScore.toFixed(2));
}

export function compareByApyAndScore(a, b, minScore = 0) {
  const apyDiff = (Number(b?.apy) || 0) - (Number(a?.apy) || 0);
  const aScore = Number.isFinite(a?.score) ? a.score : 0;
  const bScore = Number.isFinite(b?.score) ? b.score : 0;

  const aBelow = aScore < minScore;
  const bBelow = bScore < minScore;

  if (aBelow && !bBelow) return 1;
  if (bBelow && !aBelow) return -1;

  if (Math.abs(apyDiff) < 0.01) {
    return bScore - aScore;
  }

  if (Math.abs(bScore - aScore) > 0.1) {
    return apyDiff - Math.sign(apyDiff) * 0.01 * (bScore - aScore);
  }

  return apyDiff;
}
