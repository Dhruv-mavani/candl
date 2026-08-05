"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { fetchAllDigitalAssetByOwner, fetchJsonMetadata, isNonFungible } from "@metaplex-foundation/mpl-token-metadata";
import { unwrapOption } from "@metaplex-foundation/umi";
import { Loader2, ImageOff, RefreshCw } from "lucide-react";

import { useUmi } from "@/lib/metaplex";
import { useNFTStore, type OwnedNFT } from "@/lib/nft-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../common/dialog";
import { Button } from "../common/button";

const stripPadding = (value: string) => value.replace(/\0/g, "").trim();

export function ImportNFTDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { connected } = useWallet();
  const umi = useUmi();
  const addNFTs = useNFTStore((s) => s.addNFTs);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletNFTs, setWalletNFTs] = useState<OwnedNFT[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadWalletNFTs = async () => {
    if (!umi) return;
    setLoading(true);
    setError(null);
    try {
      const assets = await fetchAllDigitalAssetByOwner(umi, umi.identity.publicKey);

      // fetchAllDigitalAssetByOwner returns every SPL mint with a Metaplex
      // metadata account, including fungible tokens (e.g. devnet test coins)
      // that happen to have metadata attached. Keep NFTs only.
      const nftAssets = assets.filter((asset) => {
        const tokenStandard = unwrapOption(asset.metadata.tokenStandard);
        if (tokenStandard !== null) return isNonFungible(tokenStandard);
        // Legacy metadata predates the tokenStandard field; such assets are
        // only ever NFTs, so fall back to the mint shape (1 whole unit).
        return asset.mint.decimals === 0 && asset.mint.supply === BigInt(1);
      });

      const resolved = await Promise.all(
        nftAssets.map(async (asset) => {
          const uri = stripPadding(asset.metadata.uri);
          let image = "";
          try {
            const json = await fetchJsonMetadata(umi, uri);
            image = json.image ?? "";
          } catch {
            // Off-chain metadata may be unreachable; fall back to no image.
          }

          const nft: OwnedNFT = {
            mint: asset.mint.publicKey.toString(),
            name: stripPadding(asset.metadata.name) || "Unnamed NFT",
            symbol: stripPadding(asset.metadata.symbol),
            image,
            uri,
            source: "imported",
          };
          return nft;
        })
      );

      setWalletNFTs(resolved);
    } catch (err) {
      console.error("Failed to load wallet NFTs:", err);
      setError(err instanceof Error ? err.message : "Failed to load NFTs from wallet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && umi) {
      setSelected(new Set());
      loadWalletNFTs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, umi?.identity.publicKey]);

  const toggleSelected = (mint: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(mint)) next.delete(mint);
      else next.add(mint);
      return next;
    });
  };

  const handleImport = () => {
    const toImport = walletNFTs.filter((n) => selected.has(n.mint));
    addNFTs(toImport);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import NFT</DialogTitle>
          <DialogDescription>
            Select NFTs already in your wallet to bring them into Candl so you can
            deposit them into a market.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto -mx-1 px-1">
          {!connected ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Connect your wallet to see your NFTs.
            </p>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning wallet for NFTs…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-6 text-center">{error}</p>
          ) : walletNFTs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No NFTs found in this wallet.
            </p>
          ) : (
            <div className="grid gap-2">
              {walletNFTs.map((nft) => {
                const isSelected = selected.has(nft.mint);
                return (
                  <button
                    key={nft.mint}
                    type="button"
                    onClick={() => toggleSelected(nft.mint)}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {nft.image ? (
                      // nft.image comes from on-chain metadata for any wallet-owned NFT — an
                      // arbitrary external URL (any IPFS/Arweave/host) that next/image's loader
                      // cannot resolve without a pre-configured remotePatterns entry.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nft.image} alt={nft.name} className="w-10 h-10 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <ImageOff className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{nft.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{nft.mint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center sm:justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadWalletNFTs}
            disabled={!connected || loading}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={handleImport} disabled={selected.size === 0}>
            Import {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
