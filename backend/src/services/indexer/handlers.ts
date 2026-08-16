import { and, eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { candles, markets, trades } from "../../db/schema.js";
import { applyTradeToCandles, getBucketStart } from "../candle-engine/index.js";
import { resolveAndCacheNftMetadata } from "../metadata/index.js";
import { getHub } from "../../api/websocket/hub.js";
import type {
  MarketCreatedEvent,
  MarketExtendedEvent,
  MarketSettledEvent,
  SharesRedeemedEvent,
  TradeExecutedEvent,
} from "./events.js";

// Default protocol fee split from docs/03-economics.md; overwritten once the
// program exposes real per-market fee config in the MarketCreated event.
const DEFAULT_PROTOCOL_FEE_BPS = 95;
const DEFAULT_CREATOR_FEE_BPS = 30;
const DEFAULT_DURATION_SECONDS = 30 * 24 * 60 * 60;

type Db = ReturnType<typeof getDb>;

export async function handleMarketCreated(db: Db, event: MarketCreatedEvent) {
  const createdAt = new Date(event.timestamp * 1000);

  await db
    .insert(markets)
    .values({
      pubkey: event.market,
      nftMint: event.nftMint,
      creator: event.creator,
      createdAt,
      duration: DEFAULT_DURATION_SECONDS,
      expiresAt: new Date(createdAt.getTime() + DEFAULT_DURATION_SECONDS * 1000),
      state: "ACTIVE",
      feeProtocolBps: DEFAULT_PROTOCOL_FEE_BPS,
      feeCreatorBps: DEFAULT_CREATOR_FEE_BPS,
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
    const currentShares = Number(market.outstandingShares ?? 0);
    const currentReserve = Number(market.reserveSol ?? 0);
    const shareDelta = event.isBuy ? event.shareAmount : -event.shareAmount;
    const reserveDelta = event.isBuy ? event.solAmount : -event.solAmount;

    await db
      .update(markets)
      .set({
        currentPrice: event.price.toString(),
        outstandingShares: (currentShares + shareDelta).toString(),
        reserveSol: (currentReserve + reserveDelta).toString(),
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

  const remainingShares = Number(market.outstandingShares ?? 0) - event.shares;
  const remainingReserve = Number(market.reserveSol ?? 0) - event.solReceived;

  await db
    .update(markets)
    .set({
      outstandingShares: remainingShares.toString(),
      reserveSol: remainingReserve.toString(),
      // redeem.rs flips the on-chain market to Settled once the last share
      // redeems (outstanding_shares hits 0) -- mirror that transition here.
      state: remainingShares <= 0 ? "SETTLED" : "SETTLING",
    })
    .where(eq(markets.pubkey, event.market));
}
