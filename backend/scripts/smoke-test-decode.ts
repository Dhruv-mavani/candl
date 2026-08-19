import { Connection, PublicKey } from "@solana/web3.js";
import { decodeCandlEvents } from "../src/services/indexer/decode.js";

const PROGRAM_ID = new PublicKey("JDqvbHqaL1W57YALJnY1Lyyi6Ai5aFMaNi1mzYATTYAa");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 10 });
console.log(`Found ${signatures.length} signatures for the program.`);

for (const { signature } of signatures) {
  const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
  const logs = tx?.meta?.logMessages;
  if (!logs) continue;

  const events = decodeCandlEvents(logs, signature);
  console.log(signature, "->", events.length ? events.map((e) => e.type).join(", ") : "no event decoded", events);
}
