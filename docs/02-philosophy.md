# Philosophy

> Every decision in Candl — from the folder structure to the smart contract design — is guided by these principles. They are non-negotiable.

---

## Core Principles

### 1. Protocol First

Candl is a **protocol**, not a website.

If the website disappeared tomorrow, another developer should be able to build a complete trading interface on top of Candl using only the SDK and API.

The on-chain program is the product. The SDK is the developer experience. The website is just one consumer of the protocol.

This distinction matters because it forces us to design clean boundaries:

```
Protocol  → Owns truth (on-chain state, trades, reserves)
Services  → Owns computation (charts, analytics, search)
Frontend  → Owns presentation (UI, UX, interactions)
```

No layer should leak into another.

---

### 2. Simplicity Over Cleverness

Prefer readable code over clever code.

If a simpler solution exists with similar performance, choose it. Complex abstractions, clever hacks, and "elegant" tricks that sacrifice readability are not welcome.

**Bad:**
```typescript
const p = r.map(x => x.v).reduce((a, b) => a + b, 0) / r.length;
```

**Good:**
```typescript
const totalVolume = trades.reduce((sum, trade) => sum + trade.volume, 0);
const averageVolume = totalVolume / trades.length;
```

Code is read far more often than it is written. Optimize for the reader.

---

### 3. Modularity

Every feature lives in its own module. Every module owns exactly one responsibility.

**Bad:**
```
MarketService
├── Buy NFT
├── Sell NFT
├── Generate candles
├── Run analytics
├── Send notifications
└── Update search index
```

**Good:**
```
MarketService       → Market state management
TradeService        → Buy and sell execution
CandleEngine        → Candlestick generation
AnalyticsEngine     → Volume, holders, trends
NotificationService → Alerts and notifications
SearchService       → Full-text search
```

Small services. Small responsibilities. Clear boundaries.

---

### 4. Separation of Concerns

Three strict rules:

1. **Frontend should never contain protocol logic.** The frontend calls the SDK. It does not calculate bonding curve prices or manage on-chain state.

2. **Backend should never duplicate protocol logic.** The backend reads from the chain and computes derived data (charts, analytics). It does not reimplement the bonding curve.

3. **Protocol should never depend on frontend or backend.** The Anchor program works independently. It doesn't care whether the frontend exists.

---

### 5. Event-Driven Architecture

Instead of tightly coupling systems, Candl uses events.

**Bad (tightly coupled):**
```
Buy NFT
    → Update price
    → Update chart
    → Update analytics
    → Send notification
    → Update portfolio
    → Update search
```

If any step fails, everything fails.

**Good (event-driven):**
```
Buy NFT
    → Emit TradeEvent

Indexer receives TradeEvent
    → Update chart
    → Update analytics
    → Update portfolio
    → Send notification
    → Update search
```

Each consumer processes events independently. If the notification service is down, trading still works. If analytics is slow, charts still update. Systems are decoupled and independently scalable.

---

### 6. On-Chain Truth, Off-Chain Computation

The blockchain is the **source of truth** for:

- Ownership
- Trades
- Bonding curve state
- Reserve balances
- Fees and royalties
- Market state (active, settled)

Off-chain services handle **computation and display**:

- Candlestick generation
- Analytics aggregation
- Search indexing
- Trending algorithms
- Leaderboards
- Notifications
- Recommendations

The chain should never be used for expensive computations. Off-chain services should never contradict on-chain truth.

---

### 7. Single Ownership of Data

Every piece of data has exactly one owner. No duplication across systems.

| Data | Owner |
|---|---|
| Current price | Bonding curve (on-chain) |
| Trade history | Indexer |
| Candlestick data | Candle Engine |
| NFT metadata | Metaplex |
| Market state | Anchor program |
| User portfolio | Portfolio service |
| Search index | Search service |

When two systems need the same data, one owns it and the other reads from it.

---

### 8. Documentation Before Code

Every feature follows this order:

```
Idea → Discussion → Documentation → Architecture → Implementation → Testing → Review
```

No exceptions.

If a feature isn't documented, it isn't ready to be implemented. If the architecture hasn't been reviewed, the code shouldn't be written. If the tests don't pass, the feature isn't done.

This process feels slow. It saves weeks of refactoring.

---

### 9. Security First

Always assume malicious users.

- Validate every input on-chain.
- Handle overflow and underflow (use checked math).
- Handle invalid accounts (verify PDAs, ownership, signers).
- Handle replay attacks where applicable.
- Never trust client input.
- Protect every instruction with proper access control.
- Consider front-running in trade execution.

A protocol that handles real money must be paranoid about security.

---

### 10. Long-Term Maintainability

If an implementation decision is unclear, choose the architecture that would be **easiest to maintain five years from now**.

Never optimize for short-term convenience. Never take shortcuts that create technical debt. Never prioritize shipping speed over code quality.

This project should feel like it could be maintained by a team of engineers for years.

---

## Engineering Standards

### Code Style

- Small files (< 200 lines preferred)
- Small functions (< 30 lines preferred)
- Explicit types everywhere (no `any`)
- Readable variable and function names
- Named constants instead of magic numbers
- No duplicated logic — extract into shared modules
- Avoid deeply nested conditionals

### Naming Conventions

Use simple, domain-specific names:

```
Market, NFT, Trade, Buy, Sell, Reserve,
Treasury, Price, Chart, Analytics, History,
Creator, Trader, Share, Duration, Settlement
```

Avoid confusing abbreviations. If a new contributor can't understand a name without context, rename it.

### File Organization

Every module follows a consistent structure:

```
module/
├── index.ts          → Public API
├── types.ts          → Type definitions
├── constants.ts      → Named constants
├── service.ts        → Core logic
├── utils.ts          → Helper functions
└── __tests__/        → Tests
```

---

## Version Philosophy

We are not building everything at once.

Development happens in milestones. Each milestone is completed fully before the next one begins. We never partially implement multiple milestones simultaneously.

| Version | Focus | Scope |
|---|---|---|
| **V1** | Prove the protocol | Create market, buy, sell, chart, basic analytics |
| **V2** | Advanced trading | Creator dashboard, multiple curves, portfolio, alerts |
| **V3** | Developer platform | SDK, public API, embeddable widgets |
| **V4+** | Protocol ecosystem | Governance, plugins, multi-asset, cross-chain |

---

## The Three-Question Test

Every feature must satisfy three questions before implementation:

1. **Why does this feature exist?** — If we can't articulate the value, we don't build it.
2. **Where does it belong?** — If we can't place it cleanly in the architecture, we redesign first.
3. **Can another module reuse it?** — If yes, it should be in a shared package.

If we can't answer all three, we redesign before writing code.

---

## What We Optimize For

| Optimize For | Over |
|---|---|
| Readability | Cleverness |
| Maintainability | Speed of development |
| Security | Feature count |
| Modularity | Convenience |
| Long-term architecture | Short-term hacks |
| Documentation | Tribal knowledge |
| Open source | Proprietary control |

---

## UI Philosophy

The Candl UI should feel like:

- **Stripe** — Clean, minimal, professional
- **Linear** — Fast, responsive, keyboard-first
- **Vercel** — Modern typography, excellent spacing
- **TradingView** — Data-rich charts, professional analytics
- **Pump.fun** — Crypto-native, fun, instant

Design principles:

- Dark mode first
- Large spacing
- Excellent typography (Inter, Geist, or similar)
- Professional animations (subtle, purposeful)
- Never feel cluttered
- Data-dense but not overwhelming
- Every interaction should feel instant
