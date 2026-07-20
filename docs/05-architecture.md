# Architecture

> This document is the complete system blueprint for Candl. It describes every layer, every service, every module, and how they communicate.

---

## System Overview

Candl is a three-layer architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Layer 3: Frontend                      │
│                                                           │
│   apps/web          apps/admin         apps/docs          │
│   (Trading UI)      (Admin Panel)      (Documentation)    │
└───────────────────────────┬───────────────────────────────┘
                            │
                   REST API / WebSocket
                            │
┌───────────────────────────┴───────────────────────────────┐
│                   Layer 2: Services                        │
│                                                            │
│   Indexer    Candle Engine    Analytics    Search           │
│   Metadata   Notifications   Portfolio                     │
└───────────────────────────┬────────────────────────────────┘
                            │
                   Solana RPC / Events
                            │
┌───────────────────────────┴───────────────────────────────┐
│                Layer 1: Protocol (On-Chain)                 │
│                                                            │
│   programs/candl (Anchor Program)                          │
│   Instructions: create_market, buy, sell, settle, extend   │
│   Accounts: Market, BondingCurve, TradeHistory             │
│   Events: MarketCreated, TradeExecuted, MarketSettled       │
└────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
candl/
│
├── apps/                          # Applications
│   ├── web/                       # Main trading website
│   ├── admin/                     # Admin dashboard (V2)
│   └── docs/                      # Documentation site (V3)
│
├── programs/                      # Solana on-chain programs
│   └── candl/                     # Main Anchor program
│       ├── src/
│       │   ├── lib.rs             # Program entry point
│       │   ├── instructions/      # Instruction handlers
│       │   │   ├── create_market.rs
│       │   │   ├── buy.rs
│       │   │   ├── sell.rs
│       │   │   ├── settle.rs
│       │   │   ├── extend_market.rs
│       │   │   └── redeem.rs
│       │   ├── state/             # Account structures
│       │   │   ├── market.rs
│       │   │   └── bonding_curve.rs
│       │   ├── errors.rs          # Custom error codes
│       │   ├── events.rs          # Event definitions
│       │   └── constants.rs       # Protocol constants
│       ├── tests/                 # Integration tests
│       └── Anchor.toml
│
├── packages/                      # Shared packages
│   ├── types/                     # Shared TypeScript types
│   ├── config/                    # Shared configuration
│   ├── utils/                     # Shared utility functions
│   ├── ui/                        # Shared UI components
│   ├── charts/                    # Chart components
│   ├── wallet/                    # Wallet adapter wrapper
│   └── validation/                # Input validation
│
├── sdk/                           # TypeScript SDK (V3)
│   ├── src/
│   │   ├── client.ts              # Main SDK client
│   │   ├── market.ts              # Market operations
│   │   ├── trade.ts               # Trade operations
│   │   ├── curve.ts               # Curve calculations
│   │   └── types.ts               # SDK types
│   └── package.json
│
├── services/                      # Backend services
│   ├── indexer/                   # Blockchain event indexer
│   ├── candle-engine/             # Candlestick generator
│   ├── analytics/                 # Analytics aggregation
│   ├── search/                    # Full-text search (V2)
│   ├── metadata/                  # NFT metadata resolver
│   └── notifications/             # Alerts and notifications (V2)
│
├── docs/                          # Documentation
│   ├── 01-vision.md
│   ├── 02-philosophy.md
│   ├── 03-economics.md
│   ├── ... (this directory)
│
├── scripts/                       # Utility scripts
│   ├── deploy.sh                  # Deployment scripts
│   ├── seed.ts                    # Test data seeding
│   └── migrate.ts                 # Database migrations
│
├── tests/                         # End-to-end tests
│
├── Candl.md                       # Founder questionnaire
├── PROJECT_RULES.md               # Project rules
├── README.md                      # Repository README
├── package.json                   # Root package.json
├── turbo.json                     # Turborepo config
└── .gitignore
```

---

## Layer 1: Protocol (On-Chain)

### Technology

- **Framework**: Anchor (Solana program framework)
- **Language**: Rust
- **NFT Standard**: Metaplex Token Metadata

### Program Architecture

```
programs/candl/src/
├── lib.rs                         # declare_id!, program module
├── instructions/
│   ├── mod.rs                     # Re-exports
│   ├── create_market.rs           # Create a new market
│   ├── buy.rs                     # Buy shares
│   ├── sell.rs                    # Sell shares
│   ├── extend_market.rs           # Extend market duration
│   ├── settle.rs                  # Transition to settlement
│   └── redeem.rs                  # Redeem shares for SOL
├── state/
│   ├── mod.rs                     # Re-exports
│   ├── market.rs                  # Market account
│   └── bonding_curve.rs           # Curve state and math
├── errors.rs                      # CandlError enum
├── events.rs                      # Event structs
└── constants.rs                   # Protocol-level constants
```

### Accounts (PDAs)

| Account | Seeds | Description |
|---|---|---|
| `Market` | `["market", nft_mint]` | Stores market state, configuration, and references |
| `MarketVault` | `["vault", market]` | Holds SOL reserve for the market |
| `NftEscrow` | `["nft_escrow", market]` | Holds the NFT during the market's lifetime |

### Instructions

| Instruction | Description | Access |
|---|---|---|
| `create_market` | Deposit NFT, initialize curve, start market | NFT owner only |
| `buy` | Buy shares with SOL | Anyone |
| `sell` | Sell shares for SOL | Share holder only |
| `extend_market` | Extend market duration | Creator only |
| `settle` | Transition expired market to settlement | Anyone (permissionless) |
| `redeem` | Redeem shares for proportional SOL | Share holder only |

### Events

| Event | Emitted When | Contains |
|---|---|---|
| `MarketCreated` | Market is created | Market pubkey, NFT mint, creator, curve params, duration |
| `TradeExecuted` | Buy or sell completes | Market, trader, direction, amounts, price, fees |
| `MarketExtended` | Duration is extended | Market, new expiry |
| `MarketSettled` | Market transitions to settled | Market, final reserve, final supply |
| `SharesRedeemed` | Shares redeemed during settlement | Market, trader, shares, SOL received |

---

## Layer 2: Services (Off-Chain)

### Indexer

**Responsibility**: Listen to Solana for Candl program events and store them in the database.

```
Solana RPC (WebSocket)
    │
    ├── Receive transaction logs
    ├── Parse Anchor events
    ├── Validate and decode
    ├── Store in database
    └── Notify downstream services
```

**Technology**: Node.js/TypeScript, Solana web3.js, PostgreSQL

The indexer is the bridge between on-chain events and off-chain services. It:

- Subscribes to program logs via WebSocket.
- Decodes Anchor events from transaction data.
- Stores raw events in the database.
- Triggers downstream processing (candle generation, analytics updates).

### Candle Engine

**Responsibility**: Aggregate trade events into OHLC candlestick data.

```
Trade Events (from Indexer)
    │
    ├── Group by market
    ├── Group by time interval (1m, 5m, 15m, 1h, 4h, 1d)
    ├── Calculate Open, High, Low, Close
    ├── Calculate Volume
    ├── Store in candles table
    └── Push via WebSocket to connected clients
```

**Intervals Supported**: 1m, 5m, 15m, 30m, 1h, 4h, 1d

The Candle Engine produces the data that powers the live candlestick charts — the signature feature of Candl.

### Analytics Engine

**Responsibility**: Compute market-level and protocol-level analytics.

**Market-Level Analytics**:
- 24h volume
- Total volume
- Price change (24h, 7d, 30d)
- Current market cap (price × outstanding shares)
- Holder count
- Trade count
- Reserve balance
- All-time high / all-time low
- Largest holder
- Recent whale activity

**Protocol-Level Analytics**:
- Total markets created
- Total trading volume
- Total unique traders
- Total fees collected
- Most active markets
- Trending markets

### Metadata Service

**Responsibility**: Resolve and cache NFT metadata from Metaplex.

- Fetch on-chain metadata (name, symbol, URI).
- Fetch off-chain JSON metadata (image, attributes, description).
- Cache results to avoid repeated RPC calls.
- Serve metadata via API.

### Search Service (V2)

**Responsibility**: Full-text search across markets, creators, and NFTs.

### Notification Service (V2)

**Responsibility**: Price alerts, trade notifications, market events.

---

## Layer 3: Frontend

### Technology

- **Framework**: Next.js (React)
- **Styling**: CSS Modules or vanilla CSS (dark mode first)
- **Charts**: Lightweight charting library (TradingView-style)
- **Wallet**: Solana wallet adapter
- **State**: React context + SWR/React Query for data fetching

### Pages

| Route | Page | Description |
|---|---|---|
| `/` | Home / Discover | Trending, new, and hot markets |
| `/market/[id]` | Market Page | Chart, analytics, buy/sell, trade history |
| `/create` | Create Market | Deposit NFT, configure curve |
| `/portfolio` | Portfolio (V2) | User's positions across markets |
| `/creator/[address]` | Creator Page (V2) | Creator's markets, earnings |

### Market Page Components

The market page is the most important page in Candl. It should feel like opening a token on DexScreener:

```
┌─────────────────────────────────────────┐
│ NFT Image │ Name │ Creator │ Price      │
├─────────────────────────────────────────┤
│                                         │
│         Candlestick Chart               │
│         (1m, 5m, 15m, 1h, 4h, 1d)      │
│                                         │
├───────────────┬─────────────────────────┤
│               │                         │
│  Buy / Sell   │   Market Analytics      │
│  Panel        │   ├── 24h Volume        │
│               │   ├── Market Cap        │
│               │   ├── Holders           │
│               │   ├── Reserve           │
│               │   ├── ATH / ATL         │
│               │   ├── Price Impact      │
│               │   └── Slippage Est.     │
│               │                         │
├───────────────┴─────────────────────────┤
│                                         │
│         Trade History                   │
│         (Recent trades with direction)  │
│                                         │
├─────────────────────────────────────────┤
│         Holder Distribution             │
│         (Largest holders, whale alerts) │
└─────────────────────────────────────────┘
```

---

## Communication Flow

### Buy Trade Flow

```
1. User clicks "Buy" on frontend
2. Frontend builds transaction using SDK
3. User signs with wallet
4. Transaction sent to Solana
5. Anchor program executes buy instruction
6. TradeExecuted event emitted
7. Indexer receives event via WebSocket
8. Indexer stores trade in database
9. Candle Engine updates candlestick data
10. Analytics Engine updates market stats
11. WebSocket pushes update to frontend
12. Chart and analytics update in real-time
```

### Market Creation Flow

```
1. Creator fills form on /create page
2. Frontend builds create_market transaction
3. Creator signs with wallet
4. Transaction sent to Solana
5. Anchor program creates market, locks NFT
6. MarketCreated event emitted
7. Indexer receives event
8. Metadata Service fetches NFT metadata
9. Market appears on Discover page
```

---

## Data Flow Diagram

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  Trader   │────▶│  Solana   │────▶│   Indexer    │
│ (Wallet)  │     │ (Anchor)  │     │              │
└──────────┘     └──────────┘     └──────┬───────┘
                                          │
                              ┌───────────┼───────────┐
                              │           │           │
                     ┌────────▼──┐ ┌──────▼──┐ ┌─────▼──────┐
                     │  Candle   │ │Analytics│ │  Metadata  │
                     │  Engine   │ │ Engine  │ │  Service   │
                     └────────┬──┘ └──────┬──┘ └─────┬──────┘
                              │           │           │
                              └───────────┼───────────┘
                                          │
                                  ┌───────▼───────┐
                                  │   Database    │
                                  │  (PostgreSQL) │
                                  └───────┬───────┘
                                          │
                                  ┌───────▼───────┐
                                  │  REST API /   │
                                  │  WebSocket    │
                                  └───────┬───────┘
                                          │
                                  ┌───────▼───────┐
                                  │   Frontend    │
                                  │   (Next.js)   │
                                  └───────────────┘
```

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **On-Chain** | Anchor (Rust) | Standard for Solana programs |
| **Indexer** | Node.js + TypeScript | Fast development, Solana web3.js support |
| **Database** | PostgreSQL | Relational data, time-series (candles), proven at scale |
| **API** | Express/Fastify + TypeScript | Simple, fast, well-documented |
| **WebSocket** | ws or Socket.io | Real-time chart and analytics updates |
| **Frontend** | Next.js (React) | SSR, file-based routing, React ecosystem |
| **Styling** | Vanilla CSS / CSS Modules | Full control, no framework lock-in |
| **Charts** | Lightweight Charts (TradingView) | Professional candlestick rendering |
| **Wallet** | @solana/wallet-adapter | Standard Solana wallet integration |
| **Monorepo** | Turborepo | Fast builds, shared packages, task orchestration |
| **Package Manager** | pnpm | Fast, disk-efficient, workspace support |
| **Testing** | Vitest (JS), Anchor tests (Rust) | Fast, modern test runners |

---

## Scalability Considerations

### Assume Scale

Architecture should support:

- Millions of markets
- Millions of trades
- Millions of candles
- Thousands of concurrent WebSocket connections

### Horizontal Scaling

- **Indexer**: Can run multiple instances with partitioning by market.
- **Candle Engine**: Can run independently per market or per time interval.
- **API**: Stateless — can be load-balanced across instances.
- **Database**: Read replicas for API queries. Write to primary from indexer only.

### Caching

- NFT metadata is cached (rarely changes).
- Current market state is cached with short TTL (changes with every trade).
- Candlestick data is append-only (never changes once a candle is closed).
- Analytics are computed periodically, not on every request.

---

## Deployment Architecture (V1)

```
┌───────────────────────────┐
│       Solana Devnet        │
│   (Anchor Program)         │
└──────────────┬────────────┘
               │ RPC
┌──────────────┴────────────┐
│       VPS / Cloud          │
│                            │
│   ┌──────────────┐         │
│   │   Indexer    │         │
│   └──────┬───────┘         │
│          │                 │
│   ┌──────▼───────┐         │
│   │  PostgreSQL  │         │
│   └──────┬───────┘         │
│          │                 │
│   ┌──────▼───────┐         │
│   │   API Server │         │
│   └──────┬───────┘         │
│          │                 │
└──────────┼────────────────┘
           │
┌──────────▼────────────────┐
│     Vercel / Cloudflare    │
│   (Next.js Frontend)       │
└───────────────────────────┘
```

V1 can run on a single VPS. Scaling happens when needed, not prematurely.
