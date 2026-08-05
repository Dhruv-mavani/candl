import { publicKey } from "@metaplex-foundation/umi";
import { fetchDigitalAsset, fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { eq } from "drizzle-orm";
import type { getDb } from "../../db/index.js";
import { nftMetadata } from "../../db/schema.js";
import type { NftMetadataRow } from "../../db/schema.js";
import { getUmi } from "./umi.js";

type Db = ReturnType<typeof getDb>;

const stripPadding = (value: string) => value.replace(/\0/g, "").trim();

// docs/05-architecture.md: "NFT metadata is cached (rarely changes)".
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface ResolvedNftMetadata {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  description: string | null;
  attributes: unknown;
}

/** Fetches on-chain Metaplex metadata + the off-chain JSON it points to. */
export async function fetchNftMetadataFromChain(mint: string): Promise<ResolvedNftMetadata> {
  const umi = getUmi();
  const asset = await fetchDigitalAsset(umi, publicKey(mint));

  const name = stripPadding(asset.metadata.name);
  const symbol = stripPadding(asset.metadata.symbol);
  const uri = stripPadding(asset.metadata.uri);

  let imageUrl: string | null = null;
  let description: string | null = null;
  let attributes: unknown = null;

  if (uri) {
    try {
      const json = await fetchJsonMetadata(umi, uri);
      imageUrl = json.image ?? null;
      description = json.description ?? null;
      attributes = json.attributes ?? null;
    } catch {
      // Off-chain metadata may be unreachable; on-chain fields still stand.
    }
  }

  return { mint, name: name || "Unnamed NFT", symbol, imageUrl, description, attributes };
}

/**
 * Resolves metadata for a mint, serving a fresh cached row from
 * `nft_metadata` when available (avoids hammering RPC per
 * docs/07-backend.md), otherwise fetching from chain and upserting.
 */
export async function resolveAndCacheNftMetadata(db: Db, mint: string): Promise<NftMetadataRow> {
  const [cached] = await db.select().from(nftMetadata).where(eq(nftMetadata.mint, mint)).limit(1);

  const isFresh = cached?.fetchedAt && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;
  if (cached && isFresh) return cached;

  const resolved = await fetchNftMetadataFromChain(mint);

  const [row] = await db
    .insert(nftMetadata)
    .values({
      mint: resolved.mint,
      name: resolved.name,
      symbol: resolved.symbol,
      imageUrl: resolved.imageUrl,
      description: resolved.description,
      attributes: resolved.attributes,
    })
    .onConflictDoUpdate({
      target: nftMetadata.mint,
      set: {
        name: resolved.name,
        symbol: resolved.symbol,
        imageUrl: resolved.imageUrl,
        description: resolved.description,
        attributes: resolved.attributes,
        fetchedAt: new Date(),
      },
    })
    .returning();

  if (!row) throw new Error(`Failed to upsert metadata for mint ${mint}`);
  return row;
}
