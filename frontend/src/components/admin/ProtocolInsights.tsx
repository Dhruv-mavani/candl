"use client";
import { Coins, TrendingUp, Layers, Users, ImageOff } from "lucide-react";
import useSWR from "swr";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  getProtocolStats,
  getProtocolEarningsHistory,
  getProtocolEarningsByMarket,
} from "@/lib/api";
import { useSolPriceUsd } from "@/lib/solPrice";

const glass =
  "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl";

function lamportsToSol(value: number) {
  return value / 1e9;
}

/**
 * Left-side protocol-wide earnings dashboard for the admin view -- every
 * number and chart point here comes from the real trade log (see backend
 * services/analytics/protocol-stats.ts), never mock/sample data.
 */
export function ProtocolInsights() {
  const solPriceUsd = useSolPriceUsd();
  const lamportsToUsd = (lamports: number) => (solPriceUsd ? (lamports / 1e9) * solPriceUsd : 0);

  const { data: stats } = useSWR("/api/v1/protocol/stats", getProtocolStats, { refreshInterval: 15000 });
  const { data: history } = useSWR(
    "/api/v1/protocol/earnings/history",
    () => getProtocolEarningsHistory(30),
    { refreshInterval: 15000 }
  );
  const { data: byMarket } = useSWR(
    "/api/v1/protocol/earnings/by-market",
    () => getProtocolEarningsByMarket(6),
    { refreshInterval: 15000 }
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Protocol Insights</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Real fee revenue and volume across every market</p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-4 ${glass}`}>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <Coins className="w-3.5 h-3.5" />
            Protocol Earnings
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            ${lamportsToUsd(stats?.totalProtocolEarnings ?? 0).toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {lamportsToSol(stats?.totalProtocolEarnings ?? 0).toFixed(6)} SOL
          </div>
        </div>

        <div className={`p-4 ${glass}`}>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Total Volume
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            ${lamportsToUsd(stats?.totalVolume ?? 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {lamportsToSol(stats?.totalVolume ?? 0).toFixed(4)} SOL
          </div>
        </div>

        <div className={`p-4 ${glass}`}>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <Layers className="w-3.5 h-3.5" />
            Markets
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{stats?.totalMarkets ?? "—"}</div>
        </div>

        <div className={`p-4 ${glass}`}>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <Users className="w-3.5 h-3.5" />
            Unique Traders
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{stats?.totalUniqueTraders ?? "—"}</div>
        </div>
      </div>

      {/* Cumulative earnings chart */}
      <div className={`p-4 ${glass}`}>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Cumulative Protocol Earnings</div>
        {history && history.length >= 2 ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="protocolEarningsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" hide />
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const point = payload[0]!.payload as { timestamp: string; cumulativeProtocolEarningsLamports: number; cumulativeVolumeLamports: number };
                      return (
                        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-white/10 p-2 rounded-lg shadow-lg text-xs whitespace-nowrap">
                          <div className="text-slate-500 dark:text-slate-400 mb-0.5">
                            {new Date(point.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </div>
                          <div className="font-bold text-amber-600 dark:text-amber-400">
                            ${lamportsToUsd(point.cumulativeProtocolEarningsLamports).toFixed(4)} earned
                          </div>
                          <div className="text-slate-400 dark:text-slate-500 text-[10px]">
                            ${lamportsToUsd(point.cumulativeVolumeLamports).toFixed(2)} volume
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeProtocolEarningsLamports"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#protocolEarningsFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-xs text-slate-400">Not enough trade history yet</div>
        )}
      </div>

      {/* Top markets by protocol earnings */}
      <div className={`p-4 ${glass}`}>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Top Markets by Protocol Fees</div>
        <div className="space-y-2">
          {byMarket && byMarket.length > 0 ? (
            byMarket.map((m) => (
              <div key={m.marketPubkey} className="flex items-center gap-2.5">
                {m.nftImageUrl ? (
                  // m.nftImageUrl is an arbitrary on-chain URL (IPFS/Arweave/any host a
                  // creator supplied) that next/image's loader cannot resolve without a
                  // pre-configured remotePatterns entry.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.nftImageUrl} alt={m.nftName ?? "NFT"} className="w-7 h-7 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <ImageOff className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">
                    {m.nftName ?? `${m.nftMint.slice(0, 4)}..${m.nftMint.slice(-4)}`}
                  </div>
                </div>
                <div className="text-xs font-semibold shrink-0">${lamportsToUsd(m.protocolEarnedLamports).toFixed(4)}</div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400">No fee revenue yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
