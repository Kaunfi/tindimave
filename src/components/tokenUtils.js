function normalizeTokenSymbol(value) {
  if (value === undefined || value === null) return "";
  const upper = String(value).trim().toUpperCase();
  if (!upper) return "";
  const withoutAt = upper.replace(/^@+/, "");

  // Remove common noise characters while keeping alphanumerics.
  const cleaned = withoutAt.replace(/[^A-Z0-9]/g, "");
  if (/[A-Z]/.test(cleaned)) {
    return cleaned;
  }

  // As a last resort keep the original (sans @) when it still contains letters
  // even if surrounded by unusual characters.
  if (/[A-Z]/.test(withoutAt)) {
    return withoutAt;
  }

  return "";
}

function coalesceTokenSymbol(...values) {
  for (const value of values) {
    const normalized = normalizeTokenSymbol(value);
    if (normalized) return normalized;
  }
  return "";
}

export function tokenKeyFromPairName(pairName) {
  if (!pairName) return "";
  const first = String(pairName)
    .replace(/[–—−]/g, "-")
    .split(/[-/ _]/)[0]
    .replace(/[^A-Za-z0-9]/g, "");
  return normalizeTokenSymbol(first);
}

export function quoteKeyFromPairName(pairName) {
  if (!pairName) return "";
  const cleaned = String(pairName).replace(/[–—−]/g, "-");
  const parts = cleaned.split(/[-/ _]/);
  return normalizeTokenSymbol(parts[1]);
}

export function ensureTokenSymbol(...values) {
  return coalesceTokenSymbol(...values);
}

export function formatPairLabel(pairName, base, quote) {
  const name = String(pairName || "").trim();
  if (name) {
    const normalizedDashes = name.replace(/[–—−]/g, "-");
    const cleaned = normalizedDashes.replace(/[-]/g, "/");
    if (cleaned.includes("/")) {
      return cleaned.replace(/\s+/g, "").toUpperCase();
    }
    if (cleaned) {
      return cleaned.replace(/\s+/g, "").toUpperCase();
    }
  }
  const b = (base || "").toUpperCase();
  const q = (quote || "").toUpperCase();
  if (b && q) {
    return `${b}/${q}`;
  }
  return b || q || "—";
}
