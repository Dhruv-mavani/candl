import Fastify from "fastify";
import cors from "@fastify/cors";
import { getDb } from "./db/index.js";
import { registerMarketRoutes } from "./api/routes/markets.js";
import { registerProtocolRoutes } from "./api/routes/protocol.js";
import { registerWebSocketRoute } from "./api/websocket/index.js";
import { startIndexer } from "./services/indexer/index.js";

const PORT = Number(process.env.PORT ?? 4000);

async function main() {
  const db = getDb();
  const app = Fastify({ logger: true });

  await app.register(cors);
  await registerWebSocketRoute(app);

  registerMarketRoutes(app, db);
  registerProtocolRoutes(app, db);

  app.get("/health", async () => ({ status: "ok" }));

  const indexer = startIndexer(db);

  const shutdown = async () => {
    indexer.stop();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
