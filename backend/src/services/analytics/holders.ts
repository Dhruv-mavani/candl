import { eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { trades } from "../../db/schema.js";

type Db = ReturnType<typeof getDb>;

export interface HolderPosition {
  trader: string;
  shares: number;
}

/**
 * Net share position per trader, derived from the immutable trade log
 * (buys minus sells). There is no separate "holders" table -- this is the
 * single source of truth for positions until the indexer reads real
 * on-chain share balances (docs/02-philosophy.md: single ownership of data).
 */
export async function getHolderPositions(db: Db, marketPubkey: string): Promise<HolderPosition[]> {
  const marketTrades = await db
    .select({ trader: trades.trader, direction: trades.direction, shareAmount: trades.shareAmount })
    .from(trades)
    .where(eq(trades.marketPubkey, marketPubkey));

  const balances = new Map<string, number>();
  for (const trade of marketTrades) {
    const shares = Number(trade.shareAmount);
    const signed = trade.direction === "BUY" ? shares : -shares;
    balances.set(trade.trader, (balances.get(trade.trader) ?? 0) + signed);
  }

  return [...balances.entries()]
    .filter(([, shares]) => shares > 0)
    .map(([trader, shares]) => ({ trader, shares }))
    .sort((a, b) => b.shares - a.shares);
}

export async function getHolderCount(db: Db, marketPubkey: string): Promise<number> {
  const holders = await getHolderPositions(db, marketPubkey);
  return holders.length;
}

export async function getLargestHolder(db: Db, marketPubkey: string): Promise<HolderPosition | null> {
  const holders = await getHolderPositions(db, marketPubkey);
  return holders[0] ?? null;
}
