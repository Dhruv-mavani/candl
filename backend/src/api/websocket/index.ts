import type { FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import type WS from "ws";
import { getHub } from "./hub.js";

interface SubscribeMessage {
  action: "subscribe" | "unsubscribe";
  topic: string;
  market: string;
}

function isSubscribeMessage(value: unknown): value is SubscribeMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    (message.action === "subscribe" || message.action === "unsubscribe") &&
    typeof message.topic === "string" &&
    typeof message.market === "string"
  );
}

// docs/10-api.md: client sends { action: "subscribe", topic: "market:trade", market }
// and receives { event: "trade" | "candle_update", data: {...} } messages.
export async function registerWebSocketRoute(app: FastifyInstance) {
  await app.register(fastifyWebsocket);

  app.get("/api/v1/ws", { websocket: true }, (socket) => {
    const hub = getHub();

    socket.on("message", (raw: WS.Data) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        socket.send(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      if (!isSubscribeMessage(parsed)) {
        socket.send(JSON.stringify({ error: "Expected { action, topic, market }" }));
        return;
      }

      if (parsed.action === "subscribe") hub.subscribe(parsed.topic, parsed.market, socket);
      else hub.unsubscribe(parsed.topic, parsed.market, socket);
    });

    socket.on("close", () => hub.removeSocket(socket));
  });
}

export { getHub } from "./hub.js";
