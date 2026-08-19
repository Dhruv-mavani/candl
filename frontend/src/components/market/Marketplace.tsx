"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Search, ImageOff, AlertTriangle, Clock } from "lucide-react";
import { getMarkets, type RealMarket } from "@/lib/api";
import { formatCountdown } from "@/lib/format";

const glass =
  "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_8px_32px_rgba(16,185,129,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]";

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}..${address.slice(-4)}`;
}

function RealMarketCard({ market, now }: { market: RealMarket; now: number }) {
  const name = market.metadata?.name ?? "Unnamed Market";
  const stateColor =
    market.state === "ACTIVE"
      ? "bg-emerald-500/85"
      : market.state === "SETTLING"
        ? "bg-amber-500/85"
        : "bg-slate-500/85";
  const isExpired = new Date(market.expiresAt).getTime() < now;

  return (
    <Link
      href={`/market/${market.nftMint}`}
      className="p-2.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl transition duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-emerald-500/10 hover:border-emerald-400/40 block"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        {market.metadata?.imageUrl ? (
          // market.metadata.imageUrl is an arbitrary on-chain URL (any IPFS/Arweave/host a
          // market creator supplied) that next/image's loader cannot resolve without a
          // pre-configured remotePatterns entry, which isn't possible for arbitrary hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={market.metadata.imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            <ImageOff className="w-8 h-8 text-slate-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10" />
        <div className={`absolute top-3 right-3 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg ${stateColor}`}>
          {market.state}
        </div>
        <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium">
          Live
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase">
            {truncateAddress(market.nftMint)}
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{name}</div>
        </div>

        {market.state === "ACTIVE" && (
          <div className={`flex items-center gap-1.5 text-xs font-medium tabular-nums ${isExpired ? "text-amber-500" : "text-slate-500 dark:text-slate-400"}`}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {isExpired ? "Closed -- awaiting settlement" : `Closes in ${formatCountdown(market.expiresAt, now)}`}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/50">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Reserve</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {market.reserveSol ? (Number(market.reserveSol) / 1e9).toFixed(4) : "0"} SOL
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Shares</div>
            <div className="text-base font-bold text-slate-700 dark:text-slate-300">{market.outstandingShares ?? "0"}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          Creator {truncateAddress(market.creator)}
        </div>
      </div>
    </Link>
  );
}

export function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "SETTLING">("all");

  // Shared by every RealMarketCard's countdown so they all tick from one interval, not one per card.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const { data: realMarkets, error: realMarketsError, isLoading: realMarketsLoading } = useSWR(
    "/api/v1/markets",
    getMarkets,
    { refreshInterval: 15000 }
  );

  const categories = ["all", "art", "gaming", "collectibles"];

  const filteredRealMarkets = (realMarkets ?? [])
    .filter((market) => {
      const name = market.metadata?.name ?? "";
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const categoryAttr = market.metadata?.attributes?.find((a) => a.trait_type === "category")?.value;
      const matchesCategory = category === "all" || categoryAttr?.toLowerCase() === category.toLowerCase();
      const matchesStatus = statusFilter === "all" || market.state === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => b.volume - a.volume);

  const activeMarkets = filteredRealMarkets.filter((m) => m.state === "ACTIVE");
  const settlingMarkets = filteredRealMarkets.filter((m) => m.state === "SETTLING");
  const settledMarkets = filteredRealMarkets.filter((m) => m.state === "SETTLED");

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">NFT Marketplace</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Trade fractional shares of premium NFTs</p>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3 mb-8">
        <div className={`relative flex items-center rounded-2xl overflow-hidden ${glass}`}>
          <Search className="absolute left-4 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search NFTs or collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 h-12 bg-transparent outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Category pills */}
          <div className={`flex items-center gap-1 p-1 rounded-2xl ${glass}`}>
            {categories.map((cat) => (
              <button type="button"
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-all duration-150
                  ${category === cat
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-400/25"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status pills */}
          <div className={`flex items-center gap-1 p-1 rounded-2xl ${glass}`}>
            {[
              { key: "all", label: "All" },
              { key: "ACTIVE", label: "Live" },
              { key: "SETTLING", label: "Settling" },
            ].map(({ key, label }) => (
              <button type="button"
                key={key}
                onClick={() => setStatusFilter(key as "all" | "ACTIVE" | "SETTLING")}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${statusFilter === key
                    ? "bg-amber-400/20 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real, on-chain devnet markets -- split by state so an expired/settling
          market never gets mistaken for one still open to trade. */}
      {realMarketsLoading && (
        <div className={`text-center py-10 rounded-2xl ${glass} mb-10`}>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading live markets…</p>
        </div>
      )}

      {realMarketsError && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl ${glass} mb-10`}>
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Couldn&apos;t reach the Candl backend. Is it running at{" "}
            {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}?
          </p>
        </div>
      )}

      {realMarkets && realMarkets.length === 0 && (
        <div className={`text-center py-10 rounded-2xl ${glass} mb-10`}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No markets created yet. Deposit an NFT from your Portfolio to create one.
          </p>
        </div>
      )}

      {realMarkets && realMarkets.length > 0 && filteredRealMarkets.length === 0 && (
        <div className={`text-center py-10 rounded-2xl ${glass} mb-10`}>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No markets in the &quot;{category}&quot; category yet.
          </p>
        </div>
      )}

      {activeMarkets.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-1">Live Markets</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Open for trading right now.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {activeMarkets.map((market) => (
              <RealMarketCard key={market.pubkey} market={market} now={now} />
            ))}
          </div>
        </div>
      )}

      {settlingMarkets.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-1">Settling Markets</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Trading closed -- shares can be redeemed once settlement finishes.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {settlingMarkets.map((market) => (
              <RealMarketCard key={market.pubkey} market={market} now={now} />
            ))}
          </div>
        </div>
      )}

      {settledMarkets.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-1">Settled Markets</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Fully redeemed -- kept here for reference.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {settledMarkets.map((market) => (
              <RealMarketCard key={market.pubkey} market={market} now={now} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
