"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, User, Sun, Moon } from "lucide-react";
import { Button } from "../common/button";
import { CandlLogo } from "../common/CandlLogo";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { CreateNFTDialog } from "../wallet/CreateNFTDialog";
import { ImportNFTDialog } from "../wallet/ImportNFTDialog";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

// While the site is pre-launch, this hides wallet connect/trading entry points
// and swaps in a waitlist signup CTA instead. Flip off in env when trading opens.
const WAITLIST_MODE = process.env.NEXT_PUBLIC_WAITLIST_MODE === "true";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = usePathname();
  const { connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [createNFTOpen, setCreateNFTOpen] = useState(false);
  const [importNFTOpen, setImportNFTOpen] = useState(false);

  const navLinks = WAITLIST_MODE
    ? []
    : connected
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
      <CreateNFTDialog open={createNFTOpen} onOpenChange={setCreateNFTOpen} />
      <ImportNFTDialog open={importNFTOpen} onOpenChange={setImportNFTOpen} />

      {/* ── Background layer ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Base */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />
        {/* Blobs */}
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-emerald-300/35 dark:bg-zinc-800/30 blur-[100px]" />
        <div className="absolute top-1/2 -right-24 w-[380px] h-[380px] rounded-full bg-sky-300/30 dark:bg-zinc-800/20 blur-[90px]" />
        <div className="absolute bottom-0 left-1/3 w-[340px] h-[340px] rounded-full bg-amber-200/40 dark:bg-zinc-700/20 blur-[80px]" />
        <div className="absolute top-1/3 left-1/2 w-[260px] h-[260px] rounded-full bg-teal-200/25 dark:bg-zinc-800/20 blur-[70px]" />
      </div>

      {/* ── Grid overlay ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: isDark
            ? "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)"
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
                  <button type="button"
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
              <button type="button"
                onClick={() => setIsDark((d) => !d)}
                aria-label="Toggle theme"
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors outline-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                  bg-emerald-100/70 dark:bg-white/10 hover:bg-emerald-200 dark:hover:bg-white/20
                  text-emerald-600 dark:text-emerald-300
                  border border-emerald-200/50 dark:border-white/10 hover:border-emerald-300 dark:hover:border-white/20"
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              {!WAITLIST_MODE && connected && (
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateNFTOpen(true)}
                    className="h-9 rounded-xl border-emerald-200/50 dark:border-white/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-white/5"
                  >
                    Create NFT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportNFTOpen(true)}
                    className="h-9 rounded-xl border-emerald-200/50 dark:border-white/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-white/5"
                  >
                    Import NFT
                  </Button>
                </div>
              )}

              {WAITLIST_MODE ? (
                <Link href="/waitlist">
                  <Button
                    size="sm"
                    className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold"
                  >
                    Join Waitlist
                  </Button>
                </Link>
              ) : (
                <div className="wallet-adapter-container">
                  <WalletMultiButton className="candl-wallet-btn" style={{
                    height: '36px',
                    fontSize: '14px',
                    borderRadius: '12px',
                    fontWeight: 600,
                  }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10">
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      {navLinks.length > 0 && (
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
      )}
      {/* ── Premium Footer ── */}
      <footer className="relative z-10 mt-24 border-t border-emerald-200/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl overflow-hidden">
        
        {/* Massive Background Watermark */}
        <div className="absolute top-0 left-0 w-full h-[400px] flex items-center justify-center pointer-events-none select-none opacity-5 dark:opacity-[0.03]">
          <h1 className="text-[33vw] font-black tracking-tighter whitespace-nowrap text-emerald-900 dark:text-white">CANDL</h1>
        </div>

        {/* 1. Hero CTA */}
        <div className="relative w-full px-4 sm:px-6 lg:px-8 pt-24 pb-16 border-b border-emerald-200/50 dark:border-white/10">
          <div className="max-w-2xl space-y-6">
            <div className="text-xs font-bold tracking-[0.2em] text-emerald-600 dark:text-emerald-400 uppercase">
              FAST. SECURE. LIQUID.
            </div>
            <h2 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white leading-[0.9]">
              Start<br />Trading.
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md pt-2">
              {WAITLIST_MODE
                ? "Candl is still in development. Join the waitlist and we'll let you know the moment trading opens."
                : "Join the revolution of decentralized NFT trading. Deposit an asset or buy shares instantly."}
            </p>
            <div className="flex items-center gap-4 pt-4">
              <Link href={WAITLIST_MODE ? "/waitlist" : "/marketplace"}>
                <button type="button" className="px-8 py-4 rounded-full font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)] transition active:scale-95">
                  {WAITLIST_MODE ? "JOIN WAITLIST" : "START TRADING"} &rarr;
                </button>
              </Link>
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
          <div className="w-full max-w-5xl mx-auto">
              <div>
                <h4 className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-6 uppercase">Platform</h4>
                <ul className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {WAITLIST_MODE ? (
                    <li><Link href="/waitlist" className="hover:text-emerald-500 transition-colors">Join Waitlist</Link></li>
                  ) : (
                    <>
                      <li><Link href="/marketplace" className="hover:text-emerald-500 transition-colors">Marketplace</Link></li>
                      <li><Link href="/portfolio" className="hover:text-emerald-500 transition-colors">Portfolio</Link></li>
                    </>
                  )}
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
