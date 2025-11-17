import crypto from "crypto";
import { HYPERLIQUID_BASE_URL, API_KEY, API_SECRET, SUBACCOUNT } from "./config.js";

const DEFAULT_TIMEOUT_MS = 15_000;

function buildHeaders({ body, needsAuth, apiKey, apiSecret, subaccount }) {
  const headers = { "Content-Type": "application/json" };
  if (!needsAuth) return headers;

  if (!apiKey || !apiSecret) {
    throw new Error("Hyperliquid credentials are missing. Set API_KEY and API_SECRET in env.");
  }

  const signature = crypto.createHmac("sha256", apiSecret).update(body ?? "").digest("hex");
  headers["X-API-KEY"] = apiKey;
  headers["X-SIGNATURE"] = signature;
  if (subaccount) headers["X-SUBACCOUNT"] = subaccount;
  return headers;
}

export class HyperliquidClient {
  constructor({ baseUrl = HYPERLIQUID_BASE_URL, apiKey = API_KEY, apiSecret = API_SECRET, subaccount = SUBACCOUNT } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.subaccount = subaccount;
  }

  async request(path, payload = {}, { needsAuth = false, signal } = {}) {
    const url = `${this.baseUrl}${path}`;
    const body = JSON.stringify(payload);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: buildHeaders({ body, needsAuth, apiKey: this.apiKey, apiSecret: this.apiSecret, subaccount: this.subaccount }),
        body,
        signal: signal ?? controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Hyperliquid API ${response.status}: ${text || response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async getBalances() {
    return this.request("/info", { type: "walletBalances" }, { needsAuth: true });
  }

  async getPositions() {
    return this.request("/info", { type: "openPositions" }, { needsAuth: true });
  }

  async getRecentTrades(symbol) {
    return this.request("/info", { type: "trades", coin: symbol }, { needsAuth: false });
  }

  async placeSpotOrder({ symbol, side, size, price, clientOrderId, tif = "Gtc" }) {
    const payload = {
      type: "spotOrder",
      order: {
        coin: symbol,
        side,
        size,
        price,
        reduceOnly: false,
        tif,
        clientOrderId,
      },
    };

    return this.request("/trade", payload, { needsAuth: true });
  }

  async placePerpOrder({ symbol, side, size, price, reduceOnly = false, clientOrderId, tif = "Gtc" }) {
    const payload = {
      type: "perpOrder",
      order: {
        coin: symbol,
        side,
        size,
        price,
        reduceOnly,
        tif,
        clientOrderId,
      },
    };

    return this.request("/trade", payload, { needsAuth: true });
  }
}
