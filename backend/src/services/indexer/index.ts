import { Connection, PublicKey } from "@solana/web3.js";
import type { getDb } from "../../db/index.js";
import { decodeCandlEvents, fetchMarketConfig } from "./decode.js";
import {
  handleMarketCreated,
  handleMarketExtended,
  handleMarketSettled,
  handleSharesRedeemed,
  handleTradeExecuted,
} from "./handlers.js";

type Db = ReturnType<typeof getDb>;

export interface IndexerHandle {
  stop: () => void;
}

/**
 * Subscribes to the Candl program's transaction logs (docs/07-backend.md:
 * "Subscribes to program logs via WebSocket"). Real Solana subscription --
 * the only missing piece is decoding events without a deployed program's
 * IDL (see decode.ts). Until CANDL_PROGRAM_ID is set, this stays idle
 * rather than pretending to index anything.
 */
export function startIndexer(db: Db): IndexerHandle {
  const programId = process.env.CANDL_PROGRAM_ID;

  if (!programId) {
    console.log(
      "[indexer] idle: CANDL_PROGRAM_ID is not set. The Candl Anchor program hasn't been deployed yet " +
        "(see docs/14-roadmap.md, Phase 1). Set CANDL_PROGRAM_ID once it is."
    );
    return { stop: () => {} };
  }

  const endpoint = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
  const connection = new Connection(endpoint, "confirmed");
  const programPublicKey = new PublicKey(programId);

  const subscriptionId = connection.onLogs(programPublicKey, (logInfo) => {
    void handleLogs(db, connection, logInfo.logs, logInfo.signature, logInfo.err !== null);
  });

  console.log(`[indexer] listening for logs from ${programId} on ${endpoint}`);

  return {
    stop: () => {
      connection.removeOnLogsListener(subscriptionId);
    },
  };
}

async function handleLogs(db: Db, connection: Connection, logs: string[], signature: string, hasError: boolean) {
  if (hasError) return;

  const events = decodeCandlEvents(logs, signature);

  // Processed in order, one at a time (not Promise.all): redeemAll bundles
  // multiple force_redeem instructions -- and so multiple SharesRedeemed
  // events -- into a single transaction, and handleSharesRedeemed reads the
  // market's current outstandingShares before decrementing it, so each
  // event in this loop needs to see the previous one's write already
  // applied to converge on the right final state (see handlers.ts).
  for (const event of events) {
    try {
      if (event.type === "MarketCreated") await handleMarketCreated(db, event, await fetchMarketConfig(connection, event.market));
      else if (event.type === "TradeExecuted") await handleTradeExecuted(db, event);
      else if (event.type === "MarketSettled") await handleMarketSettled(db, event);
      else if (event.type === "MarketExtended") await handleMarketExtended(db, event);
      else if (event.type === "SharesRedeemed") await handleSharesRedeemed(db, event);
    } catch (err) {
      console.error(`[indexer] failed to process ${event.type} from ${signature}:`, err);
    }
  }
}
