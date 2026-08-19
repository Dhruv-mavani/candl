import { desc, eq, gte, sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { markets, nftMetadata, trades } from "../../db/schema.js";
import { getProtocolEarnings, creatorShareOfFee } from "./earnings.js";

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

export interface ProtocolHistoryPoint {
  timestamp: string;
  cumulativeVolumeLamports: number;
  cumulativeProtocolEarningsLamports: number;
}

/**
 * Protocol-wide cumulative volume and protocol-fee earnings over time, built
 * by replaying every trade across every market in order (each trade's
 * protocol cut split out via its own market's fee_protocol_bps/fee_creator_bps,
 * same as getProtocolEarnings) and sampling the running totals at evenly
 * spaced points -- real data throughout, nothing synthesized.
 */
export async function getProtocolEarningsHistory(db: Db, points = 30): Promise<ProtocolHistoryPoint[]> {
  const rows = await db
    .select({
      timestamp: trades.timestamp,
      solAmount: trades.solAmount,
      feePaid: trades.feePaid,
      feeProtocolBps: markets.feeProtocolBps,
      feeCreatorBps: markets.feeCreatorBps,
    })
    .from(trades)
    .innerJoin(markets, eq(trades.marketPubkey, markets.pubkey))
    .orderBy(trades.timestamp);

  if (rows.length === 0) return [];

  const start = rows[0]!.timestamp.getTime();
  const end = Date.now();
  const stepMs = points > 1 ? Math.max(1, (end - start) / (points - 1)) : 0;

  const series: ProtocolHistoryPoint[] = [];
  let idx = 0;
  let cumulativeVolume = 0;
  let cumulativeProtocolEarnings = 0;

  for (let i = 0; i < points; i++) {
    const t = start + i * stepMs;
    while (idx < rows.length && rows[idx]!.timestamp.getTime() <= t) {
      const row = rows[idx]!;
      const feePaid = Number(row.feePaid);
      const creatorShare = creatorShareOfFee(feePaid, row.feeProtocolBps, row.feeCreatorBps);
      cumulativeVolume += Number(row.solAmount);
      cumulativeProtocolEarnings += feePaid - creatorShare;
      idx++;
    }
    series.push({
      timestamp: new Date(t).toISOString(),
      cumulativeVolumeLamports: cumulativeVolume,
      cumulativeProtocolEarningsLamports: cumulativeProtocolEarnings,
    });
  }

  return series;
}

export interface ProtocolMarketEarnings {
  marketPubkey: string;
  nftMint: string;
  nftName: string | null;
  nftImageUrl: string | null;
  protocolEarnedLamports: number;
  volumeLamports: number;
}

/** Markets ranked by how much protocol fee revenue they've generated. */
export async function getProtocolEarningsByMarket(db: Db, limit = 8): Promise<ProtocolMarketEarnings[]> {
  const rows = await db
    .select({
      marketPubkey: markets.pubkey,
      nftMint: markets.nftMint,
      nftName: nftMetadata.name,
      nftImageUrl: nftMetadata.imageUrl,
      feeProtocolBps: markets.feeProtocolBps,
      feeCreatorBps: markets.feeCreatorBps,
      totalFeePaid: sql<string>`COALESCE(SUM(${trades.feePaid}), 0)`,
      totalVolume: sql<string>`COALESCE(SUM(${trades.solAmount}), 0)`,
    })
    .from(markets)
    .leftJoin(trades, eq(trades.marketPubkey, markets.pubkey))
    .leftJoin(nftMetadata, eq(nftMetadata.mint, markets.nftMint))
    .groupBy(markets.pubkey, markets.nftMint, nftMetadata.name, nftMetadata.imageUrl, markets.feeProtocolBps, markets.feeCreatorBps);

  return rows
    .map((row) => {
      const totalFee = Number(row.totalFeePaid);
      const creatorShare = creatorShareOfFee(totalFee, row.feeProtocolBps, row.feeCreatorBps);
      return {
        marketPubkey: row.marketPubkey,
        nftMint: row.nftMint,
        nftName: row.nftName,
        nftImageUrl: row.nftImageUrl,
        protocolEarnedLamports: totalFee - creatorShare,
        volumeLamports: Number(row.totalVolume),
      };
    })
    .filter((m) => m.protocolEarnedLamports > 0)
    .sort((a, b) => b.protocolEarnedLamports - a.protocolEarnedLamports)
    .slice(0, limit);
}
