import * as finnhub from "@/lib/providers/finnhub";
import * as fmp from "@/lib/providers/fmp";
import type { StockDataBundle } from "@/lib/providers/types";

// Trimmed fetch for the digest scanner — grading only needs ratios,
// annual incomeHistory, priceHistory, and earningsSurprises (confirmed by
// reading lib/grading/index.ts). Skips incomeHistoryQuarterly, news, and
// recommendationTrend, which the grader never touches — cuts per-symbol
// calls from 9 (full getStockData bundle) to 6.
export interface SignalData {
  bundle: StockDataBundle;
  errors: string[];
}

async function settle<T>(
  promise: Promise<T>,
  label: string,
  errors: string[]
): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function fetchSignalData(rawSymbol: string): Promise<SignalData> {
  const symbol = rawSymbol.trim().toUpperCase();
  const errors: string[] = [];

  const [quote, profile, ratios, incomeHistory, priceHistory, earningsSurprises] =
    await Promise.all([
      settle(finnhub.getQuote(symbol), "quote", errors),
      settle(fmp.getCompanyProfile(symbol), "profile", errors),
      settle(fmp.getFundamentalRatios(symbol), "ratios", errors),
      settle(fmp.getIncomeStatementHistory(symbol, "annual", 5), "incomeHistory", errors),
      settle(fmp.getHistoricalPrices(symbol), "priceHistory", errors),
      settle(finnhub.getEarningsSurprises(symbol), "earningsSurprises", errors),
    ]);

  const bundle: StockDataBundle = {
    symbol,
    quote,
    profile,
    ratios,
    incomeHistory,
    incomeHistoryQuarterly: null,
    priceHistory,
    recommendationTrend: null,
    news: null,
    earningsSurprises,
    errors,
  };

  return { bundle, errors };
}
