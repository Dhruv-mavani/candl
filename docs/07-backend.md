# Backend Architecture

> This document covers the off-chain services in Candl (Layer 2).

---

## Overview

The backend is composed of modular services. These services read from the blockchain, compute derived data, and serve it to the frontend. 

**Core philosophy**: The backend never duplicates on-chain logic (like calculating bond curve outputs). It is strictly for indexing, aggregation, caching, and serving.

---

## Services

### 1. Indexer

**Role**: Listens to the Solana blockchain for Candl program events and stores them in the database.

**Flow**:
1. Subscribes to Solana via WebSocket (`logsSubscribe`).
2. When a log matching the Candl program ID arrives, fetches the transaction.
3. Decodes Anchor events (`MarketCreated`, `TradeExecuted`, etc.).
4. Inserts raw events into the PostgreSQL database.
5. Publishes a lightweight message (e.g., via Redis Pub/Sub) to notify downstream services.

**Reliability**:
- The indexer must handle RPC disconnects and missed blocks.
- It should run a periodic polling fallback to catch any events missed by WebSockets.

### 2. Candle Engine

**Role**: Generates OHLC (Open, High, Low, Close) candlestick data from raw trades.

**Flow**:
1. Listens for `TradeExecuted` events from the indexer.
2. For each configured interval (1m, 5m, 15m, 1h, 4h, 1d), updates the current active candle.
3. If the trade timestamp crosses an interval boundary, closes the previous candle and opens a new one.
4. Stores candles in the database.
5. Broadcasts the updated candle via WebSocket to connected clients.

### 3. Analytics Engine

**Role**: Calculates market-level statistics.

**Metrics**:
- 24h Volume
- Total Volume
- Current Market Cap
- Holder Count
- All-Time High / Low

**Flow**:
- Subscribes to events or runs periodic cron jobs (e.g., every minute) to recalculate rolling 24h volume.
- Stores aggregated stats in a fast-read table or Redis cache.

### 4. Metadata Service

**Role**: Resolves Metaplex NFT metadata.

**Flow**:
1. When a new market is created, fetches on-chain token metadata.
2. Fetches the off-chain JSON URI (image, attributes).
3. Caches the result in the database so the frontend doesn't need to spam IPFS/Arweave.

---

## Technology Stack

- **Runtime**: Node.js or Bun
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma or Drizzle ORM)
- **Message Broker**: Redis (for Pub/Sub between services and caching)
- **Blockchain RPC**: Helius or generic Solana RPC

---

## Deployment

In V1, these services can run as separate processes on a single server (e.g., managed via PM2 or Docker Compose). As traffic scales, they can be deployed as independent microservices to AWS/GCP.
