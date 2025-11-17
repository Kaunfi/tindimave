import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadLocalEnv(fileName = ".env") {
  const envPath = path.resolve(__dirname, "..", fileName);
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=");
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

export const API_KEY = process.env.API_KEY ?? "";
export const API_SECRET = process.env.API_SECRET ?? "";
export const SUBACCOUNT = process.env.SUBACCOUNT ?? "";
export const HYPERLIQUID_BASE_URL = process.env.HYPERLIQUID_BASE_URL ?? "https://api.hyperliquid.xyz";

export const DEFAULT_REBALANCE_HOURS = Number.parseFloat(
  process.env.REBALANCE_INTERVAL_HOURS ?? "8",
);
export const DEFAULT_LEVERAGE = Number.parseFloat(process.env.DEFAULT_LEVERAGE ?? "1");
export const DEFAULT_SYMBOL = process.env.TARGET_SYMBOL ?? "ETH";
export const DEFAULT_QUOTE_TO_DEPLOY = Number.parseFloat(process.env.QUOTE_TO_DEPLOY ?? "0");
