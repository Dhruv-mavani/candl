import { BorshCoder, EventParser } from "@anchor-lang/core";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import idl from "../../idl/candl.json" with { type: "json" };
import type { CandlEvent } from "./events.js";

const programId = new PublicKey(idl.address);
const coder = new BorshCoder(idl as never);
const eventParser = new EventParser(programId, coder);

// Anchor decodes u64/i64 as BN and Pubkey as PublicKey; our internal event
// shapes want plain numbers/base58 strings (see events.ts).
function toNumber(value: unknown): number {
  return typeof value === "object" && value !== null && "toNumber" in value
    ? (value as { toNumber: () => number }).toNumber()
    : Number(value);
}

function toBase58(value: unknown): string {
  return typeof value === "object" && value !== null && "toBase58" in value
    ? (value as { toBase58: () => string }).toBase58()
    : String(value);
}

/**
 * Decodes every Candl program event out of a transaction's log lines, using
 * the real deployed program's IDL (backend/src/idl/candl.json). Each Anchor
 * instruction emits at most one event, but a single transaction can bundle
 * multiple instructions (redeemAll in frontend/src/lib/candl-program.ts
 * sends one force_redeem per remaining holder in one transaction), so a
 * transaction's logs can carry multiple events -- all of them are decoded
 * and returned, not just the first match.
 */
export function decodeCandlEvents(logs: string[], signature: string): CandlEvent[] {
  const events: CandlEvent[] = [];

  for (const event of eventParser.parseLogs(logs)) {
    const data = event.data as Record<string, unknown>;

    // The Rust event structs use snake_case (docs/06-smart-contracts.md's
    // #[event] definitions); unlike instruction/account names, Anchor's
    // BorshEventCoder does NOT camelCase event field names at decode time --
    // verified empirically against a real devnet MarketCreated event.
    if (event.name === "MarketCreated") {
      events.push({
        type: "MarketCreated",
        market: toBase58(data.market),
        nftMint: toBase58(data.nft_mint),
        creator: toBase58(data.creator),
        timestamp: toNumber(data.timestamp),
      });
    }

    if (event.name === "TradeExecuted") {
      events.push({
        type: "TradeExecuted",
        market: toBase58(data.market),
        trader: toBase58(data.trader),
        isBuy: Boolean(data.is_buy),
        solAmount: toNumber(data.sol_amount),
        shareAmount: toNumber(data.share_amount),
        price: toNumber(data.price),
        feePaid: toNumber(data.fee_paid),
        timestamp: toNumber(data.timestamp),
        signature,
      });
    }

    if (event.name === "MarketSettled") {
      events.push({
        type: "MarketSettled",
        market: toBase58(data.market),
        finalReserve: toNumber(data.final_reserve),
        timestamp: toNumber(data.timestamp),
      });
    }

    if (event.name === "MarketExtended") {
      events.push({
        type: "MarketExtended",
        market: toBase58(data.market),
        newExpiresAt: toNumber(data.new_expires_at),
      });
    }

    if (event.name === "SharesRedeemed") {
      events.push({
        type: "SharesRedeemed",
        market: toBase58(data.market),
        trader: toBase58(data.trader),
        shares: toNumber(data.shares),
        solReceived: toNumber(data.sol_received),
      });
    }
  }

  return events;
}

export interface OnChainMarketConfig {
  durationSeconds: number;
  feeProtocolBps: number;
  feeCreatorBps: number;
}

/**
 * MarketCreated's on-chain event only carries market/nftMint/creator/timestamp
 * (see events.rs) -- duration and fees are real per-market values set by
 * create_market.rs but never emitted, so the indexer has to read the Market
 * account itself rather than guess at them (a hardcoded 30-day/95bps/30bps
 * default previously caused markets created with a different duration to
 * cache the wrong expiresAt, silently letting the frontend offer trades on
 * markets that had already expired on-chain).
 */
export async function fetchMarketConfig(connection: Connection, marketPubkey: string): Promise<OnChainMarketConfig> {
  const accountInfo = await connection.getAccountInfo(new PublicKey(marketPubkey));
  if (!accountInfo) throw new Error(`Market account ${marketPubkey} not found on-chain`);

  const market = coder.accounts.decode("Market", accountInfo.data) as Record<string, unknown>;
  return {
    durationSeconds: toNumber(market.duration),
    feeProtocolBps: toNumber(market.fee_protocol_bps),
    feeCreatorBps: toNumber(market.fee_creator_bps),
  };
}
