import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OwnedNFT {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  uri: string;
  source: "created" | "imported";
}

interface NFTStore {
  nfts: OwnedNFT[];
  addNFT: (nft: OwnedNFT) => void;
  addNFTs: (nfts: OwnedNFT[]) => void;
  removeNFT: (mint: string) => void;
}

export const useNFTStore = create<NFTStore>()(
  persist(
    (set) => ({
      nfts: [],
      addNFT: (nft) =>
        set((state) =>
          state.nfts.some((n) => n.mint === nft.mint)
            ? state
            : { nfts: [...state.nfts, nft] }
        ),
      addNFTs: (nfts) =>
        set((state) => {
          const existingMints = new Set(state.nfts.map((n) => n.mint));
          const newOnes = nfts.filter((n) => !existingMints.has(n.mint));
          return newOnes.length > 0 ? { nfts: [...state.nfts, ...newOnes] } : state;
        }),
      removeNFT: (mint) =>
        set((state) => ({ nfts: state.nfts.filter((n) => n.mint !== mint) })),
    }),
    { name: "candl-nfts" }
  )
);
