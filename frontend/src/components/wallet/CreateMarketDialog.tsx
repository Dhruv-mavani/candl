"use client";

import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { Loader2, CheckCircle2, Info } from "lucide-react";

import { useCandlProgram, createMarket } from "@/lib/candl-program";
import { useNFTStore, type OwnedNFT } from "@/lib/nft-store";
import { getErrorMessage, isWalletRejection } from "@/lib/wallet-errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../common/dialog";
import { Button } from "../common/button";
import { Input } from "../common/input";
import { Label } from "../common/label";

const MIN_DURATION_DAYS = 1;
const MAX_DURATION_DAYS = 30;
const DEFAULT_DURATION_DAYS = 7;
const SECONDS_PER_DAY = 60 * 60 * 24;

type Step = "idle" | "submitting" | "done";

export function CreateMarketDialog({
  open,
  onOpenChange,
  nft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nft: OwnedNFT | null;
}) {
  const program = useCandlProgram();
  const removeNFT = useNFTStore((s) => s.removeNFT);
  const { connection } = useConnection();

  const [durationDays, setDurationDays] = useState(DEFAULT_DURATION_DAYS);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ signature: string; market: string } | null>(null);
  const [rentExemptSol, setRentExemptSol] = useState<number | null>(null);

  useEffect(() => {
    connection.getMinimumBalanceForRentExemption(0).then((lamports) => setRentExemptSol(lamports / 1e9));
  }, [connection]);

  const resetForm = () => {
    setDurationDays(DEFAULT_DURATION_DAYS);
    setStep("idle");
    setError(null);
    setResult(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && step !== "submitting") resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!program || !program.provider.publicKey) {
      setError("Connect your wallet first.");
      return;
    }
    if (!nft) {
      setError("No NFT selected.");
      return;
    }

    try {
      setStep("submitting");
      const { signature, market } = await createMarket({
        program,
        creator: program.provider.publicKey,
        nftMint: new PublicKey(nft.mint),
        durationSeconds: durationDays * SECONDS_PER_DAY,
      });

      removeNFT(nft.mint); // the NFT is now escrowed by the market, not sitting in the wallet
      setResult({ signature, market: market.toBase58() });
      setStep("done");
    } catch (err) {
      if (!isWalletRejection(err)) console.error("Create market failed:", err);
      setError(getErrorMessage(err, "Failed to create market."));
      setStep("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Market</DialogTitle>
          <DialogDescription>
            Deposit {nft?.name ?? "this NFT"} into a Candl bonding-curve market on Solana
            devnet. The NFT moves into program escrow and traders can start buying shares
            immediately.
          </DialogDescription>
        </DialogHeader>

        {step === "done" && result ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="font-semibold">Market created</p>
            <p className="text-xs text-muted-foreground break-all">{result.market}</p>
            <a
              href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View transaction on Solana Explorer
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-start gap-2 rounded-lg bg-sky-50 dark:bg-sky-400/[0.07] border border-sky-200/60 dark:border-sky-400/15 p-3">
              <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-700 dark:text-sky-300">
                Creating a market requires a one-time deposit of{" "}
                <strong>{rentExemptSol !== null ? `${rentExemptSol} SOL` : "a small amount of SOL"}</strong> --
                the rent-exempt minimum Solana requires for the market&apos;s reserve account. This is
                fully refunded once the market fully settles and every share has been redeemed.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="duration">Market duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min={MIN_DURATION_DAYS}
                max={MAX_DURATION_DAYS}
                value={durationDays}
                disabled={step === "submitting"}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <p className="text-xs text-muted-foreground">
                {MIN_DURATION_DAYS}–{MAX_DURATION_DAYS} days. Can be extended later, never shortened.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {step === "done" ? (
            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={
                !program ||
                step === "submitting" ||
                durationDays < MIN_DURATION_DAYS ||
                durationDays > MAX_DURATION_DAYS
              }
              className="w-full"
            >
              {step === "submitting" && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === "submitting" ? "Creating Market…" : "Create Market"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
