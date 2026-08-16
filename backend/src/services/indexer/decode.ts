import { BorshCoder, EventParser } from "@anchor-lang/core";
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
 * Decodes Candl program events out of a transaction's log lines, using the
 * real deployed program's IDL (backend/src/idl/candl.json). Each Anchor
 * instruction emits at most one event, so the first match wins.
 */
export function decodeCandlEvent(logs: string[], signature: string): CandlEvent | null {
  for (const event of eventParser.parseLogs(logs)) {
    const data = event.data as Record<string, unknown>;

    // The Rust event structs use snake_case (docs/06-smart-contracts.md's
    // #[event] definitions); unlike instruction/account names, Anchor's
    // BorshEventCoder does NOT camelCase event field names at decode time --
    // verified empirically against a real devnet MarketCreated event.
    if (event.name === "MarketCreated") {
      return {
        type: "MarketCreated",
        market: toBase58(data.market),
        nftMint: toBase58(data.nft_mint),
        creator: toBase58(data.creator),
        timestamp: toNumber(data.timestamp),
      };
    }

    if (event.name === "TradeExecuted") {
      return {
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
      };
    }

    if (event.name === "MarketSettled") {
      return {
        type: "MarketSettled",
        market: toBase58(data.market),
        finalReserve: toNumber(data.final_reserve),
        timestamp: toNumber(data.timestamp),
      };
    }

    if (event.name === "MarketExtended") {
      return {
        type: "MarketExtended",
        market: toBase58(data.market),
        newExpiresAt: toNumber(data.new_expires_at),
      };
    }

    if (event.name === "SharesRedeemed") {
      return {
        type: "SharesRedeemed",
        market: toBase58(data.market),
        trader: toBase58(data.trader),
        shares: toNumber(data.shares),
        solReceived: toNumber(data.sol_received),
      };
    }
  }

  return null;
}
