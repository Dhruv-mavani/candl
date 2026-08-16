import { getDb } from "../src/db/index.js";
import { handleMarketCreated, handleTradeExecuted } from "../src/services/indexer/handlers.js";

const db = getDb();

const MARKET_PUBKEY = "SmokeTestMarket11111111111111111111111111";
const NFT_MINT = "6gvxEaDHMmrtfq41N45XrEEy4YEkAWwXhbKjjsiFHzvs"; // real "Dhruv #001" mint
const CREATOR = "8ZUczUAUSctP7z2X6uZ5C8LAtsHu5uxDoGGeF57Cbjug";
const TRADER = "9RRDcvHfNfKKfrgYLuLNQhcpXeDNaewaR9M8j1z8yrDW";

const now = Math.floor(Date.now() / 1000);

console.log("1. Simulating MarketCreated event...");
await handleMarketCreated(
  db,
  {
    type: "MarketCreated",
    market: MARKET_PUBKEY,
    nftMint: NFT_MINT,
    creator: CREATOR,
    timestamp: now - 3600,
  },
  { durationSeconds: 30 * 24 * 60 * 60, feeProtocolBps: 95, feeCreatorBps: 30 }
);

console.log("2. Simulating 3 TradeExecuted events (buy, buy, sell)...");
await handleTradeExecuted(db, {
  type: "TradeExecuted",
  market: MARKET_PUBKEY,
  trader: TRADER,
  isBuy: true,
  solAmount: 1.5,
  shareAmount: 10,
  price: 0.15,
  feePaid: 0.01875,
  timestamp: now - 1800,
  signature: "sig1",
});
await handleTradeExecuted(db, {
  type: "TradeExecuted",
  market: MARKET_PUBKEY,
  trader: TRADER,
  isBuy: true,
  solAmount: 2.0,
  shareAmount: 12,
  price: 0.17,
  feePaid: 0.025,
  timestamp: now - 900,
  signature: "sig2",
});
await handleTradeExecuted(db, {
  type: "TradeExecuted",
  market: MARKET_PUBKEY,
  trader: TRADER,
  isBuy: false,
  solAmount: 0.8,
  shareAmount: 5,
  price: 0.16,
  feePaid: 0.01,
  timestamp: now - 60,
  signature: "sig3",
});

console.log("Done seeding. Market pubkey:", MARKET_PUBKEY, "NFT mint:", NFT_MINT);
process.exit(0);
