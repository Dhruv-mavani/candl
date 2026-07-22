"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CandlSimulator } from "./CandlSimulator";
import { TrendingUp, ArrowRight, Zap, Shield, Users, Briefcase, Rocket, ShieldCheck, CheckCircle2 } from "lucide-react";
import { nftData } from "@/lib/mockData";

const glass =
  "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_8px_32px_rgba(16,185,129,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]";
const glassHover =
  "hover:bg-white/65 dark:hover:bg-white/[0.08] hover:border-emerald-300/60 dark:hover:border-emerald-500/25 hover:shadow-[0_12px_40px_rgba(16,185,129,0.14)]";

function AnimatedCounter({ end, decimals = 0, prefix = "", suffix = "" }: { end: number, decimals?: number, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 2000;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo for smooth deceleration
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(easeProgress * end);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [end]);
  
  return <>{prefix}{count.toFixed(decimals)}{suffix}</>;
}

function Typewriter({ words }: { words: string[] }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWordIndex];
    let typingSpeed = isDeleting ? 60 : 120;

    if (!isDeleting && currentText === word) {
      typingSpeed = 6000; // Pause at end of word (wait 6 seconds before deleting)
      setIsDeleting(true);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
      typingSpeed = 800; // Pause before typing next word
    }

    const timer = setTimeout(() => {
      setCurrentText(
        isDeleting
          ? word.substring(0, currentText.length - 1)
          : word.substring(0, currentText.length + 1)
      );
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, words]);

  return (
    <span className="inline-flex items-center">
      <span className="bg-gradient-to-r from-emerald-600 to-sky-600 dark:from-emerald-300 dark:to-sky-300 bg-clip-text text-transparent">
        {currentText}
      </span>
      <span className="animate-pulse text-emerald-500 font-light -translate-y-[2px] ml-1">|</span>
    </span>
  );
}

export function Home() {
  const topGainers = [...nftData]
    .sort((a, b) => b.priceChange24h - a.priceChange24h)
    .slice(0, 3);

  return (
    <div className="pb-24 md:pb-0 text-slate-800 dark:text-slate-100">
      {/* ── Hero ── */}
      <section className="w-full px-4 pt-16 pb-12 relative">
        
        {/* Floating Mock NFTs (Background Decorative) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
          {/* Card 1: Top Left */}
          <div className="absolute top-[5%] left-[5%] xl:left-[10%] animate-float rotate-[-6deg] opacity-70">
            <div className="w-40 h-48 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-white/20">
              <img 
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400" 
                alt="Mock NFT" 
                className="w-full h-32 object-cover rounded-xl"
              />
              <div className="mt-3 px-1 flex justify-between items-center">
                <div className="w-16 h-3 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-8 h-3 bg-emerald-300 dark:bg-emerald-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Card 2: Bottom Left */}
          <div className="absolute top-[60%] left-[2%] xl:left-[15%] animate-float-reverse rotate-[4deg] opacity-60">
            <div className="w-36 h-44 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-white/20">
              <img 
                src="https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?q=80&w=400" 
                alt="Mock NFT" 
                className="w-full h-28 object-cover rounded-xl"
              />
              <div className="mt-3 px-1 flex justify-between items-center">
                <div className="w-12 h-2.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-10 h-2.5 bg-emerald-300 dark:bg-emerald-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Card 3: Top Right */}
          <div className="absolute top-[10%] right-[3%] xl:right-[12%] animate-float-slow rotate-[8deg] opacity-80">
            <div className="w-48 h-56 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl border border-white/20">
              <img 
                src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400" 
                alt="Mock NFT" 
                className="w-full h-36 object-cover rounded-xl"
              />
              <div className="mt-3 px-1 flex justify-between items-center">
                <div className="w-20 h-3.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-12 h-3.5 bg-emerald-300 dark:bg-emerald-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-7 relative z-10">


          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 dark:from-emerald-300 dark:via-teal-300 dark:to-sky-400 bg-clip-text text-transparent">
              Trade NFT Shares
            </span>
            <br />
            <span className="text-slate-800 dark:text-white">Like Never Before</span>
          </h1>

          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Buy and sell fractional shares of premium NFTs. Trade like stocks, invest like a pro.
            Join the revolution of decentralized NFT trading.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/marketplace">
              <button className="flex items-center gap-2 px-7 py-3 rounded-2xl text-base font-semibold
                bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600
                text-white shadow-lg shadow-emerald-400/30 transition-all duration-200 active:scale-95">
                Start Trading
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <a href="#simulator" className={`px-7 py-3 rounded-2xl text-base font-semibold transition-all duration-200 active:scale-95 inline-flex items-center justify-center ${glass}`}>
              Learn More
            </a>
          </div>

          {/* Stats */}
          <div className={`grid grid-cols-3 gap-px mt-14 rounded-2xl overflow-hidden ${glass}`}>
            {[
              { value: <AnimatedCounter end={2.4} decimals={1} prefix="$" suffix="M+" />, label: "Trading Volume", color: "text-emerald-500 dark:text-emerald-400" },
              { value: <AnimatedCounter end={12} suffix="K+" />, label: "Active Traders", color: "text-amber-500 dark:text-amber-400" },
              { value: <AnimatedCounter end={500} suffix="+" />, label: "Listed NFTs", color: "text-sky-500 dark:text-sky-400" },
            ].map(({ value, label, color }) => (
              <div key={label} className="py-6 px-4 bg-white/30 dark:bg-white/[0.03]">
                <div className={`text-3xl font-bold ${color}`}>{value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Top Gainers ── */}
      <section className="w-full px-4 py-12">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl font-bold mb-1">🔥 Top Gainers</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Trending NFTs in the last 24 hours</p>
          </div>
          <Link href="/marketplace">
            <button className={`hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${glass} ${glassHover}`}>
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {topGainers.map((nft) => (
            <Link key={nft.id} href={`/market/${nft.id}`}>
              <div className={`p-2.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-xl transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:shadow-emerald-500/10 hover:border-emerald-400/40`}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Gloss overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10" />
                  <div className="absolute top-3 right-3 bg-emerald-400/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    +{nft.priceChange24h.toFixed(1)}%
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
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Market Cap</div>
                      <div className="text-base font-bold text-slate-700 dark:text-slate-300">${(nft.marketCap / 1000).toFixed(0)}K</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="w-full px-4 py-16">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 h-[40px] md:h-[48px] flex items-center justify-center">
            <Typewriter words={["Why Choose Candl?", "Why Trade NFT Shares?", "Why Fractional Ownership?"]} />
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base">
            The world's first true NFT stock market. Built for speed, scale, and uncompromising security.
          </p>
        </div>

        <div className="mt-8">
          <CandlSimulator />
        </div>
      </section>

      {/* ── Two-Sided Market Router ── */}
      <section className="w-full px-4 py-16">
        
        {/* The Split Router */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
          
          {/* Creator / Liquidity Provider Path */}
          <div className="group relative overflow-hidden rounded-3xl p-8 md:p-10 flex flex-col backdrop-blur-xl bg-slate-900 border border-slate-700 shadow-2xl hover:shadow-[0_0_50px_rgba(16,185,129,0.15)] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-full blur-[60px] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Briefcase className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">For Creators & Whales</h3>
              <p className="text-slate-400 leading-relaxed text-sm mb-8 flex-1">
                Have a blue-chip NFT gathering dust? Deposit it into a Candl Vault to instantly generate a liquid market and earn perpetual royalties on every single trade.
              </p>
              <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2">
                Deposit Asset <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Trader Path */}
          <div className="group relative overflow-hidden rounded-3xl p-8 md:p-10 flex flex-col backdrop-blur-xl bg-white/60 dark:bg-slate-900/40 border border-emerald-200/50 dark:border-white/10 shadow-xl hover:shadow-[0_0_50px_rgba(14,165,233,0.15)] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-sky-400/20 to-transparent rounded-full blur-[60px] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-14 h-14 bg-sky-100 dark:bg-sky-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Rocket className="w-7 h-7 text-sky-600 dark:text-sky-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">For Traders</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-8 flex-1">
                Don't get priced out of the best collections. Trade fractional shares of top-tier NFTs with instant execution, continuous liquidity, and zero slippage.
              </p>
              <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2">
                Explore Markets <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>

        {/* The Trust Banner */}
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 py-6 px-8 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Audited by Trail of Bits</span>
          </div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>100% Open Source Contracts</span>
          </div>
          <div className="hidden md:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span>Bug Bounty Live</span>
          </div>
        </div>

      </section>
    </div>
  );
}
