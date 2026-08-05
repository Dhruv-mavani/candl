import type WebSocket from "ws";

// In-process pub/sub. docs/07-backend.md names Redis Pub/Sub as the
// eventual message broker for multi-instance deployments; V1 runs as a
// single process on one VPS (docs/05-architecture.md), so an in-memory hub
// is the correct-for-now choice -- swap for Redis when the backend needs to
// scale to multiple instances.

interface TradeEventData {
  market: string;
  type: "buy" | "sell";
  price: number;
  size: number;
  timestamp: number;
}

interface CandleEventData {
  market: string;
  resolution: string;
  candle: { time: number; open: number; high: number; low: number; close: number; volume: number };
}

const TRADE_TOPIC = "market:trade";

class WebSocketHub {
  private subscribers = new Map<string, Set<WebSocket>>();

  private key(topic: string, market: string) {
    return `${topic}:${market}`;
  }

  subscribe(topic: string, market: string, socket: WebSocket) {
    const key = this.key(topic, market);
    if (!this.subscribers.has(key)) this.subscribers.set(key, new Set());
    this.subscribers.get(key)?.add(socket);
  }

  unsubscribe(topic: string, market: string, socket: WebSocket) {
    this.subscribers.get(this.key(topic, market))?.delete(socket);
  }

  /** Called on socket close -- removes it from every topic it was subscribed to. */
  removeSocket(socket: WebSocket) {
    for (const sockets of this.subscribers.values()) sockets.delete(socket);
  }

  private publish(topic: string, market: string, message: unknown) {
    const sockets = this.subscribers.get(this.key(topic, market));
    if (!sockets || sockets.size === 0) return;

    const payload = JSON.stringify(message);
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) socket.send(payload);
    }
  }

  broadcastTrade(data: TradeEventData) {
    this.publish(TRADE_TOPIC, data.market, { event: "trade", data });
  }

  broadcastCandleUpdate(data: CandleEventData) {
    this.publish(TRADE_TOPIC, data.market, { event: "candle_update", data });
  }
}

let _hub: WebSocketHub | null = null;

export function getHub(): WebSocketHub {
  if (!_hub) _hub = new WebSocketHub();
  return _hub;
}
