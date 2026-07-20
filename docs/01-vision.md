# Vision

> Candl is a decentralized market protocol that enables continuous price discovery and instant liquidity for unique digital assets using bonding curves. Every NFT becomes its own self-contained market with transparent pricing, live analytics, and on-chain trading.

---

## The Problem

NFTs today are broken as financial assets.

Traditional NFT marketplaces operate on a **listing model**: an owner sets a price, lists the NFT, and waits for a buyer. This creates fundamental problems that bonding curve-based token markets solved years ago:

| Problem | Tokens (Today) | NFTs (Today) |
|---|---|---|
| **Price discovery** | Continuous, real-time | Non-existent (floor price only) |
| **Liquidity** | Instant via AMMs | None (wait for a buyer) |
| **Charts** | Live candlestick charts | None |
| **Analytics** | Volume, depth, holders, trades | Minimal |
| **Trading experience** | DexScreener, TradingView | eBay-style listings |

NFTs deserve the same infrastructure that tokens have.

---

## The Solution

Candl replaces listings with **bonding curves**.

Every NFT deposited into Candl gets its own automated market maker. Users buy and sell **market shares** instantly against the curve. Every trade updates the price. Every price update generates a candlestick. Every candlestick feeds into a live chart.

```
Traditional NFT Marketplace:

    Owner → List NFT → Wait → Maybe someone buys

Candl:

    Creator → Deposit NFT → Market Opens → Instant Trading → Live Charts
```

The result: every NFT becomes a continuously tradable financial asset with real-time pricing, transparent reserves, and full analytics.

---

## What Candl Is

Candl is **liquidity infrastructure for non-fungible assets**.

It is not an NFT marketplace. It is not a PFP launchpad. It is not a social platform.

It is a protocol that enables:

- **Continuous liquidity** — Buy or sell at any time against the bonding curve.
- **Price discovery** — The price is determined algorithmically by supply and demand.
- **Live candlestick charts** — Every trade generates OHLC data for professional charting.
- **Market analytics** — Volume, depth, holder distribution, reserve balance, price history.
- **Open infrastructure** — An SDK and API that developers can build on.

---

## The Three Layers

Candl is designed as a three-layer stack, following the pattern of successful Solana infrastructure projects:

```
┌────────────────────────────┐
│        Website (UI)         │    Layer 3: Frontend
└──────────────┬─────────────┘
               │
┌──────────────┴─────────────┐
│      SDK / API / Indexer    │    Layer 2: Services
└──────────────┬─────────────┘
               │
┌──────────────┴─────────────┐
│     Candl Protocol (Anchor) │    Layer 1: On-Chain
└────────────────────────────┘
```

### Layer 1 — Protocol (Anchor Program)

The on-chain program handles:

- Market creation (NFT deposit, curve configuration, duration)
- Trading (buy shares, sell shares)
- Bonding curve math (constant product with virtual reserves)
- Reserve management (SOL accounting)
- Fee collection (protocol fee, creator royalty)
- Market state (active, settled, extended)

No frontend logic. No off-chain dependencies. Pure on-chain protocol.

### Layer 2 — Services (Indexer, API, SDK)

Off-chain services handle:

- Indexing blockchain events (trades, market creation, settlement)
- Generating candlestick data (OHLC aggregation)
- Computing analytics (volume, holders, depth, trends)
- Serving REST and WebSocket APIs
- Providing a TypeScript SDK for developers

### Layer 3 — Website (Frontend)

The user-facing application handles:

- Market discovery (trending, new, hot)
- NFT market pages (chart, analytics, trading)
- Wallet connection (Phantom, Solflare, Backpack)
- Trade execution (buy/sell with slippage protection)
- Creator tools (create market, configure curve)
- Portfolio tracking

---

## Why Solana?

- **Speed**: ~400ms block times enable real-time trading and charting.
- **Cost**: Sub-cent transaction fees make frequent trading viable.
- **Ecosystem**: Metaplex NFT standards, Anchor framework, rich wallet ecosystem.
- **Community**: Active developer community building trading infrastructure.
- **Precedent**: Pump.fun proved that bonding curve-based trading works at scale on Solana.

---

## Who Is Candl For?

### Creators

Artists, musicians, game developers, and digital creators who want instant, continuous markets for their work — with royalties on every trade.

### Traders

People who want to trade NFT markets the way they trade token markets — with charts, analytics, and instant execution.

### Developers

Engineers who want to build on top of NFT liquidity infrastructure — custom frontends, trading bots, analytics dashboards, portfolio trackers.

---

## The Bigger Vision

NFTs are just the first use case. Candl's protocol can create bonding curve markets for any unique asset:

- Digital art
- Game items
- Music rights
- AI-generated content
- Real-world assets (represented as unique tokens)
- Event tickets
- Domain names

The protocol is asset-agnostic. The bonding curve doesn't care what the asset is — it only cares about supply, demand, and reserves.

---

## How People Should Think About Candl

Don't think:

> "NFT Marketplace"

Think:

> "Continuous Liquidity Infrastructure for Non-Fungible Assets"

Don't pitch:

> "We're like OpenSea but with charts"

Pitch:

> "Every unique digital asset gets its own automated market maker, live candlestick chart, and transparent price discovery — all on-chain, all instant, all open source."

---

## Success Criteria

Candl succeeds when:

1. The protocol runs on Solana mainnet with real users and real SOL.
2. Multiple markets have enough volume to produce meaningful candlestick charts.
3. Developers are using the SDK to build integrations.
4. The Solana ecosystem recognizes Candl as legitimate infrastructure.
5. A contributor can read the documentation and onboard without needing external help.
6. An engineer at Solana Foundation, Jupiter, or a top infrastructure team would look at the codebase and think: "This is thoughtfully designed."
