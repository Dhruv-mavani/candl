import Fastify from "fastify";
import WebSocket from "ws";
import { getDb } from "../src/db/index.js";
import { registerWebSocketRoute } from "../src/api/websocket/index.js";
import { handleTradeExecuted } from "../src/services/indexer/handlers.js";

const PORT = 4001;
const MARKET_PUBKEY = "SmokeTestMarket11111111111111111111111111";
const MINT = "6gvxEaDHMmrtfq41N45XrEEy4YEkAWwXhbKjjsiFHzvs";
const TRADER = "9RRDcvHfNfKKfrgYLuLNQhcpXeDNaewaR9M8j1z8yrDW";

const db = getDb();
const app = Fastify();
await registerWebSocketRoute(app);
await app.listen({ port: PORT });

const received: unknown[] = [];
const ws = new WebSocket(`ws://localhost:${PORT}/api/v1/ws`);

await new Promise<void>((resolve, reject) => {
  ws.on("open", () => {
    ws.send(JSON.stringify({ action: "subscribe", topic: "market:trade", market: MINT }));
    setTimeout(resolve, 300); // let the subscribe land before firing the trade
  });
  ws.on("error", reject);
});

ws.on("message", (data) => received.push(JSON.parse(data.toString())));

await handleTradeExecuted(db, {
  type: "TradeExecuted",
  market: MARKET_PUBKEY,
  trader: TRADER,
  isBuy: true,
  solAmount: 0.5,
  shareAmount: 3,
  price: 0.18,
  feePaid: 0.00625,
  timestamp: Math.floor(Date.now() / 1000),
  signature: "sig4-live-ws-test",
});

await new Promise((resolve) => setTimeout(resolve, 500));

console.log(`Received ${received.length} WS message(s):`);
console.log(JSON.stringify(received, null, 2));

const gotTrade = received.some((m) => (m as { event?: string }).event === "trade");
const gotCandle = received.some((m) => (m as { event?: string }).event === "candle_update");
console.log("\nGot 'trade' event:", gotTrade);
console.log("Got 'candle_update' event:", gotCandle);

ws.close();
await app.close();
process.exit(gotTrade && gotCandle ? 0 : 1);
