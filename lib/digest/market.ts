import * as finnhub from "@/lib/providers/finnhub";
import type { DigestRow, MarketBenchmark, MarketBriefing, MarketSentiment } from "./types";

// Liquid ETFs, not index tickers (^GSPC etc.) — Finnhub's free quote
// endpoint is reliable for common stocks/ETFs but flaky for raw indices.
const BENCHMARKS: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow Jones" },
  { symbol: "IWM", label: "Russell 2000" },
];

export async function fetchMarketBriefing(): Promise<MarketBriefing> {
  const results = await Promise.all(
    BENCHMARKS.map(async ({ symbol, label }): Promise<MarketBenchmark | null> => {
      try {
        const quote = await finnhub.getQuote(symbol);
        return { symbol, label, price: quote.price, changePercent: quote.changePercent };
      } catch {
        return null;
      }
    })
  );
  const benchmarks = results.filter((b): b is MarketBenchmark => b !== null);

  if (benchmarks.length === 0) {
    return { benchmarks: [], summary: "Benchmark data unavailable today." };
  }

  const leader = [...benchmarks].sort((a, b) => b.changePercent - a.changePercent)[0];
  const laggard = [...benchmarks].sort((a, b) => a.changePercent - b.changePercent)[0];
  const avgChange =
    benchmarks.reduce((s, b) => s + b.changePercent, 0) / benchmarks.length;
  const direction = avgChange > 0.1 ? "higher" : avgChange < -0.1 ? "lower" : "roughly flat";

  const summary =
    benchmarks.length > 1
      ? `Benchmarks are ${direction} on average (${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(
          2
        )}%), led by ${leader.label} (${leader.changePercent >= 0 ? "+" : ""}${leader.changePercent.toFixed(
          2
        )}%) while ${laggard.label} lags (${laggard.changePercent >= 0 ? "+" : ""}${laggard.changePercent.toFixed(
          2
        )}%).`
      : `${benchmarks[0].label} is ${direction} (${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%).`;

  return { benchmarks, summary };
}

const OVERSOLD_RSI = 30;
const OVERBOUGHT_RSI = 70;

// Deterministic breadth-based sentiment gauge — no external fear/greed feed,
// just what's already fetched for the scan (watchlist quotes + RSI) plus
// the benchmark ETFs above. Weights: breadth matters most since it reflects
// the actual watchlist rather than four index proxies; benchmark move and
// average RSI split the rest.
export function computeMarketSentiment(
  rows: DigestRow[],
  benchmarks: MarketBenchmark[]
): MarketSentiment {
  if (rows.length === 0) {
    return {
      label: "Neutral",
      score: 50,
      breadthPct: 0,
      avgRsi: 50,
      oversoldCount: 0,
      overboughtCount: 0,
      summary: "Not enough scanned symbols to gauge sentiment today.",
    };
  }

  const upCount = rows.filter((r) => r.changePercent > 0).length;
  const breadthPct = (upCount / rows.length) * 100;
  const avgRsi = rows.reduce((s, r) => s + r.rsi, 0) / rows.length;
  const oversoldCount = rows.filter((r) => r.rsi <= OVERSOLD_RSI).length;
  const overboughtCount = rows.filter((r) => r.rsi >= OVERBOUGHT_RSI).length;

  const benchmarkAvgChange =
    benchmarks.length > 0
      ? benchmarks.reduce((s, b) => s + b.changePercent, 0) / benchmarks.length
      : 0;

  const breadthScore = breadthPct;
  const benchmarkScore = Math.max(0, Math.min(100, 50 + benchmarkAvgChange * 10));
  const rsiScore = Math.max(0, Math.min(100, avgRsi));
  const score = 0.4 * breadthScore + 0.3 * benchmarkScore + 0.3 * rsiScore;

  const label: MarketSentiment["label"] = score >= 60 ? "Bullish" : score <= 40 ? "Bearish" : "Neutral";

  const summary =
    `${breadthPct.toFixed(0)}% of the ${rows.length}-symbol watchlist is up today, ` +
    `average RSI(14) is ${avgRsi.toFixed(0)}${
      oversoldCount > 0 ? ` (${oversoldCount} oversold)` : ""
    }${overboughtCount > 0 ? ` (${overboughtCount} overbought)` : ""}, ` +
    `and benchmarks are ${benchmarkAvgChange >= 0 ? "+" : ""}${benchmarkAvgChange.toFixed(
      2
    )}% on average — sentiment reads ${label}.`;

  return { label, score, breadthPct, avgRsi, oversoldCount, overboughtCount, summary };
}
