import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@anchor-lang/core";

/**
 * Simulates real, distinct traders buying (and some selling) real shares on
 * a live devnet market. Every trade is a genuine signed transaction against
 * the deployed program -- nothing is written directly to the backend DB, so
 * this can't produce the fabricated-data class of bug the indexer already
 * had to be fixed for (see project memory: a zombie double-indexing process
 * previously made real trades look fabricated; the fix is to only ever
 * trust on-chain data, never synthesize DB rows directly).
 *
 * "1000 bots" isn't practical with distinct funded wallets on devnet (the
 * public faucet rate-limits hard), so this funds each bot wallet directly
 * from the already-funded local CLI keypair instead of airdropping.
 */
const NFT_MINT = process.argv[2] ?? "5ZqdWfxbgXTDLihHqWp2huH61eN3Vh4UmGhSUmN1KwEK"; // Dhruv #003
const BOT_COUNT = Number(process.argv[3] ?? 20);
const FUND_LAMPORTS = 20_000_000; // 0.02 SOL per bot -- covers rent + fees + a few small buys/sells

function randomShareAmount() {
  return 1 + Math.floor(Math.random() * 5); // 1-5 shares, keeps costs low as the curve climbs
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveTradeAccounts(program: Program, nftMint: PublicKey, trader: PublicKey, creator: PublicKey) {
  const [protocolConfig] = PublicKey.findProgramAddressSync([Buffer.from("protocol_config")], program.programId);
  const [market] = PublicKey.findProgramAddressSync([Buffer.from("market"), nftMint.toBuffer()], program.programId);
  const [bondingCurve] = PublicKey.findProgramAddressSync([Buffer.from("bonding_curve"), market.toBuffer()], program.programId);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], program.programId);
  const [traderPosition] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), market.toBuffer(), trader.toBuffer()],
    program.programId
  );
  const protocolConfigAccount = await (program.account as any).protocolConfig.fetch(protocolConfig);

  return {
    protocolConfig,
    market,
    bondingCurve,
    vault,
    traderPosition,
    trader,
    protocolTreasury: protocolConfigAccount.authority as PublicKey,
    creator,
    systemProgram: SystemProgram.programId,
  };
}

async function fundBot(connection: Connection, authority: Keypair, bot: Keypair) {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: bot.publicKey, lamports: FUND_LAMPORTS })
  );
  const sig = await connection.sendTransaction(tx, [authority]);
  await connection.confirmTransaction(sig, "confirmed");
}

async function main() {
  const idl = JSON.parse(readFileSync(join(__dirname, "../target/idl/candl.json"), "utf8"));
  const keypairPath = join(homedir(), ".config/solana/id.json");
  const secretKey = JSON.parse(readFileSync(keypairPath, "utf8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(secretKey));

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const authorityProvider = new AnchorProvider(connection, new Wallet(authority), { commitment: "confirmed" });
  const authorityProgram = new Program(idl, authorityProvider);

  const nftMint = new PublicKey(NFT_MINT);
  const [market] = PublicKey.findProgramAddressSync([Buffer.from("market"), nftMint.toBuffer()], authorityProgram.programId);
  const marketAccount = await (authorityProgram.account as any).market.fetch(market);
  const creator = marketAccount.creator as PublicKey;

  console.log(`Simulating ${BOT_COUNT} bots trading on market ${market.toBase58()} (nft ${NFT_MINT})`);

  let buys = 0;
  let sells = 0;
  let failures = 0;

  for (let i = 0; i < BOT_COUNT; i++) {
    const bot = Keypair.generate();
    try {
      await fundBot(connection, authority, bot);

      const provider = new AnchorProvider(connection, new Wallet(bot), { commitment: "confirmed" });
      const program = new Program(idl, provider);
      const accounts = await resolveTradeAccounts(program, nftMint, bot.publicKey, creator);

      const shareAmount = randomShareAmount();
      const shares = new BN(shareAmount);

      const buySim = await program.methods.buy(shares, new BN(Number.MAX_SAFE_INTEGER)).accountsStrict(accounts).simulate();
      const buyEvent = buySim.events.find((e) => e.name.toLowerCase() === "tradeexecuted")!.data as Record<string, unknown>;
      const maxSolCost = new BN(String(buyEvent.solAmount))
        .add(new BN(String(buyEvent.feePaid)))
        .muln(105)
        .divn(100);

      const buySig = await program.methods.buy(shares, maxSolCost).accountsStrict(accounts).rpc();
      buys++;
      console.log(`  bot ${i + 1}/${BOT_COUNT} (${bot.publicKey.toBase58().slice(0, 8)}...) bought ${shareAmount} shares -- ${buySig}`);

      // Roughly half the bots sell part of their new position right away, for a mix of activity.
      if (Math.random() < 0.5) {
        const sellAmount = Math.max(1, Math.floor(shareAmount / 2));
        const sellShares = new BN(sellAmount);
        const sellSim = await program.methods.sell(sellShares, new BN(0)).accountsStrict(accounts).simulate();
        const sellEvent = sellSim.events.find((e) => e.name.toLowerCase() === "tradeexecuted")!.data as Record<string, unknown>;
        const minSolOut = new BN(String(sellEvent.solAmount))
          .sub(new BN(String(sellEvent.feePaid)))
          .muln(95)
          .divn(100);

        const sellSig = await program.methods.sell(sellShares, minSolOut).accountsStrict(accounts).rpc();
        sells++;
        console.log(`    -> also sold ${sellAmount} shares -- ${sellSig}`);
      }
    } catch (err) {
      failures++;
      console.error(`  bot ${i + 1}/${BOT_COUNT} failed:`, err instanceof Error ? err.message : err);
    }

    // The public devnet RPC rate-limits hard under back-to-back requests; a
    // small gap between bots keeps the run from crashing outright.
    await sleep(1500);
  }

  console.log(`\nDone. ${buys} buy(s), ${sells} sell(s), ${failures} failure(s).`);
}

// connection.confirmTransaction's internal retry/subscription plumbing can
// reject outside the awaited call stack under sustained devnet rate limiting
// -- log and keep going rather than losing the whole run to one bot's RPC hiccup.
process.on("unhandledRejection", (err) => {
  console.error("  (unhandled RPC error, continuing)", err instanceof Error ? err.message : err);
});

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
