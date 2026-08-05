# Smart Contracts

> This document details the architecture of the Candl Anchor program, including state accounts, instructions, validations, and events.

---

## Overview

The Candl protocol is implemented as a Solana program using the Anchor framework.

**Program Responsibilities**:
- Creating markets for unique NFTs
- Initializing bonding curves against the protocol's cubic reserve function (see docs/03-economics.md) -- there are no virtual reserves; the real SOL reserve is the only reserve
- Managing SOL reserves and holding the NFT in escrow
- Executing buy and sell trades against the curve
- Enforcing market durations and state transitions
- Processing settlements and redemptions

**Out of Scope (Handled Off-Chain)**:
- Candlestick data generation
- Price history and analytics
- Search and discovery

---

## State Accounts

### 1. ProtocolConfig

Singleton account holding the protocol-wide curve and fee parameters (docs/03-economics.md). All markets share this one config in V1 -- fees and the curve shape are uniform across the protocol, not chosen per-market.

```rust
#[account]
pub struct ProtocolConfig {
    pub curve_alpha: u64,           // Reserve(S) = curve_alpha * S^3 + curve_beta * S
    pub curve_beta: u64,
    pub protocol_fee_bps: u16,      // 95 = 0.95%
    pub creator_fee_bps: u16,       // 30 = 0.30%
    pub authority: Pubkey,          // Governance authority allowed to update this config
    pub bump: u8,
}
```

### 2. Market

The core account representing a single NFT market. `fee_protocol_bps` / `fee_creator_bps` are copied from `ProtocolConfig` at creation time, so a later governance change never retroactively alters an already-running market's economics.

```rust
#[account]
pub struct Market {
    pub creator: Pubkey,            // Address that created the market
    pub nft_mint: Pubkey,           // Mint address of the NFT
    pub vault: Pubkey,              // PDA holding the SOL reserve
    pub escrow: Pubkey,             // PDA holding the NFT
    pub fee_protocol_bps: u16,      // Snapshotted from ProtocolConfig at creation
    pub fee_creator_bps: u16,       // Snapshotted from ProtocolConfig at creation
    pub created_at: i64,            // Timestamp of creation
    pub duration: i64,              // Market duration in seconds
    pub state: MarketState,         // Active, Settling, or Settled
    pub bump: u8,                   // PDA bump
}
```

### 3. BondingCurve

Stores the mathematical state of the market. Often combined with the Market account for simplicity, but conceptually distinct. There is no virtual reserve -- `real_sol_reserves` must always exactly equal `Reserve(outstanding_shares)` per docs/03-economics.md.

```rust
#[account]
pub struct BondingCurve {
    pub market: Pubkey,             // Associated market
    pub outstanding_shares: u64,    // S: current circulating supply
    pub real_sol_reserves: u64,     // Must always equal Reserve(S) = curve_alpha*S^3 + curve_beta*S
}
```

### 4. TraderPosition

Per docs/15-decisions.md ADR #2, Market Shares are not SPL tokens -- they're balances tracked directly by the program. This is the account that holds one trader's balance in one market.

```rust
#[account]
pub struct TraderPosition {
    pub market: Pubkey,
    pub trader: Pubkey,
    pub shares: u64,
    pub bump: u8,
}
```

### 5. Enums

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketState {
    Active,
    Settling,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CurveType {
    Cubic, // V1 only -- see docs/03-economics.md "Future Curves" for planned variants
}
```

---

## PDAs and Seeds

| Account | Seeds | Purpose |
|---|---|---|
| ProtocolConfig | `[b"protocol_config"]` | Singleton: curve params + fee rates |
| Market | `[b"market", nft_mint.key().as_ref()]` | Unique market per NFT |
| BondingCurve | `[b"bonding_curve", market.key().as_ref()]` | Curve state for that market |
| Vault | `[b"vault", market.key().as_ref()]` | Holds SOL reserves |
| Escrow | `[b"escrow", market.key().as_ref()]` | Holds the NFT token |
| TraderPosition | `[b"position", market.key().as_ref(), trader.key().as_ref()]` | One trader's share balance in one market |

---

## Instructions

### 1. `initialize_protocol`

**Description**: One-time bootstrap that creates the singleton `ProtocolConfig` account. Must run before any market can be created.

**Validations**:
- `ProtocolConfig` must not already exist (Anchor's `init` constraint enforces this).

**Actions**:
- Initialize `ProtocolConfig` with `curve_alpha`, `curve_beta`, `protocol_fee_bps`, `creator_fee_bps`, and `authority` (the signer, who becomes the sole account allowed to call `update_protocol_config` in the future).

### 2. `create_market`

**Description**: Initializes a new market for an NFT. The NFT is transferred from the creator to the program's escrow PDA.

**Validations**:
- Signer must own the NFT (balance == 1).
- Market account must not already exist for this mint.
- Duration must be within protocol bounds (e.g., min 1 day, max 30 days).

**Actions**:
- Transfer NFT to escrow PDA.
- Initialize Market (copying `fee_protocol_bps`/`fee_creator_bps` from `ProtocolConfig`) and BondingCurve state (`outstanding_shares = 0`, `real_sol_reserves = 0`).
- Emit `MarketCreated` event.

### 3. `buy`

**Description**: Purchase market shares using SOL.

**Validations**:
- Market state must be `Active`.
- Current timestamp must be < `created_at + duration`.
- `share_amount` (shares to mint) must be > 0.
- Total cost must be <= `max_sol_cost` (slippage protection). The share amount is the primary input -- docs/03-economics.md's Buying Mechanics computes cost *from* a chosen new supply, not the other way around, which would require inverting the cubic reserve function on-chain.

**Actions**:
- Compute cost via the cubic reserve function: `cost = Reserve(outstanding_shares + delta) - Reserve(outstanding_shares)` (docs/03-economics.md).
- Deduct fees (protocol and creator) on top of `cost`.
- Mint `delta` shares to buyer; increment `outstanding_shares`.
- Increase `real_sol_reserves` by `cost` (fees never touch the reserve).
- Emit `TradeExecuted` event.

### 4. `sell`

**Description**: Sell market shares back to the curve for SOL.

**Validations**:
- Market state must be `Active`.
- Current timestamp must be < `created_at + duration`.
- `share_amount` (shares to burn) must be > 0.
- Net SOL payout must be >= `min_sol_out` (slippage protection).

**Actions**:
- Compute refund via the cubic reserve function: `refund = Reserve(outstanding_shares) - Reserve(outstanding_shares - delta)` (docs/03-economics.md).
- Deduct fees (protocol and creator) from `refund`.
- Burn `delta` shares from seller; decrement `outstanding_shares`.
- Decrease `real_sol_reserves` by `refund`; transfer net SOL (after fees) to seller from vault.
- Emit `TradeExecuted` event.

### 5. `extend_market`

**Description**: Add time to the market duration.

**Validations**:
- Signer must be the `creator`.
- Market state must be `Active`.
- Extension must not exceed maximum bounds.

**Actions**:
- Increase `duration`.
- Emit `MarketExtended` event.

### 6. `settle`

**Description**: Transition an expired market from `Active` to `Settling`.

**Validations**:
- Market state must be `Active`.
- Current timestamp must be >= `created_at + duration`.

**Actions**:
- Change state to `Settling`.
- Emit `MarketSettled` event.

### 7. `redeem`

**Description**: Redeem shares for a proportional amount of the final SOL reserve during settlement.

**Validations**:
- Market state must be `Settling`.
- Signer must own shares.

**Actions**:
- Calculate proportional SOL: `(shares / outstanding_shares) * real_sol_reserves`.
- Burn shares.
- Transfer SOL to user.
- If `outstanding_shares` becomes 0, change state to `Settled` and return NFT to creator.
- Emit `SharesRedeemed` event.

---

## Events

Events are critical for the off-chain indexer to build charts and analytics.

```rust
#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub nft_mint: Pubkey,
    pub creator: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TradeExecuted {
    pub market: Pubkey,
    pub trader: Pubkey,
    pub is_buy: bool,
    pub sol_amount: u64,
    pub share_amount: u64,
    pub price: u64, // Price(outstanding_shares) after the trade -- see docs/03-economics.md
    pub fee_paid: u64,
    pub timestamp: i64,
}

#[event]
pub struct MarketSettled {
    pub market: Pubkey,
    pub final_reserve: u64,
    pub timestamp: i64,
}
```

---

## Security Considerations

- **Integer Overflow/Underflow**: All math must use `checked_add`, `checked_sub`, `checked_mul`, and `checked_div`.
- **Cubic Overflow**: `S^3` overflows `u64` far sooner than a linear or constant-product term would (e.g. `S = 1,000,000` already gives `S^3 = 10^18`, close to `u64::MAX`). `Reserve(S)` must be computed in `u128` and checked back down to `u64` before storing, or `outstanding_shares` must be bounded well below the point where `curve_alpha * S^3` can overflow `u128`.
- **Slippage**: Buy and sell instructions must require `min_out` limits to prevent sandwich attacks.
- **Precision**: Division operations in the bonding curve can cause precision loss. Always structure math to multiply before dividing.
- **Access Control**: Use Anchor's `#[account(has_one = creator)]` and `Signer` constraints rigorously.
- **PDA Verification**: Anchor handles PDA verification automatically if seeds are defined correctly in `#[derive(Accounts)]`.
