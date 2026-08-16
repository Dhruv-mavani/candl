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

export interface RealCandle {
  /** ISO string over the wire (the API serializes a Postgres timestamp column as JSON). */
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RealMarketStats {
  volume24h: number;
  priceChange24h: number;
  holders: number;
}

/** Matches docs/10-api.md's allowed candle resolutions. */
export type CandleResolution = "1m" | "5m" | "15m" | "1h" | "1d";

export interface ProtocolStats {
  totalMarkets: number;
  totalVolume: number;
  totalUniqueTraders: number;
  /** Combined protocol + creator fees across every trade, in lamports. */
  totalFeesCollected: number;
  /** The protocol's own cut of totalFeesCollected, in lamports. */
  totalProtocolEarnings: number;
}

export interface CreatorMarketEarnings {
  marketPubkey: string;
  nftMint: string;
  tradeCount: number;
  earnedLamports: number;
}

export interface CreatorEarnings {
  totalEarnedLamports: number;
  markets: CreatorMarketEarnings[];
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

export function getMarket(mint: string): Promise<RealMarket> {
  return fetchJson<RealMarket>(`/api/v1/markets/${mint}`);
}

export function getCandles(mint: string, resolution: CandleResolution): Promise<RealCandle[]> {
  return fetchJson<RealCandle[]>(`/api/v1/markets/${mint}/candles?resolution=${resolution}`);
}

export function getMarketStats(mint: string): Promise<RealMarketStats> {
  return fetchJson<RealMarketStats>(`/api/v1/markets/${mint}/stats`);
}

export function getProtocolStats(): Promise<ProtocolStats> {
  return fetchJson<ProtocolStats>("/api/v1/protocol/stats");
}

export function getCreatorEarnings(pubkey: string): Promise<CreatorEarnings> {
  return fetchJson<CreatorEarnings>(`/api/v1/creators/${pubkey}/earnings`);
}
