/**
 * Pure technical-indicator math over real candle data (no built-in indicators
 * ship with lightweight-charts -- these are the same well-known formulas
 * TradingView's own indicators use, computed client-side from real closes/
 * highs/lows/volumes we already have, never fabricated).
 */

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i === period - 1) {
      // Seed with the SMA of the first `period` values, standard EMA convention.
      prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      out[i] = prev;
    } else if (i >= period && prev !== null) {
      prev = values[i] * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export interface BollingerPoint {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export function bollingerBands(values: number[], period: number, stdDevMultiplier: number): BollingerPoint[] {
  const middle = sma(values, period);
  return values.map((_, i) => {
    const mid = middle[i];
    if (mid === null || i < period - 1) return { upper: null, middle: null, lower: null };
    const window = values.slice(i - period + 1, i + 1);
    const variance = window.reduce((sum, v) => sum + (v - mid) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    return { upper: mid + stdDevMultiplier * stdDev, middle: mid, lower: mid - stdDevMultiplier * stdDev };
  });
}

/** Wilder's RSI (the standard formula used by every charting platform). */
export function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export interface MacdPoint {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export function macd(values: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MacdPoint[] {
  const fastEma = ema(values, fastPeriod);
  const slowEma = ema(values, slowPeriod);
  const macdLine = values.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return f !== null && s !== null ? f - s : null;
  });

  // EMA of the MACD line itself, skipping the leading nulls before slowEma exists.
  const firstValid = macdLine.findIndex((v) => v !== null);
  const signalInput = firstValid === -1 ? [] : (macdLine.slice(firstValid) as number[]);
  const signalEma = ema(signalInput, signalPeriod);

  return values.map((_, i) => {
    const macdVal = macdLine[i];
    const signalIdx = firstValid === -1 ? -1 : i - firstValid;
    const signalVal = signalIdx >= 0 ? signalEma[signalIdx] : null;
    return {
      macd: macdVal,
      signal: signalVal,
      histogram: macdVal !== null && signalVal !== null ? macdVal - signalVal : null,
    };
  });
}

export interface VwapCandle {
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Cumulative VWAP over the whole loaded range (no session-reset concept for these young, short-lived markets). */
export function vwap(candles: VwapCandle[]): number[] {
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  return candles.map((c) => {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativePV += typicalPrice * c.volume;
    cumulativeVolume += c.volume;
    return cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : typicalPrice;
  });
}
