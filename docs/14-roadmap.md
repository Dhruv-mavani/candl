# Roadmap

> This document outlines the development phases for Candl. We complete one milestone fully before moving to the next.

---

## Phase 0: Blueprint (Current)
- Complete all architecture and product documentation.
- Define database schemas and API contracts.
- No code written until this phase is fully approved.

## Phase 1: V1 Protocol (The Core)
- Develop the Anchor program.
- Implement Market Creation, Buy, Sell, Settle, Redeem.
- Implement Constant Product Bonding Curve with virtual reserves.
- Write comprehensive Anchor tests.
- **Deliverable**: Auditable on-chain program deployed to Devnet.

## Phase 2: V1 Services (The Engine)
- Build the Indexer to parse on-chain events.
- Build the Candle Engine to generate OHLC data.
- Build the REST API for historical data.
- Build the WebSocket server for live updates.
- **Deliverable**: Backend infrastructure running on Devnet.

## Phase 3: V1 Website (The Face)
- Build the Candl frontend application.
- Integrate TradingView lightweight charts.
- Implement wallet connection and trade execution.
- Build the Discover and Market pages.
- **Deliverable**: Fully functional V1 product on Devnet.

## Phase 4: Mainnet Launch
- Code audit and security review.
- Mainnet deployment.
- Initial marketing and creator onboarding.

---

## Future Versions (Post-Launch)

### V2: Advanced Trading
- Creator Dashboard.
- Portfolio tracking.
- Multiple bonding curve types (Linear, Sigmoid).

### V3: Developer Platform
- Official TypeScript SDK release.
- Public API release.
- Embeddable market widgets.

### V4: Ecosystem
- Multi-asset support (not just NFTs).
- Governance/DAO.
