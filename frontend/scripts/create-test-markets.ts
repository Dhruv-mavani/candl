import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AnchorProvider, BN, Program, Wallet } from "@anchor-lang/core";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata, createNft } from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { keypairIdentity, generateSigner, percentAmount, createGenericFile } from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import idl from "../src/lib/idl/candl.json";

/**
 * Mints a handful of real devnet NFTs (one per marketplace category) and
 * creates a real Candl market for each, so the category filter on the
 * marketplace page has real, varied markets to actually filter -- category
 * lives as a standard {trait_type, value} attribute in the NFT's own
 * metadata JSON, the same place any real NFT would carry one, not a
 * fabricated field bolted on separately.
 */
const IRYS_DEVNET_ADDRESS = "https://devnet.irys.xyz";
const DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

const NEW_MARKETS = [
  { name: "Nova Wanderer", symbol: "NOVA", category: "Art", image: "public/nfts/001.jpg", description: "A cosmic wanderer rendered in painterly detail." },
  { name: "Circuit Breaker", symbol: "CKTB", category: "Gaming", image: "public/nfts/002.jpg", description: "An in-game legendary item skin." },
  { name: "Relic of Aeons", symbol: "RELIC", category: "Collectibles", image: "public/nfts/005.jpg", description: "A rare collectible from a bygone era." },
];

async function main() {
  const keypairPath = join(homedir(), ".config/solana/id.json");
  const secretKey = JSON.parse(readFileSync(keypairPath, "utf8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(secretKey));

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(authority), { commitment: "confirmed" });
  const program = new Program(idl as any, provider);

  const umi = createUmi(connection.rpcEndpoint)
    .use(mplTokenMetadata())
    .use(irysUploader({ address: IRYS_DEVNET_ADDRESS }))
    .use(keypairIdentity(fromWeb3JsKeypair(authority)));

  for (const spec of NEW_MARKETS) {
    console.log(`\n--- ${spec.name} (${spec.category}) ---`);

    const imageBytes = readFileSync(join(__dirname, "..", spec.image));
    const genericImage = createGenericFile(imageBytes, spec.image.split("/").pop()!, { contentType: "image/jpeg" });
    const [imageUri] = await umi.uploader.upload([genericImage]);
    console.log(`  image uploaded: ${imageUri}`);

    const metadataUri = await umi.uploader.uploadJson({
      name: spec.name,
      symbol: spec.symbol,
      description: spec.description,
      image: imageUri,
      attributes: [{ trait_type: "category", value: spec.category }],
      properties: { files: [{ uri: imageUri, type: "image/jpeg" }], category: "image" },
    });
    console.log(`  metadata uploaded: ${metadataUri}`);

    const mintSigner = generateSigner(umi);
    await createNft(umi, {
      mint: mintSigner,
      name: spec.name,
      symbol: spec.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      collectionDetails: null,
    }).sendAndConfirm(umi);
    const nftMint = toWeb3JsPublicKey(mintSigner.publicKey);
    console.log(`  minted: ${nftMint.toBase58()}`);

    const creatorTokenAccount = getAssociatedTokenAddressSync(nftMint, authority.publicKey);
    const signature = await program.methods
      .createMarket(new BN(DURATION_SECONDS))
      .accounts({ nftMint, creatorTokenAccount, creator: authority.publicKey })
      .rpc();
    console.log(`  market created: ${signature}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
