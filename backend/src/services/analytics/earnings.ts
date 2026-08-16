import { eq, sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { markets, trades } from "../../db/schema.js";

type Db = ReturnType<typeof getDb>;

/**
 * buy.rs/sell.rs pay the protocol's and creator's cut straight to their
 * wallets in the same transaction as the trade -- there's no on-chain
 * "earnings" account, it's just SOL landing in protocol_treasury/creator.
 * trades.feePaid is their combined total (see events.rs), so splitting it
 * back into each side requires the market's own fee_protocol_bps/fee_creator_bps
 * (now captured correctly per-market, see decode.ts's fetchMarketConfig).
 */
function creatorShareOfFee(feePaid: number, protocolBps: number, creatorBps: number): number {
  const totalBps = protocolBps + creatorBps;
  if (totalBps === 0) return 0;
  return (feePaid * creatorBps) / totalBps;
}

export interface CreatorMarketEarnings {
  marketPubkey: string;
  nftMint: string;
  tradeCount: number;
  earnedLamports: number;
}

export interface CreatorEarnings {
  totalEarnedLamports: number;
  markets: CreatorMarketEarnings[];
}

/** Every market a wallet created, with their share of trade fees earned on each. */
export async function getCreatorEarnings(db: Db, creator: string): Promise<CreatorEarnings> {
  const rows = await db
    .select({
      marketPubkey: markets.pubkey,
      nftMint: markets.nftMint,
      feeProtocolBps: markets.feeProtocolBps,
      feeCreatorBps: markets.feeCreatorBps,
      tradeCount: sql<string>`COUNT(${trades.id})`,
      totalFeePaid: sql<string>`COALESCE(SUM(${trades.feePaid}), 0)`,
    })
    .from(markets)
    .leftJoin(trades, eq(trades.marketPubkey, markets.pubkey))
    .where(eq(markets.creator, creator))
    .groupBy(markets.pubkey, markets.nftMint, markets.feeProtocolBps, markets.feeCreatorBps);

  const perMarket = rows.map((row) => ({
    marketPubkey: row.marketPubkey,
    nftMint: row.nftMint,
    tradeCount: Number(row.tradeCount),
    earnedLamports: creatorShareOfFee(Number(row.totalFeePaid), row.feeProtocolBps, row.feeCreatorBps),
  }));

  return {
    totalEarnedLamports: perMarket.reduce((sum, m) => sum + m.earnedLamports, 0),
    markets: perMarket,
  };
}

/** Platform-wide protocol fee revenue, split out of the combined feePaid the same way. */
export async function getProtocolEarnings(db: Db): Promise<number> {
  const rows = await db
    .select({
      feeProtocolBps: markets.feeProtocolBps,
      feeCreatorBps: markets.feeCreatorBps,
      totalFeePaid: sql<string>`COALESCE(SUM(${trades.feePaid}), 0)`,
    })
    .from(markets)
    .leftJoin(trades, eq(trades.marketPubkey, markets.pubkey))
    .groupBy(markets.pubkey, markets.feeProtocolBps, markets.feeCreatorBps);

  return rows.reduce((sum, row) => {
    const totalFee = Number(row.totalFeePaid);
    const creatorFee = creatorShareOfFee(totalFee, row.feeProtocolBps, row.feeCreatorBps);
    return sum + (totalFee - creatorFee);
  }, 0);
}
