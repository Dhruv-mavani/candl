import { getDb } from "../src/db/index.js";
import { resolveAndCacheNftMetadata } from "../src/services/metadata/index.js";

const mint = process.argv[2];
if (!mint) throw new Error("Usage: tsx scripts/smoke-test-metadata-cache.ts <mint>");

const db = getDb();
const row = await resolveAndCacheNftMetadata(db, mint);
console.log("Cached row:", row);

const rowAgain = await resolveAndCacheNftMetadata(db, mint);
console.log("Second call (should hit cache, same fetchedAt):", rowAgain.fetchedAt.getTime() === row.fetchedAt?.getTime());

process.exit(0);
