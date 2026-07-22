"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Zap, TrendingUp, Coins, RefreshCcw, Terminal } from "lucide-react";
import { createChart, ColorType, CandlestickSeries, Time } from "lightweight-charts";

type Step = 1 | 2 | 3 | 4;

interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

const INTERVALS = ["1m", "5m", "15m", "1H", "1D"];

export function CandlSimulator() {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<CandleData[]>([]);
  const [shares, setShares] = useState(0);
  const [solReserve, setSolReserve] = useState(0);
  const [royalties, setRoyalties] = useState(0);
  const [activeInterval, setActiveInterval] = useState("1m");
  const [lastTime, setLastTime] = useState<number>(Math.floor(Date.now() / 1000));
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  
  const k = 0.05;
  const currentPrice = shares * k || 0.1;

  // Initialize TradingView Chart
  useEffect(() => {
    if (step > 1 && chartContainerRef.current) {
      const isDark = document.documentElement.classList.contains("dark");
      
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: isDark ? "#64748b" : "#94a3b8",
        },
        grid: {
          vertLines: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
          horzLines: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981", 
        downColor: "#f43f5e", 
        borderVisible: false, 
        wickUpColor: "#10b981", 
        wickDownColor: "#f43f5e",
      });

      chartRef.current = chart;
      seriesRef.current = series;

      const handleResize = () => {
        chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    }
  }, [step]);

  // Update chart data when data array changes
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data);
    }
  }, [data]);

  // First candle creation on initialization
  useEffect(() => {
    if (step === 2 && data.length === 0) {
      const now = Math.floor(Date.now() / 1000);
      setLastTime(now);
      setData([{ time: now as Time, open: 0.1, high: 0.105, low: 0.095, close: 0.1 }]);
    }
  }, [step, data]);

  const generateCandle = (oldPrice: number, newPrice: number, isBuy: boolean) => {
    const nextTime = lastTime + 60; // Increment time by 60 seconds for visual spacing
    setLastTime(nextTime);
    
    // Add realistic noise to wicks
    const noise = Math.random() * 0.1;
    const high = Math.max(oldPrice, newPrice) + noise;
    const low = Math.max(0.01, Math.min(oldPrice, newPrice) - noise);
    
    return {
      time: nextTime as Time,
      open: oldPrice,
      high,
      low,
      close: newPrice
    };
  };

  const handleDeposit = () => setStep(2);
  const handleInitialize = () => setStep(3);

  const handleBuy = (amount: number) => {
    const oldPrice = currentPrice;
    const newShares = shares + amount;
    const newPrice = newShares * k;
    const cost = ((shares + newShares) / 2) * amount * k; 
    const protocolFee = cost * 0.0095;
    const royaltyFee = cost * 0.0030;
    
    setShares(newShares);
    setSolReserve(prev => prev + cost); // Reserve is never reduced by fees
    setRoyalties(prev => prev + royaltyFee);
    
    const candle = generateCandle(oldPrice, newPrice, true);
    setData(prev => [...prev, candle]);
    
    if (step === 3) setStep(4);
  };

  const handleSell = (amount: number) => {
    if (shares < amount) return;
    const oldPrice = currentPrice;
    const newShares = shares - amount;
    const newPrice = newShares * k || 0.1;
    const revenue = ((shares + newShares) / 2) * amount * k; 
    const protocolFee = revenue * 0.0095;
    const royaltyFee = revenue * 0.0030;
    
    setShares(newShares);
    setSolReserve(prev => Math.max(0, prev - revenue)); // Reserve decreases by full revenue
    setRoyalties(prev => prev + royaltyFee);
    
    const candle = generateCandle(oldPrice, newPrice, false);
    setData(prev => [...prev, candle]);
  };

  const handleReset = () => {
    setStep(1);
    setData([]);
    setShares(0);
    setSolReserve(0);
    setRoyalties(0);
  };

  const getStatusMessage = () => {
    switch (step) {
      case 1: return "AWAITING_ASSET_DEPOSIT";
      case 2: return "ASSET_LOCKED // AWAITING_INITIALIZATION";
      case 3: return "MARKET_LIVE // WAITING_FOR_FIRST_TRADER";
      case 4: return "MARKET_ACTIVE // HIGH_VOLUME_DETECTED";
    }
  };

  return (
    <div id="simulator" className="w-full max-w-5xl mx-auto px-4 md:px-8 mb-24">
      {/* Intro Context */}
      <div className="mb-8 max-w-2xl">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
          <Terminal className="w-6 h-6 text-emerald-500" />
          Protocol Simulator
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          Experience exactly how Candl turns illiquid JPEGs into high-volume financial markets. Follow the terminal prompts below.
        </p>
      </div>

      {/* The Pro Terminal Window */}
      <div className="bg-white dark:bg-[#0B1015] border border-slate-300 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono flex flex-col relative group transition-colors duration-500">
        
        {/* Terminal Header */}
        <div className="bg-slate-100 dark:bg-[#121820] border-b border-slate-300 dark:border-slate-800 px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-500">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-300 dark:bg-slate-800 overflow-hidden relative border border-slate-300 dark:border-slate-700">
              <img 
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop" 
                alt="Mock"
                className="w-full h-full object-cover opacity-80"
                style={{ filter: step > 1 ? 'none' : 'grayscale(100%)' }}
              />
              {step === 1 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Lock className="w-3 h-3 text-white" /></div>}
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Asset Pair</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">ABS142 / SOL</div>
            </div>
          </div>

          <div className="flex-1 flex justify-center w-full md:w-auto">
            <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1.5 rounded text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <span className={`w-2 h-2 rounded-full ${step > 2 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              SYS_STATUS: {getStatusMessage()}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="flex flex-col">
              <span>PRC</span>
              <span className="text-slate-900 dark:text-white">{currentPrice.toFixed(2)} SOL</span>
            </div>
            <div className="flex flex-col">
              <span>RSV</span>
              <span className="text-emerald-600 dark:text-emerald-400">{solReserve.toFixed(2)} SOL</span>
            </div>
            <div className="flex flex-col">
              <span>SPLY</span>
              <span className="text-sky-600 dark:text-sky-400">{shares}</span>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="w-full h-[350px] relative bg-slate-50 dark:bg-[#0B1015] transition-colors duration-500 flex flex-col">
          
          {/* Interval Selector Overlay */}
          {step > 1 && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-white/80 dark:bg-[#121820]/80 backdrop-blur-md p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              {INTERVALS.map((interval) => (
                <button
                  key={interval}
                  onClick={() => setActiveInterval(interval)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    activeInterval === interval 
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {interval}
                </button>
              ))}
            </div>
          )}

          {step === 1 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 animate-in fade-in duration-500 h-full">
              <Lock className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm uppercase tracking-widest font-bold">Market Offline. Asset Required.</p>
            </div>
          ) : (
            <div className="w-full h-full relative">
              {step === 2 && data.length === 1 && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="bg-black text-emerald-400 px-4 py-2 border border-emerald-500/30 text-xs font-bold tracking-wider animate-pulse">
                    &gt; INITIALIZATION_REQUIRED
                  </div>
                </div>
              )}
              {/* TradingView Container */}
              <div ref={chartContainerRef} className="w-full h-full" />
            </div>
          )}
        </div>

        {/* Command Bar (Action Panel) */}
        <div className="bg-white dark:bg-[#121820] border-t border-slate-300 dark:border-slate-800 p-4 md:p-6 transition-colors duration-500">
          <div className="flex flex-col lg:flex-row gap-6">
            
            <div className="flex-1 flex flex-col justify-center border-l-2 border-emerald-500 pl-4">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 tracking-wider uppercase">
                {step === 1 && "Step 1: The Creator's Dilemma"}
                {step === 2 && "Step 2: Bonding Curve Generation"}
                {step === 3 && "Step 3: Trader Entry"}
                {step === 4 && "Step 4: Hype & Speculation"}
              </span>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                {step === 1 && "You are a creator. Normally you wait weeks to sell an NFT. Instead, deposit it into Candl to instantly generate a liquid market for your work."}
                {step === 2 && "The asset is locked in the smart contract. A mathematical bonding curve (Price = K × Supply) is automatically generated. Initialize the market."}
                {step === 3 && "You are now a trader. Buy fractional shares of the NFT instantly. Try buying the first shares to see how the math pushes the price up."}
                {step === 4 && "As you build hype, traders buy in early expecting a price boom. High volume drives the curve up, rewarding buyers and generating massive royalties for you!"}
              </p>
            </div>

            <div className="flex flex-col justify-center min-w-[280px]">
              {step === 1 && (
                <button onClick={handleDeposit} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 rounded">
                  <Lock className="w-4 h-4" /> Deposit Asset
                </button>
              )}
              {step === 2 && (
                <button onClick={handleInitialize} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 rounded">
                  <Zap className="w-4 h-4" /> Initialize Market
                </button>
              )}
              {step === 3 && (
                <button onClick={() => handleBuy(10)} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 rounded">
                  <TrendingUp className="w-4 h-4" /> Buy 10 Shares
                </button>
              )}
              {step === 4 && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleBuy(5)} className="py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 rounded">
                    Buy 5
                  </button>
                  <button onClick={() => handleSell(5)} disabled={shares < 5} className="py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 rounded">
                    Sell 5
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Creator Earnings:</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{royalties.toFixed(4)} SOL</span>
            </div>
            
            {step === 4 && (
              <button onClick={handleReset} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase font-bold transition-colors">
                <RefreshCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
