import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@anchor-lang/core";

/**
 * Simulates real, distinct traders buying and selling real shares across
 * every currently-ACTIVE market, for a fixed wall-clock duration. Every
 * trade is a genuine signed transaction against the deployed program --
 * nothing is written directly to the backend DB (see project memory: a
 * zombie double-indexing process previously made real trades look
 * fabricated; the fix is to only ever trust on-chain data).
 *
 * Unlike a plain burst of N one-shot bots, this keeps a small pool of
 * funded bot wallets alive per market and has them trade repeatedly with
 * randomized delays and randomized buy/sell decisions over the run, which
 * reads a lot closer to independent human traders than a synchronized burst.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const DURATION_MINUTES = Number(process.argv[2] ?? 10);
const BOTS_PER_MARKET = Number(process.argv[3] ?? 4);
const FUND_LAMPORTS = 60_000_000; // 0.06 SOL/bot -- enough headroom for several buys/sells over the run
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 9000;

function randomShareAmount(max = 5) {
  return 1 + Math.floor(Math.random() * max);
}

function randomDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ActiveMarket {
  nftMint: string;
  name: string;
}

async function fetchActiveMarkets(): Promise<ActiveMarket[]> {
  const res = await fetch(`${API_URL}/api/v1/markets`);
  const markets = (await res.json()) as { state: string; nftMint: string; metadata: { name: string | null } | null }[];
  return markets
    .filter((m) => m.state === "ACTIVE")
    .map((m) => ({ nftMint: m.nftMint, name: m.metadata?.name ?? m.nftMint }));
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

interface Bot {
  label: string;
  keypair: Keypair;
  program: Program;
  accounts: Awaited<ReturnType<typeof resolveTradeAccounts>>;
  heldShares: number; // client-side tracking so sells only happen against known holdings
}

interface MarketGroup {
  name: string;
  bots: Bot[];
}

async function buy(bot: Bot, shareAmount: number): Promise<string> {
  const shares = new BN(shareAmount);
  const sim = await bot.program.methods.buy(shares, new BN(Number.MAX_SAFE_INTEGER)).accountsStrict(bot.accounts).simulate();
  const event = sim.events.find((e) => e.name.toLowerCase() === "tradeexecuted")!.data as Record<string, unknown>;
  const maxSolCost = new BN(String(event.solAmount)).add(new BN(String(event.feePaid))).muln(105).divn(100);
  const sig = await bot.program.methods.buy(shares, maxSolCost).accountsStrict(bot.accounts).rpc();
  bot.heldShares += shareAmount;
  return sig;
}

async function sell(bot: Bot, shareAmount: number): Promise<string> {
  const shares = new BN(shareAmount);
  const sim = await bot.program.methods.sell(shares, new BN(0)).accountsStrict(bot.accounts).simulate();
  const event = sim.events.find((e) => e.name.toLowerCase() === "tradeexecuted")!.data as Record<string, unknown>;
  const minSolOut = new BN(String(event.solAmount)).sub(new BN(String(event.feePaid))).muln(95).divn(100);
  const sig = await bot.program.methods.sell(shares, minSolOut).accountsStrict(bot.accounts).rpc();
  bot.heldShares -= shareAmount;
  return sig;
}

async function main() {
  const idl = JSON.parse(readFileSync(join(__dirname, "../target/idl/candl.json"), "utf8"));
  const keypairPath = join(homedir(), ".config/solana/id.json");
  const secretKey = JSON.parse(readFileSync(keypairPath, "utf8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(secretKey));

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const authorityProvider = new AnchorProvider(connection, new Wallet(authority), { commitment: "confirmed" });
  const authorityProgram = new Program(idl, authorityProvider);

  const activeMarkets = await fetchActiveMarkets();
  if (activeMarkets.length === 0) {
    console.log("No ACTIVE markets found -- nothing to simulate.");
    return;
  }
  console.log(`Found ${activeMarkets.length} active market(s): ${activeMarkets.map((m) => m.name).join(", ")}`);
  console.log(`Funding ${BOTS_PER_MARKET} bot(s) per market, running for ${DURATION_MINUTES} minute(s)...\n`);

  const groups: MarketGroup[] = [];

  for (const market of activeMarkets) {
    const nftMint = new PublicKey(market.nftMint);
    const [marketPda] = PublicKey.findProgramAddressSync([Buffer.from("market"), nftMint.toBuffer()], authorityProgram.programId);
    const marketAccount = await (authorityProgram.account as any).market.fetch(marketPda);
    const creator = marketAccount.creator as PublicKey;

    const bots: Bot[] = [];
    for (let i = 0; i < BOTS_PER_MARKET; i++) {
      const keypair = Keypair.generate();
      await fundBot(connection, authority, keypair);
      const provider = new AnchorProvider(connection, new Wallet(keypair), { commitment: "confirmed" });
      const program = new Program(idl, provider);
      const accounts = await resolveTradeAccounts(program, nftMint, keypair.publicKey, creator);
      bots.push({ label: `${market.name}#${i + 1}`, keypair, program, accounts, heldShares: 0 });
      console.log(`  funded bot ${market.name}#${i + 1} (${keypair.publicKey.toBase58().slice(0, 8)}...)`);
    }
    groups.push({ name: market.name, bots });
  }

  console.log("\nTrading...\n");

  const endTime = Date.now() + DURATION_MINUTES * 60_000;
  let buys = 0;
  let sells = 0;
  let failures = 0;

  while (Date.now() < endTime) {
    const group = groups[Math.floor(Math.random() * groups.length)];
    const bot = group.bots[Math.floor(Math.random() * group.bots.length)];

    try {
      // Humans hold, then sometimes cash out part of a position rather than
      // trading in perfect lockstep -- weight toward buying, allow selling
      // only against shares this bot actually holds.
      const shouldSell = bot.heldShares > 0 && Math.random() < 0.4;
      if (shouldSell) {
        const amount = Math.max(1, Math.min(bot.heldShares, randomShareAmount(3)));
        const sig = await sell(bot, amount);
        sells++;
        console.log(`  [${group.name}] ${bot.label} sold ${amount} shares -- ${sig}`);
      } else {
        const amount = randomShareAmount();
        const sig = await buy(bot, amount);
        buys++;
        console.log(`  [${group.name}] ${bot.label} bought ${amount} shares -- ${sig}`);
      }
    } catch (err) {
      failures++;
      console.error(`  [${group.name}] ${bot.label} trade failed:`, err instanceof Error ? err.message : err);
    }

    await sleep(randomDelay());
  }

  console.log(`\nDone. ${buys} buy(s), ${sells} sell(s), ${failures} failure(s) over ${DURATION_MINUTES} minute(s).`);
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
