import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import type { Umi } from "@metaplex-foundation/umi";

// Read-only: no wallet identity needed, just RPC access to decode Metaplex
// accounts. createUmi() generates a throwaway keypair identity internally,
// which is fine since this service never signs or sends transactions.
let _umi: Umi | null = null;

export function getUmi(): Umi {
  if (!_umi) {
    const endpoint = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
    _umi = createUmi(endpoint).use(mplTokenMetadata());
  }
  return _umi;
}
