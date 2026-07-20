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

*(Add new decisions here as the project evolves.)*
