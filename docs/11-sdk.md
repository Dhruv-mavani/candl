# SDK

> This document details the `@candl/sdk` package for interacting with the protocol from JavaScript/TypeScript.

---

## Overview

The Candl SDK abstracts the complexity of Anchor program calls, providing a clean, typed interface for frontend applications and third-party integrations.

## Core Features

- Fetching market state.
- Estimating buy/sell outputs (price impact and slippage calculation).
- Building and sending transactions (create, buy, sell, extend, settle, redeem).
- Parsing on-chain events.

## Installation (Future)

```bash
npm install @candl/sdk @solana/web3.js
```

## Basic Usage

### Initializing the Client

```typescript
import { CandlClient } from '@candl/sdk';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const client = new CandlClient(connection);
```

### Fetching a Market

```typescript
const nftMint = new PublicKey('...');
const market = await client.getMarket(nftMint);

console.log('Current Price:', market.getCurrentPrice());
console.log('Reserve SOL:', market.realSolReserve.toString());
```

### Buying Shares

```typescript
// Estimate output
const solInput = 1.5; // SOL
const estimate = market.estimateBuy(solInput);
console.log(`Expected shares: ${estimate.expectedShares}`);
console.log(`Price Impact: ${estimate.priceImpactPct}%`);

// Build transaction
const tx = await client.buildBuyTransaction({
  buyer: wallet.publicKey,
  nftMint,
  solAmount: solInput,
  minSharesOut: estimate.minimumShares(0.01), // 1% slippage tolerance
});

// Send via wallet adapter
const signature = await wallet.sendTransaction(tx, connection);
```

## Design Principles

- **Pure Functions First**: Calculations (like bonding curve math) should be pure functions, easily testable without a live connection.
- **Transaction Builders**: Always return un-signed `Transaction` or `VersionedTransaction` objects so the caller handles signing.
- **No Side Effects**: The SDK should not mutate state or maintain its own cache unless explicitly requested.
