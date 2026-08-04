import { gradeStock, type StockGrades } from "@/lib/grading";
import { computeRSI } from "@/lib/backtest/indicators";
import { computeProjection } from "@/lib/projections/trend";
import { fiftyTwoWeekRange } from "@/lib/priceStats";
import { fetchSignalData } from "./fetchSignalData";
import { buildThesis } from "./thesis";
import { DEFAULT_WATCHLIST } from "./watchlist";
import type { DigestCandidate, DigestResult, DigestSkip } from "./types";

const RSI_PERIOD = 14;
const RSI_BUY_THRESHOLD = 45;
const FUNDAMENTAL_FLOOR = 45;
const MAX_CANDIDATES = 5;
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
  candidate: DigestCandidate | null;
  skip: DigestSkip | null;
}

// Qualifies + scores + composes one candidate. Oversold alone isn't enough
// to qualify — a fundamental floor (profitability + growth) filters out
// "cheap for a reason" names. Target/stop reuse the existing statistical
// projection (lib/projections/trend.ts) rather than an invented flat %.
async function scanSymbol(symbol: string): Promise<ScanOutcome> {
  const { bundle, errors } = await fetchSignalData(symbol);
  const { quote, priceHistory, profile } = bundle;

  if (!priceHistory || priceHistory.length < RSI_PERIOD + 2) {
    const priceHistoryError = errors.find((e) => e.startsWith("priceHistory:"));
    const reason = priceHistoryError
      ? `Price data unavailable (${priceHistoryError.replace("priceHistory: ", "")}).`
      : "Not enough price history.";
    return { candidate: null, skip: { symbol, reason } };
  }

  const sorted = [...priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  const closes = sorted.map((p) => p.close);
  const rsiSeries = computeRSI(closes, RSI_PERIOD);
  const rsi = rsiSeries[rsiSeries.length - 1];
  const price = quote?.price ?? closes[closes.length - 1];

  if (rsi === null) {
    return { candidate: null, skip: { symbol, reason: "RSI unavailable." } };
  }
  if (rsi > RSI_BUY_THRESHOLD) {
    return { candidate: null, skip: { symbol, reason: `RSI ${rsi.toFixed(0)} not oversold.` } };
  }

  const grades: StockGrades = gradeStock(bundle);
  const floorGrades = [grades.profitability, grades.growth].filter((g) => !g.insufficientData);
  if (floorGrades.length === 0) {
    return { candidate: null, skip: { symbol, reason: "Not enough fundamentals data." } };
  }
  const fundamentalFloor = floorGrades.reduce((s, g) => s + g.score, 0) / floorGrades.length;
  if (fundamentalFloor < FUNDAMENTAL_FLOOR) {
    return {
      candidate: null,
      skip: {
        symbol,
        reason: `Oversold but fundamentals too weak (${fundamentalFloor.toFixed(0)}/100).`,
      },
    };
  }

  const projection = computeProjection(priceHistory);
  const horizon = projection.points.find((p) => p.daysAhead === PROJECTION_HORIZON_DAYS);
  if (projection.insufficientData || !horizon) {
    return {
      candidate: null,
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

  const thesis = buildThesis({ symbol, price, rsi, rsiPeriod: RSI_PERIOD, range, grades });

  const candidate: DigestCandidate = {
    symbol,
    name: profile?.name ?? symbol,
    price,
    rsi,
    score,
    grades: {
      valuation: grades.valuation.score,
      growth: grades.growth.score,
      profitability: grades.profitability.score,
      momentum: grades.momentum.score,
      epsRevenue: grades.epsRevenue.score,
    },
    thesis,
    targetPrice: horizon.upper1sd,
    stopLoss: horizon.lower1sd,
    horizonDays: PROJECTION_HORIZON_DAYS,
  };

  return { candidate, skip: null };
}

export async function runDailyScan(
  watchlist: string[] = DEFAULT_WATCHLIST
): Promise<DigestResult> {
  const outcomes = await mapWithConcurrency(watchlist, CONCURRENCY, scanSymbol);

  const candidates = outcomes
    .map((o) => o.candidate)
    .filter((c): c is DigestCandidate => c !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);

  const skipped = outcomes.map((o) => o.skip).filter((s): s is DigestSkip => s !== null);

  return {
    scannedAt: new Date().toISOString(),
    watchlistSize: watchlist.length,
    candidates,
    skipped,
  };
}
