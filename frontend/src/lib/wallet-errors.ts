import { WalletError } from "@solana/wallet-adapter-base";

/**
 * True when the user cancelled a wallet prompt (reject signature, close
 * popup, etc.) rather than a real failure. Covers signMessage, signTransaction,
 * and sendTransaction rejections uniformly, since they all extend WalletError.
 */
export function isWalletRejection(err: unknown): boolean {
  return err instanceof WalletError && /reject|declin|cancel/i.test(err.message);
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (isWalletRejection(err)) return "Cancelled — no signature was provided.";
  return err instanceof Error ? err.message : fallback;
}
