"use client";
import Link from "next/link";
import Image from "next/image";
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Clock, ImageOff, Sparkles, X, Coins } from "lucide-react";
import { nftData } from "@/lib/mockData";
import { useNFTStore, type OwnedNFT } from "@/lib/nft-store";
import { useState } from "react";
import useSWR from "swr";
import { useWallet } from "@solana/wallet-adapter-react";
import { getCreatorEarnings, getTraderPortfolio, getTraderPortfolioPerformance, getTraderPortfolioHistory, getTraderTrades } from "@/lib/api";
import { useSolPriceUsd } from "@/lib/solPrice";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../common/alert-dialog";
import { CreateMarketDialog } from "./CreateMarketDialog";

const glass =
  "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_8px_32px_rgba(16,185,129,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]";
const inset =
  "bg-white/40 dark:bg-white/[0.04] border border-white/60 dark:border-white/[0.07] rounded-xl";

function lamportsToSol(value: number) {
  return value / 1e9;
}

export function Portfolio() {
  const [tab, setTab] = useState<"holdings" | "mynfts" | "history">("holdings");
  const myNFTs = useNFTStore((s) => s.nfts);
  const { publicKey } = useWallet();
  const solPriceUsd = useSolPriceUsd();
  const { data: creatorEarnings } = useSWR(
    publicKey ? `/api/v1/creators/${publicKey.toBase58()}/earnings` : null,
    () => getCreatorEarnings(publicKey!.toBase58()),
    { refreshInterval: 15000 }
  );
  const { data: portfolio } = useSWR(
    publicKey ? `/api/v1/traders/${publicKey.toBase58()}/portfolio` : null,
    () => getTraderPortfolio(publicKey!.toBase58()),
    { refreshInterval: 15000 }
  );
  const { data: performance } = useSWR(
    publicKey ? `/api/v1/traders/${publicKey.toBase58()}/performance` : null,
    () => getTraderPortfolioPerformance(publicKey!.toBase58()),
    { refreshInterval: 60000 }
  );
  const [performancePeriod, setPerformancePeriod] = useState<"day" | "week" | "month" | "year">("day");
  // Real trade-price-derived value series, windowed to match the selected period, refreshed frequently for a near-live feel.
  const { data: history } = useSWR(
    publicKey ? `/api/v1/traders/${publicKey.toBase58()}/portfolio/history?period=${performancePeriod}` : null,
    () => getTraderPortfolioHistory(publicKey!.toBase58(), { period: performancePeriod }),
    { refreshInterval: 5000 }
  );
  // This wallet's own real trade log -- fetched lazily, only once the History tab is open.
  const { data: trades } = useSWR(
    publicKey && tab === "history" ? `/api/v1/traders/${publicKey.toBase58()}/trades` : null,
    () => getTraderTrades(publicKey!.toBase58()),
    { refreshInterval: 15000 }
  );
  const marketsWithEarnings = creatorEarnings?.markets.filter((m) => m.tradeCount > 0) ?? [];
  const removeNFT = useNFTStore((s) => s.removeNFT);
  const [nftPendingRemoval, setNftPendingRemoval] = useState<OwnedNFT | null>(null);
  const [nftForMarketCreation, setNftForMarketCreation] = useState<OwnedNFT | null>(null);
  const [createMarketOpen, setCreateMarketOpen] = useState(false);

  // Real positions derived on the backend from this wallet's own trade log
  // (see backend/src/services/analytics/portfolio.ts) -- no mock/fabricated data.
  const holdings = portfolio?.holdings ?? [];
  const lamportsToUsd = (lamports: number) => (solPriceUsd ? (lamports / 1e9) * solPriceUsd : 0);
  const totalValue = lamportsToUsd(portfolio?.totalValueLamports ?? 0);
  const totalCost = lamportsToUsd(portfolio?.totalCostLamports ?? 0);
  const profitLoss = totalValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
  const selectedPeriodChange = performance?.[performancePeriod];
  const periodEarnedUsd = lamportsToUsd(selectedPeriodChange?.earnedLamports ?? 0);
  const historyTrendUp =
    history && history.length >= 2 ? history[history.length - 1]!.valueLamports >= history[0]!.valueLamports : true;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8 text-slate-800 dark:text-slate-100">
      <AlertDialog
        open={nftPendingRemoval !== null}
        onOpenChange={(open) => !open && setNftPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {nftPendingRemoval?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this NFT from your Candl list. This only
              removes it here — it does not affect the NFT on-chain — but this action
              cannot be undone and you&apos;ll need to import it again to see it here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNftPendingRemoval(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (nftPendingRemoval) removeNFT(nftPendingRemoval.mint);
                setNftPendingRemoval(null);
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateMarketDialog
        open={createMarketOpen}
        onOpenChange={(open) => {
          setCreateMarketOpen(open);
          if (!open) setNftForMarketCreation(null);
        }}
        nft={nftForMarketCreation}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">My Portfolio</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Track your NFT share investments</p>
      </div>

      {/* Stats row */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {/* Total Value */}
        <div className={`rounded-2xl p-5 relative ${glass}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-transparent rounded-2xl overflow-hidden" />
          <div className="relative flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Wallet className="w-3.5 h-3.5" />
                Total Value
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">Shares you currently hold, at today&apos;s price</div>
              <div className="text-2xl font-bold mb-1">${totalValue.toFixed(2)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {((portfolio?.totalValueLamports ?? 0) / 1e9).toFixed(4)} SOL
              </div>

              <div className="flex items-center gap-1 mb-2">
                {(["day", "week", "month", "year"] as const).map((period) => (
                  <button
                    type="button"
                    key={period}
                    onClick={() => setPerformancePeriod(period)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize transition-colors
                      ${performancePeriod === period
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}
                  >
                    {period === "day" ? "1D" : period === "week" ? "1W" : period === "month" ? "1M" : "1Y"}
                  </button>
                ))}
              </div>
              <div>
                {selectedPeriodChange ? (
                  <div className={`flex items-center gap-1 text-sm font-semibold ${periodEarnedUsd >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                    {periodEarnedUsd >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {periodEarnedUsd >= 0 ? "+" : ""}${Math.abs(periodEarnedUsd).toFixed(2)}
                    {selectedPeriodChange.percent !== null && (
                      <span className="text-xs font-medium opacity-80">
                        ({selectedPeriodChange.percent >= 0 ? "+" : ""}{selectedPeriodChange.percent.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No history yet</div>
                )}
              </div>
            </div>

            {/* Real-time value chart -- every point is this wallet's actual holdings priced
                at real historical trade prices (see backend getTraderPortfolioHistory), never fabricated. */}
            {history && history.length >= 2 && (
              <div className="w-28 h-32 shrink-0 self-stretch">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <YAxis domain={["dataMin", "dataMax"]} hide />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const point = payload[0]!.payload as { timestamp: string; valueLamports: number };
                          return (
                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-white/10 p-2 rounded-lg shadow-lg text-xs z-50 relative whitespace-nowrap">
                              <div className="text-slate-500 dark:text-slate-400 mb-0.5">
                                {new Date(point.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                              </div>
                              <div className="font-bold text-emerald-600 dark:text-emerald-400">${lamportsToUsd(point.valueLamports).toFixed(2)}</div>
                              <div className="text-slate-400 dark:text-slate-500 text-[10px]">{(point.valueLamports / 1e9).toFixed(4)} SOL</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{ stroke: "rgba(52, 211, 153, 0.3)", strokeWidth: 1, strokeDasharray: "4 4" }}
                      wrapperStyle={{ zIndex: 50 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="valueLamports"
                      stroke={historyTrendUp ? "#34d399" : "#fb7185"}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, fill: historyTrendUp ? "#34d399" : "#fb7185", strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* P&L */}
        <div className={`rounded-2xl p-5 relative overflow-hidden ${glass}`}>
          <div className={`absolute inset-0 rounded-2xl ${profitLoss >= 0 ? "bg-gradient-to-br from-emerald-400/8" : "bg-gradient-to-br from-rose-400/8"} to-transparent`} />
          <div className="relative flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Holder Earnings
          </div>
          <div className="relative text-[10px] text-slate-400 dark:text-slate-500 mb-2">
            Profit/loss as a trader -- separate from Creator Earnings below
          </div>
          <div className={`relative text-2xl font-bold mb-1 ${profitLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
            {profitLoss >= 0 ? "+" : ""}${profitLoss.toFixed(2)}
          </div>
          <div className={`relative flex items-center gap-1 text-sm font-semibold ${profitLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
            {profitLoss >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {profitLossPercent.toFixed(2)}%
          </div>
        </div>

        {/* Holdings count */}
        <div className={`rounded-2xl p-5 relative overflow-hidden ${glass}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400/8 to-transparent rounded-2xl" />
          <div className="relative text-xs text-slate-500 dark:text-slate-400 mb-1">Holdings</div>
          <div className="relative text-2xl font-bold mb-1">{holdings.length}</div>
          <div className="relative text-sm text-slate-500 dark:text-slate-400">
            {holdings.reduce((s, h) => s + h.shares, 0)} total shares
          </div>
        </div>
      </div>

      {/* Creator Earnings (real on-chain fee revenue -- only shown once you've created a market someone actually traded on) */}
      {marketsWithEarnings.length > 0 && (
        <div className={`rounded-2xl p-5 mb-8 relative overflow-hidden ${glass}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/8 to-transparent rounded-2xl" />
          <div className="relative flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Coins className="w-3.5 h-3.5" />
            Creator Earnings (devnet)
          </div>
          <div className="relative text-[10px] text-slate-400 dark:text-slate-500 mb-2">
            Trading fees paid to you as the creator of these markets -- separate from Holder Earnings above, which is your profit/loss as a trader
          </div>
          <div className="relative mb-4">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${lamportsToUsd(creatorEarnings?.totalEarnedLamports ?? 0).toFixed(6)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lamportsToSol(creatorEarnings?.totalEarnedLamports ?? 0).toFixed(6)} SOL
            </div>
          </div>
          <div className="relative space-y-2">
            {marketsWithEarnings.map((m) => (
              <Link
                key={m.marketPubkey}
                href={`/market/${m.nftMint}`}
                className={`flex items-center gap-3 p-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.04] ${inset}`}
              >
                {m.nftImageUrl ? (
                  // m.nftImageUrl is an arbitrary on-chain URL (IPFS/Arweave/any host a
                  // creator supplied) that next/image's loader cannot resolve without a
                  // pre-configured remotePatterns entry.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.nftImageUrl} alt={m.nftName ?? "NFT"} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <ImageOff className="w-4 h-4 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 mr-3">
                  <div className="text-sm font-medium truncate">
                    {m.nftName ?? `${m.nftMint.slice(0, 4)}..${m.nftMint.slice(-4)}`}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {m.tradeCount} trade{m.tradeCount === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-auto">
                  <div className="text-sm font-semibold">${lamportsToUsd(m.earnedLamports).toFixed(6)}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{lamportsToSol(m.earnedLamports).toFixed(6)} SOL</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex items-center gap-1 p-1 rounded-2xl mb-5 w-fit ${glass}`}>
        {(["holdings", "mynfts", "history"] as const).map((t) => (
          <button type="button"
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-all
              ${tab === t
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-400/25"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
          >
            {t === "history" ? "Transaction History" : t === "mynfts" ? `My NFTs (${myNFTs.length})` : "Holdings"}
          </button>
        ))}
      </div>

      {/* Holdings */}
      {tab === "holdings" && (
        <div className={`rounded-2xl overflow-hidden ${glass}`}>
          {/* Table Header (Desktop Only) */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-black/5 dark:bg-white/[0.02]">
            <div className="col-span-4">Asset</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Balance</div>
            <div className="col-span-2 text-right">Value / Cost</div>
            <div className="col-span-2 text-right">P&L</div>
          </div>
          
          {holdings.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="font-semibold mb-1">No Holdings Yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {publicKey ? "Buy shares on any market to see your positions here." : "Connect your wallet to see your positions."}
              </p>
            </div>
          ) : (
          <div className="flex flex-col">
            {holdings.map((holding) => {
              const priceUsd = lamportsToUsd(holding.currentPriceLamports);
              const valueUsd = lamportsToUsd(holding.valueLamports);
              const costUsd = lamportsToUsd(holding.costBasisLamports);
              const avgPriceUsd = lamportsToUsd(holding.avgCostLamports);
              const pl = valueUsd - costUsd;
              const plPct = costUsd > 0 ? (pl / costUsd) * 100 : 0;

              return (
                <Link key={holding.marketPubkey} href={`/market/${holding.nftMint}`}>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-y-4 md:gap-4 items-center p-4 border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors">
                    {/* Asset */}
                    <div className="col-span-2 md:col-span-4 flex items-center gap-3">
                      {holding.nftImageUrl ? (
                        // holding.nftImageUrl is an arbitrary on-chain URL (IPFS/Arweave/any
                        // host a creator supplied) that next/image's loader cannot resolve
                        // without a pre-configured remotePatterns entry.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={holding.nftImageUrl} alt={holding.nftName ?? "NFT"} className="w-11 h-11 rounded-lg object-cover shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                          <ImageOff className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm">
                          {holding.nftName ?? `${holding.nftMint.slice(0, 4)}..${holding.nftMint.slice(-4)}`}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{holding.marketState.toLowerCase()}</div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="col-span-1 md:col-span-2 md:text-right">
                      <div className="text-[11px] font-medium text-slate-400 md:hidden mb-0.5 uppercase tracking-wide">Price</div>
                      <div className="font-medium text-sm">${priceUsd.toFixed(2)}</div>
                    </div>

                    {/* Balance */}
                    <div className="col-span-1 md:col-span-2 text-right">
                      <div className="text-[11px] font-medium text-slate-400 md:hidden mb-0.5 uppercase tracking-wide">Balance</div>
                      <div className="font-medium text-sm">{holding.shares} shares</div>
                      <div className="text-[11px] text-slate-500">@ ${avgPriceUsd.toFixed(2)} avg</div>
                    </div>

                    {/* Value / Cost */}
                    <div className="col-span-1 md:col-span-2 md:text-right">
                      <div className="text-[11px] font-medium text-slate-400 md:hidden mb-0.5 uppercase tracking-wide">Value / Cost</div>
                      <div className="font-semibold text-sm text-amber-500 dark:text-amber-400">${valueUsd.toFixed(2)}</div>
                      <div className="text-[11px] text-slate-500">${costUsd.toFixed(2)} cost</div>
                    </div>

                    {/* P&L */}
                    <div className="col-span-1 md:col-span-2 text-right">
                      <div className="text-[11px] font-medium text-slate-400 md:hidden mb-0.5 uppercase tracking-wide">P&L</div>
                      <div className={`font-semibold text-sm ${pl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                        {pl >= 0 ? "+" : ""}${pl.toFixed(2)}
                      </div>
                      <div className={`text-[11px] ${pl >= 0 ? "text-emerald-500/80" : "text-rose-500/80"}`}>
                        {plPct >= 0 ? "+" : ""}{plPct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* My NFTs */}
      {tab === "mynfts" && (
        <div className={`rounded-2xl overflow-hidden ${glass}`}>
          {myNFTs.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="font-semibold mb-1">No NFTs Yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Use &ldquo;Create NFT&rdquo; or &ldquo;Import NFT&rdquo; in the navbar to add NFTs from your wallet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
              {myNFTs.map((nft) => (
                <div
                  key={nft.mint}
                  className={`relative rounded-xl overflow-hidden p-3 flex flex-col gap-2 ${inset}`}
                >
                  <button
                    type="button"
                    onClick={() => setNftPendingRemoval(nft)}
                    aria-label={`Remove ${nft.name}`}
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {nft.image ? (
                    // nft.image comes from user-imported/created NFT metadata — an arbitrary
                    // external URL (any IPFS/Arweave/host) that next/image's loader cannot
                    // resolve without a pre-configured remotePatterns entry.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={nft.image} alt={nft.name} className="w-full aspect-square rounded-lg object-cover" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                      <ImageOff className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{nft.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{nft.mint}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide
                        ${nft.source === "created"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400"
                        }`}
                    >
                      {nft.source}
                    </span>
                    <a
                      href={`https://explorer.solana.com/address/${nft.mint}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Explorer
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNftForMarketCreation(nft);
                      setCreateMarketOpen(true);
                    }}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-400 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-600 transition-colors"
                  >
                    Create Market
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History -- this wallet's own real trade log, joined with NFT metadata (backend GET /traders/:pubkey/trades). */}
      {tab === "history" && (
        <div className={`rounded-2xl overflow-hidden ${glass}`}>
          {!trades || trades.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="font-semibold mb-1">No Transactions Yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {publicKey ? "Your transaction history will appear here" : "Connect your wallet to see your transaction history"}
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-2">
              <h3 className="font-semibold mb-4">Recent Transactions</h3>
              {trades.map((tx) => {
                const isBuy = tx.direction === "BUY";
                const shares = Number(tx.shareAmount);
                const pricePerShareUsd = lamportsToUsd(Number(tx.price));
                const totalUsd = lamportsToUsd(Number(tx.solAmount));
                return (
                  <a
                    key={tx.id}
                    href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between p-4 transition-all hover:bg-white/30 dark:hover:bg-white/[0.04] ${inset}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                        ${isBuy ? "bg-emerald-100 dark:bg-emerald-400/10" : "bg-rose-100 dark:bg-rose-400/10"}`}>
                        {isBuy
                          ? <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          : <ArrowUpRight className="w-4 h-4 text-rose-500" />
                        }
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {tx.nftName ?? (tx.nftMint ? `${tx.nftMint.slice(0, 4)}..${tx.nftMint.slice(-4)}` : "Unknown market")}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {isBuy ? "Bought" : "Sold"} {shares} share{shares === 1 ? "" : "s"} @ ${pricePerShareUsd.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold text-sm ${isBuy ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {isBuy ? "-" : "+"}${totalUsd.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(tx.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trending Markets */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-lg">Trending Markets</h3>
          </div>
          <Link href="/marketplace" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
            View All
          </Link>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {[...nftData]
            .sort((a, b) => b.priceChange24h - a.priceChange24h)
            .slice(0, 3)
            .map((nft) => (
              <Link key={nft.id} href={`/market/${nft.id}`}>
                <div className={`rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer border border-transparent hover:border-emerald-500/20 ${glass}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <Image src={nft.image} alt={nft.name} width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{nft.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{nft.collection}</div>
                    </div>
                  </div>
                  <div className="flex items-end justify-between pt-4 border-t border-black/5 dark:border-white/5">
                    <div>
                      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Price</div>
                      <div className="font-bold">${nft.currentPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">24h Change</div>
                      <div className={`font-semibold text-sm ${nft.priceChange24h >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                        {nft.priceChange24h >= 0 ? "+" : ""}{nft.priceChange24h.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
