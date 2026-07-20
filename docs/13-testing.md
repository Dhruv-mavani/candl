# Testing Strategy

> This document describes how Candl is tested across all layers.

---

## 1. On-Chain (Anchor Tests)

Anchor tests are the most critical. They run against a local validator (`solana-test-validator`).

**Focus Areas**:
- **Math & Invariants**: Fuzz testing the bonding curve. Random buys and sells must always maintain the $x * y = k$ invariant (adjusted for fees) and never trap.
- **State Transitions**: Ensure a market cannot be traded after expiry, and cannot be settled before expiry.
- **Permissions**: Verify that only the creator can extend a market, and that the vault cannot be accessed directly.
- **Slippage**: Verify that trades revert if slippage bounds are exceeded.

*Tooling: TypeScript + Mocha + Chai + `@coral-xyz/anchor`*

## 2. SDK Tests

The SDK must have 100% test coverage on all mathematical functions (estimating output, price impact, slippage).

**Focus Areas**:
- Ensuring the SDK's off-chain math perfectly matches the on-chain Rust math.
- Handling of edge cases (0 input, max u64 input).

*Tooling: Vitest*

## 3. Backend (Services)

Backend tests ensure data integrity.

**Focus Areas**:
- **Indexer**: Given a mock transaction log, does the indexer correctly decode it and store it in the DB?
- **Candle Engine**: Given an array of trades, are the OHLC candles aggregated correctly across time boundaries?

*Tooling: Vitest, Testcontainers (PostgreSQL)*

## 4. Frontend

Frontend testing focuses on critical user flows.

**Focus Areas**:
- Slippage input validation.
- Correct formatting of numbers (e.g., formatting 1000000000 lamports as 1 SOL).

*Tooling: Playwright (E2E), React Testing Library (Components)*
