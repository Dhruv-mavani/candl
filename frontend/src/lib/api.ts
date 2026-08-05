const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface RealMarketMetadata {
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  description: string | null;
}

export interface RealMarket {
  id: number;
  pubkey: string;
  nftMint: string;
  creator: string;
  createdAt: string;
  duration: number;
  expiresAt: string;
  state: "ACTIVE" | "SETTLING" | "SETTLED";
  feeProtocolBps: number;
  feeCreatorBps: number;
  currentPrice: string | null;
  reserveSol: string | null;
  outstandingShares: string | null;
  metadata: RealMarketMetadata | null;
  volume: number;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`Backend request failed: ${res.status} ${res.statusText}`);
  return res.json();
}

/** Fetcher shape SWR expects: (key) => Promise<data>. */
export const swrFetcher = <T>(path: string) => fetchJson<T>(path);

export function getMarkets(): Promise<RealMarket[]> {
  return fetchJson<RealMarket[]>("/api/v1/markets");
}
