import { DEFAULT_LEVERAGE, DEFAULT_QUOTE_TO_DEPLOY, DEFAULT_REBALANCE_HOURS, DEFAULT_SYMBOL } from "../config.js";
import { HyperliquidClient } from "../hyperliquidClient.js";
import { calculateHedgeSizes, summarizeExposure } from "../utils/hedgeSizing.js";

const client = new HyperliquidClient();

function extractLastPrice(trades) {
  if (!Array.isArray(trades) || trades.length === 0) {
    throw new Error("No trade data returned by Hyperliquid.");
  }

  const [first] = trades;
  if (first?.price) return Number(first.price);
  if (first?.px) return Number(first.px);
  if (Array.isArray(first)) return Number(first[0]);
  return Number(first);
}

async function fetchLatestPrice(symbol) {
  const trades = await client.getRecentTrades(symbol);
  const price = extractLastPrice(trades);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price for ${symbol}: ${price}`);
  }
  return price;
}

function selectQuoteBalance(balances = []) {
  const stable = balances.find((b) => ["USD", "USDC", "USDT"].includes((b?.coin ?? b?.asset ?? "").toUpperCase()));
  const available = Number(
    stable?.available ?? stable?.availableBalance ?? stable?.spot ?? stable?.balance ?? stable?.total ?? 0,
  );
  return Number.isFinite(available) ? available : 0;
}

async function executeLongSpotShortPerp({ symbol, quoteToDeploy, leverage }) {
  const [balanceResponse, price] = await Promise.all([client.getBalances(), fetchLatestPrice(symbol)]);
  const quoteBalance = selectQuoteBalance(balanceResponse?.balances ?? balanceResponse ?? []);
  const usableQuote = quoteToDeploy > 0 ? Math.min(quoteToDeploy, quoteBalance) : quoteBalance;

  const { spotSize, perpSize } = calculateHedgeSizes({ quoteAmount: usableQuote, price, leverage, hedgeRatio: 1 });

  if (spotSize <= 0 || perpSize <= 0) {
    console.log("No notional available to deploy; skipping orders.");
    return { spotSize: 0, perpSize: 0 };
  }

  await client.placeSpotOrder({ symbol, side: "buy", size: spotSize, price });
  await client.placePerpOrder({ symbol, side: "sell", size: perpSize, price, reduceOnly: false });

  return { spotSize, perpSize, price };
}

async function rebalancePositions({ symbol, targetQuote, leverage }) {
  const [positions, price] = await Promise.all([client.getPositions(), fetchLatestPrice(symbol)]);
  const { spotSize: currentSpot, perpSize: currentPerp } = summarizeExposure(positions ?? [], symbol);
  const { spotSize: targetSpot, perpSize: targetPerp } = calculateHedgeSizes({
    quoteAmount: targetQuote,
    price,
    leverage,
    hedgeRatio: 1,
  });

  const spotDiff = targetSpot - currentSpot;
  const perpDiff = -targetPerp - currentPerp; // target is short

  if (Math.abs(spotDiff) > 0) {
    const side = spotDiff > 0 ? "buy" : "sell";
    await client.placeSpotOrder({ symbol, side, size: Math.abs(spotDiff), price });
  }

  if (Math.abs(perpDiff) > 0) {
    const side = perpDiff > 0 ? "buy" : "sell";
    await client.placePerpOrder({ symbol, side, size: Math.abs(perpDiff), price });
  }

  return {
    currentSpot,
    currentPerp,
    targetSpot,
    targetPerp,
    price,
  };
}

async function runCycle() {
  const symbol = DEFAULT_SYMBOL;
  const leverage = Number.isFinite(DEFAULT_LEVERAGE) && DEFAULT_LEVERAGE > 0 ? DEFAULT_LEVERAGE : 1;
  const quoteToDeploy = Number.isFinite(DEFAULT_QUOTE_TO_DEPLOY) && DEFAULT_QUOTE_TO_DEPLOY > 0 ? DEFAULT_QUOTE_TO_DEPLOY : 0;

  console.log(`Executing long spot / short perp for ${symbol} with leverage ${leverage}x`);
  await executeLongSpotShortPerp({ symbol, quoteToDeploy, leverage });
  console.log("Initial hedge executed. Starting rebalance loop...");

  const intervalMs = Math.max(1, DEFAULT_REBALANCE_HOURS) * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      console.log(`Running scheduled rebalance for ${symbol}`);
      await rebalancePositions({ symbol, targetQuote: quoteToDeploy, leverage });
      console.log("Rebalance complete");
    } catch (error) {
      console.error("Rebalance failed", error);
    }
  }, intervalMs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCycle().catch((error) => {
    console.error("Strategy failed to start", error);
    process.exit(1);
  });
}

export { executeLongSpotShortPerp, rebalancePositions, runCycle };
