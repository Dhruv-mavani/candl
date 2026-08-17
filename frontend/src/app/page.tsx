"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Home } from "@/components/market/Home";
import { Marketplace } from "@/components/market/Marketplace";

const WAITLIST_MODE = process.env.NEXT_PUBLIC_WAITLIST_MODE === "true";

export default function Page() {
  const { connected } = useWallet();

  if (!WAITLIST_MODE && connected) {
    return <Marketplace />;
  }

  return <Home />;
}
