"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  BarChart3,
  Droplets,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  Activity,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Minus,
  Eraser,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, LineStyle, CrosshairMode, PriceScaleMode } from "lightweight-charts";
import type { IChartApi, ISeriesApi, SeriesType, UTCTimestamp, IPriceLine, MouseEventParams } from "lightweight-charts";

import { getMarket, getCandles, getMarketStats, type CandleResolution, type RealMarket } from "@/lib/api";
import { formatCountdown } from "@/lib/format";
import { useSolPriceUsd } from "@/lib/solPrice";
import { sma, ema, bollingerBands, rsi, macd, vwap } from "@/lib/indicators";
import { TrendLinePrimitive, type TrendLinePoint } from "@/lib/trendLinePrimitive";
import {
  useCandlProgram,
  deriveCandlPdas,
  deriveTraderPosition,
  quoteTrade,
  quotedTotal,
  buy,
  sell,
  settleMarket,
  quoteRedeem,
  redeem,
  type TradeQuote,
} from "@/lib/candl-program";
import { getErrorMessage, isWalletRejection } from "@/lib/wallet-errors";

const glass =
  "bg-white/50 dark:bg-white/[0.05] backdrop-blur-xl border border-white/70 dark:border-white/10 shadow-[0_8px_32px_rgba(16,185,129,0.07)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]";
const inset =
  "bg-white/40 dark:bg-white/[0.04] border border-white/60 dark:border-white/[0.07] rounded-xl";

const RESOLUTIONS: { key: CandleResolution; label: string }[] = [
  { key: "1m", label: "1m" },
  { key: "5m", label: "5m" },
  { key: "15m", label: "15m" },
  { key: "1h", label: "1h" },
  { key: "1d", label: "1d" },
];

function lamportsToSol(value: string | number | null | undefined) {
  return value ? Number(value) / 1e9 : 0;
}

function NotFound() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-16 text-center">
      <h2 className="text-2xl font-bold mb-4">Market not found</h2>
      <Link href="/marketplace">
        <button type="button" className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-medium">
          Back to Marketplace
        </button>
      </Link>
    </div>
  );
}

export function RealMarketDetail({ mint }: { mint: string }) {
  const [resolution, setResolution] = useState<CandleResolution>("1h");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amountMode, setAmountMode] = useState<"Shares" | "SOL">("Shares");
  const [shareInput, setShareInput] = useState("");

  const { publicKey } = useWallet();
  const program = useCandlProgram();
  const nftMint = useMemo(() => new PublicKey(mint), [mint]);

  // Tracked in state (not read directly during render) so expiry checks stay pure -- ticks every second so the countdown badge reads live.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, 1_000);
    return () => clearInterval(interval);
  }, []);

  const { data: market, error: marketError, isLoading: marketLoading, mutate: refreshMarket } = useSWR<RealMarket>(
    `/api/v1/markets/${mint}`,
    () => getMarket(mint),
    { refreshInterval: 10_000 }
  );
  const priceSOL = lamportsToSol(market?.currentPrice);
  const solPriceUsd = useSolPriceUsd();

  const { data: stats } = useSWR(
    `/api/v1/markets/${mint}/stats`,
    () => getMarketStats(mint),
    { refreshInterval: 15_000 }
  );

  const { data: candles, mutate: refreshCandles } = useSWR(
    `/api/v1/markets/${mint}/candles?resolution=${resolution}`,
    () => getCandles(mint, resolution),
    { refreshInterval: 10_000 }
  );

  // Fetch true on-chain state to override any stale/buggy backend indexing
  const { data: onChainCurve, mutate: refreshOnChainCurve } = useSWR(
    program ? `onChainCurve:${mint}` : null,
    async () => {
      if (!program) return null;
      const { bondingCurve } = deriveCandlPdas(nftMint);
      return await program.account.bondingCurve.fetchNullable(bondingCurve);
    },
    { refreshInterval: 10_000 }
  );

  const creator = useMemo(() => (market ? new PublicKey(market.creator) : null), [market]);

  const { data: ownedShares, mutate: refreshPosition } = useSWR(
    program && publicKey ? `position:${mint}:${publicKey.toBase58()}` : null,
    async () => {
      if (!program || !publicKey) return 0;
      const { market: marketPda } = deriveCandlPdas(nftMint);
      const positionPda = deriveTraderPosition(marketPda, publicKey);
      const position = await program.account.traderPosition.fetchNullable(positionPda);
      return position ? Number(position.shares) : 0;
    },
    { refreshInterval: 10_000 }
  );

  // In SOL mode the input is a spending budget, not a share count -- buy()/sell()
  // only ever take a share count, so this converts at the current spot price as
  // an initial guess; the debounced quote below then gets the real, exact preview
  // for that rounded share count (never a fabricated SOL-exact order).
  const shareAmount =
    amountMode === "Shares"
      ? parseInt(shareInput, 10) || 0
      : priceSOL > 0
        ? Math.floor((parseFloat(shareInput) || 0) / priceSOL)
        : 0;
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [quoting, setQuoting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!program || !publicKey || !creator || shareAmount <= 0) {
        setQuote(null);
        return;
      }
      setQuoting(true);
      try {
        const q = await quoteTrade({ program, trader: publicKey, nftMint, creator, shareAmount, side: tradeType });
        setQuote(q);
      } catch {
        // No funds/shares for a real preview yet -- the naive spot-price estimate below covers it.
        setQuote(null);
      } finally {
        setQuoting(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [program, publicKey, creator, shareAmount, tradeType, nftMint]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSignature, setSubmitSignature] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitSignature(null);
    if (!program || !publicKey || !creator) {
      setSubmitError("Connect your wallet first.");
      return;
    }
    if (shareAmount <= 0) return;

    setSubmitting(true);
    try {
      const freshQuote = await quoteTrade({ program, trader: publicKey, nftMint, creator, shareAmount, side: tradeType });
      const { signature } =
        tradeType === "buy"
          ? await buy({ program, trader: publicKey, nftMint, creator, shareAmount, quote: freshQuote })
          : await sell({ program, trader: publicKey, nftMint, creator, shareAmount, quote: freshQuote });

      setSubmitSignature(signature);
      setShareInput("");
      setQuote(null);
      refreshMarket();
      refreshCandles();
      refreshPosition();
      refreshOnChainCurve();
    } catch (err) {
      if (!isWalletRejection(err)) console.error(`${tradeType} failed:`, err);
      setSubmitError(getErrorMessage(err, `Failed to ${tradeType} shares.`));
    } finally {
      setSubmitting(false);
    }
  };

  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleSignature, setSettleSignature] = useState<string | null>(null);

  const handleSettle = async () => {
    setSettleError(null);
    setSettleSignature(null);
    if (!program) {
      setSettleError("Connect your wallet first.");
      return;
    }
    setSettling(true);
    try {
      const { signature } = await settleMarket({ program, nftMint });
      setSettleSignature(signature);
      refreshMarket();
    } catch (err) {
      if (!isWalletRejection(err)) console.error("settle failed:", err);
      setSettleError(getErrorMessage(err, "Failed to settle market."));
    } finally {
      setSettling(false);
    }
  };

  const [redeemInput, setRedeemInput] = useState("");
  const redeemAmount = parseInt(redeemInput, 10) || 0;
  const [redeemQuote, setRedeemQuote] = useState<{ solReceived: string } | null>(null);
  const [redeemQuoting, setRedeemQuoting] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSignature, setRedeemSignature] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!program || !publicKey || !creator || redeemAmount <= 0) {
        setRedeemQuote(null);
        return;
      }
      setRedeemQuoting(true);
      try {
        const q = await quoteRedeem({ program, trader: publicKey, nftMint, creator, shareAmount: redeemAmount });
        setRedeemQuote(q);
      } catch {
        setRedeemQuote(null);
      } finally {
        setRedeemQuoting(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [program, publicKey, creator, redeemAmount, nftMint]);

  const handleRedeem = async () => {
    setRedeemError(null);
    setRedeemSignature(null);
    if (!program || !publicKey || !creator) {
      setRedeemError("Connect your wallet first.");
      return;
    }
    if (redeemAmount <= 0) return;

    setRedeeming(true);
    try {
      const { signature } = await redeem({ program, trader: publicKey, nftMint, creator, shareAmount: redeemAmount });
      setRedeemSignature(signature);
      setRedeemInput("");
      setRedeemQuote(null);
      refreshMarket();
      refreshPosition();
      refreshOnChainCurve();
    } catch (err) {
      if (!isWalletRejection(err)) console.error("redeem failed:", err);
      setRedeemError(getErrorMessage(err, "Failed to redeem shares."));
    } finally {
      setRedeeming(false);
    }
  };

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const [priceScaleMode, setPriceScaleMode] = useState<"normal" | "log" | "percentage">("normal");

  // Indicators -- all computed client-side from the real candles already
  // loaded (lightweight-charts ships none of this; see lib/indicators.ts).
  const [indicators, setIndicators] = useState({ sma: false, ema: false, bb: false, vwap: false, rsi: false, macd: false });
  const [indicatorsMenuOpen, setIndicatorsMenuOpen] = useState(false);
  const overlaySeriesRef = useRef<ISeriesApi<SeriesType>[]>([]);
  const oscillatorSeriesRef = useRef<ISeriesApi<SeriesType>[]>([]);

  // Drawing tools -- lightweight-charts has none built in either.
  const [drawingMode, setDrawingMode] = useState<"none" | "trendline" | "horizontal">("none");
  const drawingModeRef = useRef(drawingMode);
  useEffect(() => {
    drawingModeRef.current = drawingMode;
    if (drawingMode === "none") pendingTrendPointRef.current = null;
  }, [drawingMode]);
  const trendLinePrimitiveRef = useRef<TrendLinePrimitive | null>(null);
  const pendingTrendPointRef = useRef<TrendLinePoint | null>(null);
  const horizontalLinesRef = useRef<IPriceLine[]>([]);

  // Real OHLC readout for whichever candle the cursor is over -- null (falls
  // back to the latest real candle below) when the cursor isn't on the chart.
  const [crosshairData, setCrosshairData] = useState<{
    open: number; high: number; low: number; close: number; volume: number; change: number; changePercent: number;
  } | null>(null);

  // markets.ts's /candles route already converts time to Unix seconds before
  // responding (unlike the market row's timestamp fields, which are raw ISO
  // strings). Shared by the chart-drawing effect and the render-time stats
  // below (avg/total volume, candle count) so both read the same real data.
  const processedCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const candleMap = new Map<number, (typeof candles)[0]>();
    for (const c of candles) {
      if (!isNaN(c.time)) candleMap.set(c.time, c);
    }
    return Array.from(candleMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestampSec, c]) => ({
        ...c,
        open: Number(c.open) / 1e9,
        high: Number(c.high) / 1e9,
        low: Number(c.low) / 1e9,
        close: Number(c.close) / 1e9,
        time: timestampSec as UTCTimestamp,
      }));
  }, [candles]);

  const latestCandle = processedCandles[processedCandles.length - 1] ?? null;
  const displayCandle =
    crosshairData ??
    (latestCandle
      ? {
          open: latestCandle.open,
          high: latestCandle.high,
          low: latestCandle.low,
          close: latestCandle.close,
          volume: latestCandle.volume,
          change: latestCandle.close - latestCandle.open,
          changePercent: latestCandle.open !== 0 ? ((latestCandle.close - latestCandle.open) / latestCandle.open) * 100 : 0,
        }
      : null);

  const chartStats = useMemo(() => {
    if (processedCandles.length === 0) return { totalVolume: 0, avgVolume: 0 };
    const totalVolume = processedCandles.reduce((sum, c) => sum + c.volume, 0);
    return { totalVolume, avgVolume: Math.floor(totalVolume / processedCandles.length) };
  }, [processedCandles]);

  useEffect(() => {
    // marketLoading gates an early return below that skips rendering this
    // container entirely, so on first mount (while still loading) the ref
    // is null and chart creation would silently no-op forever -- rerun once
    // loading finishes and the container actually exists in the DOM.
    if (!chartContainerRef.current || chartRef.current) return;
    const isDark = document.documentElement.classList.contains("dark");

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: isDark ? "#64748b" : "#94a3b8" },
      grid: {
        vertLines: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        horzLines: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 420,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)", style: LineStyle.Dotted, labelBackgroundColor: isDark ? "#1e293b" : "#f1f5f9" },
        horzLine: { width: 1, color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)", style: LineStyle.Dotted, labelBackgroundColor: isDark ? "#1e293b" : "#f1f5f9" },
      },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
      rightPriceScale: { borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", autoScale: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
      priceFormat: {
        type: "price",
        precision: 6,
        minMove: 0.000001,
      },
    });
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const trendLinePrimitive = new TrendLinePrimitive();
    candleSeries.attachPrimitive(trendLinePrimitive);
    trendLinePrimitiveRef.current = trendLinePrimitive;

    const handleClick = (param: MouseEventParams) => {
      const mode = drawingModeRef.current;
      if (mode === "none" || !param.time || !param.point) return;

      if (mode === "horizontal") {
        const price = candleSeries.coordinateToPrice(param.point.y);
        if (price === null) return;
        const line = candleSeries.createPriceLine({
          price,
          color: "#3b82f6",
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: "",
        });
        horizontalLinesRef.current.push(line);
        setDrawingMode("none");
        return;
      }

      // trendline: first click sets the anchor, second click completes it.
      const price = candleSeries.coordinateToPrice(param.point.y);
      if (price === null) return;
      const point: TrendLinePoint = { time: param.time, price };
      if (!pendingTrendPointRef.current) {
        pendingTrendPointRef.current = point;
      } else {
        trendLinePrimitiveRef.current?.addLine(pendingTrendPointRef.current, point);
        pendingTrendPointRef.current = null;
        setDrawingMode("none");
      }
    };
    chart.subscribeClick(handleClick);

    const handleCrosshairMove = (param: MouseEventParams) => {
      const candleData = param.seriesData?.get(candleSeries) as { open: number; high: number; low: number; close: number } | undefined;
      const volData = param.seriesData?.get(volumeSeries) as { value: number } | undefined;
      if (!param.time || !candleData || typeof candleData.open !== "number") {
        setCrosshairData(null);
        return;
      }
      const change = candleData.close - candleData.open;
      setCrosshairData({
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: volData?.value ?? 0,
        change,
        changePercent: candleData.open !== 0 ? (change / candleData.open) * 100 : 0,
      });
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    const handleResize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.unsubscribeClick(handleClick);
      window.removeEventListener("resize", handleResize);
      chart.remove();
      // Without this, the mount-guard above (`if (chartRef.current) return`)
      // sees a stale ref to this now-disposed chart and skips recreating one
      // -- in dev, React Strict Mode's mount/cleanup/mount double-invoke made
      // every ref here point at a removed chart with an empty panes array,
      // so any later chartRef.current.priceScale(...) call threw "incorrect
      // pane index" the instant a scale-mode button was clicked.
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      priceLineRef.current = null;
      trendLinePrimitiveRef.current = null;
      overlaySeriesRef.current = [];
      oscillatorSeriesRef.current = [];
      horizontalLinesRef.current = [];
    };
  }, [marketLoading]);

  useEffect(() => {
    if (!seriesRef.current || !volumeSeriesRef.current || processedCandles.length === 0) return;

    seriesRef.current.setData(processedCandles);
    volumeSeriesRef.current.setData(
      processedCandles.map((c) => ({
        time: c.time,
        value: c.volume, // volume is typically shares, keep as is
        color: c.close >= c.open ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)",
      }))
    );
    const last = processedCandles[processedCandles.length - 1];

    if (priceLineRef.current) {
      seriesRef.current.removePriceLine(priceLineRef.current);
    }

    priceLineRef.current = seriesRef.current.createPriceLine({
      price: last.close,
      color: last.close >= last.open ? "#10b981" : "#f43f5e",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: "",
    });

    chartRef.current?.timeScale().fitContent();
  }, [processedCandles]);

  // Redraws every active indicator from the real candles already loaded.
  // Oscillator panes (RSI/MACD) are torn down and rebuilt in a fixed order
  // rather than incrementally added/removed -- with pane indices shifting
  // whenever one is toggled off, incremental bookkeeping is far more failure
  // -prone than just recomputing the (cheap, small) set from scratch.
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = seriesRef.current;
    if (!chart || !candleSeries) return;

    for (const s of overlaySeriesRef.current) chart.removeSeries(s);
    overlaySeriesRef.current = [];
    for (const s of oscillatorSeriesRef.current) chart.removeSeries(s);
    oscillatorSeriesRef.current = [];
    while (chart.panes().length > 1) chart.removePane(chart.panes().length - 1);

    if (processedCandles.length === 0) return;

    const times = processedCandles.map((c) => c.time);
    const closes = processedCandles.map((c) => c.close);

    const addOverlayLine = (values: (number | null)[], color: string, title: string, dashed = false) => {
      const s = chart.addSeries(LineSeries, { color, lineWidth: 1, title, priceLineVisible: false, lastValueVisible: false, lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid });
      s.setData(times.map((time, i) => ({ time, value: values[i] })).filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null));
      overlaySeriesRef.current.push(s);
    };

    if (indicators.sma) addOverlayLine(sma(closes, 20), "#f59e0b", "SMA 20");
    if (indicators.ema) addOverlayLine(ema(closes, 20), "#a855f7", "EMA 20");
    if (indicators.vwap) addOverlayLine(vwap(processedCandles), "#ec4899", "VWAP");
    if (indicators.bb) {
      const bands = bollingerBands(closes, 20, 2);
      addOverlayLine(bands.map((b) => b.upper), "#38bdf8", "BB Upper", true);
      addOverlayLine(bands.map((b) => b.middle), "#38bdf8", "BB Middle");
      addOverlayLine(bands.map((b) => b.lower), "#38bdf8", "BB Lower", true);
    }

    const addOscillatorPane = () => chart.addPane().paneIndex();

    if (indicators.rsi) {
      const paneIndex = addOscillatorPane();
      const values = rsi(closes, 14);
      const s = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, title: "RSI 14", priceLineVisible: false, lastValueVisible: false }, paneIndex);
      s.setData(times.map((time, i) => ({ time, value: values[i] })).filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null));
      s.createPriceLine({ price: 70, color: "rgba(244,63,94,0.4)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" });
      s.createPriceLine({ price: 30, color: "rgba(16,185,129,0.4)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" });
      oscillatorSeriesRef.current.push(s);
    }

    if (indicators.macd) {
      const paneIndex = addOscillatorPane();
      const values = macd(closes, 12, 26, 9);
      const histSeries = chart.addSeries(
        HistogramSeries,
        { priceLineVisible: false, lastValueVisible: false, title: "MACD Histogram" },
        paneIndex
      );
      histSeries.setData(
        times
          .map((time, i) => ({ time, value: values[i].histogram, color: (values[i].histogram ?? 0) >= 0 ? "rgba(16,185,129,0.5)" : "rgba(244,63,94,0.5)" }))
          .filter((d): d is { time: UTCTimestamp; value: number; color: string } => d.value !== null)
      );
      const macdLine = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, title: "MACD", priceLineVisible: false, lastValueVisible: false }, paneIndex);
      macdLine.setData(times.map((time, i) => ({ time, value: values[i].macd })).filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null));
      const signalLine = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, title: "Signal", priceLineVisible: false, lastValueVisible: false }, paneIndex);
      signalLine.setData(times.map((time, i) => ({ time, value: values[i].signal })).filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null));
      oscillatorSeriesRef.current.push(histSeries, macdLine, signalLine);
    }
  }, [processedCandles, indicators]);

  if (marketLoading) {
    return (
      <div className={`w-full px-4 sm:px-6 lg:px-8 py-16 text-center ${glass} m-4 rounded-2xl`}>
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-emerald-500" />
      </div>
    );
  }

  if (marketError || !market) return <NotFound />;

  const outstandingSharesStr = onChainCurve ? onChainCurve.outstandingShares.toString() : market.outstandingShares;
  const reserveSolStr = onChainCurve ? onChainCurve.realSolReserves.toString() : market.reserveSol;

  const reserveSOL = lamportsToSol(reserveSolStr);
  const estimateSOL = quote ? lamportsToSol(quotedTotal(quote, tradeType).toString()) : shareAmount * priceSOL;

  const isActive = market.state === "ACTIVE";
  const isExpired = now !== null && new Date(market.expiresAt).getTime() < now;
  const canTrade = isActive && !isExpired;
  const insufficientShares = tradeType === "sell" && shareAmount > (ownedShares ?? 0);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8 text-slate-800 dark:text-slate-100">
      <Link href="/marketplace">
        <button type="button" className="flex items-center gap-1.5 mb-6 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>
      </Link>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Left: NFT info ── */}
        <div className="lg:col-span-1 space-y-5">
          <div className={`rounded-2xl overflow-hidden ${glass}`}>
            <div className="relative aspect-square bg-slate-100 dark:bg-slate-900">
              {market.metadata?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={market.metadata.imageUrl} alt={market.metadata.name ?? "NFT"} className="w-full h-full object-cover" />
              ) : null}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Live on devnet</div>
                <h1 className="text-xl font-bold">{market.metadata?.name ?? "Unnamed Market"}</h1>
              </div>

              {market.state === "ACTIVE" && now !== null && (
                <div
                  className={`flex items-center gap-2 p-3 ${inset} ${
                    isExpired ? "border-amber-400/40" : ""
                  }`}
                >
                  <Clock className={`w-4 h-4 shrink-0 ${isExpired ? "text-amber-500" : "text-emerald-500 dark:text-emerald-400"}`} />
                  <div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {isExpired ? "Market closed" : "Closes in"}
                    </div>
                    <div className={`font-semibold text-sm tabular-nums ${isExpired ? "text-amber-600 dark:text-amber-400" : ""}`}>
                      {isExpired ? "Awaiting settlement" : formatCountdown(market.expiresAt, now)}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Market Cap", sol: stats ? lamportsToSol(stats.marketCap) : 0, color: "text-sky-600 dark:text-sky-400" },
                  { label: "24h Volume", sol: stats ? lamportsToSol(stats.volume24h) : 0, color: "text-amber-500 dark:text-amber-400" },
                ].map(({ label, sol, color }) => (
                  <div key={label} className={`p-3 ${inset}`}>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{label}</div>
                    <div className={`font-semibold text-sm ${color}`}>
                      {solPriceUsd !== undefined
                        ? `$${(sol * solPriceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `${sol.toFixed(4)} SOL`}
                    </div>
                    {solPriceUsd !== undefined && <div className="text-[11px] text-slate-400 dark:text-slate-500">{sol.toFixed(4)} SOL</div>}
                  </div>
                ))}
                {[
                  { label: "Outstanding Shares", value: outstandingSharesStr ?? "0" },
                  { label: "Holders", value: (stats?.holderCount ?? 0).toString() },
                ].map(({ label, value }) => (
                  <div key={label} className={`p-3 ${inset}`}>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{label}</div>
                    <div className="font-semibold text-sm">{value}</div>
                  </div>
                ))}
              </div>

              <div className={`p-4 ${inset}`}>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mb-2">
                  <Droplets className="w-3.5 h-3.5" />
                  Reserve Liquidity
                </div>
                <div className="flex items-baseline gap-1.5 mb-2 flex-wrap">
                  {solPriceUsd !== undefined ? (
                    <>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        ${(reserveSOL * solPriceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{reserveSOL.toFixed(4)} SOL</span>
                    </>
                  ) : (
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{reserveSOL.toFixed(4)} SOL</span>
                  )}
                  <span className="text-xs text-slate-400 ml-1">locked in curve</span>
                </div>
                <div className="h-1.5 bg-slate-200/60 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 w-full" />
                </div>
              </div>

              {!canTrade && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-400/[0.07] border border-amber-200/60 dark:border-amber-400/15 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {market.state === "SETTLED"
                    ? "This market has been fully settled."
                    : market.state === "SETTLING"
                      ? "Market is settling -- redeem your shares below."
                      : "This market has expired -- awaiting settlement."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Chart + Trading ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className={`rounded-2xl p-5 ${glass}`}>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span className="font-semibold text-sm">{market.metadata?.name ?? "Market"}/SOL</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">· {resolution.toUpperCase()} · Candl</span>
              </div>

              <div className="flex items-center gap-1">
                {/* Drawing tools -- lightweight-charts has none built in, these are hand-built (see lib/trendLinePrimitive.ts) */}
                <button type="button"
                  onClick={() => setDrawingMode(drawingMode === "trendline" ? "none" : "trendline")}
                  title="Trend line -- click two points on the chart"
                  className={`p-1.5 rounded-lg transition-all ${drawingMode === "trendline" ? "bg-blue-500/15 text-blue-500" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                </button>
                <button type="button"
                  onClick={() => setDrawingMode(drawingMode === "horizontal" ? "none" : "horizontal")}
                  title="Horizontal line -- click a price level on the chart"
                  className={`p-1.5 rounded-lg transition-all ${drawingMode === "horizontal" ? "bg-blue-500/15 text-blue-500" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button type="button"
                  onClick={() => {
                    trendLinePrimitiveRef.current?.clear();
                    for (const line of horizontalLinesRef.current) seriesRef.current?.removePriceLine(line);
                    horizontalLinesRef.current = [];
                    setDrawingMode("none");
                  }}
                  title="Clear all drawings"
                  className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />

                <div className="relative">
                  <button type="button"
                    onClick={() => setIndicatorsMenuOpen((open) => !open)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${indicatorsMenuOpen || Object.values(indicators).some(Boolean) ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Indicators
                  </button>

                  {indicatorsMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIndicatorsMenuOpen(false)} />
                      <div className={`absolute right-0 top-full mt-2 w-48 p-2 rounded-xl z-20 ${glass}`}>
                        {(
                          [
                            ["sma", "SMA (20)"],
                            ["ema", "EMA (20)"],
                            ["bb", "Bollinger Bands"],
                            ["vwap", "VWAP"],
                            ["rsi", "RSI (14)"],
                            ["macd", "MACD"],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                            <input
                              type="checkbox"
                              checked={indicators[key]}
                              onChange={() => setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))}
                              className="accent-emerald-500"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {drawingMode !== "none" && (
              <p className="text-[11px] text-blue-500 mb-1">
                {drawingMode === "trendline" ? "Click two points on the chart to draw a trend line." : "Click a point on the chart to place a horizontal line."}
              </p>
            )}

            {/* OHLC data bar -- reflects the hovered candle, or the latest one */}
            {displayCandle ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1 text-xs font-mono">
                <span className="text-slate-400 dark:text-slate-500">
                  O <span className={displayCandle.close >= displayCandle.open ? "text-emerald-500" : "text-rose-500"}>{displayCandle.open.toFixed(6)}</span>
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  H <span className={displayCandle.close >= displayCandle.open ? "text-emerald-500" : "text-rose-500"}>{displayCandle.high.toFixed(6)}</span>
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  L <span className={displayCandle.close >= displayCandle.open ? "text-emerald-500" : "text-rose-500"}>{displayCandle.low.toFixed(6)}</span>
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  C <span className={displayCandle.close >= displayCandle.open ? "text-emerald-500" : "text-rose-500"}>{displayCandle.close.toFixed(6)}</span>
                </span>
                <span className={`font-semibold ${displayCandle.change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {displayCandle.change >= 0 ? "+" : ""}{displayCandle.change.toFixed(6)} ({displayCandle.changePercent >= 0 ? "+" : ""}{displayCandle.changePercent.toFixed(2)}%)
                </span>
              </div>
            ) : (
              <div className="h-4 mb-1" />
            )}

            <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-400 dark:text-slate-500 font-mono">
              <Activity className="w-3 h-3" />
              Volume <span className="text-slate-600 dark:text-slate-300">{displayCandle ? displayCandle.volume.toLocaleString() : "—"}</span>
            </div>

            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-amber-500 dark:text-amber-400">{priceSOL.toFixed(6)} SOL</span>
                {stats && stats.priceChange24h !== null && (
                  <span className={`text-base font-semibold ${stats.priceChange24h >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500"}`}>
                    {stats.priceChange24h >= 0 ? "+" : ""}{stats.priceChange24h.toFixed(2)}%
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">24hr</span>
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 dark:text-slate-500">ATH</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {stats ? `${lamportsToSol(stats.athPrice).toFixed(6)} SOL` : "—"}
                </div>
              </div>
            </div>

            <div className="relative">
              <div ref={chartContainerRef} style={{ width: "100%", height: "420px", cursor: "crosshair" }} />

              {(!candles || candles.length === 0) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">No trades yet on this market.</p>
                  <p className="text-xs text-slate-300 dark:text-slate-600">Be the first to buy shares below.</p>
                </div>
              )}
            </div>

            {/* Bottom toolbar: resolution + UTC clock + scale mode */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center gap-1 text-xs font-mono">
                {RESOLUTIONS.map(({ key, label }) => (
                  <button type="button"
                    key={key}
                    onClick={() => setResolution(key)}
                    className={`px-2 py-0.5 rounded transition-all ${resolution === key ? "text-emerald-500 font-semibold" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 dark:text-slate-500">
                <span>{now !== null ? new Date(now).toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" }) : "--:--:--"} UTC</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button type="button"
                  onClick={() => {
                    setPriceScaleMode("percentage");
                    chartRef.current?.priceScale("right").applyOptions({ mode: PriceScaleMode.Percentage });
                  }}
                  className={`px-1.5 py-0.5 rounded transition-all ${priceScaleMode === "percentage" ? "text-emerald-500 font-semibold" : "hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  %
                </button>
                <button type="button"
                  onClick={() => {
                    setPriceScaleMode("log");
                    chartRef.current?.priceScale("right").applyOptions({ mode: PriceScaleMode.Logarithmic });
                  }}
                  className={`px-1.5 py-0.5 rounded transition-all ${priceScaleMode === "log" ? "text-emerald-500 font-semibold" : "hover:text-slate-600 dark:hover:text-slate-300"}`}
                >
                  log
                </button>
                <button type="button"
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

            {/* Footer stats -- computed from the real candles currently loaded */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                <span>Avg Vol: <span className="text-slate-600 dark:text-slate-300 font-medium">{chartStats.avgVolume.toLocaleString()}</span></span>
                <span>Total Vol: <span className="text-slate-600 dark:text-slate-300 font-medium">{chartStats.totalVolume.toLocaleString()}</span></span>
                <span>Candles: <span className="text-slate-600 dark:text-slate-300 font-medium">{processedCandles.length}</span></span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" />Up</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500" />Down</span>
              </div>
            </div>
          </div>

          {/* Trading / Settle / Redeem Panel */}
          <div className={`rounded-2xl p-5 ${glass}`}>
            {market.state === "ACTIVE" && !isExpired && (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span className="font-semibold">Trade Shares</span>
                  {ownedShares ? (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium shadow-sm transition-all hover:bg-emerald-500/15">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                      <span>You own {ownedShares} shares</span>
                    </div>
                  ) : null}
                </div>

                <div className={`flex items-center gap-1 p-1 rounded-2xl mb-5 ${inset}`}>
                  <button type="button"
                    onClick={() => setTradeType("buy")}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tradeType === "buy" ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-400/25" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    Buy
                  </button>
                  <button type="button"
                    onClick={() => {
                      setTradeType("sell");
                      setAmountMode("Shares"); // sell.rs only ever burns a share count
                    }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tradeType === "sell" ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/25" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    Sell
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label htmlFor="real-trade-shares" className="text-xs text-slate-400 dark:text-slate-500 block">
                        {tradeType === "buy" ? `Amount to Buy` : "Shares to Sell"}
                      </label>
                      {tradeType === "buy" && (
                        <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-0.5">
                          {(["Shares", "SOL"] as const).map((mode) => (
                            <button type="button"
                              key={mode}
                              onClick={() => {
                                setAmountMode(mode);
                                setShareInput("");
                              }}
                              className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${amountMode === mode ? "bg-white dark:bg-white/10 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        id="real-trade-shares"
                        type="number"
                        min={0}
                        step={amountMode === "Shares" ? 1 : 0.001}
                        placeholder="0"
                        value={shareInput}
                        onChange={(e) => setShareInput(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={!canTrade}
                        className={`w-full h-12 pl-4 pr-20 rounded-xl text-lg outline-none ${inset} placeholder:text-slate-300 dark:placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                      <div className="absolute right-2 flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-400 pointer-events-none">{amountMode}</span>
                        <div className="flex flex-col border-l border-slate-200 dark:border-white/10 pl-1.5">
                          <button type="button"
                            onClick={() => {
                              const step = amountMode === "Shares" ? 1 : 0.001;
                              setShareInput(((parseFloat(shareInput) || 0) + step).toString());
                            }}
                            disabled={!canTrade}
                            aria-label="Increase amount"
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button type="button"
                            onClick={() => {
                              const step = amountMode === "Shares" ? 1 : 0.001;
                              setShareInput(Math.max(0, (parseFloat(shareInput) || 0) - step).toString());
                            }}
                            disabled={!canTrade}
                            aria-label="Decrease amount"
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-40"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {(amountMode === "Shares" ? [10, 50, 100, 500] : [0.001, 0.005, 0.01, 0.05]).map((amt) => (
                        <button type="button"
                          key={amt}
                          disabled={!canTrade}
                          onClick={() => setShareInput(amt.toString())}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${inset} hover:bg-emerald-50 dark:hover:bg-emerald-400/10 hover:text-emerald-700 dark:hover:text-emerald-400 disabled:opacity-40`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`p-4 space-y-2 ${inset}`}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 dark:text-slate-500">Spot price</span>
                      <span className="font-medium">{priceSOL.toFixed(6)} SOL</span>
                    </div>
                    {amountMode === "SOL" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400 dark:text-slate-500">Shares</span>
                        <span className="font-medium">{shareAmount}</span>
                      </div>
                    )}
                    <div className="border-t border-black/5 dark:border-white/5 pt-2 flex justify-between items-center">
                      <span className="font-semibold text-sm">
                        {tradeType === "buy" ? "Total Cost" : "You Receive"} {quoting && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
                      </span>
                      <span className={`text-lg font-bold ${tradeType === "buy" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                        {estimateSOL > 0 ? estimateSOL.toFixed(6) : "0"} SOL
                      </span>
                    </div>
                    {!quote && shareAmount > 0 && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">Estimate from current spot price -- exact cost is confirmed on submit.</p>
                    )}
                  </div>

                  {insufficientShares && (
                    <p className="text-sm text-destructive">You only own {ownedShares ?? 0} shares.</p>
                  )}
                  {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                  {submitSignature && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <a
                        href={`https://explorer.solana.com/tx/${submitSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        Trade confirmed -- view on Solana Explorer
                      </a>
                    </div>
                  )}

                  <button type="button"
                    onClick={handleSubmit}
                    disabled={!canTrade || !program || submitting || shareAmount <= 0 || insufficientShares}
                    className={`w-full h-12 rounded-2xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
                      ${tradeType === "buy"
                        ? "bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 shadow-lg shadow-emerald-400/25"
                        : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                      }`}
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                    {!program ? "Connect Wallet" : submitting ? "Confirming…" : tradeType === "buy" ? "Buy Shares" : "Sell Shares"}
                  </button>

                  <div className="bg-sky-50/80 dark:bg-sky-400/[0.07] border border-sky-200/60 dark:border-sky-400/15 rounded-xl p-3">
                    <p className="text-xs text-sky-700 dark:text-sky-300">
                      <TrendingUp className="inline w-3 h-3 mr-1" />
                      Fees are {(market.feeProtocolBps + market.feeCreatorBps) / 100}% per trade ({market.feeProtocolBps / 100}% protocol / {market.feeCreatorBps / 100}% creator).
                    </p>
                  </div>
                </div>
              </>
            )}

            {market.state === "ACTIVE" && isExpired && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">Market Expired</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Trading has closed. Settlement is permissionless -- anyone can trigger it, which unlocks redemption for every shareholder.
                </p>

                {settleError && <p className="text-sm text-destructive mb-3">{settleError}</p>}
                {settleSignature && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    <a
                      href={`https://explorer.solana.com/tx/${settleSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      Market settled -- view on Solana Explorer
                    </a>
                  </div>
                )}

                <button type="button"
                  onClick={handleSettle}
                  disabled={!program || settling}
                  className="w-full h-12 rounded-2xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 shadow-lg shadow-amber-400/25"
                >
                  {settling && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                  {!program ? "Connect Wallet" : settling ? "Settling…" : "Settle Market"}
                </button>
              </>
            )}

            {market.state === "SETTLING" && (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span className="font-semibold">Redeem Shares</span>
                  {ownedShares ? (
                    <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">You own {ownedShares} shares</span>
                  ) : null}
                </div>

                {!ownedShares && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    You don&apos;t hold any shares in this market to redeem.
                  </p>
                )}

                {!!ownedShares && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="redeem-shares" className="text-xs text-slate-400 dark:text-slate-500 block mb-1.5">
                        Shares to redeem
                      </label>
                      <input
                        id="redeem-shares"
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        value={redeemInput}
                        onChange={(e) => setRedeemInput(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={`w-full h-12 px-4 rounded-xl text-lg outline-none ${inset} placeholder:text-slate-300 dark:placeholder:text-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                    </div>

                    <div className={`p-4 space-y-2 ${inset}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">
                          You Receive {redeemQuoting && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
                        </span>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {redeemQuote ? lamportsToSol(redeemQuote.solReceived).toFixed(6) : "0"} SOL
                        </span>
                      </div>
                    </div>

                    {redeemAmount > (ownedShares ?? 0) && (
                      <p className="text-sm text-destructive">You only own {ownedShares} shares.</p>
                    )}
                    {redeemError && <p className="text-sm text-destructive">{redeemError}</p>}
                    {redeemSignature && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <a
                          href={`https://explorer.solana.com/tx/${redeemSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Redeemed -- view on Solana Explorer
                        </a>
                      </div>
                    )}

                    <button type="button"
                      onClick={handleRedeem}
                      disabled={!program || redeeming || redeemAmount <= 0 || redeemAmount > (ownedShares ?? 0)}
                      className="w-full h-12 rounded-2xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 shadow-lg shadow-emerald-400/25"
                    >
                      {redeeming && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                      {!program ? "Connect Wallet" : redeeming ? "Redeeming…" : "Redeem Shares"}
                    </button>
                  </div>
                )}
              </>
            )}

            {market.state === "SETTLED" && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                This market has been fully settled. All shares have been redeemed and the NFT has returned to its creator.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
