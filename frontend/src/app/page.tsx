"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Home } from "@/components/market/Home";
import { Marketplace } from "@/components/market/Marketplace";

export default function Page() {
  const { connected } = useWallet();

  if (connected) {
    return <Marketplace />;
  }
  
  return <Home />;
}
