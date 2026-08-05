import { eq } from "drizzle-orm";
import { getDb } from "../src/db/index.js";
import { candles, markets, trades } from "../src/db/schema.js";

const MARKET_PUBKEY = "SmokeTestMarket11111111111111111111111111";
const db = getDb();

await db.delete(candles).where(eq(candles.marketPubkey, MARKET_PUBKEY));
await db.delete(trades).where(eq(trades.marketPubkey, MARKET_PUBKEY));
await db.delete(markets).where(eq(markets.pubkey, MARKET_PUBKEY));

console.log("Removed smoke-test rows for", MARKET_PUBKEY);
process.exit(0);
