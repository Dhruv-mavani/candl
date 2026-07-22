"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, BarChart3, Share2, Activity,
  Crosshair, TrendingUp as TrendLineIcon, Minus, Type, Smile, Ruler, ZoomIn, Magnet, Pencil, BarChart2 } from "lucide-react";
import { nftData, generateCandlestickHistory, CandleData } from "@/lib/mockData";
import { createChart, ColorType, CandlestickSeries, HistogramSeries, CrosshairMode, LineStyle, PriceScaleMode } from "lightweight-charts";

const glass =
  "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_8px_32px_rgba(16,185,129,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]";
const inset =
  "bg-white/40 dark:bg-white/[0.04] border border-white/60 dark:border-white/[0.07] rounded-xl";

export function NFTDetail() {
  const { id } = useParams();
  const nft = nftData.find((n) => n.id === id);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("");
  const [timeframe, setTimeframe] = useState("30d");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Drawing tools state
  const [activeTool, setActiveTool] = useState<string>("crosshair");
  const [priceScaleMode, setPriceScaleMode] = useState<"normal" | "log" | "percentage">("normal");
  const [autoScale, setAutoScale] = useState(true);

  // Crosshair OHLC tracking state
  const [crosshairData, setCrosshairData] = useState<{
    open: number; high: number; low: number; close: number; volume: number; change: number; changePercent: number;
  } | null>(null);

  const priceHistory = useMemo(() => {
    if (!nft) return [];
    const days = timeframe === "1d" ? 1 : timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : 365;
    return generateCandlestickHistory(nft.currentPrice, days);
  }, [nft, timeframe]);

  // Compute ATH + 24h stats from the generated data
  const chartStats = useMemo(() => {
    if (priceHistory.length === 0) return { ath: 0, totalVolume: 0, avgVolume: 0 };
    const ath = Math.max(...priceHistory.map(d => d.high));
    const totalVolume = priceHistory.reduce((sum, d) => sum + d.volume, 0);
    const avgVolume = Math.floor(totalVolume / priceHistory.length);
    return { ath, totalVolume, avgVolume };
  }, [priceHistory]);

  // Latest candle for the OHLC header when crosshair is not active
  const latestCandle = useMemo(() => {
    if (priceHistory.length === 0) return null;
    const c = priceHistory[priceHistory.length - 1];
    return {
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
      change: c.close - c.open,
      changePercent: ((c.close - c.open) / c.open) * 100
    };
  }, [priceHistory]);

  const displayData = crosshairData || latestCandle;

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
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
      height: 420,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
          style: LineStyle.Dotted,
          labelBackgroundColor: isDark ? "#1e293b" : "#f1f5f9",
        },
        horzLine: {
          width: 1,
          color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
          style: LineStyle.Dotted,
          labelBackgroundColor: isDark ? "#1e293b" : "#f1f5f9",
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        autoScale: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981", 
      downColor: "#f43f5e", 
      borderVisible: false, 
      wickUpColor: "#10b981", 
      wickDownColor: "#f43f5e",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    // Volume price scale at the bottom, taking 20% of chart height
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Listen for theme toggle to dynamically update chart colors
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark");
          chart.applyOptions({
            layout: {
              textColor: isDark ? "#64748b" : "#94a3b8",
            },
            grid: {
              vertLines: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
              horzLines: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
            },
            crosshair: {
              vertLine: {
                color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                labelBackgroundColor: isDark ? "#1e293b" : "#f1f5f9",
              },
              horzLine: {
                color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
                labelBackgroundColor: isDark ? "#1e293b" : "#f1f5f9",
              },
            },
            timeScale: {
              borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
            },
            rightPriceScale: {
              borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
            },
          });
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Crosshair move handler to update OHLC data bar
    chart.subscribeCrosshairMove((param: any) => {
      if (!param || !param.time) {
        setCrosshairData(null);
        return;
      }
      const candleData = param.seriesData?.get(candleSeries);
      const volData = param.seriesData?.get(volumeSeries);
      if (candleData && typeof candleData.open === 'number') {
        const change = candleData.close - candleData.open;
        const changePercent = (change / candleData.open) * 100;
        setCrosshairData({
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData?.value || 0,
          change,
          changePercent
        });
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && volumeSeriesRef.current && priceHistory.length > 0) {
      // Set candlestick data
      seriesRef.current.setData(priceHistory);

      // Set volume data with colors matching candle direction
      const volumeData = priceHistory.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open
          ? "rgba(16, 185, 129, 0.3)"  // green for up
          : "rgba(244, 63, 94, 0.3)",   // red for down
      }));
      volumeSeriesRef.current.setData(volumeData);

      // Add current price line
      const lastCandle = priceHistory[priceHistory.length - 1];
      const isUp = lastCandle.close >= lastCandle.open;
      seriesRef.current.createPriceLine({
        price: lastCandle.close,
        color: isUp ? "#10b981" : "#f43f5e",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: "",
      });

      chartRef.current?.timeScale().fitContent();
    }
  }, [priceHistory]);

  if (!nft) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">NFT not found</h2>
        <Link href="/marketplace">
          <button className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-medium">Back to Marketplace</button>
        </Link>
      </div>
    );
  }

  const sharesNum = parseFloat(shares) || 0;
  const totalCost = (sharesNum * nft.currentPrice).toFixed(2);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8 text-slate-800 dark:text-slate-100">
      <Link href="/marketplace">
        <button className="flex items-center gap-1.5 mb-6 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>
      </Link>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Left: Image + Info ── */}
        <div className="lg:col-span-1 space-y-5">
          <div className={`rounded-2xl overflow-hidden ${glass}`}>
            <div className="relative aspect-square">
              <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
              <div className={`absolute top-4 right-4 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 text-sm
                ${nft.priceChange24h >= 0 ? "bg-emerald-500/85" : "bg-rose-500/85"}`}>
                {nft.priceChange24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {nft.priceChange24h >= 0 ? "+" : ""}{nft.priceChange24h.toFixed(1)}%
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{nft.collection}</div>
                <h1 className="text-xl font-bold">{nft.name}</h1>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Market Cap", value: `$${(nft.marketCap / 1000).toFixed(0)}K`, color: "text-sky-600 dark:text-sky-400" },
                  { label: "24h Volume", value: `$${(nft.volume24h / 1000).toFixed(0)}K`, color: "text-amber-500 dark:text-amber-400" },
                  { label: "Total Shares", value: nft.totalShares.toLocaleString(), color: "" },
                  { label: "Holders", value: nft.holders.toString(), color: "" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`p-3 ${inset}`}>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{label}</div>
                    <div className={`font-semibold text-sm ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              <div className={`p-4 ${inset}`}>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-2">
                  <Share2 className="w-3.5 h-3.5" />
                  Available Shares
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {nft.availableShares.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">/ {nft.totalShares.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-slate-200/60 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                    style={{ width: `${(nft.availableShares / nft.totalShares) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Chart + Trading ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Price Chart */}
          <div className={`rounded-2xl p-5 ${glass}`}>
            {/* ── Chart Header Row ── */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span className="font-semibold text-sm">{nft.name}/USD</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">· {timeframe.toUpperCase()} · Candl</span>
              </div>
            </div>

            {/* ── OHLC Data Bar (Crosshair Tracking) ── */}
            {mounted && displayData ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1 text-xs font-mono">
                <span className="text-slate-400 dark:text-slate-500">O <span className={displayData.close >= displayData.open ? "text-emerald-500" : "text-rose-500"}>{displayData.open.toFixed(2)}</span></span>
                <span className="text-slate-400 dark:text-slate-500">H <span className={displayData.close >= displayData.open ? "text-emerald-500" : "text-rose-500"}>{displayData.high.toFixed(2)}</span></span>
                <span className="text-slate-400 dark:text-slate-500">L <span className={displayData.close >= displayData.open ? "text-emerald-500" : "text-rose-500"}>{displayData.low.toFixed(2)}</span></span>
                <span className="text-slate-400 dark:text-slate-500">C <span className={displayData.close >= displayData.open ? "text-emerald-500" : "text-rose-500"}>{displayData.close.toFixed(2)}</span></span>
                <span className={`font-semibold ${displayData.change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {displayData.change >= 0 ? "+" : ""}{displayData.change.toFixed(2)} ({displayData.changePercent >= 0 ? "+" : ""}{displayData.changePercent.toFixed(2)}%)
                </span>
              </div>
            ) : (
              <div className="h-4 mb-1"></div>
            )}

            {/* ── Volume Label ── */}
            <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-400 dark:text-slate-500 font-mono">
              <Activity className="w-3 h-3" />
              Volume <span className="text-slate-600 dark:text-slate-300">{mounted && displayData ? displayData.volume.toLocaleString() : "—"}</span>
            </div>

            {/* ── Price + ATH Row ── */}
            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-amber-500 dark:text-amber-400">${nft.currentPrice}</span>
                <span className={`text-base font-semibold ${nft.priceChange24h >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500"}`}>
                  {nft.priceChange24h >= 0 ? "+" : ""}{nft.priceChange24h.toFixed(2)}%
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">24hr</span>
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 dark:text-slate-500">ATH</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {mounted ? `$${chartStats.ath.toFixed(2)}` : "—"}
                </div>
              </div>
            </div>

            {/* ── Chart Canvas ── */}
            <div
              ref={chartContainerRef}
              style={{ width: "100%", height: "420px", cursor: "crosshair" }}
            />

            {/* ── Chart Bottom Toolbar ── */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
              {/* Timeframe shortcuts in footer */}
              <div className="flex items-center gap-1 text-xs font-mono">
                {["1d", "7d", "30d", "90d", "1y"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-0.5 rounded transition-all
                      ${timeframe === tf
                        ? "text-emerald-500 font-semibold"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
                <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>
                <BarChart2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>

              {/* Right side: timestamp + scale controls */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 dark:text-slate-500">
                <span>{new Date().toLocaleTimeString("en-US", { hour12: false })} UTC</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  onClick={() => {
                    setPriceScaleMode("percentage");
                    chartRef.current?.priceScale("right").applyOptions({ mode: PriceScaleMode.Percentage });
                  }}
                  className={`px-1.5 py-0.5 rounded transition-all ${priceScaleMode === "percentage" ? "text-emerald-500 font-semibold" : "hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  %
                </button>
                <button
                  onClick={() => {
                    setPriceScaleMode("log");
                    chartRef.current?.priceScale("right").applyOptions({ mode: PriceScaleMode.Logarithmic });
                  }}
                  className={`px-1.5 py-0.5 rounded transition-all ${priceScaleMode === "log" ? "text-emerald-500 font-semibold" : "hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  log
                </button>
                <button
                  onClick={() => {
                    setPriceScaleMode("normal");
                    chartRef.current?.priceScale("right").applyOptions({ mode: PriceScaleMode.Normal, autoScale: true });
                    chartRef.current?.timeScale().fitContent();
                  }}
                  className={`px-1.5 py-0.5 rounded transition-all ${priceScaleMode === "normal" ? "text-emerald-500 font-semibold" : "hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  auto
                </button>
              </div>
            </div>

            {/* ── Chart Footer Stats ── */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                <span>Avg Vol: <span className="text-slate-600 dark:text-slate-300 font-medium">{mounted ? chartStats.avgVolume.toLocaleString() : "—"}</span></span>
                <span>Total Vol: <span className="text-slate-600 dark:text-slate-300 font-medium">{mounted ? chartStats.totalVolume.toLocaleString() : "—"}</span></span>
                <span>Candles: <span className="text-slate-600 dark:text-slate-300 font-medium">{mounted ? priceHistory.length : "—"}</span></span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500"></span>Up</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500"></span>Down</span>
              </div>
            </div>
          </div>

          {/* Trading Panel */}
          <div className={`rounded-2xl p-5 ${glass}`}>
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span className="font-semibold">Trade Shares</span>
            </div>

            {/* Buy / Sell toggle */}
            <div className={`flex items-center gap-1 p-1 rounded-2xl mb-5 ${inset}`}>
              <button
                onClick={() => setTradeType("buy")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                  ${tradeType === "buy"
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-400/25"
                    : "text-slate-500 dark:text-slate-400"
                  }`}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeType("sell")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                  ${tradeType === "sell"
                    ? "bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-md shadow-rose-400/25"
                    : "text-slate-500 dark:text-slate-400"
                  }`}
              >
                Sell
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 mb-1.5 block">Number of Shares</label>
                <input
                  type="number"
                  placeholder="0"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className={`w-full h-12 px-4 rounded-xl text-lg outline-none ${inset} placeholder:text-slate-300 dark:placeholder:text-slate-600`}
                />
                <div className="flex gap-1.5 mt-2">
                  {[10, 50, 100, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setShares(amt.toString())}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${inset}
                        hover:bg-emerald-50 dark:hover:bg-emerald-400/10 hover:text-emerald-700 dark:hover:text-emerald-400`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`p-4 space-y-2 ${inset}`}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 dark:text-slate-500">Price per share</span>
                  <span className="font-medium">${nft.currentPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 dark:text-slate-500">Shares</span>
                  <span className="font-medium">{sharesNum}</span>
                </div>
                <div className="border-t border-black/5 dark:border-white/5 pt-2 flex justify-between">
                  <span className="font-semibold text-sm">{tradeType === "buy" ? "Total Cost" : "Total Value"}</span>
                  <span className={`text-lg font-bold ${tradeType === "buy" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                    ${totalCost}
                  </span>
                </div>
              </div>

              <button
                disabled={!shares || sharesNum <= 0}
                className={`w-full h-12 rounded-2xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
                  ${tradeType === "buy"
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 shadow-lg shadow-emerald-400/25"
                    : "bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 shadow-lg shadow-rose-400/25"
                  }`}
              >
                {tradeType === "buy" ? "Buy Shares" : "Sell Shares"}
              </button>

              <div className="bg-sky-50/80 dark:bg-sky-400/[0.07] border border-sky-200/60 dark:border-sky-400/15 rounded-xl p-3">
                <p className="text-xs text-sky-700 dark:text-sky-300">
                  💡 <strong>Tip:</strong> Trading fees are 1.25% per transaction (0.95% to Protocol, 0.30% to Creator). Connect your wallet to start trading.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
