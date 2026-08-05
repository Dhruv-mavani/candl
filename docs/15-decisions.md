# Architectural Decisions

> This document is an Architectural Decision Record (ADR). Whenever a significant architectural decision is made, it is recorded here along with its context and consequences.

---

## 1. Event-Driven Indexing over On-Chain Aggregation

**Date**: Initial Architecture Phase
**Status**: Accepted

**Context**: We need to generate candlestick charts (OHLC data) and market statistics (volume, etc.). This data could theoretically be aggregated on-chain or computed by off-chain indexers.

**Decision**: We will use an off-chain indexer to listen to on-chain `TradeExecuted` events and compute candlesticks and analytics in a PostgreSQL database.

**Consequences**:
- **Pros**: Keeps the on-chain program lightweight, fast, and cheap. Avoids on-chain storage bloat. Allows flexible and historical querying.
- **Cons**: Introduces an off-chain dependency (the indexer) for the frontend to function correctly. If the indexer goes down, charts stop updating (though trading via the program remains functional).

---

## 2. Market Shares vs. Fractional NFTs

**Date**: Initial Architecture Phase
**Status**: Accepted

**Context**: When a user buys into a Candl market, we need to define what they actually receive. We could fractionalize the NFT into SPL tokens or create internal accounting "shares".

**Decision**: We will use internal accounting "Market Shares". A user buys a share of the market's bonding curve. The NFT itself is held in escrow. Shares are not SPL tokens; they are balances tracked by the Candl program (or simply derived from the bonding curve state).

**Consequences**:
- **Pros**: Avoids the complexity and overhead of minting SPL tokens for every market. Much cleaner UX. Avoids regulatory issues surrounding fractional NFTs.
- **Cons**: Users cannot transfer their market position to another wallet (unless we add specific functionality for that).

---

## 3. Finite Market Duration

**Date**: Initial Architecture Phase
**Status**: Accepted

**Context**: Markets need a lifecycle. Should they run forever or have a deadline?

**Decision**: Markets will have a finite duration (which can be extended by the creator but never shortened). When the duration expires, the market enters a "Settling" phase where shares can only be redeemed for the underlying reserve.

**Consequences**:
- **Pros**: Prevents the protocol from accumulating dead, zero-volume markets forever. Creates natural urgency. Provides a clear settlement mechanism.
- **Cons**: Requires active management by creators if they want their market to persist.

## 4. Cubic Reserve Function over Constant-Product-with-Virtual-Reserves

**Date**: 2026-07-31
**Status**: Accepted

**Context**: The docs disagreed with each other on the actual V1 bonding curve math. `docs/03-economics.md` specified a cost-function model with a cubic reserve, `Reserve(S) = curve_alpha*S^3 + curve_beta*S`, backed entirely by real SOL (explicitly "NO virtual reserves"). But `docs/06-smart-contracts.md`, `docs/05-architecture.md`, and `Candl.md` (Q26) all described V1 as "constant product with virtual reserves" (`x*y=k`), with a `BondingCurve` account holding `virtual_sol_reserves`/`virtual_token_reserves` fields. These are two different, incompatible pricing models -- the program cannot be written correctly until one is chosen.

**Decision**: `docs/03-economics.md` is the source of truth. V1 uses the cubic reserve cost-function model, with real reserves only. `docs/06-smart-contracts.md` has been updated: `BondingCurve` no longer has virtual reserve fields, and a new singleton `ProtocolConfig` account holds `curve_alpha`, `curve_beta`, and the protocol-wide fee rates (matching economics.md's statement that "these percentages apply uniformly across all markets" -- fees are not a per-market choice). `Market` now snapshots `fee_protocol_bps`/`fee_creator_bps` from `ProtocolConfig` at creation time rather than storing an independent `FeeConfig`. `CurveType::ConstantProduct` was renamed `CurveType::Cubic`. `Candl.md` Q26 was updated to match.

**Consequences**:
- **Pros**: Single, unambiguous pricing model to implement. Matches the economics doc's explicit "no virtual reserves, no fake liquidity" design goal, which is also the stronger trust story for traders. Global `ProtocolConfig` makes future governance-driven curve/fee tuning straightforward without touching per-market accounts.
- **Cons**: `S^3` overflows `u64` far sooner than a constant-product term would, so `Reserve(S)` must be computed in `u128` with explicit bounds checking (documented in docs/06-smart-contracts.md's Security Considerations). Anyone who had started implementation against the old virtual-reserve model needs to rework it.
