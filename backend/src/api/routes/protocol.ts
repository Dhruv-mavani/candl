import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { markets, nftMetadata, trades } from "../../db/schema.js";
import {
  getCreatorEarnings,
  getProtocolStats,
  getTrendingMarkets,
  getTraderPortfolio,
  getTraderPortfolioPerformance,
  getTraderPortfolioHistory,
  getProtocolEarningsHistory,
  getProtocolEarningsByMarket,
  PERFORMANCE_PERIOD_MS,
} from "../../services/analytics/index.js";

type Db = ReturnType<typeof getDb>;

export function registerProtocolRoutes(app: FastifyInstance, db: Db) {
  // GET /protocol/stats -- protocol-level analytics (docs/05-architecture.md).
  app.get("/api/v1/protocol/stats", async (_request, reply) => {
    const stats = await getProtocolStats(db);
    return reply.send(stats);
  });

  // GET /protocol/trending -- markets ranked by 24h volume.
  app.get<{ Querystring: { limit?: string } }>("/api/v1/protocol/trending", async (request, reply) => {
    const limit = Number(request.query.limit ?? "10");
    const trending = await getTrendingMarkets(db, limit);
    return reply.send(trending);
  });

  // GET /protocol/earnings/history -- cumulative protocol volume + fee earnings over time.
  app.get<{ Querystring: { points?: string } }>("/api/v1/protocol/earnings/history", async (request, reply) => {
    const points = request.query.points ? Number(request.query.points) : undefined;
    const history = await getProtocolEarningsHistory(db, points);
    return reply.send(history);
  });

  // GET /protocol/earnings/by-market -- markets ranked by protocol fee revenue generated.
  app.get<{ Querystring: { limit?: string } }>("/api/v1/protocol/earnings/by-market", async (request, reply) => {
    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const byMarket = await getProtocolEarningsByMarket(db, limit);
    return reply.send(byMarket);
  });

  // GET /creators/:pubkey/earnings -- what a market creator has earned in fees, per market they created.
  app.get<{ Params: { pubkey: string } }>("/api/v1/creators/:pubkey/earnings", async (request, reply) => {
    const earnings = await getCreatorEarnings(db, request.params.pubkey);
    return reply.send(earnings);
  });

  // GET /traders/:pubkey/portfolio -- a wallet's current share holdings across every market, derived from its own trade log.
  app.get<{ Params: { pubkey: string } }>("/api/v1/traders/:pubkey/portfolio", async (request, reply) => {
    const portfolio = await getTraderPortfolio(db, request.params.pubkey);
    return reply.send(portfolio);
  });

  // GET /traders/:pubkey/performance -- day/week/month/year change in value of a wallet's current holdings.
  app.get<{ Params: { pubkey: string } }>("/api/v1/traders/:pubkey/performance", async (request, reply) => {
    const performance = await getTraderPortfolioPerformance(db, request.params.pubkey);
    return reply.send(performance);
  });

  // GET /traders/:pubkey/portfolio/history -- real value-over-time series for a wallet's current holdings.
  // ?period=day|week|month|year windows it to match the performance toggle; omitted spans all real history.
  app.get<{ Params: { pubkey: string }; Querystring: { points?: string; period?: string } }>(
    "/api/v1/traders/:pubkey/portfolio/history",
    async (request, reply) => {
      const points = request.query.points ? Number(request.query.points) : undefined;
      const period = request.query.period as keyof typeof PERFORMANCE_PERIOD_MS | undefined;
      const since = period && period in PERFORMANCE_PERIOD_MS ? new Date(Date.now() - PERFORMANCE_PERIOD_MS[period]) : undefined;
      const history = await getTraderPortfolioHistory(db, request.params.pubkey, points, since);
      return reply.send(history);
    }
  );

  // GET /traders/:pubkey/trades -- this wallet's own trade history across every market, most recent first.
  app.get<{ Params: { pubkey: string }; Querystring: { limit?: string; offset?: string } }>(
    "/api/v1/traders/:pubkey/trades",
    async (request, reply) => {
      const { limit = "50", offset = "0" } = request.query;
      const rows = await db
        .select({
          id: trades.id,
          signature: trades.signature,
          marketPubkey: trades.marketPubkey,
          direction: trades.direction,
          solAmount: trades.solAmount,
          shareAmount: trades.shareAmount,
          price: trades.price,
          feePaid: trades.feePaid,
          timestamp: trades.timestamp,
          nftMint: markets.nftMint,
          nftName: nftMetadata.name,
          nftImageUrl: nftMetadata.imageUrl,
        })
        .from(trades)
        .innerJoin(markets, eq(trades.marketPubkey, markets.pubkey))
        .leftJoin(nftMetadata, eq(nftMetadata.mint, markets.nftMint))
        .where(eq(trades.trader, request.params.pubkey))
        .orderBy(desc(trades.timestamp))
        .limit(Number(limit))
        .offset(Number(offset));

      return reply.send(rows);
    }
  );
}
