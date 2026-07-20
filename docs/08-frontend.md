# Frontend Architecture

> This document covers Layer 3: the user-facing application for Candl.

---

## Overview

The Candl frontend provides a professional, instant, and data-rich trading experience. It should feel like a hybrid between a premium financial terminal (DexScreener/TradingView) and a modern consumer app (Pump.fun/Stripe).

---

## Technology Stack

- **Framework**: Next.js (App Router preferred)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (or Vanilla CSS Modules per philosophy, but Tailwind is standard for speed. *Note: Clarify with founder if Tailwind is strictly forbidden based on general tech stack rules, but for modern web apps it's usually preferred unless strictly vanilla CSS is requested.*)
- **State Management**: Zustand (client state) + SWR/React Query (server state)
- **Blockchain**: `@solana/web3.js` + `@solana/wallet-adapter`
- **Charts**: `lightweight-charts` by TradingView

---

## Key Pages

### 1. Discover / Home (`/`)
- Trending markets
- New markets
- Top volume markets
- Global statistics

### 2. Market Page (`/market/[mint]`)
The most important page.
- **Header**: NFT Name, Image, Creator, Current Price.
- **Chart**: Live candlestick chart (1m, 5m, 15m, 1h, 1d).
- **Trade Panel**: Buy/Sell interface with slippage settings and price impact warnings.
- **Analytics Panel**: 24h volume, reserve size, market cap.
- **Activity Feed**: Live scrolling list of recent trades.

### 3. Create Market (`/create`)
- Wallet connection required.
- Select eligible NFT from wallet.
- Set market duration.
- Review parameters and sign transaction.

---

## Component Architecture

Keep components small and reusable.

```
components/
├── common/             # Buttons, Inputs, Modals
├── layout/             # Navbar, Footer, Sidebars
├── charts/             # TradingView wrappers
├── market/             # Market-specific components (TradeBox, StatsBar)
└── wallet/             # Wallet connection UI
```

---

## Data Fetching Strategy

- **Initial Load**: SSR (Server-Side Rendering) or static generation with ISR for market metadata and historical candles to ensure fast time-to-interactive and good SEO.
- **Live Updates**: WebSocket connection to the Candl backend for real-time price, candle updates, and trade history.

---

## UX Guidelines

- **Dark Mode Default**: Trading interfaces look best in dark mode.
- **Instant Feedback**: Optimistic UI updates where safe, clear loading states when waiting for blockchain confirmation.
- **Clear Errors**: Translate Solana program errors (e.g., `0x1771`) into human-readable messages ("Slippage exceeded").
