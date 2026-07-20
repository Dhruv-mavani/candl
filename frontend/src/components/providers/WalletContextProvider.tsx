"use client";

import { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
  
  // Phantom and Solflare act as fallbacks: if not installed, they redirect to the download page
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
