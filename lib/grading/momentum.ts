import { MOMENTUM_CURVES } from "./thresholds";
import { scoreFromCurve } from "./interpolate";
import { weightedAverage, type GradeResult, type MetricScore } from "./types";
import { formatPercent } from "./format";
import type { HistoricalPricePoint } from "@/lib/providers/types";

function returnOverTradingDays(
  prices: HistoricalPricePoint[],
  days: number
): number | null {
  if (prices.length < days + 1) return null;
  const latest = prices[prices.length - 1].close;
  const past = prices[prices.length - 1 - days].close;
  if (past <= 0) return null;
  return (latest - past) / past;
}

function sma(prices: HistoricalPricePoint[], window: number): number | null {
  if (prices.length < window) return null;
  const slice = prices.slice(prices.length - window);
  const sum = slice.reduce((s, p) => s + p.close, 0);
  return sum / window;
}

export function gradeMomentum(
  priceHistory: HistoricalPricePoint[] | null
): GradeResult {
  if (!priceHistory || priceHistory.length < 22) {
    return {
      category: "Momentum",
      score: 0,
      metrics: [],
      notes: ["Not enough price history to grade momentum."],
      insufficientData: true,
    };
  }

  const sorted = [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latestClose = sorted[sorted.length - 1].close;

  const return1m = returnOverTradingDays(sorted, 21);
  const return3m = returnOverTradingDays(sorted, 63);
  const return6m = returnOverTradingDays(sorted, 126);
  const return12m = returnOverTradingDays(sorted, 252);
  const sma50 = sma(sorted, 50);
  const sma200 = sma(sorted, 200);
  const priceVs50dma = sma50 ? latestClose / sma50 : null;
  const priceVs200dma = sma200 ? latestClose / sma200 : null;

  const notes: string[] = [];
  if (sorted.length < 252) {
    notes.push("Fewer than 12 months of price history — some momentum signals unavailable.");
  }

  const metrics: MetricScore[] = [
    {
      key: "return1m",
      label: "1-month return",
      value: return1m,
      displayValue: formatPercent(return1m),
      score: return1m !== null ? scoreFromCurve(return1m, MOMENTUM_CURVES.return1m) : null,
      weight: 2,
    },
    {
      key: "return3m",
      label: "3-month return",
      value: return3m,
      displayValue: formatPercent(return3m),
      score: return3m !== null ? scoreFromCurve(return3m, MOMENTUM_CURVES.return3m) : null,
      weight: 2,
    },
    {
      key: "return6m",
      label: "6-month return",
      value: return6m,
      displayValue: formatPercent(return6m),
      score: return6m !== null ? scoreFromCurve(return6m, MOMENTUM_CURVES.return6m) : null,
      weight: 2,
    },
    {
      key: "return12m",
      label: "12-month return",
      value: return12m,
      displayValue: formatPercent(return12m),
      score: return12m !== null ? scoreFromCurve(return12m, MOMENTUM_CURVES.return12m) : null,
      weight: 2,
    },
    {
      key: "priceVs50dma",
      label: "Price vs 50-day avg",
      value: priceVs50dma,
      displayValue: priceVs50dma !== null ? `${(priceVs50dma * 100).toFixed(1)}%` : "N/A",
      score:
        priceVs50dma !== null
          ? scoreFromCurve(priceVs50dma, MOMENTUM_CURVES.priceVs50dma)
          : null,
      weight: 2,
    },
    {
      key: "priceVs200dma",
      label: "Price vs 200-day avg",
      value: priceVs200dma,
      displayValue: priceVs200dma !== null ? `${(priceVs200dma * 100).toFixed(1)}%` : "N/A",
      score:
        priceVs200dma !== null
          ? scoreFromCurve(priceVs200dma, MOMENTUM_CURVES.priceVs200dma)
          : null,
      weight: 2,
    },
  ];

  const avg = weightedAverage(metrics);
  const insufficientData = avg === null;
  if (insufficientData) notes.push("Not enough momentum data to grade confidently.");

  return {
    category: "Momentum",
    score: avg ?? 0,
    metrics,
    notes,
    insufficientData,
  };
}
