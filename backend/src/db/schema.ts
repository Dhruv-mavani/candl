import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// Schema mirrors docs/09-database.md exactly. The blockchain remains the
// source of truth -- this is a read-optimized replica plus derived data
// (candles, cached metadata).

export type MarketState = "ACTIVE" | "SETTLING" | "SETTLED";
export type TradeDirection = "BUY" | "SELL";
export type CandleResolution = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";

export const markets = pgTable("markets", {
  id: serial("id").primaryKey(),
  pubkey: varchar("pubkey", { length: 44 }).notNull().unique(),
  nftMint: varchar("nft_mint", { length: 44 }).notNull(),
  creator: varchar("creator", { length: 44 }).notNull(),
  createdAt: timestamp("created_at").notNull(),
  duration: integer("duration").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  state: varchar("state", { length: 20 }).notNull().$type<MarketState>(),
  feeProtocolBps: integer("fee_protocol_bps").notNull(),
  feeCreatorBps: integer("fee_creator_bps").notNull(),
  // Cached current stats (updated via events)
  currentPrice: numeric("current_price"),
  reserveSol: numeric("reserve_sol"),
  outstandingShares: numeric("outstanding_shares"),
});

export const trades = pgTable(
  "trades",
  {
    id: serial("id").primaryKey(),
    signature: varchar("signature", { length: 88 }).notNull(),
    marketPubkey: varchar("market_pubkey", { length: 44 }).references(() => markets.pubkey),
    trader: varchar("trader", { length: 44 }).notNull(),
    direction: varchar("direction", { length: 4 }).notNull().$type<TradeDirection>(),
    solAmount: numeric("sol_amount").notNull(),
    shareAmount: numeric("share_amount").notNull(),
    price: numeric("price").notNull(),
    feePaid: numeric("fee_paid").notNull(),
    timestamp: timestamp("timestamp").notNull(),
  },
  (table) => [
    index("idx_trades_market").on(table.marketPubkey),
    index("idx_trades_timestamp").on(table.timestamp),
  ]
);

export const candles = pgTable(
  "candles",
  {
    id: serial("id").primaryKey(),
    marketPubkey: varchar("market_pubkey", { length: 44 }).references(() => markets.pubkey),
    resolution: varchar("resolution", { length: 5 }).notNull().$type<CandleResolution>(),
    time: timestamp("time").notNull(),
    open: numeric("open").notNull(),
    high: numeric("high").notNull(),
    low: numeric("low").notNull(),
    close: numeric("close").notNull(),
    volume: numeric("volume").notNull(),
  },
  (table) => [unique("candles_market_resolution_time_unique").on(table.marketPubkey, table.resolution, table.time)]
);

export const nftMetadata = pgTable("nft_metadata", {
  mint: varchar("mint", { length: 44 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  symbol: varchar("symbol", { length: 50 }),
  imageUrl: text("image_url"),
  description: text("description"),
  attributes: jsonb("attributes"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

// Pre-launch signups, collected while the site is gated behind waitlist mode.
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  twitter: varchar("twitter", { length: 100 }),
  walletAddress: varchar("wallet_address", { length: 44 }),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type Candle = typeof candles.$inferSelect;
export type NewCandle = typeof candles.$inferInsert;
export type NftMetadataRow = typeof nftMetadata.$inferSelect;
export type NewNftMetadataRow = typeof nftMetadata.$inferInsert;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;
