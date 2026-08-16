import { desc, gte, sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { markets, trades } from "../../db/schema.js";
import { getProtocolEarnings } from "./earnings.js";

type Db = ReturnType<typeof getDb>;

export interface ProtocolStats {
  totalMarkets: number;
  totalVolume: number;
  totalUniqueTraders: number;
  /** Combined protocol + creator fees across every trade (matches trades.feePaid, which is the sum -- see events.rs). */
  totalFeesCollected: number;
  /** The protocol's own cut of totalFeesCollected -- see earnings.ts for how this is split out. */
  totalProtocolEarnings: number;
}

export async function getProtocolStats(db: Db): Promise<ProtocolStats> {
  const [marketCountRow] = await db.select({ count: sql<string>`COUNT(*)` }).from(markets);

  const [tradeAggRow, totalProtocolEarnings] = await Promise.all([
    db
      .select({
        totalVolume: sql<string>`COALESCE(SUM(${trades.solAmount}), 0)`,
        totalFees: sql<string>`COALESCE(SUM(${trades.feePaid}), 0)`,
        uniqueTraders: sql<string>`COUNT(DISTINCT ${trades.trader})`,
      })
      .from(trades)
      .then((rows) => rows[0]),
    getProtocolEarnings(db),
  ]);

  return {
    totalMarkets: Number(marketCountRow?.count ?? 0),
    totalVolume: Number(tradeAggRow?.totalVolume ?? 0),
    totalUniqueTraders: Number(tradeAggRow?.uniqueTraders ?? 0),
    totalFeesCollected: Number(tradeAggRow?.totalFees ?? 0),
    totalProtocolEarnings,
  };
}

export interface TrendingMarket {
  marketPubkey: string;
  volume24h: number;
}

/** Markets ranked by trading volume in the trailing 24 hours. */
export async function getTrendingMarkets(db: Db, limit = 10): Promise<TrendingMarket[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      marketPubkey: trades.marketPubkey,
      volume24h: sql<string>`SUM(${trades.solAmount})`,
    })
    .from(trades)
    .where(gte(trades.timestamp, since))
    .groupBy(trades.marketPubkey)
    .orderBy(desc(sql`SUM(${trades.solAmount})`))
    .limit(limit);

  return rows
    .filter((row): row is typeof row & { marketPubkey: string } => row.marketPubkey !== null)
    .map((row) => ({ marketPubkey: row.marketPubkey, volume24h: Number(row.volume24h) }));
}
