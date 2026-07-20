# Smart Contracts

> This document details the architecture of the Candl Anchor program, including state accounts, instructions, validations, and events.

---

## Overview

The Candl protocol is implemented as a Solana program using the Anchor framework.

**Program Responsibilities**:
- Creating markets for unique NFTs
- Initializing bonding curves with virtual reserves
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

### 1. Market

The core account representing a single NFT market.

```rust
#[account]
pub struct Market {
    pub creator: Pubkey,            // Address that created the market
    pub nft_mint: Pubkey,           // Mint address of the NFT
    pub vault: Pubkey,              // PDA holding the SOL reserve
    pub escrow: Pubkey,             // PDA holding the NFT
    pub fee_config: FeeConfig,      // Protocol and creator fee rates
    pub created_at: i64,            // Timestamp of creation
    pub duration: i64,              // Market duration in seconds
    pub state: MarketState,         // Active, Settling, or Settled
    pub total_shares: u64,          // Total market shares outstanding
    pub curve_type: CurveType,      // Enum (ConstantProduct for V1)
    pub bump: u8,                   // PDA bump
}
```

### 2. BondingCurve

Stores the mathematical state of the market. Often combined with the Market account for simplicity, but conceptually distinct.

```rust
#[account]
pub struct BondingCurve {
    pub market: Pubkey,             // Associated market
    pub virtual_sol_reserves: u64,  // Virtual SOL for pricing
    pub virtual_token_reserves: u64,// Virtual shares for pricing
    pub real_sol_reserves: u64,     // Actual SOL held in vault
    pub outstanding_shares: u64,    // Real shares owned by users
}
```

### 3. FeeConfig & Enums

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketState {
    Active,
    Settling,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CurveType {
    ConstantProduct, // V1 only
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub struct FeeConfig {
    pub protocol_fee_bps: u16,      // Basis points (e.g., 100 = 1%)
    pub creator_royalty_bps: u16,   // Basis points
}
```

---

## PDAs and Seeds

| Account | Seeds | Purpose |
|---|---|---|
| Market | `[b"market", nft_mint.key().as_ref()]` | Unique market per NFT |
| Vault | `[b"vault", market.key().as_ref()]` | Holds SOL reserves |
| Escrow | `[b"escrow", market.key().as_ref()]` | Holds the NFT token |

---

## Instructions

### 1. `create_market`

**Description**: Initializes a new market for an NFT. The NFT is transferred from the creator to the program's escrow PDA.

**Validations**:
- Signer must own the NFT (balance == 1).
- Market account must not already exist for this mint.
- Duration must be within protocol bounds (e.g., min 1 day, max 30 days).
- Fee configuration must not exceed protocol maximums.

**Actions**:
- Transfer NFT to escrow PDA.
- Initialize Market and BondingCurve state.
- Emit `MarketCreated` event.

### 2. `buy`

**Description**: Purchase market shares using SOL.

**Validations**:
- Market state must be `Active`.
- Current timestamp must be < `created_at + duration`.
- SOL provided must be > 0.
- Output shares must be >= `min_shares_out` (slippage protection).

**Actions**:
- Deduct fees (protocol and creator).
- Update `VirtualSolReserves` and `VirtualTokenReserves`.
- Mint shares to buyer.
- Update `RealSolReserves`.
- Emit `TradeExecuted` event.

### 3. `sell`

**Description**: Sell market shares back to the curve for SOL.

**Validations**:
- Market state must be `Active`.
- Current timestamp must be < `created_at + duration`.
- Shares provided must be > 0.
- Output SOL must be >= `min_sol_out` (slippage protection).

**Actions**:
- Update `VirtualSolReserves` and `VirtualTokenReserves`.
- Deduct fees from the calculated SOL output.
- Burn shares from seller.
- Transfer net SOL to seller from vault.
- Update `RealSolReserves`.
- Emit `TradeExecuted` event.

### 4. `extend_market`

**Description**: Add time to the market duration.

**Validations**:
- Signer must be the `creator`.
- Market state must be `Active`.
- Extension must not exceed maximum bounds.

**Actions**:
- Increase `duration`.
- Emit `MarketExtended` event.

### 5. `settle`

**Description**: Transition an expired market from `Active` to `Settling`.

**Validations**:
- Market state must be `Active`.
- Current timestamp must be >= `created_at + duration`.

**Actions**:
- Change state to `Settling`.
- Emit `MarketSettled` event.

### 6. `redeem`

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
    pub price: u64, // Virtual SOL / Virtual Token ratio after trade
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
- **Slippage**: Buy and sell instructions must require `min_out` limits to prevent sandwich attacks.
- **Precision**: Division operations in the bonding curve can cause precision loss. Always structure math to multiply before dividing.
- **Access Control**: Use Anchor's `#[account(has_one = creator)]` and `Signer` constraints rigorously.
- **PDA Verification**: Anchor handles PDA verification automatically if seeds are defined correctly in `#[derive(Accounts)]`.
