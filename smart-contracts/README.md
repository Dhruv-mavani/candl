# Candl Protocol (Anchor Program)

Layer 1 of the Candl stack (see `../docs/06-smart-contracts.md`, `../docs/14-roadmap.md` Phase 1). Anchor 1.0.2, Solana Agave 3.1.14.

## What's here

All 7 instructions from `docs/06-smart-contracts.md` are implemented for real: `initialize_protocol`, `create_market`, `buy`, `sell`, `extend_market`, `settle`, `redeem`. The bonding curve is the cubic reserve function from `docs/03-economics.md` (`Reserve(S) = curve_alpha*S^3 + curve_beta*S`, computed in `u128` to avoid overflow -- see `src/state/bonding_curve.rs`), not the constant-product model that used to be documented elsewhere (see `../docs/15-decisions.md` ADR #4 for why that changed).

**Deployed to devnet** at `JDqvbHqaL1W57YALJnY1Lyyi6Ai5aFMaNi1mzYATTYAa`, with `ProtocolConfig` initialized at `34ifcRyTexoFhANuo3zZvKz3FRrb5kwMDcf9WnDGzEAN`. **Not audited yet.**

## Structure

```
src/
├── lib.rs                    Program entry, instruction dispatch
├── constants.rs               Seeds, curve fixed-point scale, duration bounds
├── errors.rs
├── events.rs
├── state/
│   ├── protocol_config.rs     Singleton: curve params + protocol-wide fees
│   ├── market.rs               Per-NFT market account
│   ├── bonding_curve.rs        Curve state + the cubic reserve/cost math (+ unit tests)
│   └── trader_position.rs      Per-(market, trader) share balance -- shares aren't SPL tokens (ADR #2)
└── instructions/               One file per instruction
```

## Testing

Two layers, both real:

- **Pure math unit tests** (`src/state/bonding_curve.rs`, `#[cfg(test)] mod tests`) -- fast, no VM, run with `cargo test --lib`.
- **LiteSVM integration tests** (`tests/test_market_lifecycle.rs`) -- boots a real Solana VM, deploys the actual compiled `.so`, creates a real SPL mint to stand in for the NFT, and walks the full lifecycle: create market → buy → sell → settle → redeem → NFT returned to creator. Also covers slippage rejection and creator-only access control on `extend_market`.

```bash
anchor build          # compiles the program AND the IDL (target/deploy/candl.so, target/idl/candl.json)
cd programs/candl
cargo test             # runs both unit and integration tests (13 total)
cargo clippy --lib --tests -- -D warnings
```

`anchor test` / `drizzle-kit push`-style one-shot commands weren't used here because `anchor test` defaults to spinning up `solana-test-validator` + the JS/mocha harness, which this program doesn't use (LiteSVM tests are plain `cargo test`, no validator needed).

## What's NOT here yet

- No formal audit (`docs/12-security.md` lists this as a pre-mainnet requirement).
- No TypeScript SDK/client (planned for V3 per `docs/16-future-ideas.md`) -- the `package.json`/`migrations/` scaffolding from `anchor init` is left in place for when that's built, but nothing in this program depends on it.
- `MarketExtended`/`SharesRedeemed` events aren't wired to indexer handlers yet (only `MarketCreated`/`TradeExecuted`/`MarketSettled` are, in `../backend/src/services/indexer`).
