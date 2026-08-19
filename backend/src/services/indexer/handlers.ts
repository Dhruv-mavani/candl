import { and, eq, sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { candles, markets, trades } from "../../db/schema.js";
import { applyTradeToCandles, getBucketStart } from "../candle-engine/index.js";
import { resolveAndCacheNftMetadata } from "../metadata/index.js";
import { getHub } from "../../api/websocket/hub.js";
import type { OnChainMarketConfig } from "./decode.js";
import type {
  MarketCreatedEvent,
  MarketExtendedEvent,
  MarketSettledEvent,
  SharesRedeemedEvent,
  TradeExecutedEvent,
} from "./events.js";

type Db = ReturnType<typeof getDb>;

export async function handleMarketCreated(db: Db, event: MarketCreatedEvent, config: OnChainMarketConfig) {
  const createdAt = new Date(event.timestamp * 1000);

  await db
    .insert(markets)
    .values({
      pubkey: event.market,
      nftMint: event.nftMint,
      creator: event.creator,
      createdAt,
      duration: config.durationSeconds,
      expiresAt: new Date(createdAt.getTime() + config.durationSeconds * 1000),
      state: "ACTIVE",
      feeProtocolBps: config.feeProtocolBps,
      feeCreatorBps: config.feeCreatorBps,
      currentPrice: "0",
      reserveSol: "0",
      outstandingShares: "0",
    })
    .onConflictDoNothing({ target: markets.pubkey });

  // Best-effort: don't let a metadata fetch failure block indexing the trade.
  try {
    await resolveAndCacheNftMetadata(db, event.nftMint);
  } catch (err) {
    console.error(`[indexer] failed to resolve metadata for ${event.nftMint}:`, err);
  }
}

export async function handleTradeExecuted(db: Db, event: TradeExecutedEvent) {
  const timestamp = new Date(event.timestamp * 1000);

  await db.insert(trades).values({
    signature: event.signature,
    marketPubkey: event.market,
    trader: event.trader,
    direction: event.isBuy ? "BUY" : "SELL",
    solAmount: event.solAmount.toString(),
    shareAmount: event.shareAmount.toString(),
    price: event.price.toString(),
    feePaid: event.feePaid.toString(),
    timestamp,
  });

  const [market] = await db.select().from(markets).where(eq(markets.pubkey, event.market)).limit(1);
  if (market) {
    const shareDelta = event.isBuy ? event.shareAmount : -event.shareAmount;
    const reserveDelta = event.isBuy ? event.solAmount : -event.solAmount;

    // Atomic increment at the SQL level -- concurrent trades on the same
    // market (e.g. several bots trading close together) can otherwise both
    // read the same pre-update row and overwrite each other's delta.
    await db
      .update(markets)
      .set({
        currentPrice: event.price.toString(),
        outstandingShares: sql`${markets.outstandingShares} + ${shareDelta}`,
        reserveSol: sql`${markets.reserveSol} + ${reserveDelta}`,
      })
      .where(eq(markets.pubkey, event.market));
  }

  await applyTradeToCandles(db, event.market, {
    price: event.price.toString(),
    solAmount: event.solAmount.toString(),
    timestamp,
  });

  if (market) {
    const hub = getHub();
    hub.broadcastTrade({
      market: market.nftMint,
      type: event.isBuy ? "buy" : "sell",
      price: event.price,
      size: event.shareAmount,
      timestamp: event.timestamp,
    });

    const bucketStart = getBucketStart(timestamp, "1m");
    const [liveCandle] = await db
      .select()
      .from(candles)
      .where(and(eq(candles.marketPubkey, event.market), eq(candles.resolution, "1m"), eq(candles.time, bucketStart)))
      .limit(1);

    if (liveCandle) {
      hub.broadcastCandleUpdate({
        market: market.nftMint,
        resolution: "1m",
        candle: {
          time: Math.floor(liveCandle.time.getTime() / 1000),
          open: Number(liveCandle.open),
          high: Number(liveCandle.high),
          low: Number(liveCandle.low),
          close: Number(liveCandle.close),
          volume: Number(liveCandle.volume),
        },
      });
    }
  }
}

export async function handleMarketSettled(db: Db, event: MarketSettledEvent) {
  await db
    .update(markets)
    .set({ state: "SETTLING", reserveSol: event.finalReserve.toString() })
    .where(eq(markets.pubkey, event.market));
}

export async function handleMarketExtended(db: Db, event: MarketExtendedEvent) {
  await db
    .update(markets)
    .set({ expiresAt: new Date(event.newExpiresAt * 1000) })
    .where(eq(markets.pubkey, event.market));
}

export async function handleSharesRedeemed(db: Db, event: SharesRedeemedEvent) {
  const [market] = await db.select().from(markets).where(eq(markets.pubkey, event.market)).limit(1);
  if (!market) return;

  // Same atomic-increment reasoning as handleTradeExecuted -- redemptions
  // can also arrive close together for a settling market.
  const remainingShares = Number(market.outstandingShares ?? 0) - event.shares;

  await db
    .update(markets)
    .set({
      outstandingShares: sql`${markets.outstandingShares} - ${event.shares}`,
      reserveSol: sql`${markets.reserveSol} - ${event.solReceived}`,
      // force_redeem.rs flips the on-chain market to Settled once the last
      // share redeems (outstanding_shares hits 0) -- mirror that transition here.
      state: remainingShares <= 0 ? "SETTLED" : "SETTLING",
    })
    .where(eq(markets.pubkey, event.market));
}
