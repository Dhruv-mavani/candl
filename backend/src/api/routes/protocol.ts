import type { FastifyInstance } from "fastify";
import type { getDb } from "../../db/index.js";
import { getCreatorEarnings, getProtocolStats, getTrendingMarkets } from "../../services/analytics/index.js";

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

  // GET /creators/:pubkey/earnings -- what a market creator has earned in fees, per market they created.
  app.get<{ Params: { pubkey: string } }>("/api/v1/creators/:pubkey/earnings", async (request, reply) => {
    const earnings = await getCreatorEarnings(db, request.params.pubkey);
    return reply.send(earnings);
  });
}
