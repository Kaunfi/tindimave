export function calculateHedgeSizes({ quoteAmount, price, leverage = 1, hedgeRatio = 1 }) {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("A positive price is required to compute hedge sizes.");
  }

  const safeQuote = Number.isFinite(quoteAmount) && quoteAmount > 0 ? quoteAmount : 0;
  const targetNotional = safeQuote * hedgeRatio;
  const spotSize = targetNotional / price;
  const perpSize = (targetNotional * leverage) / price;

  return { spotSize, perpSize };
}

export function summarizeExposure(positions = [], symbol) {
  if (!symbol) return { spotSize: 0, perpSize: 0 };
  let spotSize = 0;
  let perpSize = 0;

  for (const position of positions) {
    const coin = position?.coin ?? position?.asset ?? position?.symbol ?? position?.pair;
    if (!coin || coin.toUpperCase() !== symbol.toUpperCase()) continue;

    const size = Number(position?.sz ?? position?.size ?? position?.positionSize ?? 0);
    if (!Number.isFinite(size) || size === 0) continue;

    const kind = (position?.type ?? position?.kind ?? position?.product ?? "").toLowerCase();
    if (kind.includes("perp")) {
      perpSize += size;
    } else {
      spotSize += size;
    }
  }

  return { spotSize, perpSize };
}
