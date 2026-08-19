# Market Lifecycle

> This document describes the complete lifecycle of a Candl market — from creation to settlement.

---

## Overview

Every market on Candl goes through a defined lifecycle:

```
Creation → Active Trading → Settlement
```

Each phase has specific rules, constraints, and behaviors. Markets are finite — they have a beginning and an end. This creates urgency, clean resolution, and prevents the protocol from being littered with inactive markets.

---

## Phase 1: Market Creation

### What Happens

A creator deposits an NFT and configures the market parameters.

```
Creator
    │
    ├── Deposits NFT into Candl program
    ├── Sets market duration
    └── Signs transaction

The bonding curve (curve_alpha, curve_beta) and fee split are global,
protocol-wide values read from ProtocolConfig at creation time -- not
something the creator configures per market (docs/03-economics.md,
docs/06-smart-contracts.md).
    
    ↓

Market Account Created (on-chain)
    │
    ├── NFT locked in program PDA
    ├── Bonding curve initialized
    ├── Market state = ACTIVE
    ├── Creation timestamp recorded
    ├── Expiry timestamp calculated
    └── Creator wallet recorded
```

### Parameters

| Parameter | Description | Constraints |
|---|---|---|
| **NFT Mint** | The NFT to create a market for | Must be a valid Metaplex NFT owned by the creator |
| **Market Duration** | How long the market runs | Minimum and maximum bounds (docs/06-smart-contracts.md) |

Fees are not a creator-chosen parameter -- every market uses the same protocol-wide split (docs/03-economics.md: 0.95% protocol / 0.30% creator), copied from `ProtocolConfig` at creation time.

### Rules

- The NFT is transferred to a program-derived address (PDA). The creator no longer holds it during the active phase.
- Each NFT can only have one active market at a time.
- The creator cannot cancel a market once it's created.
- All parameters are immutable after creation (except duration, which can be extended).

---

## Phase 2: Active Trading

### What Happens

Once created, the market is open for trading. Anyone can buy or sell market shares against the bonding curve.

### Buying

```
Trader sends SOL
    │
    ├── Protocol fee deducted
    ├── Creator royalty deducted
    ├── Remaining SOL added to reserve
    ├── Bonding curve calculates shares out
    ├── Shares minted to trader
    ├── TradeEvent emitted
    └── Price increased
```

### Selling

```
Trader sends shares
    │
    ├── Bonding curve calculates SOL out
    ├── Protocol fee deducted from SOL out
    ├── Creator royalty deducted from SOL out
    ├── Net SOL transferred to trader
    ├── Shares burned
    ├── TradeEvent emitted
    └── Price decreased
```

### Trade Events

Every trade emits an on-chain event containing:

```
TradeEvent {
    market: Pubkey,          // Market account
    trader: Pubkey,          // Trader's wallet
    direction: Buy | Sell,   // Trade direction
    sol_amount: u64,         // SOL involved
    share_amount: u64,       // Shares involved
    price: u64,              // Price at execution
    reserve_after: u64,      // Reserve after trade
    supply_after: u64,       // Shares outstanding after trade
    timestamp: i64,          // Slot timestamp
    protocol_fee: u64,       // Fee to protocol
    creator_royalty: u64,    // Fee to creator
}
```

These events are indexed off-chain to generate candlestick charts, analytics, and trade history.

### Slippage Protection

Every trade includes a slippage tolerance:

- **Buy**: Maximum SOL the trader is willing to spend per share.
- **Sell**: Minimum SOL the trader is willing to receive per share.

If the actual execution price exceeds the tolerance, the transaction reverts.

### Market Extension

During the active phase, the creator can **extend** the market duration.

- Markets can be extended but **never shortened**.
- Extension adds time to the existing expiry.
- This protects traders who entered with time-based expectations.

### Rules During Active Trading

- Anyone can buy shares at any time.
- Anyone who holds shares can sell at any time.
- The bonding curve is always available — there is no closing or downtime.
- All trades are atomic — they either succeed completely or revert.
- The creator cannot withdraw SOL from the reserve.
- The creator cannot withdraw the NFT during this phase.

---

## Phase 3: Settlement

### What Happens

When the market duration expires, the market enters the settlement phase.

```
Market duration expires
    │
    ├── Market state = SETTLING
    ├── No new buys allowed
    ├── Shareholders can redeem shares for SOL
    ├── Anyone can redeem on a shareholder's behalf via force_redeem
    ├── Creator can claim accumulated royalties
    └── After all shares redeemed → Market state = SETTLED
```

### Share Redemption

During settlement, shareholders redeem their shares for a proportional amount of the remaining SOL reserve.

```
Redemption amount = (trader's shares / total shares outstanding) × reserve balance
```

This is different from selling during the active phase:

- **Active trading**: Price is determined by the bonding curve. Large sells have price impact.
- **Settlement redemption**: Price is proportional. Everyone gets their fair share of the reserve.

`redeem` requires the shareholder's own signature. `force_redeem` is the same instruction with that requirement lifted: anyone can trigger it on a specific shareholder's behalf, paying only the network fee. It cannot redirect funds or change the amount -- the payout destination and size are both derived from that shareholder's own on-chain position (`trader_position`), never from anything the caller supplies. This exists so a market never gets stuck forever just because one shareholder lost their wallet or never comes back: the creator (who wants their NFT back, see below) or anyone else can simply pay out every remaining holder.

### NFT Return

After settlement, the NFT is returned to the creator once every share has been redeemed -- via `redeem`, `force_redeem`, or a mix of both. There is no grace period or timeout that returns the NFT early: as long as even one share is outstanding, the market stays in Settling. `force_redeem` is what keeps this from meaning "forever" in practice.

### Creator Payout

The creator's accumulated royalties are paid out during or after settlement. Royalties are collected throughout the active phase and held in the creator's claimable balance.

---

## State Diagram

```
                    ┌──────────────┐
        create() →  │    ACTIVE     │
                    │              │
                    │  Buy / Sell   │
                    │  Extend       │
                    └──────┬───────┘
                           │
                    duration expires
                           │
                    ┌──────▼───────┐
                    │   SETTLING   │
                    │              │
                    │  Redeem /     │
                    │  force_redeem │
                    │  No new buys  │
                    └──────┬───────┘
                           │
                    all shares redeemed
                    (self or forced)
                           │
                    ┌──────▼───────┐
                    │   SETTLED    │
                    │              │
                    │  NFT returned │
                    │  Market closed │
                    └──────────────┘
```

---

## Timing

| Event | Timestamp | Source |
|---|---|---|
| Market created | `created_at` | Transaction timestamp |
| Market expires | `created_at + duration` | Calculated |
| Market extended | `expires_at + extension` | Creator instruction |
| Settlement starts | `expires_at` | Automatic (checked on next interaction) |
| Market settled | When all shares redeemed (via `redeem` and/or `force_redeem`) | Checked on interaction |

Note: Solana doesn't have automatic timers. State transitions are checked and enforced when users interact with the market (e.g., when someone tries to buy after expiry, the market is transitioned to SETTLING).

---

## Edge Cases

### No One Trades

If a market is created but no one buys:

- The market expires with no reserve.
- The NFT is returned to the creator.
- The market is effectively a no-op.

### Creator Buys Their Own Shares

Allowed. The bonding curve treats all traders equally. The creator pays the same price as anyone else.

### Large Sell at Settlement

If a large holder sells during the active phase right before settlement, the price drops significantly and the reserve is partially drained. Other holders receive less upon redemption.

This is an inherent property of bonding curves. Transparency (visible reserve, visible holdings) mitigates this — traders can monitor whale positions.

### Market With One Holder

If only one person bought shares and the market expires, that person redeems 100% of the reserve (minus fees already collected during trading).

---

## Summary

| Phase | Duration | Allowed Actions |
|---|---|---|
| **Creation** | Instant | Deposit NFT, configure curve, set duration |
| **Active** | Market duration (days/weeks) | Buy, sell, extend duration |
| **Settling** | Until all shares redeemed | Redeem/force_redeem shares, claim royalties |
| **Settled** | Permanent | NFT returned, market closed |
