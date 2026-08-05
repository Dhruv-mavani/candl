import { fetchNftMetadataFromChain } from "../src/services/metadata/index.js";

const mint = process.argv[2];
if (!mint) throw new Error("Usage: tsx scripts/smoke-test-metadata.ts <mint>");

const result = await fetchNftMetadataFromChain(mint);
console.log(JSON.stringify(result, null, 2));
