# Future Ideas

> This document is the parking lot for ideas that do NOT belong in V1. Do not implement these features until explicitly approved for a future milestone.

---

## V2: Advanced Trading & UI

1. **Creator Dashboard**: A dedicated interface for creators to track the performance of all their markets, view total earnings, and extend durations.
2. **Portfolio Tracking**: A dashboard for traders to see their active positions across multiple Candl markets, tracking PnL and total value.
3. **Multiple Bonding Curves**: Implement alternative curve formulas (Linear, Quadratic, Sigmoid) to allow different market dynamics.
4. **Dynamic Story Curves**: A visualization feature where the curve itself tells a story, reacting visually to the price action.
5. **Price Alerts**: Allow users to set email or push notifications for price targets on specific NFTs.

## V3: Developer Platform

1. **Official SDK Release**: Polish, document, and publish `@candl/sdk` to npm.
2. **Public API**: Open the REST and WebSocket APIs to the public with rate limiting and API keys.
3. **Embeddable Widgets**: Provide React components so third-party sites can embed a Candl chart or buy button directly on their pages.
4. **White-Label Markets**: Allow other projects to spin up their own Candl-powered frontends.

## V4: Protocol Ecosystem

1. **Governance (DAO)**: Implement a protocol token to govern fee rates, curve types, and treasury usage.
2. **Plugin System**: Allow developers to write custom Anchor programs that interact with Candl markets (e.g., automated trading vaults).
3. **Multi-Asset Support**: Expand beyond NFTs to support SPL tokens, Real World Assets (RWAs), or domain names using the same continuous liquidity infrastructure.
4. **Cross-Chain**: Investigate deploying the protocol to Eclipse, Monad, or other high-throughput chains.

## Miscellaneous Ideas

- **Derivatives**: Futures or options markets for highly liquid NFTs.
- **AI Market Analysis**: Integrate AI to provide summaries of market sentiment and whale activity based on trade history.
- **Bundles / Index Funds**: A mechanism to buy shares in a basket of top Candl markets.
