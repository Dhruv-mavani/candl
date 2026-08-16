// Event shapes mirror docs/06-smart-contracts.md exactly, so decode.ts has
// a precise target to build against once the Anchor program is deployed.

export interface MarketCreatedEvent {
  type: "MarketCreated";
  market: string;
  nftMint: string;
  creator: string;
  timestamp: number;
}

export interface TradeExecutedEvent {
  type: "TradeExecuted";
  market: string;
  trader: string;
  isBuy: boolean;
  solAmount: number;
  shareAmount: number;
  price: number;
  feePaid: number;
  timestamp: number;
  signature: string;
}

export interface MarketSettledEvent {
  type: "MarketSettled";
  market: string;
  finalReserve: number;
  timestamp: number;
}

export interface MarketExtendedEvent {
  type: "MarketExtended";
  market: string;
  newExpiresAt: number;
}

export interface SharesRedeemedEvent {
  type: "SharesRedeemed";
  market: string;
  trader: string;
  shares: number;
  solReceived: number;
}

export type CandlEvent =
  | MarketCreatedEvent
  | TradeExecutedEvent
  | MarketSettledEvent
  | MarketExtendedEvent
  | SharesRedeemedEvent;
