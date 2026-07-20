# Candl Project Rules

> If you are contributing to Candl, you must read and adhere to these rules. They are the law of the codebase.

## 1. Documentation Before Code
Never write a feature before it is documented. If an architectural decision needs to be made, document it in `docs/15-decisions.md` first. If you are adding a new concept, define it in `docs/17-glossary.md`. Code is the final step, not the first.

## 2. Protocol > Services > Frontend
Maintain strict separation of concerns.
- **Protocol (Anchor)**: The source of truth. Handles state, money, and math.
- **Services (Backend)**: The computation layer. Derives data (candles, analytics) from the chain.
- **Frontend (UI)**: The presentation layer. Displays data and builds transactions. 
Never put business logic in the frontend that belongs in the protocol.

## 3. Simplicity Over Cleverness
Write code that is easy to read, not code that makes you look smart. We are building infrastructure that must be maintained for years.
- No magic numbers.
- No complex nested ternary operators.
- Use explicit types (no `any` in TypeScript).
- Avoid premature optimization.

## 4. Single Ownership of Data
Every piece of data has exactly one owner.
- The bonding curve owns the current price.
- The indexer owns the trade history.
- The candle engine owns the OHLC data.
If two systems need the same data, one owns it and the other reads from it. Never duplicate state.

## 5. Security is Non-Negotiable
We are handling people's money.
- Use checked math always (`checked_add`, `checked_mul` in Rust).
- Validate all inputs.
- Assume all users are malicious.
- Require slippage parameters on all trades to prevent front-running.

## 6. Event-Driven Architecture
Services should react to events (e.g., `TradeExecuted` from the chain), not be tightly coupled with direct API calls to each other. This ensures resilience and independent scalability.

---
*For a deeper dive into these concepts, see `docs/02-philosophy.md`.*
