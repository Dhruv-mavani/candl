"use client";

import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN, Program } from "@anchor-lang/core";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "./idl/candl.json";
import type { Candl } from "./idl/candl";

/** Default slippage tolerance applied to live trades (docs don't specify one; V1 keeps it fixed rather than exposing a settings UI). */
const DEFAULT_SLIPPAGE_BPS = 100; // 1%

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

export function deriveTraderPosition(market: PublicKey, trader: PublicKey) {
  const [traderPosition] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), market.toBuffer(), trader.toBuffer()],
    CANDL_PROGRAM_ID
  );
  return traderPosition;
}

/**
 * buy/sell's `market` PDA seed is `market.nft_mint` (self-referential -- the
 * on-chain program validates an already-supplied account against its own
 * field). That means the Anchor client can't auto-derive `market`, and
 * `protocol_treasury`/`creator` have no seed info at all, so every account
 * here is resolved explicitly and passed via accountsStrict rather than
 * relying on partial auto-resolution.
 */
async function resolveTradeAccounts(program: Program<Candl>, nftMint: PublicKey, trader: PublicKey, creator: PublicKey) {
  const { protocolConfig, market, bondingCurve, vault } = deriveCandlPdas(nftMint);
  const traderPosition = deriveTraderPosition(market, trader);
  const protocolConfigAccount = await program.account.protocolConfig.fetch(protocolConfig);

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

export interface TradeParams {
  program: Program<Candl>;
  trader: PublicKey;
  nftMint: PublicKey;
  creator: PublicKey;
  shareAmount: number;
}

export interface TradeQuote {
  /** The curve's cost (buy) or refund (sell) BEFORE fees, in lamports -- matches TradeExecuted.sol_amount, which is gross either way. */
  solAmount: string;
  /** Price(outstanding_shares) after the trade, in lamports per share. */
  price: string;
  feePaid: string;
}

/**
 * What the trader actually pays (buy) or receives (sell), in lamports.
 * buy.rs charges `cost + fees`; sell.rs pays out `refund - fees` -- sol_amount
 * alone is NOT the total, so every caller needing the real amount (the
 * on-chain slippage bound, or a UI total) goes through this one place.
 */
export function quotedTotal(quote: TradeQuote, side: "buy" | "sell"): BN {
  const solAmount = new BN(quote.solAmount);
  const feePaid = new BN(quote.feePaid);
  return side === "buy" ? solAmount.add(feePaid) : solAmount.sub(feePaid);
}

function findTradeEvent(events: readonly { name: string; data: Record<string, unknown> }[]) {
  const event = events.find((e) => e.name.toLowerCase() === "tradeexecuted");
  if (!event) throw new Error("Simulation did not emit a TradeExecuted event.");
  return event.data;
}

/**
 * Gets an authoritative cost/refund preview by simulating the real
 * instruction (no signature required -- see AnchorProvider.simulate) and
 * reading back its emitted TradeExecuted event, instead of reimplementing
 * the bonding curve formula in the frontend.
 */
export async function quoteTrade({
  program,
  trader,
  nftMint,
  creator,
  shareAmount,
  side,
}: TradeParams & { side: "buy" | "sell" }): Promise<TradeQuote> {
  const accounts = await resolveTradeAccounts(program, nftMint, trader, creator);
  const shares = new BN(shareAmount);

  const { events } =
    side === "buy"
      ? await program.methods.buy(shares, new BN(Number.MAX_SAFE_INTEGER)).accountsStrict(accounts).simulate()
      : await program.methods.sell(shares, new BN(0)).accountsStrict(accounts).simulate();

  const data = findTradeEvent(events);
  return {
    solAmount: String(data.solAmount),
    price: String(data.price),
    feePaid: String(data.feePaid),
  };
}

export interface ExecuteTradeParams extends TradeParams {
  /** Fresh quote from quoteTrade() for the same side/shareAmount. */
  quote: TradeQuote;
}

/** Applies DEFAULT_SLIPPAGE_BPS on top of a fresh quote and sends the real buy transaction. */
export async function buy({ program, trader, nftMint, creator, shareAmount, quote }: ExecuteTradeParams) {
  const accounts = await resolveTradeAccounts(program, nftMint, trader, creator);
  const maxSolCost = quotedTotal(quote, "buy").muln(10_000 + DEFAULT_SLIPPAGE_BPS).divn(10_000);

  const signature = await program.methods
    .buy(new BN(shareAmount), maxSolCost)
    .accountsStrict(accounts)
    .rpc();

  return { signature };
}

/** Applies DEFAULT_SLIPPAGE_BPS on top of a fresh quote and sends the real sell transaction. */
export async function sell({ program, trader, nftMint, creator, shareAmount, quote }: ExecuteTradeParams) {
  const accounts = await resolveTradeAccounts(program, nftMint, trader, creator);
  const minSolOut = quotedTotal(quote, "sell").muln(10_000 - DEFAULT_SLIPPAGE_BPS).divn(10_000);

  const signature = await program.methods
    .sell(new BN(shareAmount), minSolOut)
    .accountsStrict(accounts)
    .rpc();

  return { signature };
}

/**
 * Transitions an expired Active market to Settling. Permissionless on-chain
 * (settle.rs takes no signer beyond whoever pays the tx fee) -- any wallet
 * can call this once the market's real expiry has passed.
 */
export async function settleMarket({ program, nftMint }: { program: Program<Candl>; nftMint: PublicKey }) {
  const { market, bondingCurve } = deriveCandlPdas(nftMint);

  const signature = await program.methods.settle().accountsStrict({ market, bondingCurve }).rpc();

  return { signature };
}

export interface RedeemAllParams {
  program: Program<Candl>;
  caller: PublicKey;
  nftMint: PublicKey;
  creator: PublicKey;
}

export interface RemainingPosition {
  trader: PublicKey;
  shares: number;
}

function resolveForceRedeemAccounts(nftMint: PublicKey, trader: PublicKey, caller: PublicKey, creator: PublicKey) {
  const { market, bondingCurve, vault, escrow } = deriveCandlPdas(nftMint);
  const traderPosition = deriveTraderPosition(market, trader);
  // force_redeem.rs requires this to already exist (the creator's own ATA
  // from create_market's deposit, now empty since the NFT moved to escrow),
  // so unlike createMarket there's nothing here that needs init_if_needed.
  const creatorTokenAccount = getAssociatedTokenAddressSync(nftMint, creator);

  return {
    market,
    bondingCurve,
    vault,
    traderPosition,
    trader,
    caller,
    escrow,
    nftMint,
    creatorTokenAccount,
    creator,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}

/**
 * Every trader position still holding shares in this market, read straight
 * from on-chain TraderPosition accounts (not a trade-log-derived table,
 * which wouldn't reflect redemptions already paid out) -- this is the "who
 * still needs to be redeemed" list redeemAll() acts on.
 */
export async function getRemainingPositions({
  program,
  nftMint,
}: {
  program: Program<Candl>;
  nftMint: PublicKey;
}): Promise<RemainingPosition[]> {
  const { market } = deriveCandlPdas(nftMint);
  const positions = await program.account.traderPosition.all([
    { memcmp: { offset: 8, bytes: market.toBase58() } },
  ]);

  return positions
    .map((p) => ({ trader: p.account.trader as PublicKey, shares: Number(p.account.shares) }))
    .filter((p) => p.shares > 0);
}

/**
 * Redeems every remaining shareholder in a settling market in one
 * transaction -- the caller's own position (if any) plus everyone else's,
 * via force_redeem for each. Only the caller pays the network fee; every
 * payout still goes to its own trader, never to the caller (force_redeem.rs).
 * This is what actually lets a market reach Settled instead of staying stuck
 * because one holder never came back to redeem themselves
 * (docs/04-market-lifecycle.md).
 */
export async function redeemAll({ program, caller, nftMint, creator }: RedeemAllParams) {
  const positions = await getRemainingPositions({ program, nftMint });
  if (positions.length === 0) {
    throw new Error("No remaining shares to redeem.");
  }

  const instructions = await Promise.all(
    positions.map((p) =>
      program.methods
        .forceRedeem(new BN(p.shares))
        .accountsStrict(resolveForceRedeemAccounts(nftMint, p.trader, caller, creator))
        .instruction()
    )
  );

  const tx = new Transaction().add(...instructions);
  const signature = await (program.provider as AnchorProvider).sendAndConfirm(tx);

  return { signature, redeemedCount: positions.length };
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
