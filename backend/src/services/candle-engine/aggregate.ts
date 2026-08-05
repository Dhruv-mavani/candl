import type { CandleResolution } from "../../db/schema.js";
import { RESOLUTION_SECONDS } from "./constants.js";

export interface TradeForCandle {
  price: number;
  solAmount: number;
  timestamp: Date;
}

export interface OhlcvBucket {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Floors a timestamp to the start of the bucket it belongs to for a given resolution. */
export function getBucketStart(timestamp: Date, resolution: CandleResolution): Date {
  const seconds = RESOLUTION_SECONDS[resolution];
  const epochSeconds = Math.floor(timestamp.getTime() / 1000);
  const bucketStartSeconds = epochSeconds - (epochSeconds % seconds);
  return new Date(bucketStartSeconds * 1000);
}

/**
 * Folds a single trade into an existing (possibly absent) OHLCV bucket.
 * Pure function -- the only place candle math happens, so it's the only
 * place that needs testing to trust every candle in the system.
 */
export function mergeTradeIntoBucket(existing: OhlcvBucket | null, trade: TradeForCandle, bucketStart: Date): OhlcvBucket {
  if (!existing) {
    return {
      time: bucketStart,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.solAmount,
    };
  }

  return {
    time: existing.time,
    open: existing.open,
    high: Math.max(existing.high, trade.price),
    low: Math.min(existing.low, trade.price),
    close: trade.price,
    volume: existing.volume + trade.solAmount,
  };
}

/**
 * Aggregates a full list of trades (assumed sorted ascending by timestamp)
 * into OHLCV buckets for one resolution. Used both for incremental updates
 * (a single new trade) and full regeneration from trade history, since
 * candles are derived data that can always be rebuilt from `trades`
 * (docs/09-database.md).
 */
export function aggregateTrades(trades: TradeForCandle[], resolution: CandleResolution): OhlcvBucket[] {
  const buckets = new Map<number, OhlcvBucket>();

  for (const trade of trades) {
    const bucketStart = getBucketStart(trade.timestamp, resolution);
    const key = bucketStart.getTime();
    const merged = mergeTradeIntoBucket(buckets.get(key) ?? null, trade, bucketStart);
    buckets.set(key, merged);
  }

  return [...buckets.values()].sort((a, b) => a.time.getTime() - b.time.getTime());
}
