import { and, asc, eq, sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { candles, trades } from "../../db/schema.js";
import type { CandleResolution, Trade } from "../../db/schema.js";
import { RESOLUTIONS } from "./constants.js";
import { aggregateTrades, getBucketStart, type TradeForCandle } from "./aggregate.js";

type Db = ReturnType<typeof getDb>;

function toTradeForCandle(trade: Pick<Trade, "price" | "solAmount" | "timestamp">): TradeForCandle {
  return {
    price: Number(trade.price),
    solAmount: Number(trade.solAmount),
    timestamp: trade.timestamp,
  };
}

/**
 * Called after a single trade is recorded (docs/07-backend.md: "For each
 * configured interval, updates the current active candle"). Upserts the
 * bucket for every resolution atomically at the SQL level so concurrent
 * trades never race each other.
 */
export async function applyTradeToCandles(db: Db, marketPubkey: string, trade: Pick<Trade, "price" | "solAmount" | "timestamp">) {
  const price = Number(trade.price);
  const solAmount = Number(trade.solAmount);

  for (const resolution of RESOLUTIONS) {
    const bucketStart = getBucketStart(trade.timestamp, resolution);

    await db
      .insert(candles)
      .values({
        marketPubkey,
        resolution,
        time: bucketStart,
        open: price.toString(),
        high: price.toString(),
        low: price.toString(),
        close: price.toString(),
        volume: solAmount.toString(),
      })
      .onConflictDoUpdate({
        target: [candles.marketPubkey, candles.resolution, candles.time],
        set: {
          high: sql`GREATEST(${candles.high}, ${price})`,
          low: sql`LEAST(${candles.low}, ${price})`,
          close: sql`${price}`,
          volume: sql`${candles.volume} + ${solAmount}`,
        },
      });
  }
}

/**
 * Rebuilds every candle for a market from the immutable trades table.
 * Safe to run at any time -- candles are derived data, never a source of
 * truth (docs/09-database.md).
 */
export async function regenerateCandlesForMarket(db: Db, marketPubkey: string) {
  const marketTrades = await db
    .select({ price: trades.price, solAmount: trades.solAmount, timestamp: trades.timestamp })
    .from(trades)
    .where(eq(trades.marketPubkey, marketPubkey))
    .orderBy(asc(trades.timestamp));

  const tradesForCandles = marketTrades.map(toTradeForCandle);

  for (const resolution of RESOLUTIONS) {
    await db.delete(candles).where(and(eq(candles.marketPubkey, marketPubkey), eq(candles.resolution, resolution)));

    const buckets = aggregateTrades(tradesForCandles, resolution);
    if (buckets.length === 0) continue;

    await db.insert(candles).values(
      buckets.map((bucket) => ({
        marketPubkey,
        resolution,
        time: bucket.time,
        open: bucket.open.toString(),
        high: bucket.high.toString(),
        low: bucket.low.toString(),
        close: bucket.close.toString(),
        volume: bucket.volume.toString(),
      }))
    );
  }
}

export async function getCandles(db: Db, marketPubkey: string, resolution: CandleResolution, from?: Date, to?: Date) {
  const conditions = [eq(candles.marketPubkey, marketPubkey), eq(candles.resolution, resolution)];
  if (from) conditions.push(sql`${candles.time} >= ${from}`);
  if (to) conditions.push(sql`${candles.time} <= ${to}`);

  return db
    .select()
    .from(candles)
    .where(and(...conditions))
    .orderBy(asc(candles.time));
}

export { RESOLUTIONS, RESOLUTION_SECONDS } from "./constants.js";
export { aggregateTrades, getBucketStart, mergeTradeIntoBucket } from "./aggregate.js";
export type { OhlcvBucket, TradeForCandle } from "./aggregate.js";
