"use client";

import useSWR from "swr";

/**
 * Real SOL/USD spot price from CoinGecko's public API (no key required, CORS-open).
 * This is the one place in the app that talks to an external price feed --
 * every on-chain amount is still SOL/lamports; this is purely a USD display
 * conversion, never used in any trade/quote calculation.
 */
async function fetchSolPriceUsd(): Promise<number> {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
  if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status}`);
  const data = (await res.json()) as { solana?: { usd?: number } };
  const price = data.solana?.usd;
  if (typeof price !== "number") throw new Error("Unexpected CoinGecko response shape");
  return price;
}

/** SOL/USD price, refreshed every 60s. Returns undefined while loading or if the feed is unreachable. */
export function useSolPriceUsd(): number | undefined {
  const { data } = useSWR("sol-price-usd", fetchSolPriceUsd, { refreshInterval: 60_000, revalidateOnFocus: false });
  return data;
}
