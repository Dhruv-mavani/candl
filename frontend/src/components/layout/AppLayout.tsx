"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, LayoutDashboard, ShoppingBag, User, Sun, Moon, MessageCircle, Code2, Send, MessageSquare, Hash, BookOpen } from "lucide-react";
import { Button } from "../common/button";
import { CandlLogo } from "../common/CandlLogo";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = usePathname();
  const { connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navLinks = connected
    ? [
        { to: "/", label: "Marketplace", icon: ShoppingBag },
        { to: "/portfolio", label: "Portfolio", icon: User },
      ]
    : [
        { to: "/", label: "Home", icon: LayoutDashboard },
        { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
        { to: "/portfolio", label: "Portfolio", icon: User },
      ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Standard UX: Scroll down -> Hide navbar, Scroll up -> Show navbar
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsNavVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("candl-theme");
    if (stored) {
      setIsDark(stored === "dark");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("candl-theme", isDark ? "dark" : "light");
  }, [isDark, mounted]);

  const isActive = (path: string) => {
    if (!location) return false;
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen relative">
      {/* ── Background layer ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Base */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-[#060e18] dark:via-[#071420] dark:to-[#060e18]" />
        {/* Blobs */}
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-emerald-300/35 dark:bg-emerald-500/15 blur-[100px]" />
        <div className="absolute top-1/2 -right-24 w-[380px] h-[380px] rounded-full bg-sky-300/30 dark:bg-sky-500/12 blur-[90px]" />
        <div className="absolute bottom-0 left-1/3 w-[340px] h-[340px] rounded-full bg-amber-200/40 dark:bg-amber-400/10 blur-[80px]" />
        <div className="absolute top-1/3 left-1/2 w-[260px] h-[260px] rounded-full bg-teal-200/25 dark:bg-teal-400/8 blur-[70px]" />
      </div>

      {/* ── Grid overlay ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: isDark
            ? "linear-gradient(rgba(52,211,153,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(52,211,153,0.05) 1px,transparent 1px)"
            : "linear-gradient(rgba(16,185,129,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.07) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Navbar ── */}
      <header 
        className={`sticky top-0 z-50 px-4 transition-transform duration-300 ${
          isNavVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div
            className="mt-3 flex items-center justify-between h-14 px-5 rounded-2xl
              bg-white/50 dark:bg-white/[0.06]
              backdrop-blur-xl
              border border-emerald-200/60 dark:border-emerald-500/15
              shadow-[0_4px_24px_rgba(16,185,129,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <CandlLogo className="w-32 h-auto text-slate-900 dark:text-white" />
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label }) => (
                <Link key={to} href={to}>
                  <button
                    className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-150
                      ${isActive(to)
                        ? "bg-emerald-500/15 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300"
                        : "text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5"
                      }`}
                  >
                    {label}
                  </button>
                </Link>
              ))}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDark((d) => !d)}
                aria-label="Toggle theme"
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all outline-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                  bg-emerald-100/70 dark:bg-white/10 hover:bg-emerald-200 dark:hover:bg-white/20
                  text-emerald-600 dark:text-emerald-300
                  border border-emerald-200/50 dark:border-white/10 hover:border-emerald-300 dark:hover:border-white/20"
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              {connected && (
                <div className="hidden sm:flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 rounded-xl border-emerald-200/50 dark:border-white/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-white/5">
                    Create NFT
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 rounded-xl border-emerald-200/50 dark:border-white/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-white/5">
                    Import NFT
                  </Button>
                </div>
              )}

              <div className="wallet-adapter-container">
                <WalletMultiButton className="candl-wallet-btn" style={{ 
                  height: '36px', 
                  fontSize: '14px', 
                  borderRadius: '12px',
                  fontWeight: 600,
                }} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10">
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
        <div
          className="flex items-center justify-around h-14 rounded-2xl
            bg-white/55 dark:bg-white/[0.07]
            backdrop-blur-xl
            border border-emerald-200/60 dark:border-emerald-500/15
            shadow-[0_-2px_20px_rgba(16,185,129,0.08)]"
        >
          {navLinks.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              href={to}
              className={`flex flex-col items-center gap-0.5 px-4 transition-colors
                ${isActive(to) ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
      {/* ── Premium Footer ── */}
      <footer className="relative z-10 mt-24 border-t border-emerald-200/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl overflow-hidden">
        
        {/* Massive Background Watermark */}
        <div className="absolute top-0 left-0 w-full h-[400px] flex items-center justify-center pointer-events-none select-none opacity-5 dark:opacity-[0.03]">
          <h1 className="text-[33vw] font-black tracking-tighter whitespace-nowrap text-emerald-900 dark:text-white">CANDL</h1>
        </div>

        {/* 1. Hero CTA & Contact Block */}
        <div className="relative w-full px-4 sm:px-6 lg:px-8 pt-24 pb-16 border-b border-emerald-200/50 dark:border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
            {/* Left: Massive CTA */}
            <div className="space-y-6">
              <div className="text-xs font-bold tracking-[0.2em] text-emerald-600 dark:text-emerald-400 uppercase">
                FAST. SECURE. LIQUID.
              </div>
              <h2 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white leading-[0.9]">
                Start<br />Trading.
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md pt-2">
                Join the revolution of decentralized NFT trading. Deposit an asset or buy shares instantly.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <Link href="/marketplace">
                  <button className="px-8 py-4 rounded-full font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all active:scale-95">
                    START TRADING &rarr;
                  </button>
                </Link>
                <button className="px-8 py-4 rounded-full font-bold border-2 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all active:scale-95">
                  VIEW DOCS
                </button>
              </div>
            </div>

            {/* Right: Ecosystem Grid */}
            <div className="lg:pl-16">
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Join the Ecosystem</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                Candl is built by the community, for the community. Connect with us, read the docs, or contribute to the protocol.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a href="#" className="group flex flex-col p-5 rounded-2xl bg-white/50 dark:bg-black/20 border border-emerald-200/50 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all">
                  <MessageSquare className="w-6 h-6 text-[#5865F2] mb-3 transition-transform group-hover:-translate-y-1" />
                  <span className="font-bold text-slate-900 dark:text-white">Discord</span>
                  <span className="text-xs text-slate-500 mt-1">12k+ Active Traders</span>
                </a>
                
                <a href="#" className="group flex flex-col p-5 rounded-2xl bg-white/50 dark:bg-black/20 border border-emerald-200/50 dark:border-white/10 hover:border-sky-400 dark:hover:border-sky-500/50 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all">
                  <Hash className="w-6 h-6 text-[#1DA1F2] mb-3 transition-transform group-hover:-translate-y-1" />
                  <span className="font-bold text-slate-900 dark:text-white">Twitter (X)</span>
                  <span className="text-xs text-slate-500 mt-1">Protocol Announcements</span>
                </a>
                
                <a href="#" className="group flex flex-col p-5 rounded-2xl bg-white/50 dark:bg-black/20 border border-emerald-200/50 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all">
                  <BookOpen className="w-6 h-6 text-amber-500 mb-3 transition-transform group-hover:-translate-y-1" />
                  <span className="font-bold text-slate-900 dark:text-white">Documentation</span>
                  <span className="text-xs text-slate-500 mt-1">Smart Contract Specs</span>
                </a>
                
                <a href="#" className="group flex flex-col p-5 rounded-2xl bg-white/50 dark:bg-black/20 border border-emerald-200/50 dark:border-white/10 hover:border-slate-400 dark:hover:border-slate-500/50 hover:bg-slate-50 dark:hover:bg-slate-500/10 transition-all">
                  <Code2 className="w-6 h-6 text-slate-800 dark:text-white mb-3 transition-transform group-hover:-translate-y-1" />
                  <span className="font-bold text-slate-900 dark:text-white">GitHub</span>
                  <span className="text-xs text-slate-500 mt-1">100% Open Source</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Scrolling Marquee */}
        <div className="relative border-b border-emerald-200/50 dark:border-white/10 bg-emerald-50 dark:bg-white/[0.02] py-4 overflow-hidden flex">
          <div className="animate-marquee whitespace-nowrap flex items-center gap-8 text-sm font-bold tracking-[0.2em] text-emerald-800 dark:text-emerald-500/70">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="flex items-center gap-8">
                <span>INSTANT LIQUIDITY</span>
                <span>✦</span>
                <span>NON-CUSTODIAL</span>
                <span>✦</span>
                <span>FRACTIONAL SHARES</span>
                <span>✦</span>
                <span>ON-CHAIN ANALYTICS</span>
                <span>✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* 3. Link Grid */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-wrap justify-between md:justify-evenly w-full max-w-5xl mx-auto gap-12 md:gap-24">
              <div>
                <h4 className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-6 uppercase">Platform</h4>
                <ul className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <li><Link href="/marketplace" className="hover:text-emerald-500 transition-colors">Marketplace</Link></li>
                  <li><Link href="/portfolio" className="hover:text-emerald-500 transition-colors">Portfolio</Link></li>
                  <li><a href="#" className="hover:text-emerald-500 transition-colors">Analytics</a></li>
                  <li><a href="#" className="hover:text-emerald-500 transition-colors">Leaderboard</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-6 uppercase">Resources</h4>
                <ul className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <li><a href="#" className="hover:text-emerald-500 transition-colors">Documentation</a></li>
                  <li>
                    <a href="#" className="hover:text-emerald-500 transition-colors flex items-center gap-2">
                      Careers <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Hiring</span>
                    </a>
                  </li>
                  <li><a href="#" className="hover:text-emerald-500 transition-colors">Audits</a></li>
                  <li><a href="#" className="hover:text-emerald-500 transition-colors">Brand Assets</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-6 uppercase">Social</h4>
                <ul className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <li><a href="#" className="hover:text-emerald-500 transition-colors flex items-center justify-between gap-4">Twitter ↗</a></li>
                  <li><a href="#" className="hover:text-emerald-500 transition-colors flex items-center justify-between gap-4">Discord ↗</a></li>
                  <li><a href="#" className="hover:text-emerald-500 transition-colors flex items-center justify-between gap-4">GitHub ↗</a></li>
                </ul>
              </div>
            </div>
          
          <div className="mt-16 pt-8 border-t border-emerald-200/50 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-500">
            <div>© {new Date().getFullYear()} CANDL. ALL RIGHTS RESERVED.</div>
            <div className="flex gap-6 uppercase tracking-wider">
              <Link href="/privacy" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-emerald-500 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
