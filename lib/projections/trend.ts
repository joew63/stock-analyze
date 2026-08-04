import type { HistoricalPricePoint } from "@/lib/providers/types";

export interface ProjectionPoint {
  daysAhead: number;
  date: string;
  median: number;
  upper1sd: number;
  lower1sd: number;
  upper2sd: number;
  lower2sd: number;
}

export interface PriceProjection {
  currentPrice: number;
  asOfDate: string;
  annualizedVolatility: number;
  annualizedDrift: number;
  lookbackDays: number;
  points: ProjectionPoint[];
  insufficientData: boolean;
}

const TRADING_DAYS_PER_YEAR = 252;

// Statistical projection only — not investment advice. Models price as
// geometric Brownian motion using the trailing window's historical mean
// daily log return (drift) and standard deviation (volatility), then
// projects a median path with 1sd/2sd confidence bands at each horizon.
export function computeProjection(
  priceHistory: HistoricalPricePoint[] | null,
  lookbackDays = 180,
  horizonsInDays: number[] = [30, 60, 90]
): PriceProjection {
  if (!priceHistory || priceHistory.length < 30) {
    return {
      currentPrice: 0,
      asOfDate: "",
      annualizedVolatility: 0,
      annualizedDrift: 0,
      lookbackDays,
      points: [],
      insufficientData: true,
    };
  }

  const sorted = [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const window = sorted.slice(-Math.min(lookbackDays, sorted.length));
  const closes = window.map((p) => p.close);

  const logReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    logReturns.push(Math.log(closes[i] / closes[i - 1]));
  }

  const meanDailyLogReturn =
    logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance =
    logReturns.reduce((s, r) => s + (r - meanDailyLogReturn) ** 2, 0) /
    logReturns.length;
  const dailyVol = Math.sqrt(variance);

  const annualizedDrift = meanDailyLogReturn * TRADING_DAYS_PER_YEAR;
  const annualizedVolatility = dailyVol * Math.sqrt(TRADING_DAYS_PER_YEAR);

  const currentPrice = closes[closes.length - 1];
  const asOfDate = window[window.length - 1].date;

  const points: ProjectionPoint[] = horizonsInDays.map((days) => {
    const drift = (meanDailyLogReturn - 0.5 * variance) * days;
    const sd = dailyVol * Math.sqrt(days);
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + days);
    return {
      daysAhead: days,
      date: projectedDate.toISOString().slice(0, 10),
      median: currentPrice * Math.exp(drift),
      upper1sd: currentPrice * Math.exp(drift + sd),
      lower1sd: currentPrice * Math.exp(drift - sd),
      upper2sd: currentPrice * Math.exp(drift + 2 * sd),
      lower2sd: currentPrice * Math.exp(drift - 2 * sd),
    };
  });

  return {
    currentPrice,
    asOfDate,
    annualizedVolatility,
    annualizedDrift,
    lookbackDays: window.length,
    points,
    insufficientData: false,
  };
}
