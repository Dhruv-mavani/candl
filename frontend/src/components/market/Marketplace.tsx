"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { Search, TrendingUp, TrendingDown, Filter, ImageOff, AlertTriangle, Landmark } from "lucide-react";
import { nftData } from "@/lib/mockData";
import { getMarkets, getProtocolStats, type RealMarket } from "@/lib/api";

function lamportsToSol(value: number) {
  return value / 1e9;
}

const glass =
  "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_8px_32px_rgba(16,185,129,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]";

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}..${address.slice(-4)}`;
}

function RealMarketCard({ market }: { market: RealMarket }) {
  const name = market.metadata?.name ?? "Unnamed Market";
  const stateColor =
    market.state === "ACTIVE"
      ? "bg-emerald-500/85"
      : market.state === "SETTLING"
        ? "bg-amber-500/85"
        : "bg-slate-500/85";

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
  const [sortBy, setSortBy] = useState("volume");

  const { data: realMarkets, error: realMarketsError, isLoading: realMarketsLoading } = useSWR(
    "/api/v1/markets",
    getMarkets,
    { refreshInterval: 15000 }
  );

  const { data: protocolStats } = useSWR("/api/v1/protocol/stats", getProtocolStats, { refreshInterval: 30000 });

  const categories = ["all", "art", "gaming", "collectibles"];

  const filteredNFTs = nftData
    .filter((nft) => {
      const matchesSearch =
        nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nft.collection.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        category === "all" || nft.category.toLowerCase() === category.toLowerCase();
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "volume") return b.volume24h - a.volume24h;
      if (sortBy === "price") return b.currentPrice - a.currentPrice;
      if (sortBy === "change") return b.priceChange24h - a.priceChange24h;
      return 0;
    });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">NFT Marketplace</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Trade fractional shares of premium NFTs</p>
        </div>

        {protocolStats && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${glass}`}>
            <Landmark className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                Protocol Revenue (devnet)
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {lamportsToSol(protocolStats.totalProtocolEarnings).toFixed(6)} SOL
              </div>
            </div>
          </div>
        )}
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

          {/* Sort pills */}
          <div className={`flex items-center gap-1 p-1 rounded-2xl ${glass}`}>
            {[
              { key: "volume", label: "Volume" },
              { key: "price", label: "Price" },
              { key: "change", label: "24h %" },
            ].map(({ key, label }) => (
              <button type="button"
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-150
                  ${sortBy === key
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

      {/* Live Markets (real, on-chain devnet data) */}
      <div className="mb-10">
        <h2 className="text-xl font-bold mb-1">Live Markets</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Real markets created on Solana devnet through Candl.
        </p>

        {realMarketsLoading && (
          <div className={`text-center py-10 rounded-2xl ${glass}`}>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading live markets…</p>
          </div>
        )}

        {realMarketsError && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl ${glass}`}>
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Couldn&apos;t reach the Candl backend. Is it running at{" "}
              {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}?
            </p>
          </div>
        )}

        {realMarkets && realMarkets.length === 0 && (
          <div className={`text-center py-10 rounded-2xl ${glass}`}>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No markets created yet. Deposit an NFT from your Portfolio to create one.
            </p>
          </div>
        )}

        {realMarkets && realMarkets.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {realMarkets.map((market) => (
              <RealMarketCard key={market.pubkey} market={market} />
            ))}
          </div>
        )}
      </div>

      {/* Demo Grid (sample data, not backed by real markets) */}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">Demo Markets</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sample data illustrating what a busy Candl market looks like.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredNFTs.map((nft) => (
          <Link key={nft.id} href={`/market/${nft.id}`}>
            <div className={`p-2.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl transition duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-emerald-500/10 hover:border-emerald-400/40`}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image
                  src={nft.image}
                  alt={nft.name}
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10" />
                <div
                  className={`absolute top-3 right-3 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1
                    ${nft.priceChange24h >= 0 ? "bg-emerald-500/85" : "bg-rose-500/85"}`}
                >
                  {nft.priceChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {nft.priceChange24h >= 0 ? "+" : ""}{nft.priceChange24h.toFixed(1)}%
                </div>
                <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium">
                  {nft.category}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase">{nft.collection}</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white truncate">{nft.name}</div>
                </div>
                
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/50">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Share Price</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${nft.currentPrice}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">24h Volume</div>
                    <div className="text-base font-bold text-slate-700 dark:text-slate-300">${(nft.volume24h / 1000).toFixed(0)}K</div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  <span>{nft.circulatingSupply.toLocaleString()} shares</span>
                  <span>{nft.holders} holders</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredNFTs.length === 0 && (
        <div className={`text-center py-16 rounded-2xl mt-4 ${glass}`}>
          <Filter className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No NFTs found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
