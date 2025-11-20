import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "../config.js";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export function formatNumber(value, { maximumFractionDigits = 4 } = {}) {
  return Number.isFinite(value)
    ? Number(value).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits })
    : "0";
}

export function formatUsd(value) {
  if (!Number.isFinite(value)) return "-";
  return `${formatNumber(value, { maximumFractionDigits: 2 })} $`;
}

export async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram credentials missing; skipping notification.");
    return;
  }

  const url = `${TELEGRAM_API_BASE}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

export function buildStrategyMessage({
  context,
  symbol,
  leverage,
  price,
  targetSpot,
  targetPerp,
  spotAction,
  perpAction,
}) {
  const headline = context === "initial" ? "🚀 Nouvelle stratégie en place !" : "🔄 La stratégie vient d'être réajustée";
  const lines = [
    headline,
    `Pair : ${symbol} (${leverage}x)`,
    `Prix de ref : ${formatUsd(price)}`,
    "",
    "🎯 Exposition cible",
    `• Spot : ${formatNumber(targetSpot)} ${symbol}`,
    `• Perp : short ${formatNumber(targetPerp)} ${symbol}`,
  ];

  const actions = [];
  if (spotAction) actions.push(`• Spot : ${spotAction}`);
  if (perpAction) actions.push(`• Perp : ${perpAction}`);

  if (actions.length > 0) {
    lines.push("", "🛠️ Actions", ...actions);
  }

  lines.push("", "Merci pour ta confiance, je reste à l'affût ! 🤖✨");
  return lines.join("\n");
}
