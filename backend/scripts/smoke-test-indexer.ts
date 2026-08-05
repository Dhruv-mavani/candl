import { getDb } from "../src/db/index.js";
import { startIndexer } from "../src/services/indexer/index.js";

const handle = startIndexer(getDb());
handle.stop();
console.log("Indexer start/stop cycle completed without throwing.");
process.exit(0);
