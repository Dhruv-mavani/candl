# Economics

> This document describes the economic model of Candl — how bonding curves work, how pricing is determined, how reserves are managed, and how value flows through the protocol.

---

## Core Economic Concept

Candl uses **bonding curves** to create continuous, automated markets for individual NFTs.

A bonding curve is a mathematical function that determines the price of an asset based on its supply. When someone buys, the supply decreases (or demand increases), and the price goes up. When someone sells, the supply increases (or demand decreases), and the price goes down.

```
Buying  → Price increases
Selling → Price decreases
```

This is the same mechanism used by:

- **Pump.fun** — for launching memecoins on Solana
- **Uniswap** — for decentralized token trading on Ethereum
- **Meteora** — for dynamic bonding curves on Solana

Candl applies this mechanism to **individual NFTs** instead of fungible tokens.

---

## How It Works (Simple Explanation)

Imagine a box of chocolates:

```
🍫🍫🍫🍫🍫🍫🍫🍫🍫🍫
10 chocolates
```

Rule: every time someone buys a chocolate, the next one costs more.

```
Chocolate #1  = ₹10
Chocolate #2  = ₹12
Chocolate #3  = ₹15
Chocolate #4  = ₹20
Chocolate #5  = ₹26
```

The chocolates are identical. The price increases because **supply is decreasing**.

Now imagine someone returns chocolates. More chocolates available → price drops.

That's a bonding curve.

---

## The Constant Product Model

Candl V1 uses a **constant product bonding curve with virtual reserves**, the same model used by Pump.fun and derived from Uniswap's `x * y = k` formula.

### How It Works

The bonding curve maintains two virtual reserves:

```
Virtual SOL Reserve  ×  Virtual Token Reserve  =  Constant (k)
```

When a user buys:

1. User sends SOL to the program.
2. SOL reserve increases.
3. Token reserve must decrease to maintain the constant.
4. The decrease in token reserve = tokens the user receives.
5. Price (SOL per token) has increased.

When a user sells:

1. User sends tokens back to the program.
2. Token reserve increases.
3. SOL reserve must decrease to maintain the constant.
4. The decrease in SOL reserve = SOL the user receives.
5. Price (SOL per token) has decreased.

### Example

```
Initial state:
    Virtual SOL Reserve  = 100 SOL
    Virtual Token Reserve = 1,000,000 shares
    k = 100 × 1,000,000 = 100,000,000

Alice buys with 20 SOL:
    New SOL Reserve = 120 SOL
    New Token Reserve = 100,000,000 / 120 = 833,333 shares
    Alice receives = 1,000,000 - 833,333 = 166,667 shares
    New price = 120 / 833,333 = 0.000144 SOL/share
    (was 0.0001 SOL/share → price increased)

Bob buys with 30 SOL:
    New SOL Reserve = 150 SOL
    New Token Reserve = 100,000,000 / 150 = 666,667 shares
    Bob receives = 833,333 - 666,667 = 166,666 shares
    Notice: Bob paid 30 SOL for ~166,666 shares
    Alice paid 20 SOL for ~166,667 shares
    Bob paid more per share (price went up)
```

### Why Virtual Reserves?

Virtual reserves allow the curve to have a meaningful starting price even when the real reserve is empty.

Without virtual reserves:
- Initial price would be 0 or undefined.
- The first buyer would get tokens for essentially nothing.

With virtual reserves:
- There's always a base price, even with no real SOL in the reserve.
- The curve shapes the launch experience, making early buys affordable but not free.

---

## Market Shares

When a user "buys into" an NFT market on Candl, they receive **market shares** — not the NFT itself.

Market shares represent:

- A position in that market's bonding curve.
- The ability to sell back to the curve at the current price.
- Exposure to the market's price movement.

Market shares are **not** transferable tokens. They exist only within the context of the Candl protocol and the specific market they belong to.

### Why Shares Instead of the NFT?

| Approach | Problem |
|---|---|
| Buy the entire NFT | Only one buyer at a time. No continuous market. |
| Fractional NFT ownership | Complex redemption. Legal ambiguity. Already exists. |
| Receipt NFTs | No real value. No incentive. |
| Market shares | Enables fractional participation, continuous trading, and clear value proposition. |

Market shares make every NFT market accessible to any budget. You don't need to afford the entire NFT — you buy shares proportional to what you can invest.

---

## Price Mechanics

### Current Price

The current price is derived from the bonding curve's reserves:

```
Price = Virtual SOL Reserve / Virtual Token Reserve
```

This price changes with every trade.

### Price Impact

Large trades move the price more than small trades. This is called **price impact**.

```
Small buy  → Small price increase
Large buy  → Large price increase
```

The price impact is a natural property of the constant product formula. Traders should always check the estimated price impact before executing a trade.

### Slippage

Slippage is the difference between the expected price and the actual execution price. It occurs because the price moves as the trade is processed.

Candl supports **slippage tolerance** — the maximum acceptable slippage before a transaction is rejected.

```
Expected price: 0.15 SOL/share
Slippage tolerance: 1%
Maximum acceptable price: 0.1515 SOL/share
If actual price > 0.1515 → Transaction reverts
```

---

## Fee Structure

Every trade on Candl incurs fees. Fees serve two purposes:

1. **Protocol sustainability** — Fund development and infrastructure.
2. **Creator incentive** — Reward creators for every trade, not just the first sale.

### Fee Distribution

```
Trade Fee (e.g., 2% of transaction)
├── Protocol Fee (e.g., 1%)  → Protocol Treasury
└── Creator Royalty (e.g., 1%) → Creator Wallet
```

Fee percentages are configurable per market (within protocol-defined bounds) and are enforced on-chain.

### When Fees Are Collected

Fees are collected on both **buys and sells**:

- **Buy**: Fee is deducted from the SOL input before the bonding curve calculation.
- **Sell**: Fee is deducted from the SOL output after the bonding curve calculation.

This ensures the reserve is never reduced by fees — fees come from the trader's side.

---

## Reserve Management

The reserve is the SOL balance held by the bonding curve program. It represents the total liquidity backing the market.

### Reserve Rules

1. **The reserve only changes via trades.** Buying adds to the reserve. Selling removes from the reserve.
2. **Fees are taken from the trader, not the reserve.** The reserve is always fully backed.
3. **The reserve is on-chain and verifiable.** Anyone can check the exact SOL balance at any time.
4. **No one can withdraw from the reserve except through selling shares.** Not even the creator. Not even the protocol.

### Reserve Transparency

Every market page displays:

- Current reserve balance (SOL)
- Total shares outstanding
- Price per share
- Reserve-to-share ratio

This gives traders complete visibility into the market's backing.

---

## Market Lifecycle Economics

### Creation

When a creator creates a market:

```
Creator deposits NFT
    → Market account created on-chain
    → Bonding curve initialized with virtual reserves
    → Market duration set
    → Market opens for trading
```

The creator does not deposit SOL. The initial reserve is virtual only.

### Active Trading

During the active phase:

```
Buyers send SOL → Receive shares → Reserve grows → Price rises
Sellers return shares → Receive SOL → Reserve shrinks → Price falls
```

Fees are collected on every trade and distributed to the protocol treasury and creator.

### Settlement

When the market duration expires:

```
No new buys allowed
Shareholders can redeem shares for proportional SOL from reserve
Creator receives accumulated royalties
Market state becomes "settled"
```

---

## Why This Model Works

### For Creators

- Instant market for their work — no waiting for buyers.
- Royalties on **every trade**, not just the first sale.
- Transparent earnings visible on-chain.
- No negotiation. No price-setting guesswork.

### For Traders

- Instant buy/sell against a mathematically deterministic curve.
- Transparent pricing — the bonding curve is the same for everyone.
- No reliance on counterparties — the curve is always available.
- Clear reserve backing — every share is backed by real SOL.

### For The Protocol

- Sustainable fee revenue from every trade.
- Network effects — more markets → more traders → more fees → more development.
- Open source — anyone can build on top, increasing the protocol's reach.

---

## Bonding Curve Types (Future)

V1 uses a single curve type: constant product with virtual reserves.

Future versions may support:

| Curve Type | Behavior | Use Case |
|---|---|---|
| **Linear** | Price increases steadily | Predictable, simple markets |
| **Quadratic** | Price increases faster over time | Scarcity-driven markets |
| **Sigmoid** | Slow start, fast middle, stable end | Markets with a "discovery" phase |
| **Logarithmic** | Fast start, slow growth | Markets that stabilize early |
| **Custom** | Creator-defined parameters | Advanced use cases |

These are V2+ features and are documented in `16-future-ideas.md`.

---

## Economic Risks

### Reserve Drain

If many holders sell simultaneously, the reserve can be significantly reduced. This is not a bug — it's how bonding curves work. Later sellers receive less SOL per share than earlier sellers.

**Mitigation**: The constant product formula naturally increases slippage for large sells, discouraging rapid liquidation.

### Low Trading Volume

A market with no trades generates no candles, no fees, and no creator royalties. The protocol depends on trading activity.

**Mitigation**: Market duration creates urgency. Discovery features (trending, new, hot) drive attention to active markets.

### Front-Running

A malicious actor could observe a pending buy transaction and submit their own buy first, profiting from the price increase.

**Mitigation**: Slippage tolerance limits the damage. On-chain priority mechanisms (Solana's fee prioritization) reduce but don't eliminate this risk. Future versions may explore commit-reveal schemes or MEV protection.

### Price Manipulation

A well-capitalized actor could buy a large amount to inflate the price, then sell.

**Mitigation**: Price impact is transparent and visible before execution. The constant product formula makes large price movements increasingly expensive. All trades are on-chain and auditable.
