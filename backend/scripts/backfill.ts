import { Connection, PublicKey } from "@solana/web3.js";
import { getDb } from "../src/db/index.js";
import { decodeCandlEvents, fetchMarketConfig } from "../src/services/indexer/decode.js";
import { handleMarketCreated, handleMarketSettled, handleTradeExecuted } from "../src/services/indexer/handlers.js";

// One-time (re-runnable) backfill: replays every historical transaction
// against the program through the same handlers the live indexer uses, for
// anything that happened before real event decoding existed (or if the
// indexer process wasn't running at the time).

const PROGRAM_ID = new PublicKey(process.env.CANDL_PROGRAM_ID ?? "JDqvbHqaL1W57YALJnY1Lyyi6Ai5aFMaNi1mzYATTYAa");
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

async function main() {
  const db = getDb();
  const connection = new Connection(RPC_URL, "confirmed");

  const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 1000 });
  console.log(`Found ${signatures.length} transaction(s) for ${PROGRAM_ID.toBase58()}.`);

  // getSignaturesForAddress returns newest-first; replay oldest-first so
  // markets exist before their trades reference them.
  const chronological = [...signatures].reverse();

  let processed = 0;
  for (const { signature, err } of chronological) {
    if (err) continue;

    const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
    const logs = tx?.meta?.logMessages;
    if (!logs) continue;

    const events = decodeCandlEvents(logs, signature);

    for (const event of events) {
      console.log(`${signature} -> ${event.type}`);

      if (event.type === "MarketCreated") await handleMarketCreated(db, event, await fetchMarketConfig(connection, event.market));
      else if (event.type === "TradeExecuted") await handleTradeExecuted(db, event);
      else if (event.type === "MarketSettled") await handleMarketSettled(db, event);

      processed += 1;
    }
  }

  console.log(`Backfill complete. Processed ${processed} event(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
