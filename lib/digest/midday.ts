import * as finnhub from "@/lib/providers/finnhub";
import { DEFAULT_WATCHLIST } from "./watchlist";
import { fetchMarketBriefing } from "./market";
import { fetchNewsHighlights } from "./news";
import type {
  DigestSkip,
  MiddayPulse,
  MiddayQuote,
  MiddayResult,
} from "./types";

const CONCURRENCY = 5;
const MAX_MOVERS = 5;
// A midday ping is a glance, not a read — a few market-wide headlines only,
// no per-symbol news feeds (the morning digest does the deeper pass).
const MIDDAY_NEWS_COUNT = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface QuoteOutcome {
  quote: MiddayQuote | null;
  skip: DigestSkip | null;
}

// Just a live quote — no FMP profile call, so "name" falls back to the
// symbol. The daily digest is where names/fundamentals matter; a midday
// ping is about where prices are right now.
async function quoteSymbol(symbol: string): Promise<QuoteOutcome> {
  try {
    const q = await finnhub.getQuote(symbol);
    return {
      quote: {
        symbol,
        name: symbol,
        price: q.price,
        changePercent: q.changePercent,
      },
      skip: null,
    };
  } catch (err) {
    return {
      quote: null,
      skip: {
        symbol,
        reason: `Quote unavailable (${
          err instanceof Error ? err.message : String(err)
        }).`,
      },
    };
  }
}

// Lightweight intraday pulse: breadth (what share of the watchlist is
// green) plus the average benchmark move. Deliberately no RSI term — the
// daily sentiment gauge uses RSI, but RSI here would just be yesterday's
// close restated, so it would add noise, not signal. Weights: breadth is
// the live watchlist itself, benchmarks are four ETF proxies, so breadth
// carries more.
function computeMiddayPulse(
  quotes: MiddayQuote[],
  benchmarkAvgChange: number
): MiddayPulse {
  if (quotes.length === 0) {
    return {
      label: "Neutral",
      score: 50,
      breadthPct: 0,
      upCount: 0,
      downCount: 0,
      benchmarkAvgChange,
      summary: "No live quotes available — can't gauge the intraday pulse.",
    };
  }

  const upCount = quotes.filter((q) => q.changePercent > 0).length;
  const downCount = quotes.filter((q) => q.changePercent < 0).length;
  const breadthPct = (upCount / quotes.length) * 100;

  const breadthScore = breadthPct;
  const benchmarkScore = Math.max(0, Math.min(100, 50 + benchmarkAvgChange * 10));
  const score = 0.6 * breadthScore + 0.4 * benchmarkScore;

  const label: MiddayPulse["label"] =
    score >= 60 ? "Bullish" : score <= 40 ? "Bearish" : "Neutral";

  const summary =
    `${breadthPct.toFixed(0)}% of the ${quotes.length} quoted watchlist names are up so far today ` +
    `(${upCount} up, ${downCount} down), and benchmarks are ` +
    `${benchmarkAvgChange >= 0 ? "+" : ""}${benchmarkAvgChange.toFixed(2)}% on average — ` +
    `intraday pulse reads ${label}.`;

  return {
    label,
    score,
    breadthPct,
    upCount,
    downCount,
    benchmarkAvgChange,
    summary,
  };
}

export async function runMiddayScan(
  watchlist: string[] = DEFAULT_WATCHLIST
): Promise<MiddayResult> {
  const [outcomes, marketBriefing, newsHighlights] = await Promise.all([
    mapWithConcurrency(watchlist, CONCURRENCY, quoteSymbol),
    fetchMarketBriefing(),
    fetchNewsHighlights([], MIDDAY_NEWS_COUNT),
  ]);

  const quotes = outcomes
    .map((o) => o.quote)
    .filter((q): q is MiddayQuote => q !== null);
  const skipped = outcomes
    .map((o) => o.skip)
    .filter((s): s is DigestSkip => s !== null);

  const byChangeDesc = [...quotes].sort(
    (a, b) => b.changePercent - a.changePercent
  );
  const gainers = byChangeDesc.filter((q) => q.changePercent > 0).slice(0, MAX_MOVERS);
  const losers = byChangeDesc
    .filter((q) => q.changePercent < 0)
    .slice(-MAX_MOVERS)
    .reverse();

  const benchmarkAvgChange =
    marketBriefing.benchmarks.length > 0
      ? marketBriefing.benchmarks.reduce((s, b) => s + b.changePercent, 0) /
        marketBriefing.benchmarks.length
      : 0;

  const pulse = computeMiddayPulse(quotes, benchmarkAvgChange);

  return {
    scannedAt: new Date().toISOString(),
    watchlistSize: watchlist.length,
    quotedCount: quotes.length,
    marketBriefing,
    pulse,
    gainers,
    losers,
    quotes: byChangeDesc,
    newsHighlights,
    skipped,
  };
}
