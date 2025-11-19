export const ALLOWED_BASES = ["HYPE", "BTC", "ETH", "SOL"];

export const ALLOWED_BASES_SET = new Set(ALLOWED_BASES);

export function isAllowedBase(base) {
  if (!base) return false;
  return ALLOWED_BASES_SET.has(String(base).toUpperCase());
}
