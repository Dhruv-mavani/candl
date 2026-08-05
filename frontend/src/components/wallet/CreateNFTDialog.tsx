"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getErrorMessage, isWalletRejection } from "@/lib/wallet-errors";
import {
  createGenericFileFromBrowserFile,
  generateSigner,
  percentAmount,
} from "@metaplex-foundation/umi";
import { createNft } from "@metaplex-foundation/mpl-token-metadata";
import { Loader2, UploadCloud, CheckCircle2 } from "lucide-react";

import { useUmi } from "@/lib/metaplex";
import { useNFTStore } from "@/lib/nft-store";
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
import { Textarea } from "../common/textarea";

const DEFAULT_SELLER_FEE_BPS = 0;

function deriveSymbol(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return cleaned.slice(0, 8) || "CANDL";
}

type Step = "idle" | "uploading-image" | "uploading-metadata" | "minting" | "done";

const STEP_LABEL: Record<Step, string> = {
  idle: "Create NFT",
  "uploading-image": "Uploading image…",
  "uploading-metadata": "Uploading metadata…",
  minting: "Minting on Solana…",
  done: "Minted",
};

export function CreateNFTDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { connected } = useWallet();
  const umi = useUmi();
  const addNFT = useNFTStore((s) => s.addNFT);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);

  const isBusy = step !== "idle" && step !== "done";

  const resetForm = () => {
    setName("");
    setSymbol("");
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
    setStep("idle");
    setError(null);
    setMintAddress(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !isBusy) resetForm();
    onOpenChange(next);
  };

  const handleFileChange = (file: File | null) => {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!umi) {
      setError("Connect your wallet first.");
      return;
    }
    if (!name.trim()) {
      setError("Give your NFT a name.");
      return;
    }
    if (!imageFile) {
      setError("Choose an image for your NFT.");
      return;
    }

    try {
      setStep("uploading-image");
      const genericImageFile = await createGenericFileFromBrowserFile(imageFile);
      const [imageUri] = await umi.uploader.upload([genericImageFile]);
      // The uploader's internal task pool swallows a rejected wallet signature
      // instead of throwing (it resolves with an empty results array), so a
      // cancelled signature would otherwise flow through as `undefined` and
      // silently produce a broken NFT. Catch that here instead.
      if (!imageUri) throw new Error("Image upload was cancelled or failed.");

      setStep("uploading-metadata");
      const metadataUri = await umi.uploader.uploadJson({
        name: name.trim(),
        symbol: symbol.trim() || deriveSymbol(name),
        description: description.trim(),
        image: imageUri,
        properties: {
          files: [{ uri: imageUri, type: imageFile.type }],
          category: "image",
        },
      });
      if (!metadataUri) throw new Error("Metadata upload was cancelled or failed.");

      setStep("minting");
      const mint = generateSigner(umi);
      await createNft(umi, {
        mint,
        name: name.trim(),
        symbol: symbol.trim() || deriveSymbol(name),
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(DEFAULT_SELLER_FEE_BPS),
        collectionDetails: null,
      }).sendAndConfirm(umi);

      addNFT({
        mint: mint.publicKey.toString(),
        name: name.trim(),
        symbol: symbol.trim() || deriveSymbol(name),
        image: imageUri,
        uri: metadataUri,
        source: "created",
      });

      setMintAddress(mint.publicKey.toString());
      setStep("done");
    } catch (err) {
      if (!isWalletRejection(err)) console.error("Create NFT failed:", err);
      setError(getErrorMessage(err, "Failed to create NFT."));
      setStep("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create NFT</DialogTitle>
          <DialogDescription>
            Mint a new NFT to your wallet on Solana devnet using the Metaplex Token
            Metadata standard. You can deposit it into a Candl market afterwards.
          </DialogDescription>
        </DialogHeader>

        {step === "done" && mintAddress ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="font-semibold">NFT minted successfully</p>
            <p className="text-xs text-muted-foreground break-all">{mintAddress}</p>
            <a
              href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View on Solana Explorer
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nft-image">Image</Label>
              <label
                htmlFor="nft-image"
                className="flex items-center gap-3 rounded-md border border-dashed border-input px-3 py-3 cursor-pointer hover:border-emerald-400/60 transition-colors"
              >
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="Preview" className="w-12 h-12 rounded-md object-cover shrink-0" />
                ) : (
                  <UploadCloud className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm text-muted-foreground truncate">
                  {imageFile ? imageFile.name : "Choose an image file"}
                </span>
              </label>
              <input
                id="nft-image"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isBusy}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nft-name">Name</Label>
              <Input
                id="nft-name"
                placeholder="Genesis #001"
                value={name}
                disabled={isBusy}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nft-symbol">Symbol (optional)</Label>
              <Input
                id="nft-symbol"
                placeholder={name ? deriveSymbol(name) : "CANDL"}
                value={symbol}
                disabled={isBusy}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nft-description">Description (optional)</Label>
              <Textarea
                id="nft-description"
                placeholder="Describe your asset…"
                value={description}
                disabled={isBusy}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {!connected && (
              <p className="text-sm text-muted-foreground">Connect your wallet to mint.</p>
            )}
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
              disabled={!connected || isBusy}
              className="w-full"
            >
              {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {STEP_LABEL[step]}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
