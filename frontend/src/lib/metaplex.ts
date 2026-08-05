"use client";

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import type { Umi } from "@metaplex-foundation/umi";

const IRYS_DEVNET_ADDRESS = "https://devnet.irys.xyz";

/**
 * Builds a Metaplex Umi instance bound to the connected wallet-adapter wallet.
 * Returns null until a wallet is connected — the Metaplex identity/payer
 * requires a signer.
 */
export function useUmi(): Umi | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey) return null;

    return createUmi(connection.rpcEndpoint)
      .use(mplTokenMetadata())
      .use(irysUploader({ address: IRYS_DEVNET_ADDRESS }))
      .use(walletAdapterIdentity(wallet));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, wallet.publicKey]);
}
