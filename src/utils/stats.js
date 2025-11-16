export function aggregateFundingStats(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      count: 0,
      totalOI: 0,
      avgFunding: null,
      avgApy: null,
    };
  }

  const count = rows.length;
  const totalOI = rows.reduce((sum, row) => sum + (Number.isFinite(row.oi) ? row.oi : 0), 0);
  const avgFunding =
    rows.reduce((sum, row) => sum + (Number.isFinite(row.funding) ? row.funding : 0), 0) / count;
  const avgApy = rows.reduce((sum, row) => sum + (Number.isFinite(row.apy) ? row.apy : 0), 0) / count;

  return { count, totalOI, avgFunding, avgApy };
}

export function aggregateSpotStats(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      count: 0,
      avgMinProvide: null,
    };
  }

  const validMinProvide = rows
    .map((row) => (Number.isFinite(row.minProvideSize) ? row.minProvideSize : null))
    .filter((value) => value !== null);

  const avgMinProvide =
    validMinProvide.length === 0
      ? null
      : validMinProvide.reduce((sum, value) => sum + value, 0) / validMinProvide.length;

  return {
    count: rows.length,
    avgMinProvide,
  };
}
