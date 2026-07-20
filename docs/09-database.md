# Database Schema

> This document defines the PostgreSQL schema for Candl's off-chain indexer and services.

---

## Overview

The database acts as a read-optimized replica of on-chain state and a storage engine for derived data (candles, analytics). The blockchain remains the ultimate source of truth.

---

## Core Tables

### 1. `markets`
Stores market metadata and current state.
```sql
CREATE TABLE markets (
    id SERIAL PRIMARY KEY,
    pubkey VARCHAR(44) UNIQUE NOT NULL,      -- Market account address
    nft_mint VARCHAR(44) NOT NULL,           -- NFT mint address
    creator VARCHAR(44) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    state VARCHAR(20) NOT NULL,              -- 'ACTIVE', 'SETTLING', 'SETTLED'
    fee_protocol_bps INTEGER NOT NULL,
    fee_creator_bps INTEGER NOT NULL,
    -- Cached current stats (updated via events)
    current_price NUMERIC,
    reserve_sol NUMERIC,
    outstanding_shares NUMERIC
);
```

### 2. `trades`
Immutable ledger of all buy/sell events.
```sql
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    signature VARCHAR(88) NOT NULL,          -- Transaction signature
    market_pubkey VARCHAR(44) REFERENCES markets(pubkey),
    trader VARCHAR(44) NOT NULL,
    direction VARCHAR(4) NOT NULL,           -- 'BUY' or 'SELL'
    sol_amount NUMERIC NOT NULL,
    share_amount NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    fee_paid NUMERIC NOT NULL,
    timestamp TIMESTAMP NOT NULL
);
CREATE INDEX idx_trades_market ON trades(market_pubkey);
CREATE INDEX idx_trades_timestamp ON trades(timestamp);
```

### 3. `candles`
Time-series data for charts.
```sql
CREATE TABLE candles (
    id SERIAL PRIMARY KEY,
    market_pubkey VARCHAR(44) REFERENCES markets(pubkey),
    resolution VARCHAR(5) NOT NULL,          -- '1m', '5m', '1h', '1d'
    time TIMESTAMP NOT NULL,
    open NUMERIC NOT NULL,
    high NUMERIC NOT NULL,
    low NUMERIC NOT NULL,
    close NUMERIC NOT NULL,
    volume NUMERIC NOT NULL,
    UNIQUE(market_pubkey, resolution, time)
);
```

### 4. `nft_metadata`
Cache for Metaplex metadata.
```sql
CREATE TABLE nft_metadata (
    mint VARCHAR(44) PRIMARY KEY,
    name VARCHAR(255),
    symbol VARCHAR(50),
    image_url TEXT,
    description TEXT,
    attributes JSONB,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Design Notes
- Store monetary values (SOL, shares) as `NUMERIC` to prevent precision loss.
- Never delete trades. They are an immutable log.
- Candles can be regenerated at any time by re-processing the `trades` table.
