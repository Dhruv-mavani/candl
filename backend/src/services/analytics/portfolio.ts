import { eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { markets, nftMetadata, trades } from "../../db/schema.js";
import { getPriceAsOf } from "./market-stats.js";

type Db = ReturnType<typeof getDb>;

export interface PortfolioHolding {
  marketPubkey: string;
  nftMint: string;
  nftName: string | null;
  nftImageUrl: string | null;
  marketState: string;
  shares: number;
  avgCostLamports: number;
  currentPriceLamports: number;
  costBasisLamports: number;
  valueLamports: number;
}

export interface TraderPortfolio {
  totalValueLamports: number;
  totalCostLamports: number;
  holdings: PortfolioHolding[];
}

/**
 * Every market a wallet currently holds shares in, with an average-cost basis
 * derived from their own buy/sell trade log (same "no separate positions
 * table, derive from trades" approach as holders.ts). On a sell, cost basis
 * is reduced proportionally by the position's running average cost rather
 * than tracking lots, which is the standard average-cost accounting method.
 */
export async function getTraderPortfolio(db: Db, trader: string): Promise<TraderPortfolio> {
  const rows = await db
    .select({
      marketPubkey: trades.marketPubkey,
      direction: trades.direction,
      shareAmount: trades.shareAmount,
      solAmount: trades.solAmount,
      nftMint: markets.nftMint,
      nftName: nftMetadata.name,
      nftImageUrl: nftMetadata.imageUrl,
      marketState: markets.state,
      currentPrice: markets.currentPrice,
    })
    .from(trades)
    .innerJoin(markets, eq(trades.marketPubkey, markets.pubkey))
    .leftJoin(nftMetadata, eq(nftMetadata.mint, markets.nftMint))
    .where(eq(trades.trader, trader))
    .orderBy(trades.timestamp);

  interface Accumulator {
    shares: number;
    costLamports: number;
    nftMint: string;
    nftName: string | null;
    nftImageUrl: string | null;
    marketState: string;
    currentPrice: number;
  }

  const byMarket = new Map<string, Accumulator>();

  for (const row of rows) {
    const marketPubkey = row.marketPubkey;
    if (!marketPubkey) continue;
    let entry = byMarket.get(marketPubkey);
    if (!entry) {
      entry = {
        shares: 0,
        costLamports: 0,
        nftMint: row.nftMint,
        nftName: row.nftName,
        nftImageUrl: row.nftImageUrl,
        marketState: row.marketState,
        currentPrice: Number(row.currentPrice ?? 0),
      };
      byMarket.set(marketPubkey, entry);
    }

    const shareAmount = Number(row.shareAmount);
    const solAmount = Number(row.solAmount);
    if (row.direction === "BUY") {
      entry.shares += shareAmount;
      entry.costLamports += solAmount;
    } else {
      const avgCost = entry.shares > 0 ? entry.costLamports / entry.shares : 0;
      entry.shares -= shareAmount;
      entry.costLamports -= avgCost * shareAmount;
    }
  }

  const holdings: PortfolioHolding[] = [];
  for (const [marketPubkey, entry] of byMarket) {
    if (entry.shares <= 0) continue;
    const valueLamports = entry.shares * entry.currentPrice;
    holdings.push({
      marketPubkey,
      nftMint: entry.nftMint,
      nftName: entry.nftName,
      nftImageUrl: entry.nftImageUrl,
      marketState: entry.marketState,
      shares: entry.shares,
      avgCostLamports: entry.costLamports / entry.shares,
      currentPriceLamports: entry.currentPrice,
      costBasisLamports: entry.costLamports,
      valueLamports,
    });
  }

  holdings.sort((a, b) => b.valueLamports - a.valueLamports);

  return {
    totalValueLamports: holdings.reduce((sum, h) => sum + h.valueLamports, 0),
    totalCostLamports: holdings.reduce((sum, h) => sum + h.costBasisLamports, 0),
    holdings,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PeriodChange {
  earnedLamports: number;
  percent: number | null;
}

export interface PortfolioPerformance {
  day: PeriodChange;
  week: PeriodChange;
  month: PeriodChange;
  year: PeriodChange;
}

/**
 * Value of currently-held shares now vs. at a cutoff in the past, using each
 * market's nearest trade price at-or-before that cutoff (same "price as of"
 * primitive market-stats.ts uses for a single market's 24h/7d/30d change).
 * Like that per-market calculation, this holds today's share count constant
 * across the window rather than replaying historical buys/sells -- a
 * standard "what today's position was worth then vs. now" approximation,
 * not a full realized+unrealized ledger.
 */
async function computePeriodChange(db: Db, holdings: PortfolioHolding[], cutoff: Date): Promise<PeriodChange> {
  let valueNow = 0;
  let valueThen = 0;
  for (const holding of holdings) {
    const priceThen = await getPriceAsOf(db, holding.marketPubkey, cutoff);
    valueNow += holding.valueLamports;
    valueThen += holding.shares * (priceThen ?? holding.currentPriceLamports);
  }
  return {
    earnedLamports: valueNow - valueThen,
    percent: valueThen > 0 ? ((valueNow - valueThen) / valueThen) * 100 : null,
  };
}

export async function getTraderPortfolioPerformance(db: Db, trader: string): Promise<PortfolioPerformance> {
  const { holdings } = await getTraderPortfolio(db, trader);
  const now = new Date();
  const [day, week, month, year] = await Promise.all([
    computePeriodChange(db, holdings, new Date(now.getTime() - DAY_MS)),
    computePeriodChange(db, holdings, new Date(now.getTime() - 7 * DAY_MS)),
    computePeriodChange(db, holdings, new Date(now.getTime() - 30 * DAY_MS)),
    computePeriodChange(db, holdings, new Date(now.getTime() - 365 * DAY_MS)),
  ]);
  return { day, week, month, year };
}

export interface PortfolioHistoryPoint {
  timestamp: string;
  valueLamports: number;
}

async function getPriceHistory(db: Db, marketPubkey: string): Promise<{ timestamp: Date; price: number }[]> {
  const rows = await db
    .select({ timestamp: trades.timestamp, price: trades.price })
    .from(trades)
    .where(eq(trades.marketPubkey, marketPubkey))
    .orderBy(trades.timestamp);
  return rows.map((r) => ({ timestamp: r.timestamp, price: Number(r.price) }));
}

/** Last known price at or before `cutoff` from an ascending-ordered price history, falling back to the earliest known price (or the given default if there's no history at all). */
function priceAsOfFromHistory(history: { timestamp: Date; price: number }[], cutoff: Date, fallback: number): number {
  if (history.length === 0) return fallback;
  let price = history[0]!.price;
  for (const point of history) {
    if (point.timestamp.getTime() > cutoff.getTime()) break;
    price = point.price;
  }
  return price;
}

export const PERFORMANCE_PERIOD_MS: Record<"day" | "week" | "month" | "year", number> = {
  day: DAY_MS,
  week: 7 * DAY_MS,
  month: 30 * DAY_MS,
  year: 365 * DAY_MS,
};

/**
 * Real value-over-time series for a wallet's current holdings. Defaults to
 * spanning from the earliest trade across any currently-held market up to
 * now; pass `since` (e.g. one of PERFORMANCE_PERIOD_MS's cutoffs, to match
 * the day/week/month/year toggle) to window it to a specific period instead
 * -- the window is still clamped to the earliest real trade, never extended
 * past actual history. Same current-shares-held-constant approximation as
 * computePeriodChange, just sampled at many points instead of one -- every
 * price plotted is a real trade price, never synthesized.
 */
export async function getTraderPortfolioHistory(db: Db, trader: string, points = 30, since?: Date): Promise<PortfolioHistoryPoint[]> {
  const { holdings } = await getTraderPortfolio(db, trader);
  if (holdings.length === 0) return [];

  const histories = await Promise.all(
    holdings.map(async (holding) => ({ holding, history: await getPriceHistory(db, holding.marketPubkey) }))
  );

  const allTimestamps = histories.flatMap(({ history }) => history.map((p) => p.timestamp.getTime()));
  if (allTimestamps.length === 0) return [];

  const earliestTrade = Math.min(...allTimestamps);
  const start = since ? Math.max(since.getTime(), earliestTrade) : earliestTrade;
  const end = Date.now();
  const stepMs = points > 1 ? Math.max(1, (end - start) / (points - 1)) : 0;

  const series: PortfolioHistoryPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = new Date(start + i * stepMs);
    let value = 0;
    for (const { holding, history } of histories) {
      value += holding.shares * priceAsOfFromHistory(history, t, holding.currentPriceLamports);
    }
    series.push({ timestamp: t.toISOString(), valueLamports: value });
  }

  // Pin the last point to the exact current value rather than whatever the
  // last sampled price happens to be.
  series[series.length - 1] = {
    timestamp: new Date().toISOString(),
    valueLamports: holdings.reduce((sum, h) => sum + h.valueLamports, 0),
  };

  return series;
}
