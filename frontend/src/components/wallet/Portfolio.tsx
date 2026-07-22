"use client";
import Link from "next/link";
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { portfolioData, nftData } from "@/lib/mockData";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useState } from "react";

const glass =
  "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_8px_32px_rgba(16,185,129,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]";
const inset =
  "bg-white/40 dark:bg-white/[0.04] border border-white/60 dark:border-white/[0.07] rounded-xl";

export function Portfolio() {
  const [tab, setTab] = useState<"holdings" | "history">("holdings");

  const holdings = [
    { nftId: "1", shares: 50, avgPrice: 23.8 },
    { nftId: "3", shares: 30, avgPrice: 32.1 },
    { nftId: "5", shares: 40, avgPrice: 25.2 },
  ];

  const totalValue = holdings.reduce((sum, h) => {
    const nft = nftData.find((n) => n.id === h.nftId);
    return sum + (nft ? nft.currentPrice * h.shares : 0);
  }, 0);

  const totalCost = holdings.reduce((sum, h) => sum + h.avgPrice * h.shares, 0);
  const profitLoss = totalValue - totalCost;
  const profitLossPercent = (profitLoss / totalCost) * 100;

  const miniChart = Array.from({ length: 7 }, () => ({ value: totalValue * (0.95 + Math.random() * 0.1) }));

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8 text-slate-800 dark:text-slate-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">My Portfolio</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Track your NFT share investments</p>
      </div>

      {/* Stats row */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {/* Total Value */}
        <div className={`rounded-2xl p-5 relative overflow-hidden ${glass}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-transparent rounded-2xl" />
          <div className="relative flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Wallet className="w-3.5 h-3.5" />
            Total Value
          </div>
          <div className="relative text-2xl font-bold mb-3">${totalValue.toFixed(2)}</div>
          <ResponsiveContainer width="100%" height={44}>
            <LineChart data={miniChart}>
              <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* P&L */}
        <div className={`rounded-2xl p-5 relative overflow-hidden ${glass}`}>
          <div className={`absolute inset-0 rounded-2xl ${profitLoss >= 0 ? "bg-gradient-to-br from-emerald-400/8" : "bg-gradient-to-br from-rose-400/8"} to-transparent`} />
          <div className="relative flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Total P&L
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

      {/* Tabs */}
      <div className={`flex items-center gap-1 p-1 rounded-2xl mb-5 w-fit ${glass}`}>
        {(["holdings", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-all
              ${tab === t
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-400/25"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
          >
            {t === "history" ? "Transaction History" : "Holdings"}
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
          
          <div className="flex flex-col">
            {holdings.map((holding) => {
              const nft = nftData.find((n) => n.id === holding.nftId);
              if (!nft) return null;
              const currentValue = nft.currentPrice * holding.shares;
              const costBasis = holding.avgPrice * holding.shares;
              const pl = currentValue - costBasis;
              const plPct = (pl / costBasis) * 100;

              return (
                <Link key={holding.nftId} href={`/market/${nft.id}`}>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-y-4 md:gap-4 items-center p-4 border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors">
                    {/* Asset */}
                    <div className="col-span-2 md:col-span-4 flex items-center gap-3">
                      <img src={nft.image} alt={nft.name} className="w-11 h-11 rounded-lg object-cover shrink-0 shadow-sm" />
                      <div>
                        <div className="font-semibold text-sm">{nft.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{nft.collection}</div>
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div className="col-span-1 md:col-span-2 md:text-right">
                      <div className="text-[11px] font-medium text-slate-400 md:hidden mb-0.5 uppercase tracking-wide">Price</div>
                      <div className="font-medium text-sm">${nft.currentPrice.toFixed(2)}</div>
                    </div>
                    
                    {/* Balance */}
                    <div className="col-span-1 md:col-span-2 text-right">
                      <div className="text-[11px] font-medium text-slate-400 md:hidden mb-0.5 uppercase tracking-wide">Balance</div>
                      <div className="font-medium text-sm">{holding.shares} shares</div>
                      <div className="text-[11px] text-slate-500">@ ${holding.avgPrice} avg</div>
                    </div>
                    
                    {/* Value / Cost */}
                    <div className="col-span-1 md:col-span-2 md:text-right">
                      <div className="text-[11px] font-medium text-slate-400 md:hidden mb-0.5 uppercase tracking-wide">Value / Cost</div>
                      <div className="font-semibold text-sm text-amber-500 dark:text-amber-400">${currentValue.toFixed(2)}</div>
                      <div className="text-[11px] text-slate-500">${costBasis.toFixed(2)} cost</div>
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
        </div>
      )}

      {/* History */}
      {tab === "history" && (
        <div className={`rounded-2xl overflow-hidden ${glass}`}>
          {portfolioData.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="font-semibold mb-1">No Transactions Yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="p-5 space-y-2">
              <h3 className="font-semibold mb-4">Recent Transactions</h3>
              {portfolioData.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between p-4 transition-all hover:bg-white/30 dark:hover:bg-white/[0.04] ${inset}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                      ${tx.type === "buy" ? "bg-emerald-100 dark:bg-emerald-400/10" : "bg-rose-100 dark:bg-rose-400/10"}`}>
                      {tx.type === "buy"
                        ? <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        : <ArrowUpRight className="w-4 h-4 text-rose-500" />
                      }
                    </div>
                    <div>
                      <div className="font-medium text-sm">{tx.nftName}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {tx.type === "buy" ? "Bought" : "Sold"} {tx.shares} shares @ ${tx.price}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${tx.type === "buy" ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {tx.type === "buy" ? "-" : "+"}${tx.total.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(tx.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className={`rounded-3xl p-8 text-center mt-8 relative overflow-hidden ${glass}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/8 via-transparent to-amber-400/8 rounded-3xl" />
        <h3 className="relative font-bold text-lg mb-3">Ready to expand your portfolio?</h3>
        <Link href="/marketplace">
          <button className="relative px-6 py-2.5 rounded-xl font-semibold text-sm
            bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600
            text-white shadow-md shadow-emerald-400/25 transition-all active:scale-95">
            Browse NFTs
          </button>
        </Link>
      </div>
    </div>
  );
}
