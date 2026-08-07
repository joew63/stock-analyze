import { gradeStock, type StockGrades } from "@/lib/grading";
import { computeRSI } from "@/lib/backtest/indicators";
import { computeProjection } from "@/lib/projections/trend";
import { fiftyTwoWeekRange } from "@/lib/priceStats";
import { fetchSignalData } from "./fetchSignalData";
import { buildThesis, buildCaution, summarizeBusiness } from "./thesis";
import { DEFAULT_WATCHLIST } from "./watchlist";
import { fetchMarketBriefing, computeMarketSentiment } from "./market";
import type { DigestRow, DigestResult, DigestSkip } from "./types";

const RSI_PERIOD = 14;
const RSI_OVERSOLD_THRESHOLD = 45;
const RSI_OVERBOUGHT_THRESHOLD = 70;
const MAX_STANDOUTS = 7;
const FACTOR_STRONG_THRESHOLD = 60;
const CONCURRENCY = 5;
const PROJECTION_HORIZON_DAYS = 30;

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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

interface ScanOutcome {
  row: DigestRow | null;
  skip: DigestSkip | null;
}

// Builds one row for (almost) every watchlist symbol — scoring and ranking
// happen after the fact (see runDailyScan), not as a qualification gate.
// A symbol only ends up in `skipped` when we genuinely can't compute
// numbers for it (missing price history, RSI, or fundamentals), not
// because it looked unattractive.
async function scanSymbol(symbol: string): Promise<ScanOutcome> {
  const { bundle, errors } = await fetchSignalData(symbol);
  const { quote, priceHistory, profile } = bundle;

  if (!priceHistory || priceHistory.length < RSI_PERIOD + 2) {
    const priceHistoryError = errors.find((e) => e.startsWith("priceHistory:"));
    const reason = priceHistoryError
      ? `Price data unavailable (${priceHistoryError.replace("priceHistory: ", "")}).`
      : "Not enough price history.";
    return { row: null, skip: { symbol, reason } };
  }

  const sorted = [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const closes = sorted.map((p) => p.close);
  const rsiSeries = computeRSI(closes, RSI_PERIOD);
  const rsi = rsiSeries[rsiSeries.length - 1];
  const price = quote?.price ?? closes[closes.length - 1];
  const changePercent = quote?.changePercent ?? 0;

  if (rsi === null) {
    return { row: null, skip: { symbol, reason: "RSI unavailable." } };
  }

  const grades: StockGrades = gradeStock(bundle);
  const floorGrades = [grades.profitability, grades.growth].filter((g) => !g.insufficientData);
  if (floorGrades.length === 0) {
    return { row: null, skip: { symbol, reason: "Not enough fundamentals data." } };
  }
  const fundamentalFloor = floorGrades.reduce((s, g) => s + g.score, 0) / floorGrades.length;

  const projection = computeProjection(priceHistory);
  const horizon = projection.points.find((p) => p.daysAhead === PROJECTION_HORIZON_DAYS);
  if (projection.insufficientData || !horizon) {
    return {
      row: null,
      skip: { symbol, reason: "Not enough history for a price projection." },
    };
  }

  const range = fiftyTwoWeekRange(priceHistory);
  const oversoldScore = clamp(50 - rsi, 0, 50) * 2; // 0-100
  let proximityToLow = 0;
  if (range && range.high > range.low) {
    const position = clamp((price - range.low) / (range.high - range.low), 0, 1);
    proximityToLow = (1 - position) * 100;
  }
  const score = 0.4 * oversoldScore + 0.3 * proximityToLow + 0.3 * fundamentalFloor;
  const allFactorsStrong =
    oversoldScore >= FACTOR_STRONG_THRESHOLD &&
    proximityToLow >= FACTOR_STRONG_THRESHOLD &&
    fundamentalFloor >= FACTOR_STRONG_THRESHOLD;

  const thesis = buildThesis({ symbol, price, rsi, rsiPeriod: RSI_PERIOD, range, grades });
  const businessSummary = summarizeBusiness(profile?.description ?? null);
  const caution = buildCaution(grades);

  const row: DigestRow = {
    symbol,
    name: profile?.name ?? symbol,
    price,
    changePercent,
    rsi,
    oversold: rsi <= RSI_OVERSOLD_THRESHOLD,
    overbought: rsi >= RSI_OVERBOUGHT_THRESHOLD,
    score,
    allFactorsStrong,
    grades: {
      valuation: grades.valuation.score,
      growth: grades.growth.score,
      profitability: grades.profitability.score,
      momentum: grades.momentum.score,
      epsRevenue: grades.epsRevenue.score,
    },
    thesis,
    businessSummary,
    caution,
    targetPrice: horizon.upper1sd,
    stopLoss: horizon.lower1sd,
    horizonDays: PROJECTION_HORIZON_DAYS,
  };

  return { row, skip: null };
}

export async function runDailyScan(
  watchlist: string[] = DEFAULT_WATCHLIST
): Promise<DigestResult> {
  const [outcomes, marketBriefing] = await Promise.all([
    mapWithConcurrency(watchlist, CONCURRENCY, scanSymbol),
    fetchMarketBriefing(),
  ]);

  const rows = outcomes
    .map((o) => o.row)
    .filter((r): r is DigestRow => r !== null)
    .sort((a, b) => b.score - a.score);

  const skipped = outcomes.map((o) => o.skip).filter((s): s is DigestSkip => s !== null);

  const standouts = rows.slice(0, MAX_STANDOUTS);
  const marketSentiment = computeMarketSentiment(rows, marketBriefing.benchmarks);

  return {
    scannedAt: new Date().toISOString(),
    watchlistSize: watchlist.length,
    marketBriefing,
    marketSentiment,
    standouts,
    rows,
    skipped,
  };
}
