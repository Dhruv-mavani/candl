import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@anchor-lang/core";

// Steeper-than-doc-example curve so buy/sell amounts at realistic share
// counts produce assertable SOL values (see conversation: docs/03-economics.md's
// literal example values round down below the network's flat tx fee).
const CURVE_ALPHA = new BN(1_000_000_000); // 1.0, scaled by CURVE_SCALE
const CURVE_BETA = new BN(100_000_000); // 0.1, scaled by CURVE_SCALE
const PROTOCOL_FEE_BPS = 95; // 0.95%, mandated by docs/03-economics.md
const CREATOR_FEE_BPS = 30; // 0.30%, mandated by docs/03-economics.md

async function main() {
  const idl = JSON.parse(readFileSync(join(__dirname, "../target/idl/candl.json"), "utf8"));
  const keypairPath = join(homedir(), ".config/solana/id.json");
  const secretKey = JSON.parse(readFileSync(keypairPath, "utf8"));
  const authority = Keypair.fromSecretKey(new Uint8Array(secretKey));

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(authority), { commitment: "confirmed" });
  const program = new Program(idl, provider);

  const [protocolConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_config")],
    program.programId
  );

  const existing = await connection.getAccountInfo(protocolConfig);
  if (existing) {
    console.log("ProtocolConfig already initialized at", protocolConfig.toBase58());
    return;
  }

  const tx = await program.methods
    .initializeProtocol(CURVE_ALPHA, CURVE_BETA, PROTOCOL_FEE_BPS, CREATOR_FEE_BPS)
    .accounts({
      protocolConfig,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("initialize_protocol tx:", tx);
  console.log("ProtocolConfig:", protocolConfig.toBase58());
  console.log("Program ID:", program.programId.toBase58());
  console.log("Authority:", authority.publicKey.toBase58());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
