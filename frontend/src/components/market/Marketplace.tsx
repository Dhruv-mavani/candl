"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { nftData } from "@/lib/mockData";

const glass =
  "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_8px_32px_rgba(16,185,129,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]";

export function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("volume");

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
    <div className="container mx-auto px-4 py-8 pb-28 md:pb-8 text-slate-800 dark:text-slate-100">
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
              <button
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
              <button
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

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredNFTs.map((nft) => (
          <Link key={nft.id} href={`/market/${nft.id}`}>
            <div className={`p-2.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-emerald-500/10 hover:border-emerald-400/40`}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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
                  <span>{nft.availableShares.toLocaleString()} shares</span>
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
