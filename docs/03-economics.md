# Economics

> This document describes the economic model of Candl — how bonding curves work, how pricing is determined, how reserves are managed, and how value flows through the protocol.

---

## Core Economic Concept

Candl uses **cost-function based bonding curves** to create continuous, automated markets for individual NFTs.

A bonding curve is a mathematical function that determines the total cost of an asset based on its circulating supply. When someone buys, the supply increases, and the price goes up. When someone sells, the supply decreases, and the price goes down.

```
Buying  → Price increases
Selling → Price decreases
```

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

The chocolates are identical. The price increases because **supply is increasing**.

Now imagine someone returns chocolates to the box. More chocolates available in the box (less in circulation) → price drops.

That's a bonding curve.

---

## Reserve Is The Source Of Truth

Every market has only one real reserve.

- The reserve contains **real SOL** deposited by buyers.
- The reserve is the **only source of liquidity**.
- There are **NO virtual reserves**.
- There are **NO fake balances**.
- The reserve always exists on-chain and is fully transparent.

The reserve must always satisfy the bonding curve. Nobody may withdraw reserve funds except through selling Market Shares. The creator cannot access reserve funds, and the protocol cannot access reserve funds. Only bonding-curve trades may increase or decrease the reserve.

---

## Market Shares

When a user "buys into" an NFT market on Candl, they receive **market shares** — not the NFT itself.

Market shares represent:

- A position in that market's bonding curve.
- The ability to sell back to the curve at the current price.
- Exposure to the market's price movement.

**Market Shares are minted when users buy.**
**Market Shares are burned when users sell.**

- They are never pre-minted.
- They are never allocated to the creator.
- They are never allocated to the protocol.

Circulating supply is entirely created by market activity.

### Why Shares Instead of the NFT?

| Approach | Problem |
|---|---|
| Buy the entire NFT | Only one buyer at a time. No continuous market. |
| Fractional NFT ownership | Complex redemption. Legal ambiguity. Already exists. |
| Receipt NFTs | No real value. No incentive. |
| Market shares | Enables fractional participation, continuous trading, and clear value proposition. |

Market shares make every NFT market accessible to any budget. You don't need to afford the entire NFT — you buy shares proportional to what you can invest.

---

## The Cost Function Model

Candl uses a **cost-function based bonding curve**. The protocol defines a cost function `C(s)`.

Where:
- `s` = current circulating supply
- `C(s)` = total SOL that should exist in the reserve when supply equals `s`.

The reserve should always exactly equal:

```
Reserve = C(Current Supply)
```

This cost function becomes the single source of truth for pricing and reserve mechanics.

### Final V1 Formulas

For V1, Candl uses a specific quadratic bonding curve where the numbers are fully configurable via the protocol configuration. Rather than starting with the price, Candl strictly defines the **Reserve Formula** as the source of truth for the smart contract:

```
Reserve(S) = curve_alpha * S³ + curve_beta * S
```

From this, the UI can mathematically derive the spot price (the derivative of the reserve):

```
Price(S) = 3 * curve_alpha * S² + curve_beta
```

This architecture ensures the smart contract logic remains incredibly clean. If the market is growing too slowly, governance can simply tweak `curve_alpha`, and both the reserve and price will remain mathematically consistent automatically.

When executing trades, the cost is calculated strictly from the Reserve function:

```
BuyCost = Reserve(S + Δ) - Reserve(S)

SellRefund = Reserve(S) - Reserve(S - Δ)
```

### Protocol Configuration

To ensure the protocol is future-proof and can be tuned via governance without requiring a smart contract upgrade, the curve parameters are **not hardcoded**. They are defined dynamically inside the `ProtocolConfig`:

```rust
pub struct ProtocolConfig {
    pub curve_alpha: u64,
    pub curve_beta: u64,
    pub protocol_fee_bps: u16,
    pub creator_fee_bps: u16,
}
```

Every market in Candl uses this same mathematical model, but by storing `curve_alpha` (e.g., `0.001`) and `curve_beta` (e.g., `0.1`) in the config, the protocol retains maximum flexibility.

---

## Buying and Selling Mechanics

### Buying

When a buyer purchases Market Shares:

1. Read current circulating supply.
2. Decide the new supply after minting.
3. Compute the cost:
   `Cost = C(newSupply) - C(oldSupply)`
4. Buyer pays that amount.
5. Reserve increases by that amount.
6. New Market Shares are minted.

Every buy increases both reserve and supply.

### Selling

When a holder sells Market Shares:

1. Read current circulating supply.
2. Determine supply after burning.
3. Compute the payout:
   `Payout = C(oldSupply) - C(newSupply)`
4. Burn Market Shares.
5. Pay SOL from reserve.
6. Reserve decreases accordingly.

Every sell decreases both reserve and supply.

---

## Price Mechanics

### Current Price

The protocol internally derives a spot price from the bonding curve.

Conceptually:
**Current Price = marginal cost of minting the next Market Share.**

The displayed price on the frontend is the price of purchasing the next infinitesimally small Market Share according to the bonding curve's cost function.

### Price Impact

Large trades move the price more than small trades. This is called **price impact**.

```
Small buy  → Small price increase
Large buy  → Large price increase
```

The price impact is a natural property of the bonding curve. Traders should always check the estimated price impact before executing a trade.

### Slippage

Slippage is the difference between the expected price and the actual execution price. It occurs because the price moves as the trade is processed.

Candl supports **slippage tolerance** — the maximum acceptable slippage before a transaction is rejected.

---

## Fee Structure

Every trade on Candl incurs a fee. 

Candl uses a **fixed percentage-based fee model**, not flat fees. Every trade (buy and sell) incurs a total fee of **1.25%**. 

### Fee Distribution

The fee is split as follows:
- **0.95%** → Candl Protocol Treasury
- **0.30%** → Market Creator

These percentages apply uniformly across all markets. Creators cannot choose or customize their fee percentage. Every market on Candl follows the exact same fee structure to ensure consistency, predictability, and a uniform trading experience.

Percentage-based fees scale naturally with trade size and avoid unfairly penalizing small trades.

Fee values are stored in a configurable protocol configuration account (e.g., `ProtocolConfig`) so governance can update them in future protocol upgrades without changing the core trading logic.

### Incentive Structure

- **The protocol fee** (0.95%) funds protocol development, infrastructure, maintenance, and future ecosystem growth.
- **The creator fee** (0.30%) rewards asset owners for committing their asset, creating liquidity markets, and attracting trading activity, aligning incentives between creators and the protocol.

### When Fees Are Collected

Fees are collected on both **buys and sells**:

- **Buy**: Fee is added on top of the SOL required to purchase the shares.
- **Sell**: Fee is deducted from the SOL output returned from the curve.

This ensures the reserve is never reduced by fees — fees always come from the trader's side, and the reserve remains fully backed by `C(s)`.

---

## Market Lifecycle Economics

### Creation

When a market is created:

- NFT is locked.
- Market metadata is created.
- Supply starts at exactly zero.
- Reserve starts at exactly zero.
- No virtual liquidity exists.
- No shares exist until the first purchase.

### Active Trading

During the active phase:

```
Buyers send SOL → Cost Function is evaluated → Reserve grows → Price rises
Sellers return shares → Cost Function is evaluated → Reserve shrinks → Price falls
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
- Clear reserve backing — every share is backed by real SOL. There is no fake liquidity.

### For The Protocol

- Sustainable fee revenue from every trade.
- Network effects — more markets → more traders → more fees → more development.
- Open source — anyone can build on top, increasing the protocol's reach.

---

## Future Curves

The protocol architecture is designed to support different cost functions in the future.

Examples of future cost function shapes:

| Curve Type | Behavior | Use Case |
|---|---|---|
| **Linear** | Price increases steadily | Predictable, simple markets |
| **Quadratic** | Price increases faster over time | Scarcity-driven markets |
| **Sigmoid** | Slow start, fast middle, stable end | Markets with a "discovery" phase |
| **Logarithmic** | Fast start, slow growth | Markets that stabilize early |
| **Custom** | Creator-defined parameters | Advanced use cases |

V1 will initially use one default cost function. The exact mathematical function will be finalized after simulation and economic testing.

---

## Economic Risks

### Reserve Drain

If many holders sell simultaneously, the reserve will shrink rapidly. This is not a bug — it's how bonding curves work. Because the reserve exactly matches `C(s)`, there is always enough SOL in the reserve to pay out every single shareholder until supply reaches zero. Later sellers simply receive less SOL per share than earlier sellers.

### Low Trading Volume

A market with no trades generates no volume, no fees, and no creator royalties. The protocol depends on trading activity.

**Mitigation**: Market duration creates urgency. Discovery features (trending, new, hot) drive attention to active markets.

### Front-Running

A malicious actor could observe a pending buy transaction and submit their own buy first, profiting from the price increase.

**Mitigation**: Slippage tolerance limits the damage. On-chain priority mechanisms (Solana's fee prioritization) reduce but don't eliminate this risk.

### Price Manipulation

A well-capitalized actor could buy a large amount to inflate the price, then sell.

**Mitigation**: Price impact is transparent and visible before execution. The cost function shape makes extreme price movements increasingly expensive. All trades are on-chain and auditable.
