import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { markets, trades } from "../../db/schema.js";
import { getHolderCount, getLargestHolder, type HolderPosition } from "./holders.js";

type Db = ReturnType<typeof getDb>;

const HOUR_MS = 60 * 60 * 1000;

export interface MarketStats {
  volume24h: number;
  totalVolume: number;
  tradeCount: number;
  priceChange24h: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  marketCap: number | null;
  reserveSol: number | null;
  currentPrice: number | null;
  athPrice: number | null;
  atlPrice: number | null;
  holderCount: number;
  largestHolder: HolderPosition | null;
}

async function getVolumeSince(db: Db, marketPubkey: string, since: Date): Promise<{ volume: number; count: number }> {
  const [row] = await db
    .select({
      volume: sql<string>`COALESCE(SUM(${trades.solAmount}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(trades)
    .where(and(eq(trades.marketPubkey, marketPubkey), gte(trades.timestamp, since)));

  return { volume: Number(row?.volume ?? 0), count: Number(row?.count ?? 0) };
}

/** Price of the trade closest to (at or before) the cutoff, for computing % change. */
export async function getPriceAsOf(db: Db, marketPubkey: string, cutoff: Date): Promise<number | null> {
  const [before] = await db
    .select({ price: trades.price })
    .from(trades)
    .where(and(eq(trades.marketPubkey, marketPubkey), sql`${trades.timestamp} <= ${cutoff}`))
    .orderBy(desc(trades.timestamp))
    .limit(1);

  if (before) return Number(before.price);

  // Market is younger than the window -- fall back to its first ever trade.
  const [first] = await db
    .select({ price: trades.price })
    .from(trades)
    .where(eq(trades.marketPubkey, marketPubkey))
    .orderBy(asc(trades.timestamp))
    .limit(1);

  return first ? Number(first.price) : null;
}

function percentChange(from: number | null, to: number | null): number | null {
  if (from === null || to === null || from === 0) return null;
  return ((to - from) / from) * 100;
}

async function getAllTimeHighLow(db: Db, marketPubkey: string): Promise<{ high: number | null; low: number | null }> {
  const [row] = await db
    .select({
      high: sql<string | null>`MAX(${trades.price})`,
      low: sql<string | null>`MIN(${trades.price})`,
    })
    .from(trades)
    .where(eq(trades.marketPubkey, marketPubkey));

  return {
    high: row?.high != null ? Number(row.high) : null,
    low: row?.low != null ? Number(row.low) : null,
  };
}

export async function getMarketStats(db: Db, marketPubkey: string): Promise<MarketStats | null> {
  const [market] = await db.select().from(markets).where(eq(markets.pubkey, marketPubkey)).limit(1);
  if (!market) return null;

  const now = new Date();
  const [volume24h, totalVolumeRow, priceChange24h, priceChange7d, priceChange30d, athAtl, holderCount, largestHolder] =
    await Promise.all([
      getVolumeSince(db, marketPubkey, new Date(now.getTime() - 24 * HOUR_MS)),
      getVolumeSince(db, marketPubkey, new Date(0)),
      getPriceAsOf(db, marketPubkey, new Date(now.getTime() - 24 * HOUR_MS)),
      getPriceAsOf(db, marketPubkey, new Date(now.getTime() - 7 * 24 * HOUR_MS)),
      getPriceAsOf(db, marketPubkey, new Date(now.getTime() - 30 * 24 * HOUR_MS)),
      getAllTimeHighLow(db, marketPubkey),
      getHolderCount(db, marketPubkey),
      getLargestHolder(db, marketPubkey),
    ]);

  const currentPrice = market.currentPrice != null ? Number(market.currentPrice) : null;
  const outstandingShares = market.outstandingShares != null ? Number(market.outstandingShares) : null;

  return {
    volume24h: volume24h.volume,
    totalVolume: totalVolumeRow.volume,
    tradeCount: totalVolumeRow.count,
    priceChange24h: percentChange(priceChange24h, currentPrice),
    priceChange7d: percentChange(priceChange7d, currentPrice),
    priceChange30d: percentChange(priceChange30d, currentPrice),
    marketCap: currentPrice !== null && outstandingShares !== null ? currentPrice * outstandingShares : null,
    reserveSol: market.reserveSol != null ? Number(market.reserveSol) : null,
    currentPrice,
    athPrice: athAtl.high,
    atlPrice: athAtl.low,
    holderCount,
    largestHolder,
  };
}
