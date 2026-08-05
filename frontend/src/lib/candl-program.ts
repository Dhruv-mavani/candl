"use client";

import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN, Program } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "./idl/candl.json";
import type { Candl } from "./idl/candl";

export const CANDL_PROGRAM_ID = new PublicKey(idl.address);

export function useCandlProgram(): Program<Candl> | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new Program(idl as Candl, provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, wallet?.publicKey]);
}

/** Mirrors the seeds in smart-contracts/programs/candl/src/constants.rs. */
export function deriveCandlPdas(nftMint: PublicKey) {
  const [protocolConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_config")],
    CANDL_PROGRAM_ID
  );
  const [market] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), nftMint.toBuffer()],
    CANDL_PROGRAM_ID
  );
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), market.toBuffer()],
    CANDL_PROGRAM_ID
  );
  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), market.toBuffer()],
    CANDL_PROGRAM_ID
  );
  const [escrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), market.toBuffer()],
    CANDL_PROGRAM_ID
  );

  return { protocolConfig, market, bondingCurve, vault, escrow };
}

export interface CreateMarketParams {
  program: Program<Candl>;
  creator: PublicKey;
  nftMint: PublicKey;
  durationSeconds: number;
}

/**
 * Builds and sends the create_market transaction (docs/06-smart-contracts.md,
 * docs/08-frontend.md). Every account except nftMint/creatorTokenAccount/creator
 * is a PDA or well-known program address the Anchor client resolves itself
 * from the IDL's seed metadata -- no need to derive them by hand here.
 */
export async function createMarket({ program, creator, nftMint, durationSeconds }: CreateMarketParams) {
  const { market, bondingCurve, vault, escrow } = deriveCandlPdas(nftMint);
  const creatorTokenAccount = getAssociatedTokenAddressSync(nftMint, creator);

  const signature = await program.methods
    .createMarket(new BN(durationSeconds))
    .accounts({ nftMint, creatorTokenAccount, creator })
    .rpc();

  return { signature, market, bondingCurve, vault, escrow };
}
