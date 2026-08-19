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
  /** Unix seconds -- the /candles route converts it before responding (unlike the market row's raw ISO-string timestamp fields). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HolderPosition {
  trader: string;
  shares: number;
}

export interface RealMarketStats {
  volume24h: number;
  totalVolume: number;
  tradeCount: number;
  priceChange24h: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  marketCap: number | null;
  reserveSol: number | null;
  currentPrice: number | null;
  athPrice: number | null;
  atlPrice: number | null;
  holderCount: number;
  largestHolder: HolderPosition | null;
}

/** Matches docs/10-api.md's allowed candle resolutions. */
export type CandleResolution = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";

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
  nftName: string | null;
  nftImageUrl: string | null;
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

export function getCandles(mint: string, resolution: CandleResolution, fromUnixSeconds?: number): Promise<RealCandle[]> {
  const from = fromUnixSeconds ? `&from=${fromUnixSeconds}` : "";
  return fetchJson<RealCandle[]>(`/api/v1/markets/${mint}/candles?resolution=${resolution}${from}`);
}

export function getMarketStats(mint: string): Promise<RealMarketStats> {
  return fetchJson<RealMarketStats>(`/api/v1/markets/${mint}/stats`);
}

export function getProtocolStats(): Promise<ProtocolStats> {
  return fetchJson<ProtocolStats>("/api/v1/protocol/stats");
}

export interface ProtocolHistoryPoint {
  timestamp: string;
  cumulativeVolumeLamports: number;
  cumulativeProtocolEarningsLamports: number;
}

export function getProtocolEarningsHistory(points?: number): Promise<ProtocolHistoryPoint[]> {
  const query = points ? `?points=${points}` : "";
  return fetchJson<ProtocolHistoryPoint[]>(`/api/v1/protocol/earnings/history${query}`);
}

export interface ProtocolMarketEarnings {
  marketPubkey: string;
  nftMint: string;
  nftName: string | null;
  nftImageUrl: string | null;
  protocolEarnedLamports: number;
  volumeLamports: number;
}

export function getProtocolEarningsByMarket(limit?: number): Promise<ProtocolMarketEarnings[]> {
  const query = limit ? `?limit=${limit}` : "";
  return fetchJson<ProtocolMarketEarnings[]>(`/api/v1/protocol/earnings/by-market${query}`);
}

export function getCreatorEarnings(pubkey: string): Promise<CreatorEarnings> {
  return fetchJson<CreatorEarnings>(`/api/v1/creators/${pubkey}/earnings`);
}

export interface PortfolioHolding {
  marketPubkey: string;
  nftMint: string;
  nftName: string | null;
  nftImageUrl: string | null;
  marketState: string;
  shares: number;
  avgCostLamports: number;
  currentPriceLamports: number;
  costBasisLamports: number;
  valueLamports: number;
}

export interface TraderPortfolio {
  totalValueLamports: number;
  totalCostLamports: number;
  holdings: PortfolioHolding[];
}

export function getTraderPortfolio(pubkey: string): Promise<TraderPortfolio> {
  return fetchJson<TraderPortfolio>(`/api/v1/traders/${pubkey}/portfolio`);
}

export interface PeriodChange {
  earnedLamports: number;
  percent: number | null;
}

export interface PortfolioPerformance {
  day: PeriodChange;
  week: PeriodChange;
  month: PeriodChange;
  year: PeriodChange;
}

export function getTraderPortfolioPerformance(pubkey: string): Promise<PortfolioPerformance> {
  return fetchJson<PortfolioPerformance>(`/api/v1/traders/${pubkey}/performance`);
}

export interface PortfolioHistoryPoint {
  timestamp: string;
  valueLamports: number;
}

export type PerformancePeriod = "day" | "week" | "month" | "year";

export interface TraderTrade {
  id: number;
  signature: string;
  marketPubkey: string | null;
  direction: "BUY" | "SELL";
  solAmount: string;
  shareAmount: string;
  price: string;
  feePaid: string;
  timestamp: string;
  nftMint: string | null;
  nftName: string | null;
  nftImageUrl: string | null;
}

export function getTraderTrades(pubkey: string, limit = 50): Promise<TraderTrade[]> {
  return fetchJson<TraderTrade[]>(`/api/v1/traders/${pubkey}/trades?limit=${limit}`);
}

export function getTraderPortfolioHistory(
  pubkey: string,
  options?: { points?: number; period?: PerformancePeriod }
): Promise<PortfolioHistoryPoint[]> {
  const params = new URLSearchParams();
  if (options?.points) params.set("points", String(options.points));
  if (options?.period) params.set("period", options.period);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchJson<PortfolioHistoryPoint[]>(`/api/v1/traders/${pubkey}/portfolio/history${query}`);
}

export interface WaitlistJoinPayload {
  email: string;
  name: string;
  twitter?: string;
  walletAddress?: string;
  message?: string;
}

export interface WaitlistEntry {
  id: number;
  email: string;
  name: string;
  twitter: string | null;
  walletAddress: string | null;
  message: string | null;
  createdAt: string;
}

export async function joinWaitlist(payload: WaitlistJoinPayload): Promise<{ status: "joined" | "already-joined" }> {
  const res = await fetch(`${API_URL}/api/v1/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data;
}

/** Admin-only: reads the waitlist, gated by ADMIN_SECRET on the backend. */
export async function getWaitlistEntries(adminSecret: string): Promise<WaitlistEntry[]> {
  const res = await fetch(`${API_URL}/api/v1/admin/waitlist`, {
    headers: { "x-admin-secret": adminSecret },
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Invalid admin secret" : `Request failed: ${res.status}`);
  return res.json();
}
