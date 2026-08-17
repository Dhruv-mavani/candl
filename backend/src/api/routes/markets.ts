import type { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { markets, nftMetadata, trades } from "../../db/schema.js";
import type { MarketState } from "../../db/schema.js";
import { RESOLUTIONS, getCandles } from "../../services/candle-engine/index.js";
import type { CandleResolution } from "../../db/schema.js";
import { getMarketStats } from "../../services/analytics/index.js";

type Db = ReturnType<typeof getDb>;

async function findMarketByMint(db: Db, mint: string) {
  const [row] = await db
    .select({ market: markets, metadata: nftMetadata })
    .from(markets)
    .leftJoin(nftMetadata, eq(nftMetadata.mint, markets.nftMint))
    .where(eq(markets.nftMint, mint))
    .limit(1);
  return row ? { ...row.market, metadata: row.metadata } : null;
}

interface ListMarketsQuery {
  status?: string;
  sort?: "volume" | "newest";
  limit?: string;
  offset?: string;
}

interface CandlesQuery {
  resolution?: string;
  from?: string;
  to?: string;
}

interface PaginationQuery {
  limit?: string;
  offset?: string;
}

export function registerMarketRoutes(app: FastifyInstance, db: Db) {
  // GET /markets -- list all markets with basic stats.
  app.get<{ Querystring: ListMarketsQuery }>("/api/v1/markets", async (request, reply) => {
    const { status, sort = "newest", limit = "20", offset = "0" } = request.query;

    const conditions = status ? [eq(markets.state, status.toUpperCase() as MarketState)] : [];
    const volumeExpr = sql<string>`COALESCE(SUM(${trades.solAmount}), 0)`;

    const rows = await db
      .select({ market: markets, metadata: nftMetadata, volume: volumeExpr })
      .from(markets)
      .leftJoin(trades, eq(trades.marketPubkey, markets.pubkey))
      .leftJoin(nftMetadata, eq(nftMetadata.mint, markets.nftMint))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(markets.id, nftMetadata.mint)
      .orderBy(sort === "volume" ? desc(volumeExpr) : desc(markets.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    return reply.send(rows.map(({ market, metadata, volume }) => ({ ...market, metadata, volume: Number(volume) })));
  });

  // GET /markets/:mint -- market configuration, current price, reserve, NFT metadata.
  app.get<{ Params: { mint: string } }>("/api/v1/markets/:mint", async (request, reply) => {
    const market = await findMarketByMint(db, request.params.mint);
    if (!market) return reply.code(404).send({ error: "Market not found" });
    return reply.send(market);
  });

  // GET /markets/:mint/candles -- OHLC data for the chart.
  app.get<{ Params: { mint: string }; Querystring: CandlesQuery }>(
    "/api/v1/markets/:mint/candles",
    async (request, reply) => {
      const market = await findMarketByMint(db, request.params.mint);
      if (!market) return reply.code(404).send({ error: "Market not found" });

      const resolution = (request.query.resolution ?? "1h") as CandleResolution;
      if (!RESOLUTIONS.includes(resolution)) {
        return reply.code(400).send({ error: `resolution must be one of: ${RESOLUTIONS.join(", ")}` });
      }

      const from = request.query.from ? new Date(Number(request.query.from) * 1000) : undefined;
      const to = request.query.to ? new Date(Number(request.query.to) * 1000) : undefined;

      const rows = await getCandles(db, market.pubkey, resolution, from, to);
      return reply.send(
        rows.map((c) => ({
          time: Math.floor(c.time.getTime() / 1000),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        }))
      );
    }
  );

  // GET /markets/:mint/trades -- recent trades.
  app.get<{ Params: { mint: string }; Querystring: PaginationQuery }>(
    "/api/v1/markets/:mint/trades",
    async (request, reply) => {
      const market = await findMarketByMint(db, request.params.mint);
      if (!market) return reply.code(404).send({ error: "Market not found" });

      const { limit = "50", offset = "0" } = request.query;

      const rows = await db
        .select()
        .from(trades)
        .where(eq(trades.marketPubkey, market.pubkey))
        .orderBy(desc(trades.timestamp))
        .limit(Number(limit))
        .offset(Number(offset));

      return reply.send(rows);
    }
  );

  // GET /markets/:mint/stats -- 24h rolling stats.
  app.get<{ Params: { mint: string } }>("/api/v1/markets/:mint/stats", async (request, reply) => {
    const market = await findMarketByMint(db, request.params.mint);
    if (!market) return reply.code(404).send({ error: "Market not found" });

    const stats = await getMarketStats(db, market.pubkey);
    if (!stats) return reply.code(404).send({ error: "Market not found" });

    return reply.send(stats);
  });
}
