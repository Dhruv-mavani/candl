# Candl Backend

Layer 2 of the Candl stack (see `../docs/05-architecture.md`, `../docs/07-backend.md`). Node.js + TypeScript, Fastify, Drizzle ORM, Neon Postgres.

## What's real vs. what's waiting on Phase 1

Everything here talks to a real, provisioned Neon Postgres database and real Solana devnet RPC. The **only** thing that can't be real yet is decoding Candl program events (`src/services/indexer/decode.ts`) -- the Anchor program itself (`docs/06-smart-contracts.md`) hasn't been written or deployed (`docs/14-roadmap.md`, Phase 1). Everything downstream of that single function -- DB writes, candle aggregation, analytics, the REST API, the WebSocket broadcasts -- is fully implemented and has been verified against the live database.

## Structure

```
src/
├── db/            Drizzle schema + client (docs/09-database.md)
├── services/
│   ├── indexer/       Solana log subscription + event handlers (idle until CANDL_PROGRAM_ID is set)
│   ├── candle-engine/  OHLC aggregation from the trades table
│   ├── analytics/      Market + protocol-level stats
│   └── metadata/       Metaplex on-chain + off-chain metadata resolution (fully functional today)
├── api/
│   ├── routes/     REST endpoints (docs/10-api.md)
│   └── websocket/  WS pub/sub hub + route (docs/10-api.md)
└── server.ts       Entry point
```

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / DATABASE_URL_UNPOOLED from your Neon project
npm run db:generate    # regenerate SQL migrations after changing src/db/schema.ts
npx tsx src/db/migrate.ts  # apply migrations (drizzle-kit push needs a TTY, so this is the non-interactive path)
npm run dev
```

Once the Candl Anchor program is deployed, set `CANDL_PROGRAM_ID` in `.env` to start indexing real trades.

## Scripts

`scripts/` holds manual verification utilities (this codebase has no on-chain program yet to generate real events for automated tests against):

- `smoke-test-metadata.ts <mint>` -- resolves on-chain + off-chain metadata for any devnet NFT mint
- `smoke-test-metadata-cache.ts <mint>` -- same, but verifies the `nft_metadata` cache round-trip
- `smoke-test-indexer.ts` -- verifies the indexer's idle path when `CANDL_PROGRAM_ID` is unset
- `smoke-test-ws-e2e.ts` -- boots a real Fastify+WS server, subscribes a client, fires a trade through the real handler pipeline, and asserts both `trade` and `candle_update` messages arrive
- `smoke-test-e2e.ts` / `clean-smoke-test-data.ts` -- seeds/removes a fake market+trades to manually exercise the REST API end to end
